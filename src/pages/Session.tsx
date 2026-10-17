import { Fragment, useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from "react";
import { ConceptMap, Legend } from "../components/ConceptMap";
import { Icon } from "../components/Icon";
import { Kai } from "../components/Kai";
import { Redirect } from "../components/Shell";
import { Button, Dialog, IconButton, PrivateBadge } from "../components/ui";
import { statusLabel, type Status } from "../lib/data";
import { analyse, canTry, reply, runExample, snapshot, type Message, type Session as SessionT } from "../lib/engine";
import { go } from "../lib/router";
import { useSpeech } from "../lib/speech";
import { useStore } from "../lib/store";
import { getTopic, type TopicDef } from "../lib/topics";

type Modal = "pause" | "end" | "try" | "nudge" | null;

const generalNudges = [
  { label: "Give a real-life example or analogy", starter: "It’s a bit like " },
  { label: "Trace a tiny example by hand, step by step", starter: "Let’s trace a small example step by step: " },
  { label: "Explain what would go wrong without it", starter: "If that didn’t happen, " },
];

/** Render ``` fenced code inside chat messages. */
export function MessageText({ text }: { text: string }) {
  const parts = text.split(/```(?:\w+)?\n?/);
  return <>{parts.map((p, i) => (i % 2 ? <pre key={i} className="chat-code"><code>{p.replace(/\n$/, "")}</code></pre> : <Fragment key={i}>{p}</Fragment>))}</>;
}

export function Session({ id }: { id?: string }) {
  const { sessions } = useStore();
  const session = sessions.find((s) => s.id === id);
  const topic = getTopic(session?.topicId);
  if (!session || !topic) return <Redirect to="home" />;
  if (session.status === "completed") return <Redirect to="summary" id={session.id} />;
  return <Teaching session={session} topic={topic} />;
}

function Teaching({ session, topic }: { session: SessionT; topic: TopicDef }) {
  const { settings, updateSession, toast } = useStore();
  const [text, setText] = useState("");
  const [typingUntil, setTypingUntil] = useState(0);
  const [modal, setModal] = useState<Modal>(null);
  const [node, setNode] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<{ kind: "right" | "wrong"; note: string } | null>(null);
  const [speakMode, setSpeakMode] = useState(settings.inputMode === "Speak");
  const [tab, setTab] = useState<"chat" | "map">("chat");
  const chatEnd = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number>(0);
  const typing = typingUntil > 0;

  const speech = useSpeech(
    (t) => { setText((prev) => (prev ? `${prev} ${t}` : t)); setSpeakMode(false); requestAnimationFrame(() => input.current?.focus()); },
    (msg) => { toast(msg); setSpeakMode(false); },
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // While Kai is "thinking", hide its newest reply and show the map as it was before.
  const visible = typing ? session.messages.slice(0, -1) : session.messages;
  const lastKai = [...visible].reverse().find((m) => m.from === "kai" && m.snapshot);
  const shownStatuses: Record<string, Status> = typing ? (lastKai?.snapshot ?? {}) : snapshot(session.nodes);
  const fresh = typing ? [] : session.lastChanged;
  const disputed = topic.nodes.filter((n) => session.nodes[n.id]?.disputed).map((n) => n.id);
  const statusOf = (nid: string): Status => shownStatuses[nid] ?? "grey";
  const covered = topic.nodes.filter((n) => statusOf(n.id) !== "grey").length;
  const mintCount = topic.nodes.filter((n) => statusOf(n.id) === "mint").length;
  const anyCoral = topic.nodes.some((n) => statusOf(n.id) === "coral");
  const total = topic.nodes.length;
  const unlocked = canTry(topic, session.nodes) && !typing;
  const studentTexts = session.messages.filter((m) => m.from === "student").map((m) => m.text);
  const nextSample = topic.samples[Math.min(studentTexts.length, topic.samples.length - 1)];
  const example = useMemo(() => runExample(topic, session.nodes), [topic, session.nodes]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: settings.reduceMotion ? "auto" : "smooth", block: "end" });
  }, [visible.length, typing, settings.reduceMotion]);

  const delay = settings.reduceMotion ? 250 : { Relaxed: 1600, Normal: 1100, Curious: 800 }[settings.pace];

  /** Store the student's message and Kai's reply together, then reveal the reply after a short "thinking" pause. */
  const send = () => {
    const message = text.trim();
    if (!message || typing) return;
    const { nodes, changes } = analyse(topic, session.nodes, message);
    const r = reply(topic, nodes, changes, message, { pace: settings.pace, simple: settings.simpleWords, previous: studentTexts });
    r.askedWhy.forEach((nid) => { nodes[nid] = { ...nodes[nid], askedWhy: true }; });
    const now = Date.now();
    const kai: Message = { from: "kai", text: r.text, at: now + 1, mood: r.mood, snapshot: snapshot(nodes), changed: changes.map((c) => c.id) };
    updateSession(session.id, (s) => ({ ...s, nodes, lastChanged: changes.map((c) => c.id), messages: [...s.messages, { from: "student", text: message, at: now }, kai] }));
    setText("");
    setTypingUntil(now + delay);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTypingUntil(0), delay);
  };

  const kaiSays = (t: string, mood: Message["mood"] = "curious", nodes = session.nodes, changed: string[] = []) => {
    updateSession(session.id, (s) => ({ ...s, nodes, lastChanged: changed, messages: [...s.messages, { from: "kai", text: t, at: Date.now(), mood, snapshot: snapshot(nodes), changed }] }));
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.getData("text").length > 140) toast("Kai learns best from your own words. Try rephrasing it after pasting.");
  };

  const insert = (starter: string) => {
    setText((prev) => (prev.trim() ? `${prev.trimEnd()} ${starter}` : starter));
    setSpeakMode(false);
    requestAnimationFrame(() => { input.current?.focus(); const el = input.current; if (el) el.selectionStart = el.selectionEnd = el.value.length; });
  };
  const close = () => setModal(null);

  const openTry = () => {
    updateSession(session.id, (s) => ({ ...s, tryAttempts: s.tryAttempts + 1 }));
    setModal("try");
  };

  const finishTry = () => {
    close();
    setTab("chat");
    if (example.outcome === "success") {
      if (!session.trySuccess) {
        updateSession(session.id, (s) => ({ ...s, trySuccess: true }));
        kaiSays(`I did it! ${topic.example.success} Thank you for teaching me.`, "aha");
      }
      return;
    }
    const f = example.failed!;
    kaiSays(example.outcome === "wrong"
      ? `Hmm, I went wrong at “${f.label}”. I thought ${session.nodes[f.id]?.belief ?? "something else"}. Can you explain that part again?`
      : `I got stuck at “${f.label}”. ${f.ask}`, "thinking");
    insert(`About ${f.label.toLowerCase()}: `);
  };

  const submitChallenge = () => {
    if (!node || !challenge) return;
    const n = topic.nodes.find((x) => x.id === node)!;
    const nodes = { ...session.nodes, [node]: { ...session.nodes[node], disputed: true, status: (challenge.kind === "right" ? "mint" : "amber") as Status, belief: challenge.kind === "right" ? n.gotIt : undefined } };
    updateSession(session.id, (s) => ({ ...s, challenges: [...s.challenges, { node, kind: challenge.kind, note: challenge.note.trim(), at: Date.now() }] }));
    kaiSays(challenge.kind === "right"
      ? `Oh, okay. I’ll trust you on that one and mark “${n.label}” as understood.`
      : `Hmm, okay, so I might have “${n.label}” wrong. ${n.clarify}`, challenge.kind === "right" ? "aha" : "thinking", nodes, [node]);
    setChallenge(null);
    setNode(null);
    toast("Thanks. Kai’s map is updated. Judgements are estimates and you’re in control.");
    if (challenge.kind === "wrong") insert(`About ${n.label.toLowerCase()}: `);
  };

  const selected = node ? topic.nodes.find((n) => n.id === node)! : null;
  const selectedState = node ? session.nodes[node] : null;

  const moodFor = (m: Message, i: number) => m.mood ?? (i === 0 ? "curious" : "thinking");

  const transcript: ReactNode[] = visible.map((m, i) => m.from === "student"
    ? <div className="message student" key={i}><MessageText text={m.text} /></div>
    : (
      <div className="kai-message" key={i}>
        <Kai size="sm" mood={moodFor(m, i)} />
        <div><small>KAI · YOUR STUDY BUDDY</small><div className="message kai-bubble">{m.text}</div></div>
      </div>
    ));

  return (
    <div className="session-page">
      <header className="session-top">
        <IconButton icon="arrow" label="Leave session" onClick={() => setModal("pause")} />
        <div className="session-title">
          <h1 tabIndex={-1}>Teaching Kai: {topic.title}</h1>
          <PrivateBadge />
        </div>
        <div className="top-actions">
          <Button variant="ghost" icon="pause" onClick={() => setModal("pause")} className="hide-mobile">Pause</Button>
          <Button variant="secondary" onClick={() => setModal("end")}>End session</Button>
        </div>
      </header>

      <div className="session-tabs" role="tablist" aria-label="Session view">
        <button type="button" role="tab" aria-selected={tab === "chat"} onClick={() => setTab("chat")}>Conversation</button>
        <button type="button" role="tab" aria-selected={tab === "map"} onClick={() => setTab("map")}>Kai’s map <span className="chip-count">{covered}/{total}</span></button>
      </div>

      <div className={`session-grid ${settings.showMap ? "" : "no-map"}`} data-tab={tab}>
        <section className="conversation" aria-label="Conversation">
          <div className="chat" role="log" aria-live="polite" aria-relevant="additions">
            <div className="session-label"><span>CONVERSATION</span><small>Explain it in your own words. Kai will ask one question at a time.</small></div>
            <div className="chat-thread">{transcript}</div>
            {typing && (
              <div className="kai-message"><Kai size="sm" mood="thinking" /><div className="message kai-bubble typing" aria-label="Kai is thinking"><span /><span /><span /></div></div>
            )}
            {!typing && mintCount >= total - 1 && !anyCoral && (
              <div className="wrap-banner">
                <Icon name="sparkle" />
                <div><strong>Kai gets {mintCount} of {total} ideas now.</strong><span>{mintCount === total ? "Every idea landed. Watch Kai try, or wrap up and reflect." : "Wrap up and reflect, or keep teaching the last idea."}</span></div>
                <Button onClick={() => setModal("end")}>Wrap up</Button>
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          <div className="composer-wrap">
            <div className="chips">
              <button type="button" onClick={() => insert("For example, ")}><Icon name="bulb" size={14} />Let me give an example</button>
              <button type="button" onClick={() => setModal("nudge")}><Icon name="help" size={14} />I’m stuck</button>
              {settings.demoHelpers && <button type="button" className="chip-demo" onClick={() => insert(nextSample)} title="Fills in a sample explanation (demo helper)"><Icon name="sparkle" size={14} />Use sample answer</button>}
            </div>
            {speakMode ? (
              <div className="listening">
                {speech.listening ? (
                  <>
                    <span className="pulse-mic"><Icon name="mic" /></span>
                    <div><strong>Listening… take your time</strong><small>{speech.interim ? `“${speech.interim}”` : "Start explaining out loud."}</small></div>
                    <button type="button" onClick={speech.stop}>Stop & review</button>
                    <button type="button" className="ghost" onClick={() => { speech.cancel(); setSpeakMode(false); }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="pulse-mic idle"><Icon name="mic" /></span>
                    <div><strong>Explain out loud</strong><small>{speech.supported ? "Tap the mic to start. You can edit the transcript before sending." : "Voice isn’t supported in this browser. Try Chrome or Edge."}</small></div>
                    <button type="button" onClick={speech.start} disabled={!speech.supported}>Start speaking</button>
                    <button type="button" className="ghost" onClick={() => setSpeakMode(false)}>Type instead</button>
                  </>
                )}
              </div>
            ) : (
              <div className="composer">
                <label htmlFor="explain" className="sr-only">Your explanation</label>
                <textarea id="explain" ref={input} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onPaste={onPaste} placeholder="Explain in your own words…" rows={2} maxLength={2000} />
                <div className="composer-actions">
                  <IconButton icon="mic" label="Speak instead" onClick={() => { setSpeakMode(true); if (speech.supported) speech.start(); }} />
                  <button type="button" onClick={() => insert("\n```\n\n```\n")}><Icon name="code" size={16} /> Add code</button>
                  <span className="kbd-hint">Enter to send · Shift+Enter for new line</span>
                  <button type="button" className="send-button" onClick={send} disabled={!text.trim() || typing} aria-label="Send explanation"><Icon name="send" size={18} /></button>
                </div>
              </div>
            )}
          </div>
        </section>

        {settings.showMap && (
          <aside className="map-panel" aria-label="Kai's understanding map">
            <div className="map-title">
              <div><p className="eyebrow">LIVE MAP</p><h2>What Kai understands so far</h2></div>
              <span aria-live="polite">{covered}/{total} ideas</span>
            </div>
            <div className="progress-track" aria-hidden="true"><b style={{ width: `${(mintCount / total) * 100}%` }} /></div>
            <ConceptMap topic={topic} statuses={shownStatuses} fresh={fresh} disputed={disputed} onNode={setNode} />
            <Legend />
            <Button variant="peach" icon="play" onClick={openTry} disabled={!unlocked}>Watch Kai try an example</Button>
            <small className="estimate">{unlocked ? "Kai’s understanding is an estimate. Tap any idea to see why, or to challenge it." : `Teach ${Math.max(1, 3 - covered)} more idea${3 - covered === 1 ? "" : "s"} to unlock this.`}</small>
          </aside>
        )}
      </div>

      <Dialog open={!!selected} onClose={() => { setNode(null); setChallenge(null); }} label="Idea details" variant="drawer">
        {selected && selectedState && (
          <>
            <p className="eyebrow">KAI’S CURRENT UNDERSTANDING</p>
            <h2>{selected.label}</h2>
            <div className={`status-banner ${selectedState.status}`}><strong>{statusLabel[selectedState.status]}{selectedState.disputed ? " · disputed by you" : ""}</strong><span>This is an estimate, not a grade.</span></div>
            {selectedState.status !== "grey" && (
              <>
                <h3>What Kai currently believes</h3>
                <p>{selectedState.status === "amber" ? "Kai has heard of this, but doesn’t know how it works yet." : `${selectedState.belief ?? selected.gotIt}.`.replace(/^./, (c) => c.toUpperCase())}</p>
              </>
            )}
            <h3>{selectedState.status === "grey" ? "Not taught yet" : "Because you said…"}</h3>
            {selectedState.evidence ? <blockquote>“{selectedState.evidence}”</blockquote> : <p>This idea hasn’t come up yet.</p>}
            <p className="drawer-hint"><Icon name="bulb" size={16} /> {selected.hint}</p>
            {challenge ? (
              <div className="challenge-form">
                <h3>What do you think?</h3>
                <div className="challenge-choices" role="radiogroup" aria-label="Your view">
                  <button type="button" role="radio" aria-checked={challenge.kind === "right"} className={challenge.kind === "right" ? "active" : ""} onClick={() => setChallenge({ ...challenge, kind: "right" })}>I think Kai actually understands this</button>
                  <button type="button" role="radio" aria-checked={challenge.kind === "wrong"} className={challenge.kind === "wrong" ? "active" : ""} onClick={() => setChallenge({ ...challenge, kind: "wrong" })}>I think Kai still has this wrong</button>
                </div>
                <label htmlFor="challenge-note">Anything to add? (optional)</label>
                <textarea id="challenge-note" rows={3} value={challenge.note} onChange={(e) => setChallenge({ ...challenge, note: e.target.value })} placeholder="What did Kai get wrong?" />
                <div className="drawer-actions">
                  <Button onClick={submitChallenge}>Send feedback</Button>
                  <Button variant="ghost" onClick={() => setChallenge(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="drawer-actions">
                <Button onClick={() => { const label = selected.label.toLowerCase(); setNode(null); setTab("chat"); insert(`About ${label}: `); }}>{selectedState.status === "grey" ? "Teach this now" : "Explain it differently"}</Button>
                {selectedState.status !== "grey" && <Button variant="secondary" onClick={() => setChallenge({ kind: selectedState.status === "mint" ? "wrong" : "right", note: "" })}>Challenge this</Button>}
              </div>
            )}
          </>
        )}
      </Dialog>

      <Dialog open={modal === "try"} onClose={close}label="Watch Kai apply it" className="try-modal">
        <div className="try-head"><Kai size="md" mood={example.outcome === "success" ? "aha" : "thinking"} /><div><p className="eyebrow">WATCH KAI APPLY IT</p><h2>{topic.example.question}</h2></div></div>
        <div className="try-grid">
          <pre><code>{topic.example.code}</code></pre>
          <ol className="trace">
            {example.steps.map((s, i) => (
              <li key={`${session.tryAttempts}-${i}`} className={`trace-step ${s.status}`} style={{ animationDelay: `${i * 0.35}s` }}>
                <Icon name={s.status === "mint" ? "check" : s.status === "coral" ? "alert" : "help"} size={16} />{s.text}
              </li>
            ))}
          </ol>
        </div>
        <div className="kai-question">
          {example.outcome === "success" ? `Got it! ${topic.example.success}`
            : example.outcome === "wrong" ? "Hmm, that doesn’t look right… Where did I go wrong?"
              : "I couldn’t finish. I think there’s a part nobody explained to me yet."}
        </div>
        <div className="button-row">
          <Button onClick={finishTry}>{example.outcome === "success" ? "Nice!" : "Help Kai fix it"}</Button>
        </div>
      </Dialog>

      <Dialog open={modal === "nudge"} onClose={close} label="A little help" variant="sheet">
        <p className="eyebrow">A LITTLE HELP</p>
        <h2>No worries. Here are some nudges</h2>
        {(() => {
          const focus = topic.nodes.find((n) => session.nodes[n.id]?.status === "amber") ?? topic.nodes.find((n) => session.nodes[n.id]?.status === "grey") ?? topic.nodes.find((n) => session.nodes[n.id]?.status === "coral");
          return focus && <button type="button" className="nudge" onClick={() => { close(); insert(`About ${focus.label.toLowerCase()}: `); }}>{focus.hint}<span>Explain {focus.label.toLowerCase()} <Icon name="arrowRight" size={14} /></span></button>;
        })()}
        {generalNudges.map((n) => (
          <button type="button" className="nudge" onClick={() => { close(); insert(n.starter); }} key={n.label}>{n.label}<span>Use nudge <Icon name="arrowRight" size={14} /></span></button>
        ))}
        <div className="nudge-links">
          <button type="button" onClick={() => { close(); go("topic", topic.id); }}>Review this topic</button>
          <button type="button" onClick={() => setModal("pause")}>Take a break: pause session</button>
        </div>
      </Dialog>

      <Dialog open={modal === "pause" || modal === "end"} onClose={close} label={modal === "pause" ? "Session paused" : "End session"} className="small-modal">
        <Kai size="md" mood={modal === "pause" ? "sleepy" : "curious"} />
        <h2>{modal === "pause" ? "Take your time." : "Ready to wrap up?"}</h2>
        <p>{modal === "pause" ? "Kai will wait right here. Your session is saved automatically, so you can come back any time." : `Kai understands ${mintCount} of ${total} ideas. You can always teach more later.`}</p>
        {modal === "end" && <ConceptMap topic={topic} statuses={shownStatuses} compact />}
        <div className="button-row centered">
          {modal === "pause"
            ? <><Button onClick={close}>Resume</Button><Button variant="secondary" onClick={() => { toast("Session saved. Pick up any time from Home."); go("home"); }}>Save & exit</Button></>
            : <><Button onClick={() => go("after", session.id)}>See my reflection</Button><Button variant="secondary" onClick={close}>Keep teaching</Button></>}
        </div>
      </Dialog>
    </div>
  );
}
