import { useState } from "react";
import { ConceptMap, Legend } from "../components/ConceptMap";
import { Icon } from "../components/Icon";
import { Kai } from "../components/Kai";
import { BackLink, Redirect, Shell } from "../components/Shell";
import { Button, Dialog, PrivateBadge } from "../components/ui";
import { confidenceLabels, statusLabel, todayLabel } from "../lib/data";
import { snapshot, summarise } from "../lib/engine";
import { go } from "../lib/router";
import { useStore } from "../lib/store";
import { getTopic } from "../lib/topics";
import { MessageText } from "./Session";

export function Summary({ id }: { id?: string }) {
  const { profile, sessions, updateSession, deleteSession, toast } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const session = sessions.find((s) => s.id === id);
  const topic = getTopic(session?.topicId);
  if (!session || !topic) return <Redirect to="history" />;
  if (session.status !== "completed") return <Redirect to="session" id={session.id} />;

  const sum = summarise(topic, session);
  const before = session.confidenceBefore;
  const after = session.confidenceAfter;
  const toggleStep = (step: string) => updateSession(session.id, (s) => ({
    ...s, nextChecked: s.nextChecked.includes(step) ? s.nextChecked.filter((x) => x !== step) : [...s.nextChecked, step],
  }));
  const reopen = () => {
    updateSession(session.id, (s) => ({ ...s, status: "active", completedAt: undefined }));
    toast("Session reopened. Tap any idea on Kai’s map to challenge it.");
    go("session", session.id);
  };

  return (
    <Shell page="history">
      <header className="summary-head">
        <Kai size="md" mood="aha" />
        <div>
          <p className="eyebrow">SESSION REFLECTION · {todayLabel(true, new Date(session.completedAt ?? session.updatedAt))}</p>
          <h1 tabIndex={-1}>Nice teaching, {profile.name}!</h1>
          <p>{sum.understood === sum.total ? `Kai now understands every idea in ${topic.title.toLowerCase()}.` : `You helped Kai build a clearer picture of ${topic.title.toLowerCase()}.`}</p>
        </div>
        <PrivateBadge />
      </header>

      <div className="stat-strip" aria-label="Session at a glance">
        <span><strong>{sum.understood}/{sum.total}</strong> ideas Kai gets</span>
        <span><strong>{sum.repaired.length}</strong> misconception{sum.repaired.length === 1 ? "" : "s"} repaired</span>
        <span><strong>{sum.revisit.length}</strong> to revisit</span>
      </div>

      <section className="card final-map">
        <div><h2>Kai’s final understanding</h2><p>Here’s the picture you built together.</p><Legend /></div>
        <ConceptMap topic={topic} statuses={snapshot(session.nodes)} />
      </section>

      <div className="summary-grid">
        <section className="summary-card mint-card">
          <p className="eyebrow">EXPLAINED CLEARLY</p>
          <h2>{sum.clear.length ? `${sum.clear.length} idea${sum.clear.length === 1 ? "" : "s"} clicked` : "Nothing clicked first time"}</h2>
          {sum.clear.length ? <ul>{sum.clear.map((n) => <li className="summary-item" key={n.id}><Icon name="check" />{n.label}</li>)}</ul> : <p>That’s okay. Every idea you repair counts too.</p>}
        </section>
        <section className="summary-card teal-card">
          <p className="eyebrow">{sum.repaired.length === 1 ? "A MISCONCEPTION YOU REPAIRED" : "MISCONCEPTIONS YOU REPAIRED"}</p>
          {sum.repaired.length ? sum.repaired.map((n) => (
            <div key={n.id}><h2>{n.label}</h2><p>Kai picked up a wrong idea along the way, and you fixed it. Now Kai knows {n.gotIt}.</p></div>
          )) : <><h2>None this time</h2><p>Kai didn’t pick up any wrong ideas that needed repairing.</p></>}
        </section>
        <section className="summary-card amber-card">
          <p className="eyebrow">WORTH REVISITING</p>
          {sum.revisit.length ? (
            <>
              <h2>{sum.revisit.map((n) => n.label).join(", ")}</h2>
              {sum.revisit.map((n) => (
                <p key={n.id}><strong>{n.label}:</strong> {statusLabel[session.nodes[n.id]?.status ?? "grey"].toLowerCase()}{session.nodes[n.id]?.status === "coral" ? `. Kai still thinks ${session.nodes[n.id]?.belief}` : ""}.</p>
              ))}
              <button type="button" className="text-link" onClick={() => go("confidence", topic.id)}>Teach this next <Icon name="arrowRight" size={16} /></button>
            </>
          ) : <><h2>Nothing to revisit</h2><p>Every idea landed. Try another topic to keep going.</p></>}
        </section>
        <section className="summary-card confidence-summary">
          <p className="eyebrow">CONFIDENCE VS EXPLANATION</p>
          <h2>{before != null && after != null && after < before ? "You calibrated your confidence" : sum.revisit.length + sum.repaired.length ? `You found ${sum.revisit.length + sum.repaired.length} gap${sum.revisit.length + sum.repaired.length === 1 ? "" : "s"}` : "Confident and clear"}</h2>
          <div className="bar-line"><span>Before</span><i><b style={{ width: `${(before ?? 0) * 20}%` }} /></i><em>{before != null ? `${before}/5 · ${confidenceLabels[before - 1]}` : "Skipped"}</em></div>
          <div className="bar-line"><span>After</span><i><b className="after" style={{ width: `${(after ?? 0) * 20}%` }} /></i><em>{after != null ? `${after}/5 · ${confidenceLabels[after - 1]}` : "Skipped"}</em></div>
          <div className="bar-line"><span>Kai</span><i><b className="kai-bar" style={{ width: `${(sum.understood / sum.total) * 100}%` }} /></i><em>{sum.understood}/{sum.total} ideas understood</em></div>
          <p>{sum.insight}</p>
        </section>
      </div>

      <section className="next-steps card">
        <div><p className="eyebrow">KEEP THE MOMENTUM</p><h2>Good next steps</h2></div>
        {sum.nextSteps.map((x) => <label key={x}><input type="checkbox" checked={session.nextChecked.includes(x)} onChange={() => toggleStep(x)} />{x}</label>)}
      </section>

      <p className="disclaimer">This summary is an estimate based on your conversation. Disagree with something? <button type="button" className="text-link inline" onClick={reopen}>Reopen the session</button> and challenge any idea on Kai’s map.</p>
      <div className="page-actions">
        <Button icon="chart" onClick={() => go("progress")}>See my progress</Button>
        <Button variant="secondary" icon="repeat" onClick={() => go("confidence", topic.id)}>Teach again</Button>
        {!session.transcriptRemoved && <Button variant="secondary" icon="play" onClick={() => go("replay", session.id)}>Replay conversation</Button>}
        <Button variant="ghost" icon="trash" onClick={() => setConfirmDelete(true)}>Delete this session</Button>
      </div>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} label="Delete session" className="small-modal">
        <span className="danger-icon"><Icon name="trash" size={26} /></span>
        <h2>Delete this session?</h2>
        <p>The conversation, map and reflection will be permanently removed from this device. This can’t be undone.</p>
        <div className="button-row centered">
          <Button variant="danger" onClick={() => { deleteSession(session.id); toast("Session deleted."); go("home"); }}>Delete session</Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Keep it</Button>
        </div>
      </Dialog>
    </Shell>
  );
}

/** Read-only replay: step through the conversation and watch Kai's map change. */
export function Replay({ id }: { id?: string }) {
  const { sessions } = useStore();
  const session = sessions.find((s) => s.id === id);
  const topic = getTopic(session?.topicId);
  const kaiIdx = session ? session.messages.map((m, i) => (m.from === "kai" ? i : -1)).filter((i) => i >= 0) : [];
  const [step, setStep] = useState(kaiIdx.length - 1);
  if (!session || !topic) return <Redirect to="history" />;

  const upto = kaiIdx[Math.max(0, step)] ?? 0;
  const statuses = session.messages[upto]?.snapshot ?? {};
  const changed = session.messages[upto]?.changed ?? [];

  return (
    <Shell page="history">
      <BackLink to="history">Session history</BackLink>
      <header className="page-header">
        <div>
          <p className="eyebrow">REPLAY · {todayLabel(true, new Date(session.createdAt))}</p>
          <h1 tabIndex={-1}>{topic.title}</h1>
          <p>Step through your explanation and watch Kai’s map change.</p>
        </div>
      </header>
      {session.transcriptRemoved ? (
        <div className="empty"><Icon name="lock" size={28} /><h2>Transcript not kept</h2><p>You chose not to keep conversation transcripts, so only the map and reflection were saved.</p></div>
      ) : (
        <div className="replay-grid">
          <section className="card replay-chat" aria-label="Conversation so far">
            {session.messages.slice(0, upto + 1).map((m, i) => m.from === "student"
              ? <div className="message student" key={i}><MessageText text={m.text} /></div>
              : (
                <button type="button" className={`kai-message replay-kai ${i === upto ? "current" : ""}`} key={i} onClick={() => setStep(kaiIdx.indexOf(i))}>
                  <Kai size="sm" mood={m.mood ?? "curious"} />
                  <div className="message kai-bubble">{m.text}</div>
                </button>
              ))}
          </section>
          <aside className="card replay-map">
            <ConceptMap topic={topic} statuses={statuses} fresh={changed} />
            <Legend />
            <label htmlFor="replay-step" className="field-label">Kai’s reply {Math.max(0, step) + 1} of {kaiIdx.length}</label>
            <input id="replay-step" type="range" min={0} max={Math.max(0, kaiIdx.length - 1)} value={Math.max(0, step)} onChange={(e) => setStep(Number(e.target.value))} />
            <div className="button-row">
              <Button variant="secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step <= 0}>Previous</Button>
              <Button onClick={() => setStep(Math.min(kaiIdx.length - 1, step + 1))} disabled={step >= kaiIdx.length - 1}>Next</Button>
            </div>
          </aside>
        </div>
      )}
    </Shell>
  );
}
