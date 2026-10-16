import { useState } from "react";
import { Kai } from "../components/Kai";
import { BackLink } from "../components/Shell";
import { Button, PrivateBadge, Segment, SettingRow } from "../components/ui";
import { confidenceLabels } from "../lib/data";
import { go } from "../lib/router";
import { useStore } from "../lib/store";

export function Confidence({ after = false }: { after?: boolean }) {
  const { confidenceBefore, setConfidenceBefore, setConfidenceAfter } = useStore();
  const [value, setValue] = useState<number | null>(after ? null : confidenceBefore);
  const proceed = () => {
    if (after) { setConfidenceAfter(value); go("summary"); }
    else { setConfidenceBefore(value); go("meet"); }
  };
  return (
    <div className="confidence-page">
      <BackLink to={after ? "session" : "topic"}>Back</BackLink>
      <section className="confidence-card">
        <Kai size="md" mood={after ? "aha" : "curious"} />
        <p className="eyebrow">{after ? "ONE LAST THING" : "BEFORE WE START"}</p>
        <h1 tabIndex={-1} id="conf-q">{after ? "Now how confident are you about explaining Recursion?" : "How confident do you feel about explaining Recursion?"}</h1>
        <p>There’s no right answer — this just helps you reflect later.</p>
        {after && confidenceBefore && <div className="before-note">Before: <strong>{confidenceBefore} — {confidenceLabels[confidenceBefore - 1]} confident</strong></div>}
        <div className="confidence-scale" role="radiogroup" aria-labelledby="conf-q">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" role="radio" aria-checked={value === n} className={value === n ? "active" : ""} onClick={() => setValue(n)} key={n}>
              <strong>{n}</strong><small>{confidenceLabels[n - 1]}</small>
            </button>
          ))}
        </div>
        <div className="button-row centered">
          <Button onClick={proceed} disabled={value === null} iconRight="arrowRight">Continue</Button>
          <Button variant="ghost" onClick={() => go(after ? "summary" : "meet")}>Skip</Button>
        </div>
        {value === null && <p className="hint">Pick a number to continue, or skip.</p>}
      </section>
    </div>
  );
}

export function Meet() {
  const { profile, settings, setSetting } = useStore();
  return (
    <div className="meet-page">
      <BackLink to="confidence">Back</BackLink>
      <div className="meet-grid">
        <section className="kai-intro">
          <Kai size="lg" mood="curious" label="Kai, looking curious" />
          <div className="speech large">Hey {profile.name}! I’ve got a test on recursion soon and I honestly don’t get it. Can you explain it to me like I’ve never heard of it?</div>
          <PrivateBadge>Private session — only you can see this</PrivateBadge>
        </section>
        <section className="setup-card" aria-labelledby="setup-title">
          <p className="eyebrow">SESSION SETUP</p>
          <h1 tabIndex={-1} id="setup-title">How do you want to teach?</h1>
          <span className="field-label" id="mode-l">Input mode</span>
          <Segment label="Input mode" options={["Type", "Speak"] as const} value={settings.inputMode} onChange={(v) => setSetting("inputMode", v)} />
          <span className="field-label">Kai’s question pace</span>
          <Segment label="Kai’s question pace" options={["Relaxed", "Normal", "Curious"] as const} value={settings.pace} onChange={(v) => setSetting("pace", v)} />
          <p className="hint left">{{ Relaxed: "Kai waits longer and asks fewer follow-ups.", Normal: "One follow-up question after each explanation.", Curious: "Kai digs deeper with extra “why?” questions." }[settings.pace]}</p>
          <SettingRow label="Show Kai’s Understanding Map" note="See ideas update as you explain" checked={settings.showMap} onChange={(v) => setSetting("showMap", v)} />
          <Button iconRight="arrowRight" onClick={() => go("session")}>Start teaching</Button>
        </section>
      </div>
    </div>
  );
}
