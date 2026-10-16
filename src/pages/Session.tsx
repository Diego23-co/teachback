import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ConceptMap, Legend } from "../components/ConceptMap";
import { Icon } from "../components/Icon";
import { Kai } from "../components/Kai";
import { Button, Dialog, IconButton, PrivateBadge } from "../components/ui";
import { kaiMessages, nodeExplanations, nodeLabels, statusLabel, statusesFor, studentMessages } from "../lib/data";
import { go } from "../lib/router";
import { useStore } from "../lib/store";

type Modal = "pause" | "end" | "try" | "nudge" | null;

const nudges = [
  { label: "Think of a real-life example, like Russian dolls", starter: "It’s a bit like Russian dolls: " },
  { label: "What would happen if the function never stopped?", starter: "If the function never stopped, " },
  { label: "Try tracing a small input by hand", starter: "Let’s trace factorial(3) step by step: " },
];

export function Session() {
  const { settings, toast } = useStore();
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [node, setNode] = useState<number | null>(null);
  const [listening, setListening] = useState(settings.inputMode === "Speak");
  const [tab, setTab] = useState<"chat" | "map">("chat");
  const chatEnd = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const statuses = statusesFor(step);
  const covered = statuses.filter((s) => s !== "grey").length;
  const done = step >= 4;

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: settings.reduceMotion ? "auto" : "smooth", block: "end" }); }, [sent.length, typing, settings.reduceMotion]);

  const respond = (message: string, toStep: number) => {
    setSent((s) => [...s, message]);
    setText("");
    setTyping(true);
    const delay = settings.reduceMotion ? 200 : { Relaxed: 1400, Normal: 1000, Curious: 700 }[settings.pace];
    setTimeout(() => { setTyping(false); setStep(toStep); }, delay);
  };

  const send = () => {
    const message = text.trim();
    if (!message || typing || done) return;
    respond(message, step + 1);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const insert = (starter: string) => { setText(starter); setListening(false); requestAnimationFrame(() => input.current?.focus()); };
  const close = () => setModal(null);

  return (
    <div className="session-page">
      <header className="session-top">
        <IconButton icon="arrow" label="Leave session" onClick={() => setModal("pause")} />
        <div className="session-title">
          <h1 tabIndex={-1}>Teaching Kai: Recursion</h1>
          <PrivateBadge />
        </div>
        <div className="top-actions">
          <Button variant="ghost" icon="pause" onClick={() => setModal("pause")} className="hide-mobile">Pause</Button>
          <Button variant="secondary" onClick={() => setModal("end")}>End session</Button>
        </div>
      </header>

      <div className="session-tabs" role="tablist" aria-label="Session view">
        <button type="button" role="tab" aria-selected={tab === "chat"} onClick={() => setTab("chat")}>Conversation</button>
        <button type="button" role="tab" aria-selected={tab === "map"} onClick={() => setTab("map")}>Kai’s map <span className="chip-count">{covered}/6</span></button>
      </div>

      <div className={`session-grid ${settings.showMap ? "" : "no-map"}`} data-tab={tab}>
        <section className="conversation" aria-label="Conversation">
          <div className="chat" role="log" aria-live="polite" aria-relevant="additions">
            <div className="session-label"><span>CONVERSATION</span><small>Explain it in your own words. Kai will ask one question at a time.</small></div>
            {kaiMessages.slice(0, step + 1).map((msg, i) => (
              <div className="chat-pair" key={i}>
                {i > 0 && <div className="message student">{sent[i - 1]}</div>}
                <div className="kai-message">
                  <Kai size="sm" mood={i === 4 ? "aha" : i === 3 ? "thinking" : "curious"} />
                  <div><small>KAI · YOUR STUDY BUDDY</small><div className="message kai-bubble">{msg}</div></div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="chat-pair">
                <div className="message student">{sent[sent.length - 1]}</div>
                <div className="kai-message"><Kai size="sm" mood="thinking" /><div className="message kai-bubble typing" aria-label="Kai is thinking"><span /><span /><span /></div></div>
              </div>
            )}
            {done && (
              <div className="wrap-banner">
                <Icon name="sparkle" />
                <div><strong>Kai gets 5 of 6 ideas now.</strong><span>Wrap up and reflect, or keep teaching infinite recursion.</span></div>
                <Button onClick={() => setModal("end")}>Wrap up</Button>
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          <div className="composer-wrap">
            <div className="chips">
              <button type="button" onClick={() => insert("For example, ")}><Icon name="bulb" size={14} />Let me give an example</button>
              <button type="button" onClick={() => setModal("nudge")}><Icon name="help" size={14} />I’m stuck</button>
              {!done && <button type="button" className="chip-demo" onClick={() => insert(studentMessages[step])} title="Fills in a sample explanation"><Icon name="sparkle" size={14} />Use sample answer</button>}
            </div>
            {listening ? (
              <div className="listening">
                <span className="pulse-mic"><Icon name="mic" /></span>
                <div><strong>Listening…</strong><small>“{studentMessages[Math.min(step, 3)].slice(0, 42)}…”</small></div>
                <button type="button" onClick={() => insert(studentMessages[Math.min(step, 3)])}>Stop & review</button>
                <button type="button" className="ghost" onClick={() => setListening(false)}>Type instead</button>
              </div>
            ) : (
              <div className="composer">
                <label htmlFor="explain" className="sr-only">Your explanation</label>
                <textarea id="explain" ref={input} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder={done ? "Kai has the picture! Wrap up or keep going…" : "Explain in your own words…"} rows={2} />
                <div className="composer-actions">
                  <IconButton icon="mic" label="Speak instead" onClick={() => setListening(true)} />
                  <button type="button" onClick={() => insert(text + "\n```\ndef factorial(n):\n  ...\n```")}><Icon name="code" size={16} /> Add code</button>
                  <span className="kbd-hint">Enter to send · Shift+Enter for new line</span>
                  <button type="button" className="send-button" onClick={send} disabled={!text.trim() || typing || done} aria-label="Send explanation"><Icon name="send" size={18} /></button>
                </div>
              </div>
            )}
          </div>
        </section>

        {settings.showMap && (
          <aside className="map-panel" aria-label="Kai's understanding map">
            <div className="map-title">
              <div><p className="eyebrow">LIVE MAP</p><h2>What Kai understands so far</h2></div>
              <span aria-live="polite">{covered}/6 ideas</span>
            </div>
            <div className="progress-track" aria-hidden="true"><b style={{ width: `${(covered / 6) * 100}%` }} /></div>
            <ConceptMap step={step} onNode={setNode} />
            <Legend />
            <Button variant="peach" icon="play" onClick={() => setModal("try")} disabled={step < 3}>Watch Kai try an example</Button>
            <small className="estimate">{step < 3 ? `Teach ${3 - step} more idea${3 - step === 1 ? "" : "s"} to unlock this.` : "Kai’s understanding is an estimate — tap any idea to challenge it."}</small>
          </aside>
        )}
      </div>

      <Dialog open={node !== null} onClose={() => setNode(null)} label="Idea details" variant="drawer">
        {node !== null && (
          <>
            <p className="eyebrow">KAI’S CURRENT UNDERSTANDING</p>
            <h2>{nodeLabels[node]}</h2>
            <div className={`status-banner ${statuses[node]}`}><strong>{statusLabel[statuses[node]]}</strong><span>This is an estimate, not a grade.</span></div>
            <h3>Why does Kai think that?</h3>
            {statuses[node] !== "grey" && <blockquote>“{nodeExplanations[node].quote}”</blockquote>}
            <p>{statuses[node] === "grey" ? nodeExplanations[5].reason : nodeExplanations[node].reason}</p>
            <div className="drawer-actions">
              <Button onClick={() => { setNode(null); insert(`About ${nodeLabels[node].toLowerCase()}: `); }}>Explain it differently</Button>
              <Button variant="secondary" onClick={() => { setNode(null); toast("Thanks — Kai will re-check this idea."); }}>Challenge this</Button>
            </div>
          </>
        )}
      </Dialog>

      <Dialog open={modal === "try"} onClose={close} label="Watch Kai apply it" className="try-modal">
        <div className="try-head"><Kai size="md" mood="thinking" /><div><p className="eyebrow">WATCH KAI APPLY IT</p><h2>Kai tries: what does factorial(3) return?</h2></div></div>
        <div className="try-grid">
          <pre><code>{`def factorial(n):\n  if n == 1:\n    return 1\n  return n * factorial(n - 1)`}</code></pre>
          <ol className="trace">
            {["factorial(3) calls factorial(2)", "factorial(2) calls factorial(1)", "factorial(1) returns 1"].map((s, i) => (
              <li key={s} className="trace-step mint" style={{ animationDelay: `${i * 0.35}s` }}><Icon name="check" size={16} />{s}</li>
            ))}
            <li className={`trace-step ${done ? "mint" : "coral"}`} style={{ animationDelay: "1.05s" }}><Icon name={done ? "check" : "alert"} size={16} />{done ? "3 × 2 × 1 = 6" : "So the answer is 1?"}</li>
          </ol>
        </div>
        <div className="kai-question">{done ? "Got it — the results multiply on the way back up. factorial(3) is 6!" : "Hmm, I got 1… but my friend says factorial(3) is 6. Where did I go wrong?"}</div>
        <div className="button-row">
          {!done ? <Button onClick={() => { close(); setTab("chat"); respond(studentMessages[3], 4); }}>Help Kai fix it</Button> : <Button onClick={close}>Nice!</Button>}
        </div>
      </Dialog>

      <Dialog open={modal === "nudge"} onClose={close} label="A little help" variant="sheet">
        <p className="eyebrow">A LITTLE HELP</p>
        <h2>No worries — here are some nudges</h2>
        {nudges.map((n) => (
          <button type="button" className="nudge" onClick={() => { close(); insert(n.starter); }} key={n.label}>{n.label}<span>Use nudge <Icon name="arrowRight" size={14} /></span></button>
        ))}
        <div className="nudge-links">
          <button type="button" onClick={() => { close(); go("topic"); }}>Review this topic</button>
          <button type="button" onClick={() => setModal("pause")}>Take a break — pause session</button>
        </div>
      </Dialog>

      <Dialog open={modal === "pause" || modal === "end"} onClose={close} label={modal === "pause" ? "Session paused" : "End session"} className="small-modal">
        <Kai size="md" mood={modal === "pause" ? "sleepy" : "curious"} />
        <h2>{modal === "pause" ? "Take your time." : "Ready to wrap up?"}</h2>
        <p>{modal === "pause" ? "Kai will wait right here. There’s no rush." : `You covered ${covered} of 6 ideas. You can always come back later.`}</p>
        {modal === "end" && <ConceptMap step={step} compact />}
        <div className="button-row centered">
          {modal === "pause"
            ? <><Button onClick={close}>Resume</Button><Button variant="secondary" onClick={() => { toast("Session saved. Pick up any time from Home."); go("home"); }}>Save & exit</Button></>
            : <><Button onClick={() => go("after")}>See my reflection</Button><Button variant="secondary" onClick={close}>Keep teaching</Button></>}
        </div>
      </Dialog>
    </div>
  );
}
