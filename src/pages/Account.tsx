import { useState, type FormEvent } from "react";
import { Icon, type IconName } from "../components/Icon";
import { PageHeader, Shell } from "../components/Shell";
import { Button, Dialog, IconButton, MiniBar, Segment, SettingRow } from "../components/ui";
import { relativeTime, shortDate, statusesOf, topicView } from "../lib/data";
import { summarise, type Session } from "../lib/engine";
import { go } from "../lib/router";
import { useStore } from "../lib/store";
import { getTopic, topicDefs } from "../lib/topics";
import { storageUsed, verifyPin } from "../lib/vault";

function Stat({ n, label, icon }: { n: string | number; label: string; icon: IconName }) {
  return <div className="stat"><span className="icon-tile"><Icon name={icon} /></span><strong>{n}</strong><span>{label}</span></div>;
}

export function Progress() {
  const { sessions } = useStore();
  const views = topicDefs.map((t) => topicView(t, sessions));
  const understood = views.reduce((n, v) => n + v.clear, 0);
  const completed = sessions.filter((s) => s.status === "completed");
  const repaired = completed.flatMap((s) => {
    const t = getTopic(s.topicId);
    return t ? summarise(t, s).repaired.map((n) => ({ topic: t.title, label: n.label, gotIt: n.gotIt, at: s.completedAt ?? s.updatedAt, key: `${s.id}-${n.id}` })) : [];
  }).sort((a, b) => b.at - a.at);

  return (
    <Shell page="progress">
      <PageHeader eyebrow="YOUR LEARNING" title="My Progress" sub="Every gap you find is progress you can use." />
      <div className="stat-grid">
        <Stat n={sessions.length} label={sessions.length === 1 ? "session" : "sessions"} icon="clock" />
        <Stat n={understood} label="ideas Kai understands" icon="check" />
        <Stat n={repaired.length} label={repaired.length === 1 ? "misconception repaired" : "misconceptions repaired"} icon="sparkle" />
      </div>
      <section className="card list-card">
        <h2>Topic progress</h2>
        {views.map((v) => (
          <button type="button" className="progress-row" key={v.topic.id} onClick={() => go("topic", v.topic.id)}>
            <span className="topic-icon"><Icon name={v.topic.icon} /></span>
            <span className="progress-name"><strong>{v.topic.title}</strong><small>{v.latest ? `${v.clear} of ${v.topic.nodes.length} ideas clear · ${v.state}` : "Not started yet"}</small></span>
            <MiniBar colors={v.progress} />
            <span className="row-link">View topic <Icon name="arrowRight" size={14} /></span>
          </button>
        ))}
      </section>
      <section className="card gaps">
        <p className="eyebrow">GAPS YOU FOUND</p>
        <h2>Worth celebrating</h2>
        {repaired.length ? (
          <ul className="gap-list">
            {repaired.slice(0, 8).map((r) => <li key={r.key}><Icon name="sparkle" size={16} /><span><strong>{r.topic} · {r.label}</strong><small>You taught Kai that {r.gotIt}. {relativeTime(r.at)}</small></span></li>)}
          </ul>
        ) : <p>When Kai picks up a wrong idea from your explanation and you repair it, it shows up here. Those are the gaps you’d otherwise find in an exam.</p>}
      </section>
    </Shell>
  );
}

export function History() {
  const { sessions, deleteSession, restoreSession, toast } = useStore();
  const items = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const remove = (s: Session) => {
    deleteSession(s.id);
    const t = getTopic(s.topicId);
    toast(`Deleted ${t?.title ?? "session"} (${shortDate(s.createdAt)})`, { label: "Undo", run: () => restoreSession(s) });
  };
  return (
    <Shell page="history">
      <PageHeader eyebrow="PRIVATE ARCHIVE" title="Session History" sub="Revisit the explanations that helped ideas click." />
      {items.length ? (
        <section className="card history-list">
          {items.map((s) => {
            const t = getTopic(s.topicId);
            if (!t) return null;
            const statuses = statusesOf(t, s);
            const clear = statuses.filter((x) => x === "mint").length;
            const done = s.status === "completed";
            return (
              <div className="history-row" key={s.id}>
                <span className="topic-icon"><Icon name={t.icon} /></span>
                <div>
                  <h3>{t.title} <span className={`pill ${done ? "pill-explained" : "pill-in-progress"}`}>{done ? "Completed" : "Paused"}</span></h3>
                  <p>{shortDate(s.createdAt)} · {clear} of {t.nodes.length} ideas clear{done ? "" : ` · last taught ${relativeTime(s.updatedAt)}`}</p>
                </div>
                <MiniBar colors={statuses} />
                <div className="history-actions">
                  {done ? <Button variant="secondary" onClick={() => go("summary", s.id)}>View summary</Button> : <Button variant="secondary" icon="play" onClick={() => go("session", s.id)}>Resume</Button>}
                  {done && !s.transcriptRemoved && <IconButton icon="play" label={`Replay ${t.title} conversation`} onClick={() => go("replay", s.id)} />}
                </div>
                <IconButton icon="trash" label={`Delete ${t.title} session from ${shortDate(s.createdAt)}`} onClick={() => remove(s)} className="danger-hover" />
              </div>
            );
          })}
        </section>
      ) : (
        <div className="empty">
          <Icon name="clock" size={28} />
          <h2>No sessions yet</h2>
          <p>Your private teaching sessions will appear here.</p>
          <Button onClick={() => go("topics")} icon="plus">Teach Kai</Button>
        </div>
      )}
    </Shell>
  );
}

/** Asks for the PIN before a sensitive action (export, account deletion…). */
function PinDialog({ open, title, text, confirm, danger = false, onClose, onSubmit }: {
  open: boolean; title: string; text: string; confirm: string; danger?: boolean;
  onClose: () => void; onSubmit: (pin: string) => Promise<string | null>;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await onSubmit(pin);
    setBusy(false);
    if (err) { setError(err); setPin(""); return; }
    setPin(""); setError(""); onClose();
  };
  return (
    <Dialog open={open} onClose={() => { setPin(""); setError(""); onClose(); }} label={title} className="small-modal">
      <span className={danger ? "danger-icon" : "info-icon"}><Icon name="lock" size={26} /></span>
      <h2>{title}</h2>
      <p>{text}</p>
      <form className="pin-form" onSubmit={submit} noValidate>
        <label htmlFor="confirm-pin">Your PIN</label>
        <input id="confirm-pin" type="password" inputMode="numeric" autoComplete="current-password" maxLength={8} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }} aria-invalid={!!error} aria-describedby="confirm-pin-err" />
        <p id="confirm-pin-err" className="field-error" role="alert">{error}</p>
        <div className="button-row centered">
          <Button type="submit" variant={danger ? "danger" : "primary"} disabled={busy || pin.length < 4}>{busy ? "Checking…" : confirm}</Button>
          <Button variant="secondary" onClick={() => { setPin(""); setError(""); onClose(); }}>Cancel</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function Privacy() {
  const { user, settings, setSetting, staySignedIn, setStaySignedIn, sessions, deleteAllSessions, exportBackup, removeAccount, toast } = useStore();
  const [dialog, setDialog] = useState<"export" | "wipe" | "account" | null>(null);
  const kb = user ? Math.max(1, Math.round(storageUsed(user.id) / 1024)) : 0;
  return (
    <Shell page="privacy">
      <PageHeader eyebrow="YOU’RE IN CONTROL" title="Privacy & Data" sub="Your explanations belong to you." />
      <section className="card privacy-explainer">
        <Icon name="lock" size={30} />
        <div>
          <h2>No database. No server. Never shared.</h2>
          <p>Everything you teach Kai, including your gaps and reflections, is stored only in this browser on this device ({sessions.length} session{sessions.length === 1 ? "" : "s"}, about {kb} KB). Kai runs on your device too, so your explanations are never sent anywhere. Kai’s judgements are estimates and are never used for assessment.</p>
        </div>
      </section>
      <section className="settings-card">
        <SettingRow label="Keep conversation transcripts" note={settings.keepTranscripts ? "On: you can replay finished sessions" : "Off: when a session ends, only the map and reflection are kept"} checked={settings.keepTranscripts} onChange={(v) => setSetting("keepTranscripts", v)} />
        <SettingRow label="Keep me signed in on this device" note={staySignedIn ? "On: no PIN needed when you come back" : "Off: you’ll need your PIN after closing the browser"} checked={staySignedIn} onChange={setStaySignedIn} />
      </section>
      <section className="settings-card">
        <h2>Move to another device</h2>
        <p className="setting-intro">Download a backup file protected with your PIN. On another device, choose <strong>“Restore from backup file”</strong> on the sign-in screen and enter your PIN to pick up where you left off.</p>
        <div className="page-actions start">
          <Button variant="secondary" icon="download" onClick={() => setDialog("export")}>Download my data (backup)</Button>
        </div>
      </section>
      <div className="page-actions start">
        <Button variant="ghost" icon="trash" onClick={() => setDialog("wipe")} disabled={!sessions.length}>Delete all sessions</Button>
        <Button variant="ghost" icon="trash" onClick={() => setDialog("account")}>Delete my profile from this device</Button>
      </div>

      <PinDialog open={dialog === "export"} title="Download your backup" confirm="Download" onClose={() => setDialog(null)}
        text="Your backup is encrypted with your PIN, so only someone who knows it can open it."
        onSubmit={async (pin) => { const r = await exportBackup(pin); if (!r.ok) return r.error; toast("Backup downloaded. Keep it somewhere safe."); return null; }} />

      <Dialog open={dialog === "wipe"} onClose={() => setDialog(null)} label="Delete all sessions" className="small-modal">
        <span className="danger-icon"><Icon name="trash" size={26} /></span>
        <h2>Delete all sessions?</h2>
        <p>Every conversation, map and reflection will be permanently removed from this device. This can’t be undone.</p>
        <div className="button-row centered">
          <Button variant="danger" onClick={() => { deleteAllSessions(); setDialog(null); toast("All sessions deleted."); }}>Delete everything</Button>
          <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
        </div>
      </Dialog>

      <PinDialog open={dialog === "account"} danger title="Delete your profile?" confirm="Delete profile" onClose={() => setDialog(null)}
        text="Your profile, settings and all sessions will be removed from this device. Backup files you downloaded will still work."
        onSubmit={async (pin) => {
          if (!user || !(await verifyPin(user, pin))) return "That PIN doesn’t match.";
          removeAccount(user.id);
          toast("Profile deleted from this device.");
          go("splash");
          return null;
        }} />
    </Shell>
  );
}

export function SettingsPage() {
  const { settings, setSetting, signOut, changePin, toast } = useStore();
  const [pinOpen, setPinOpen] = useState(false);
  const [pins, setPins] = useState({ old: "", next: "", again: "" });
  const [pinError, setPinError] = useState("");

  const savePin = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(pins.next)) return setPinError("Your new PIN must be 4 to 8 digits.");
    if (pins.next !== pins.again) return setPinError("The new PINs don’t match.");
    const r = await changePin(pins.old, pins.next);
    if (!r.ok) return setPinError(r.error);
    setPinOpen(false); setPins({ old: "", next: "", again: "" }); setPinError("");
    toast("PIN changed. Download a fresh backup so it uses your new PIN.");
  };

  const pinInput = (key: keyof typeof pins, label: string) => (
    <>
      <label htmlFor={`pin-${key}`}>{label}</label>
      <input id={`pin-${key}`} type="password" inputMode="numeric" maxLength={8} autoComplete={key === "old" ? "current-password" : "new-password"} value={pins[key]} onChange={(e) => { setPins({ ...pins, [key]: e.target.value.replace(/\D/g, "") }); setPinError(""); }} />
    </>
  );

  return (
    <Shell page="settings">
      <PageHeader eyebrow="MAKE IT COMFORTABLE" title="Settings & Accessibility" sub="Changes apply instantly and are saved to your profile on this device." />
      <section className="settings-card">
        <h2>Reading & display</h2>
        <div className="setting-row">
          <span><strong>Text size</strong><small>Choose a comfortable reading size</small></span>
          <Segment small label="Text size" options={["S", "M", "L", "XL"] as const} value={settings.textSize} onChange={(v) => setSetting("textSize", v)} />
        </div>
        <SettingRow label="Readable font" note="Use Atkinson Hyperlegible" checked={settings.readableFont} onChange={(v) => setSetting("readableFont", v)} />
        <SettingRow label="High contrast" note="Increase separation between colours" checked={settings.highContrast} onChange={(v) => setSetting("highContrast", v)} />
        <SettingRow label="Reduce motion" note="Remove pulses and transitions" checked={settings.reduceMotion} onChange={(v) => setSetting("reduceMotion", v)} />
        <SettingRow label="Dark mode" note="Use a darker, lower-glare palette" checked={settings.darkMode} onChange={(v) => setSetting("darkMode", v)} />
      </section>
      <section className="settings-card">
        <h2>Explaining with Kai</h2>
        <SettingRow label="Kai uses simpler words" note="Shorter, plainer replies. Helpful if English isn’t your first language" checked={settings.simpleWords} onChange={(v) => setSetting("simpleWords", v)} />
        <div className="setting-row">
          <span><strong>Default input</strong><small>Type or speak your explanations</small></span>
          <Segment small label="Default input" options={["Type", "Speak"] as const} value={settings.inputMode} onChange={(v) => setSetting("inputMode", v)} />
        </div>
        <div className="setting-row">
          <span><strong>Question pace</strong><small>How often Kai follows up</small></span>
          <Segment small label="Question pace" options={["Relaxed", "Normal", "Curious"] as const} value={settings.pace} onChange={(v) => setSetting("pace", v)} />
        </div>
        <SettingRow label="Show sample answers" note="Adds a “Use sample answer” chip. Handy for demos and pitches" checked={settings.demoHelpers} onChange={(v) => setSetting("demoHelpers", v)} />
      </section>
      <section className="settings-card">
        <h2>Account</h2>
        <div className="setting-row">
          <span><strong>Profile</strong><small>Name, course and how you like to explain</small></span>
          <Button variant="secondary" icon="user" onClick={() => go("profile")}>Edit profile</Button>
        </div>
        <div className="setting-row">
          <span><strong>PIN</strong><small>Used to sign in and to protect backups</small></span>
          <Button variant="secondary" icon="lock" onClick={() => setPinOpen(true)}>Change PIN</Button>
        </div>
        <div className="setting-row">
          <span><strong>Privacy & data</strong><small>Backups, deletion and transcripts</small></span>
          <Button variant="secondary" icon="lock" onClick={() => go("privacy")}>Open</Button>
        </div>
        <div className="setting-row">
          <span><strong>Sign out</strong><small>Your data stays on this device</small></span>
          <Button variant="ghost" icon="arrow" onClick={() => { signOut(); go("signin"); }}>Sign out</Button>
        </div>
      </section>

      <Dialog open={pinOpen} onClose={() => { setPinOpen(false); setPinError(""); }} label="Change PIN" className="small-modal">
        <span className="info-icon"><Icon name="lock" size={26} /></span>
        <h2>Change your PIN</h2>
        <form className="pin-form" onSubmit={savePin} noValidate>
          {pinInput("old", "Current PIN")}
          {pinInput("next", "New PIN (4 to 8 digits)")}
          {pinInput("again", "Repeat new PIN")}
          <p className="field-error" role="alert">{pinError}</p>
          <div className="button-row centered">
            <Button type="submit">Save PIN</Button>
            <Button variant="secondary" onClick={() => setPinOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Dialog>
    </Shell>
  );
}
