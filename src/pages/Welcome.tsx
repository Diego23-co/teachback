import { useRef, useState, type FormEvent } from "react";
import { Icon } from "../components/Icon";
import { Kai } from "../components/Kai";
import { BackLink } from "../components/Shell";
import { Button, Dialog, Segment } from "../components/ui";
import { go } from "../lib/router";
import { initials, useStore, type InputPref } from "../lib/store";
import { parseBackup, type BackupFile } from "../lib/vault";

export function Splash() {
  const { accounts } = useStore();
  return (
    <div className="splash">
      <div className="orb orb-one" /><div className="orb orb-two" />
      <div className="splash-kai"><Kai size="lg" mood="aha" label="Kai, your study buddy, smiling" /></div>
      <h1 tabIndex={-1}>TeachBack</h1>
      <p>The best way to learn something is to teach it.</p>
      <Button variant="secondary" iconRight="arrowRight" onClick={() => go("onboarding")}>Get started</Button>
      <button type="button" className="light-link" onClick={() => go("signin")}>
        {accounts.length ? "I already have an account" : "Restore from a backup file"}
      </button>
    </div>
  );
}

function MiniMap() {
  return (
    <div className="mini-map-art" aria-hidden="true">
      <span className="mint"><Icon name="check" size={12} />Self-call</span>
      <span className="amber"><Icon name="help" size={12} />Base case</span>
      <span className="coral"><Icon name="alert" size={12} />Return values</span>
      <span className="grey">Call stack</span>
    </div>
  );
}

const cards = [
  { title: "Meet Kai, your study buddy.", text: "Kai is a fellow student who wants to learn from you. Kai only knows what you teach.", art: <Kai size="lg" /> },
  { title: "See what Kai understands.", text: "As you explain, Kai’s understanding map fills in. Gaps show up right away.", art: <MiniMap /> },
  { title: "No grades. Just you and Kai.", text: "Everything stays in this browser on your device. There’s no time limit, and you can delete anything any time.", art: <div className="lock-art"><Icon name="lock" size={48} /></div> },
];

export function Onboarding() {
  const [slide, setSlide] = useState(0);
  const last = slide === cards.length - 1;
  const next = () => (last ? go("profile") : setSlide(slide + 1));
  return (
    <div className="center-page" onKeyDown={(e) => {
      if (e.key === "ArrowRight" && !last) setSlide(slide + 1);
      if (e.key === "ArrowLeft" && slide > 0) setSlide(slide - 1);
    }}>
      <button type="button" className="skip" onClick={() => go("profile")}>Skip intro</button>
      <section className="onboard-card" aria-roledescription="carousel" aria-label="How TeachBack works">
        <div className="onboard-art" key={slide}>{cards[slide].art}</div>
        <p className="eyebrow">HOW IT WORKS · {slide + 1} OF {cards.length}</p>
        <h1 tabIndex={-1} aria-live="polite">{cards[slide].title}</h1>
        <p>{cards[slide].text}</p>
        <div className="dots" role="tablist" aria-label="Choose slide">
          {cards.map((c, i) => (
            <button type="button" key={i} role="tab" aria-selected={i === slide} aria-label={`Slide ${i + 1}: ${c.title}`} className={i === slide ? "dot active" : "dot"} onClick={() => setSlide(i)} />
          ))}
        </div>
        <div className="button-row">
          {slide > 0 && <Button variant="ghost" onClick={() => setSlide(slide - 1)}>Back</Button>}
          <Button iconRight={last ? undefined : "arrowRight"} onClick={next}>{last ? "Let’s go" : "Next"}</Button>
        </div>
      </section>
    </div>
  );
}

const courses = ["COMS1018 – Intro to Algorithms", "COMS1000 – Intro to Programming", "COMS2002 – Data Structures", "Other / self-study"];
const validPin = (p: string) => /^\d{4,8}$/.test(p);

/** Create a profile (signed out) or edit it (signed in). */
export function ProfileSetup() {
  const { user, profile, setProfile, setSetting, signUp, toast } = useStore();
  const editing = !!user;
  const [name, setName] = useState(profile.name);
  const [course, setCourse] = useState(profile.course);
  const [pref, setPref] = useState<InputPref>(profile.inputPref);
  const [esl, setEsl] = useState(profile.esl);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [stay, setStay] = useState(true);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const errors = {
    name: name.trim() ? "" : "Please tell Kai what to call you.",
    pin: editing || validPin(pin) ? "" : "Choose a PIN of 4 to 8 digits.",
    pin2: editing || pin === pin2 ? "" : "The PINs don’t match.",
  };
  const firstError = (Object.keys(errors) as (keyof typeof errors)[]).find((k) => errors[k]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (firstError) return document.getElementById(firstError)?.focus();
    const next = { name: name.trim(), course, inputPref: pref, esl };
    if (editing) {
      setProfile(next);
      if (esl !== profile.esl) setSetting("simpleWords", esl);
      toast("Profile saved.");
      go("home");
      return;
    }
    setBusy(true);
    await signUp(next, pin, stay);
    toast(`Welcome, ${next.name}!`);
    go("home");
  };

  const err = (k: keyof typeof errors) => (touched ? errors[k] : "");

  return (
    <div className="profile-page">
      <form className="profile-form" onSubmit={submit} noValidate>
        {editing && <BackLink to="settings">Back to settings</BackLink>}
        <p className="eyebrow">{editing ? "YOUR PROFILE" : "ONE QUICK STEP"}</p>
        <h1 tabIndex={-1}>{editing ? "Edit your profile" : "Make TeachBack yours"}</h1>
        <p>{editing ? "Changes are saved on this device straight away." : "Just enough to make Kai feel like your study buddy. Your PIN lets you sign back in on this device."}</p>
        <label htmlFor="name">First name or nickname</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} autoComplete="given-name" maxLength={40} aria-invalid={!!err("name")} aria-describedby="name-err" />
        <p id="name-err" className="field-error" role="alert">{err("name")}</p>
        <label htmlFor="course">University course</label>
        <select id="course" value={course} onChange={(e) => setCourse(e.target.value)}>
          {(courses.includes(course) ? courses : [course, ...courses]).map((c) => <option key={c}>{c}</option>)}
        </select>
        {!editing && (
          <div className="pin-grid">
            <div>
              <label htmlFor="pin">Create a PIN</label>
              <input id="pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} aria-invalid={!!err("pin")} aria-describedby="pin-err" />
              <p id="pin-err" className="field-error" role="alert">{err("pin")}</p>
            </div>
            <div>
              <label htmlFor="pin2">Repeat PIN</label>
              <input id="pin2" type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} aria-invalid={!!err("pin2")} aria-describedby="pin2-err" />
              <p id="pin2-err" className="field-error" role="alert">{err("pin2")}</p>
            </div>
          </div>
        )}
        <fieldset>
          <legend>Preferred way to explain</legend>
          <Segment label="Preferred way to explain" options={["Type", "Speak", "Both"] as const} value={pref} onChange={setPref} />
        </fieldset>
        <label className="check-row"><input type="checkbox" checked={esl} onChange={(e) => setEsl(e.target.checked)} />English is not my first language <small>(Kai will use simpler words)</small></label>
        {!editing && <label className="check-row"><input type="checkbox" checked={stay} onChange={(e) => setStay(e.target.checked)} />Keep me signed in on this device</label>}
        <p className="privacy-note"><Icon name="lock" />No database, no server: your profile and sessions are stored only in this browser.</p>
        <Button type="submit" iconRight="arrowRight" disabled={busy}>{editing ? "Save changes" : busy ? "Creating…" : "Continue"}</Button>
      </form>
      <aside className="profile-welcome" aria-hidden="true">
        <Kai size="lg" mood="aha" />
        <div className="speech">{name.trim() ? `Nice to meet you, ${name.trim()}!` : "Hi! What should I call you?"}</div>
      </aside>
    </div>
  );
}

export function SignIn() {
  const { accounts, signIn, restoreBackup, removeAccount, toast } = useStore();
  const [chosen, setChosen] = useState<string | null>(accounts.length === 1 ? accounts[0].id : null);
  const [pin, setPin] = useState("");
  const [stay, setStay] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [backup, setBackup] = useState<BackupFile | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const account = accounts.find((a) => a.id === chosen);
  const target = backup?.account ?? account;

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    const parsed = parseBackup(await f.text());
    if (!parsed) { toast("That file isn’t a TeachBack backup."); return; }
    setBackup(parsed); setChosen(null); setPin(""); setError("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (Date.now() < lockedUntil) { setError("Too many tries. Wait a few seconds and try again."); return; }
    if (!/^\d{4,8}$/.test(pin)) { setError("Enter your 4 to 8 digit PIN."); return; }
    setBusy(true);
    const result = backup ? await restoreBackup(backup, pin, stay) : await signIn(chosen!, pin, stay);
    setBusy(false);
    if (result.ok) {
      toast(backup ? `Backup restored. Welcome back, ${backup.account.name}!` : `Welcome back, ${account?.name}!`);
      go("home");
      return;
    }
    const n = fails + 1;
    setFails(n);
    if (n >= 5) { setLockedUntil(Date.now() + 30_000); setFails(0); }
    setError(n >= 5 ? "Too many tries. Please wait 30 seconds." : result.error);
    setPin("");
  };

  return (
    <div className="center-page">
      <button type="button" className="skip" onClick={() => go("splash")}>Back</button>
      <section className="onboard-card signin-card">
        <Kai size="md" mood="curious" />
        <p className="eyebrow">WELCOME BACK</p>
        <h1 tabIndex={-1}>{target ? `Hi ${target.name}!` : "Who’s teaching today?"}</h1>
        <p>{backup ? "Enter the PIN you used when you made this backup." : target ? "Enter your PIN to carry on where you left off." : accounts.length ? "Choose your profile on this device." : "There are no profiles on this device yet. Restore a backup file, or create a new profile."}</p>

        {!target && accounts.length > 0 && (
          <ul className="account-list">
            {accounts.map((a) => (
              <li key={a.id}>
                <button type="button" className="account-pick" onClick={() => { setChosen(a.id); setError(""); setPin(""); }}>
                  <span className="user-avatar">{initials(a.name)}</span>
                  <span><strong>{a.name}</strong><small>{a.course.split(" – ")[0]}</small></span>
                  <Icon name="arrowRight" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {target && (
          <form className="pin-form" onSubmit={submit} noValidate>
            <label htmlFor="signin-pin">PIN</label>
            <input id="signin-pin" type="password" inputMode="numeric" autoComplete="current-password" autoFocus maxLength={8} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }} aria-invalid={!!error} aria-describedby="signin-err" />
            <p id="signin-err" className="field-error" role="alert">{error}</p>
            <label className="check-row"><input type="checkbox" checked={stay} onChange={(e) => setStay(e.target.checked)} />Keep me signed in on this device</label>
            <Button type="submit" iconRight="arrowRight" disabled={busy}>{busy ? "Checking…" : backup ? "Restore & sign in" : "Sign in"}</Button>
            <div className="signin-links">
              {(accounts.length > 1 || backup) && <button type="button" className="text-link" onClick={() => { setChosen(null); setBackup(null); setError(""); }}>Not you? Choose another profile</button>}
              {!backup && <button type="button" className="text-link muted" onClick={() => setConfirmRemove(true)}>Forgot PIN?</button>}
            </div>
          </form>
        )}

        <div className="signin-alt">
          <button type="button" className="btn btn-secondary" onClick={() => file.current?.click()}><Icon name="download" />Restore from backup file</button>
          <button type="button" className="btn btn-ghost" onClick={() => go("onboarding")}><Icon name="plus" />Create a new profile</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </section>

      <Dialog open={confirmRemove} onClose={() => setConfirmRemove(false)} label="Forgot PIN" className="small-modal">
        <span className="danger-icon"><Icon name="lock" size={26} /></span>
        <h2>Forgot your PIN?</h2>
        <p>TeachBack has no server, so nobody can reset your PIN. If you have a backup file, its PIN is the one you used when you made it. Otherwise you can remove this profile and its sessions from this device and start fresh.</p>
        <div className="button-row centered">
          <Button variant="danger" onClick={() => { if (chosen) removeAccount(chosen); setConfirmRemove(false); setChosen(null); toast("Profile removed from this device."); }}>Remove profile</Button>
          <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancel</Button>
        </div>
      </Dialog>
    </div>
  );
}
