import { Icon } from "../components/Icon";
import { Kai } from "../components/Kai";
import { PageHeader, Shell } from "../components/Shell";
import { Button, MiniBar, PrivateBadge, TopicCard } from "../components/ui";
import { topics, todayLabel } from "../lib/data";
import { go } from "../lib/router";
import { useStore } from "../lib/store";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function Home() {
  const { profile } = useStore();
  const status = ["4 of 6 ideas clear", "3 of 7 ideas clear", "Not started"];
  return (
    <Shell page="home">
      <PageHeader eyebrow={todayLabel()} title={`${greeting()}, ${profile.name}`} sub="What will you teach Kai today?" aside={<PrivateBadge>Your learning stays private</PrivateBadge>} />

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
        <section className="card continue-card" aria-labelledby="continue-title">
          <div className="card-title">
            <span className="icon-tile"><Icon name="pointer" /></span>
            <div><small>CONTINUE WHERE YOU LEFT OFF</small><h2 id="continue-title">Pointers & References</h2><p>Paused 2 days ago · 3 of 7 ideas clear</p></div>
          </div>
          <MiniBar colors={["mint", "mint", "mint", "amber", "amber", "grey", "grey"]} />
          <Button variant="secondary" icon="play" onClick={() => go("meet")}>Resume session</Button>
        </section>
        <section className="card latest" aria-labelledby="latest-title">
          <small>YOUR LATEST REFLECTION</small>
          <h2 id="latest-title">Recursion</h2>
          <p><strong>4 ideas clear</strong> · 1 idea to revisit</p>
          <div className="revisit"><span><Icon name="help" size={16} /></span><div><strong>Return values combining</strong><small>Worth another explanation</small></div></div>
          <button type="button" className="text-link" onClick={() => go("summary")}>View summary <Icon name="arrowRight" size={16} /></button>
        </section>
      </div>

      <section aria-labelledby="topics-title">
        <div className="section-head">
          <div><h2 id="topics-title">Topics to teach</h2><p>Choose one and see how well you can explain it.</p></div>
          <button type="button" className="text-link" onClick={() => go("topics")}>See all topics <Icon name="arrowRight" size={16} /></button>
        </div>
        <div className="topic-row">
          {topics.slice(0, 3).map((t, i) => <TopicCard key={t.id} topic={t} status={status[i]} onClick={() => go("topic")} />)}
        </div>
      </section>

      <aside className="tip"><Icon name="bulb" /><strong>Tip of the day</strong><span>Try explaining with an example — Kai loves examples.</span></aside>
    </Shell>
  );
}
