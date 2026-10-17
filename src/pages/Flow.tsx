import { useState } from "react";
import { Icon } from "../components/Icon";
import { Kai } from "../components/Kai";
import { BackLink, Redirect } from "../components/Shell";
import { Button, PrivateBadge, Segment, SettingRow } from "../components/ui";
import { confidenceLabels } from "../lib/data";
import { go } from "../lib/router";
import { useStore } from "../lib/store";
import { getTopic } from "../lib/topics";

/** Before: `id` is a topic id. After: `id` is a session id. */
export function Confidence({ after = false, id }: { after?: boolean; id?: string }) {
  const { sessions, pendingConfidence, setPendingConfidence, updateSession, settings } = useStore();
  const session = after ? sessions.find((s) => s.id === id) : undefined;
  const topic = getTopic(after ? session?.topicId : id);
  const before = after ? session?.confidenceBefore ?? null : null;
  const [value, setValue] = useState<number | null>(after ? session?.confidenceAfter ?? null : pendingConfidence);

  if (!topic || (after && !session)) return <Redirect to="home" />;

  const proceed = (v: number | null) => {
    if (!after) { setPendingConfidence(v); go("meet", topic.id); return; }
    updateSession(session!.id, (s) => ({
      ...s,
      confidenceAfter: v,
      status: "completed",
      completedAt: s.completedAt ?? Date.now(),
      ...(settings.keepTranscripts ? {} : { messages: s.messages.map((m) => ({ ...m, text: "" })), transcriptRemoved: true }),
    }));
    go("summary", session!.id);
  };

  return (
    <div className="confidence-page">
      {after ? <BackLink to="session" id={session!.id}>Back to session</BackLink> : <BackLink to="topic" id={topic.id}>Back</BackLink>}
      <section className="confidence-card">
        <Kai size="md" mood={after ? "aha" : "curious"} />
        <p className="eyebrow">{after ? "ONE LAST THING" : "BEFORE WE START"}</p>
        <h1 tabIndex={-1} id="conf-q">{after ? `Now how confident are you about explaining ${topic.title}?` : `How confident do you feel about explaining ${topic.title}?`}</h1>
        <p>There’s no right answer. This just helps you reflect later.</p>
        {after && before != null && <div className="before-note">Before: <strong>{before} · {confidenceLabels[before - 1]} confident</strong></div>}
        <div className="confidence-scale" role="radiogroup" aria-labelledby="conf-q">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" role="radio" aria-checked={value === n} className={value === n ? "active" : ""} onClick={() => setValue(n)} key={n}>
              <strong>{n}</strong><small>{confidenceLabels[n - 1]}</small>
            </button>
          ))}
        </div>
        <div className="button-row centered">
          <Button onClick={() => proceed(value)} disabled={value === null} iconRight="arrowRight">{after ? "See my reflection" : "Continue"}</Button>
          <Button variant="ghost" onClick={() => proceed(null)}>Skip</Button>
        </div>
        {value === null && <p className="hint">Pick a number to continue, or skip.</p>}
      </section>
    </div>
  );
}

export function Meet({ id }: { id?: string }) {
  const { profile, settings, setSetting, startSession, pendingConfidence, setPendingConfidence } = useStore();
  const topic = getTopic(id);
  if (!topic) return <Redirect to="topics" />;
  const start = () => {
    const sessionId = startSession(topic.id, pendingConfidence);
    setPendingConfidence(null);
    go("session", sessionId);
  };
  return (
    <div className="meet-page">
      <BackLink to="confidence" id={topic.id}>Back</BackLink>
      <div className="meet-grid">
        <section className="kai-intro">
          <Kai size="lg" mood="curious" label="Kai, looking curious" />
          <div className="speech large">Hey {profile.name}! I’ve got a test on {topic.title.toLowerCase()} soon and I honestly don’t get it. Can you explain it to me like I’ve never heard of it?</div>
          <PrivateBadge>Private session · stored only on this device</PrivateBadge>
        </section>
        <section className="setup-card" aria-labelledby="setup-title">
          <p className="eyebrow">SESSION SETUP</p>
          <h1 tabIndex={-1} id="setup-title">How do you want to teach?</h1>
          <span className="field-label">Input mode</span>
          <Segment label="Input mode" options={["Type", "Speak"] as const} value={settings.inputMode} onChange={(v) => setSetting("inputMode", v)} />
          <span className="field-label">Kai’s question pace</span>
          <Segment label="Kai’s question pace" options={["Relaxed", "Normal", "Curious"] as const} value={settings.pace} onChange={(v) => setSetting("pace", v)} />
          <p className="hint left">{{ Relaxed: "Kai takes its time and never rushes you.", Normal: "One follow-up question after each explanation.", Curious: "Kai digs deeper with extra “why?” questions." }[settings.pace]}</p>
          <SettingRow label="Show Kai’s Understanding Map" note="See ideas update as you explain" checked={settings.showMap} onChange={(v) => setSetting("showMap", v)} />
          <p className="hint left"><Icon name="bulb" size={14} /> Kai only learns from your words. If you explain something vaguely, Kai might pick up the wrong idea, and you’ll see it on the map.</p>
          <Button iconRight="arrowRight" onClick={start}>Start teaching</Button>
        </section>
      </div>
    </div>
  );
}
