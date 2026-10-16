import { useState } from "react";
import { Icon, type IconName } from "../components/Icon";
import { PageHeader, Shell } from "../components/Shell";
import { Button, Dialog, IconButton, MiniBar, Segment, SettingRow } from "../components/ui";
import { topics, type Status } from "../lib/data";
import { go } from "../lib/router";
import { useStore } from "../lib/store";

function Stat({ n, label, icon }: { n: string; label: string; icon: IconName }) {
  return <div className="stat"><span className="icon-tile"><Icon name={icon} /></span><strong>{n}</strong><span>{label}</span></div>;
}

export function Progress() {
  return (
    <Shell page="progress">
      <PageHeader eyebrow="YOUR LEARNING" title="My Progress" sub="Every gap you find is progress you can use." />
      <div className="stat-grid">
        <Stat n="7" label="sessions" icon="clock" />
        <Stat n="18" label="ideas Kai understands" icon="check" />
        <Stat n="4" label="misconceptions repaired" icon="sparkle" />
      </div>
      <section className="card list-card">
        <h2>Topic progress</h2>
        {topics.filter((t) => t.progress.length).map((t) => (
          <button type="button" className="progress-row" key={t.id} onClick={() => go("topic")}>
            <span className="topic-icon"><Icon name={t.icon} /></span>
            <span className="progress-name"><strong>{t.title}</strong><small>{t.progress.filter((c) => c === "mint").length} of {t.progress.length} ideas clear</small></span>
            <MiniBar colors={t.progress} />
            <span className="row-link">View topic <Icon name="arrowRight" size={14} /></span>
          </button>
        ))}
      </section>
      <section className="card gaps">
        <p className="eyebrow">GAPS YOU FOUND</p>
        <h2>Worth celebrating</h2>
        <p>You spotted that return values combine on the way back up, and that pointers store addresses rather than values.</p>
      </section>
    </Shell>
  );
}

interface HistoryItem { id: number; title: string; date: string; icon: IconName; note: string; colors: Status[] }

const initialHistory: HistoryItem[] = [
  { id: 1, title: "Recursion", date: "6 Oct 2026", icon: "repeat", note: "5 ideas clear · 1 to revisit", colors: ["mint", "mint", "mint", "mint", "mint", "amber"] },
  { id: 2, title: "Pointers & References", date: "4 Oct 2026", icon: "pointer", note: "3 ideas clear · 2 unsure", colors: ["mint", "mint", "mint", "amber", "amber", "grey"] },
  { id: 3, title: "Recursion", date: "29 Sep 2026", icon: "repeat", note: "4 ideas clear · 1 mixed up", colors: ["mint", "mint", "mint", "mint", "coral", "grey"] },
];

export function History() {
  const { toast } = useStore();
  const [items, setItems] = useState(initialHistory);
  const remove = (item: HistoryItem) => {
    const index = items.indexOf(item);
    setItems((xs) => xs.filter((x) => x.id !== item.id));
    toast(`Deleted ${item.title} — ${item.date}`, { label: "Undo", run: () => setItems((xs) => { const copy = [...xs]; copy.splice(index, 0, item); return copy; }) });
  };
  return (
    <Shell page="history">
      <PageHeader eyebrow="PRIVATE ARCHIVE" title="Session History" sub="Revisit the explanations that helped ideas click." />
      {items.length ? (
        <section className="card history-list">
          {items.map((x) => (
            <div className="history-row" key={x.id}>
              <span className="topic-icon"><Icon name={x.icon} /></span>
              <div><h3>{x.title}</h3><p>{x.date} · {x.note}</p></div>
              <MiniBar colors={x.colors} />
              <Button variant="secondary" onClick={() => go("summary")}>View summary</Button>
              <IconButton icon="trash" label={`Delete ${x.title} session from ${x.date}`} onClick={() => remove(x)} className="danger-hover" />
            </div>
          ))}
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

export function Privacy() {
  const { settings, setSetting, toast } = useStore();
  const [confirm, setConfirm] = useState(false);
  const download = () => {
    const blob = new Blob([JSON.stringify({ settings, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "teachback-data.json" });
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Your data download has started.");
  };
  return (
    <Shell page="privacy">
      <PageHeader eyebrow="YOU’RE IN CONTROL" title="Privacy & Data" sub="Your explanations belong to you." />
      <section className="card privacy-explainer">
        <Icon name="lock" size={30} />
        <div><h2>Never shared with lecturers</h2><p>Kai’s judgements are estimates. Your sessions, gaps, and reflections stay private and are never used for assessment.</p></div>
      </section>
      <section className="settings-card">
        <SettingRow label="Keep my sessions private" note="Recommended — only you can see them" checked={settings.privateSessions} onChange={(v) => setSetting("privateSessions", v)} />
        <SettingRow label="Store voice recordings" note={settings.storeVoice ? "On — recordings are kept with your sessions" : "Off — only transcripts are kept"} checked={settings.storeVoice} onChange={(v) => setSetting("storeVoice", v)} />
        <SettingRow label="Allow anonymous data to improve Kai" note="Your identity is never attached" checked={settings.anonData} onChange={(v) => setSetting("anonData", v)} />
      </section>
      <div className="page-actions start">
        <Button variant="secondary" icon="download" onClick={download}>Download my data</Button>
        <Button variant="ghost" icon="trash" onClick={() => setConfirm(true)}>Delete all sessions</Button>
      </div>
      <Dialog open={confirm} onClose={() => setConfirm(false)} label="Delete all sessions" className="small-modal">
        <span className="danger-icon"><Icon name="trash" size={26} /></span>
        <h2>Delete all sessions?</h2>
        <p>Every conversation, map and reflection will be permanently removed. This can’t be undone.</p>
        <div className="button-row centered">
          <Button variant="danger" onClick={() => { setConfirm(false); toast("All sessions deleted."); }}>Delete everything</Button>
          <Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
        </div>
      </Dialog>
    </Shell>
  );
}

export function SettingsPage() {
  const { settings, setSetting } = useStore();
  return (
    <Shell page="settings">
      <PageHeader eyebrow="MAKE IT COMFORTABLE" title="Settings & Accessibility" sub="Changes apply instantly and are saved on this device." />
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
        <SettingRow label="Kai uses simpler words" note="Helpful for non-native English speakers" checked={settings.simpleWords} onChange={(v) => setSetting("simpleWords", v)} />
        <div className="setting-row">
          <span><strong>Question pace</strong><small>How often Kai follows up</small></span>
          <Segment small label="Question pace" options={["Relaxed", "Normal", "Curious"] as const} value={settings.pace} onChange={(v) => setSetting("pace", v)} />
        </div>
      </section>
      <section className="settings-card">
        <h2>Account</h2>
        <div className="setting-row">
          <span><strong>Profile</strong><small>Name, course and how you like to explain</small></span>
          <Button variant="secondary" icon="user" onClick={() => go("profile")}>Edit profile</Button>
        </div>
        <div className="setting-row">
          <span><strong>Privacy & data</strong><small>Downloads, deletion and data sharing</small></span>
          <Button variant="secondary" icon="lock" onClick={() => go("privacy")}>Open</Button>
        </div>
      </section>
    </Shell>
  );
}
