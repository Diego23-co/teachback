import { useState, type FormEvent } from "react";
import { Icon } from "../components/Icon";
import { Kai } from "../components/Kai";
import { Button, Segment } from "../components/ui";
import { go } from "../lib/router";
import { useStore, type InputPref } from "../lib/store";

export function Splash() {
  return (
    <div className="splash">
      <div className="orb orb-one" /><div className="orb orb-two" />
      <div className="splash-kai"><Kai size="lg" mood="aha" label="Kai, your study buddy, smiling" /></div>
      <h1 tabIndex={-1}>TeachBack</h1>
      <p>The best way to learn something is to teach it.</p>
      <Button variant="secondary" iconRight="arrowRight" onClick={() => go("onboarding")}>Get started</Button>
      <button type="button" className="light-link" onClick={() => go("home")}>I already have an account</button>
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
  { title: "No grades. Just you and Kai.", text: "Sessions are private by default, there’s no time limit, and you can delete anything any time.", art: <div className="lock-art"><Icon name="lock" size={48} /></div> },
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

const courses = ["COMS1018 – Intro to Algorithms", "COMS1000 – Intro to Programming", "COMS2002 – Data Structures"];

export function ProfileSetup() {
  const { profile, setProfile, settings, setSetting } = useStore();
  const [name, setName] = useState(profile.name);
  const [course, setCourse] = useState(profile.course);
  const [pref, setPref] = useState<InputPref>(profile.inputPref);
  const [esl, setEsl] = useState(profile.esl);
  const [touched, setTouched] = useState(false);
  const error = name.trim() ? "" : "Please tell Kai what to call you.";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (error) return document.getElementById("name")?.focus();
    setProfile({ name: name.trim(), course, inputPref: pref, esl });
    if (esl) setSetting("simpleWords", true);
    go("home");
  };

  return (
    <div className="profile-page">
      <form className="profile-form" onSubmit={submit} noValidate>
        <p className="eyebrow">ONE QUICK STEP</p>
        <h1 tabIndex={-1}>Make TeachBack yours</h1>
        <p>Just enough to make Kai feel like your study buddy. You can change this any time.</p>
        <label htmlFor="name">First name or nickname</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} autoComplete="given-name" aria-invalid={touched && !!error} aria-describedby="name-err" />
        <p id="name-err" className="field-error" role="alert">{touched && error}</p>
        <label htmlFor="course">University course</label>
        <select id="course" value={course} onChange={(e) => setCourse(e.target.value)}>
          {courses.map((c) => <option key={c}>{c}</option>)}
        </select>
        <fieldset>
          <legend>Preferred way to explain</legend>
          <Segment label="Preferred way to explain" options={["Type", "Speak", "Both"] as const} value={pref} onChange={setPref} />
        </fieldset>
        <label className="check-row"><input type="checkbox" checked={esl} onChange={(e) => setEsl(e.target.checked)} />English is not my first language <small>(Kai will use simpler words)</small></label>
        <label className="check-row"><input type="checkbox" checked={settings.readableFont} onChange={(e) => setSetting("readableFont", e.target.checked)} />Use a more readable font</label>
        <p className="privacy-note"><Icon name="lock" />Your sessions are stored privately. Only you can see them.</p>
        <Button type="submit" iconRight="arrowRight">Continue</Button>
      </form>
      <aside className="profile-welcome" aria-hidden="true">
        <Kai size="lg" mood="aha" />
        <div className="speech">{name.trim() ? `Nice to meet you, ${name.trim()}!` : "Hi! What should I call you?"}</div>
      </aside>
    </div>
  );
}
