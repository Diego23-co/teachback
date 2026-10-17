import { Icon } from "../components/Icon";
import { Kai } from "../components/Kai";
import { PageHeader, Shell } from "../components/Shell";
import { Button, MiniBar, PrivateBadge, TopicCard } from "../components/ui";
import { relativeTime, statusesOf, todayLabel, topicView } from "../lib/data";
import { summarise } from "../lib/engine";
import { go } from "../lib/router";
import { useStore } from "../lib/store";
import { getTopic, topicDefs } from "../lib/topics";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const tips = [
  "Try explaining with an example. Kai loves examples.",
  "If Kai gets something wrong, look at which of your words caused it.",
  "Say why, not just what. “Why” questions are where gaps hide.",
  "Stuck? Try tracing a tiny input by hand, out loud.",
];

export function Home() {
  const { profile, sessions } = useStore();
  const active = sessions.filter((s) => s.status === "active").sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const latestDone = sessions.filter((s) => s.status === "completed").sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];
  const activeTopic = getTopic(active?.topicId);
  const doneTopic = getTopic(latestDone?.topicId);
  const summary = doneTopic && latestDone ? summarise(doneTopic, latestDone) : null;
  const tip = tips[new Date().getDate() % tips.length];

  return (
    <Shell page="home">
      <PageHeader eyebrow={todayLabel()} title={`${greeting()}, ${profile.name}`} sub="What will you teach Kai today?" aside={<PrivateBadge>Stored only on this device</PrivateBadge>} />

      <section className="hero" aria-labelledby="hero-title">
        <div>
          <span className="hero-kicker">READY WHEN YOU ARE</span>
          <h2 id="hero-title">Teach Kai a concept</h2>
          <p>Explaining out loud shows you what you really understand.</p>
          <div className="hero-actions">
            <Button variant="peach" iconRight="arrowRight" onClick={() => go("topics")}>Start a session</Button>
            <span className="hero-meta"><Icon name="clock" size={16} /> About 10 minutes · no time limit</span>
          </div>
        </div>
        <Kai size="lg" mood="curious" />
      </section>

      <div className="dashboard-grid">
        {active && activeTopic ? (
          <section className="card continue-card" aria-labelledby="continue-title">
            <div className="card-title">
              <span className="icon-tile"><Icon name={activeTopic.icon} /></span>
              <div>
                <small>CONTINUE WHERE YOU LEFT OFF</small>
                <h2 id="continue-title">{activeTopic.title}</h2>
                <p>Paused {relativeTime(active.updatedAt)} · {statusesOf(activeTopic, active).filter((x) => x === "mint").length} of {activeTopic.nodes.length} ideas clear</p>
              </div>
            </div>
            <MiniBar colors={statusesOf(activeTopic, active)} />
            <Button variant="secondary" icon="play" onClick={() => go("session", active.id)}>Resume session</Button>
          </section>
        ) : (
          <section className="card continue-card" aria-labelledby="continue-title">
            <div className="card-title">
              <span className="icon-tile"><Icon name="sparkle" /></span>
              <div><small>{sessions.length ? "NOTHING PAUSED" : "YOUR FIRST SESSION"}</small><h2 id="continue-title">{sessions.length ? "All caught up" : "Start with Recursion"}</h2><p>{sessions.length ? "Pick a topic and teach Kai something new." : "Kai is confused about recursion and would love your help."}</p></div>
            </div>
            <Button variant="secondary" icon="play" onClick={() => (sessions.length ? go("topics") : go("topic", "recursion"))}>{sessions.length ? "Choose a topic" : "Teach Recursion"}</Button>
          </section>
        )}

        {latestDone && doneTopic && summary ? (
          <section className="card latest" aria-labelledby="latest-title">
            <small>YOUR LATEST REFLECTION</small>
            <h2 id="latest-title">{doneTopic.title}</h2>
            <p><strong>{summary.understood} of {summary.total} ideas clear</strong> · {summary.revisit.length ? `${summary.revisit.length} to revisit` : "nothing to revisit"}</p>
            {summary.revisit[0] ? (
              <div className="revisit"><span><Icon name="help" size={16} /></span><div><strong>{summary.revisit[0].label}</strong><small>Worth another explanation</small></div></div>
            ) : (
              <div className="revisit good"><span><Icon name="check" size={16} /></span><div><strong>Every idea landed</strong><small>Try a new topic next</small></div></div>
            )}
            <button type="button" className="text-link" onClick={() => go("summary", latestDone.id)}>View summary <Icon name="arrowRight" size={16} /></button>
          </section>
        ) : (
          <section className="card latest" aria-labelledby="latest-title">
            <small>YOUR LATEST REFLECTION</small>
            <h2 id="latest-title">No reflections yet</h2>
            <p>Finish a session and you’ll see what Kai understood, what you repaired, and what to try next.</p>
          </section>
        )}
      </div>

      <section aria-labelledby="topics-title">
        <div className="section-head">
          <div><h2 id="topics-title">Topics to teach</h2><p>Choose one and see how well you can explain it.</p></div>
          <button type="button" className="text-link" onClick={() => go("topics")}>See all topics <Icon name="arrowRight" size={16} /></button>
        </div>
        <div className="topic-row">
          {topicDefs.map((t) => {
            const v = topicView(t, sessions);
            return <TopicCard key={t.id} title={t.title} desc={t.desc} icon={t.icon} pill={v.state} progress={v.latest ? v.progress : []} status={v.latest ? `${v.clear} of ${t.nodes.length} ideas clear` : `${t.nodes.length} ideas`} onClick={() => go("topic", t.id)} />;
          })}
        </div>
      </section>

      <aside className="tip"><Icon name="bulb" /><strong>Tip of the day</strong><span>{tip}</span></aside>
    </Shell>
  );
}
