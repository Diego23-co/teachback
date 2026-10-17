import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { BackLink, PageHeader, Shell } from "../components/Shell";
import { Button, TopicCard } from "../components/ui";
import { relativeTime, statusLabel, topicView, type TopicFilter } from "../lib/data";
import { summarise } from "../lib/engine";
import { go } from "../lib/router";
import { useStore } from "../lib/store";
import { comingSoon, getTopic, topicDefs } from "../lib/topics";

const filters: TopicFilter[] = ["All", "In progress", "Not started", "Revisit", "Explained"];

export function Topics() {
  const { sessions } = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TopicFilter>("All");
  const views = useMemo(() => topicDefs.map((t) => topicView(t, sessions)), [sessions]);
  const q = query.trim().toLowerCase();
  const matches = (title: string, desc: string) => `${title} ${desc}`.toLowerCase().includes(q);
  const shown = views.filter((v) => (filter === "All" || v.state === filter) && matches(v.topic.title, v.topic.desc));
  const soon = filter === "All" ? comingSoon.filter((c) => matches(c.title, c.desc)) : [];
  const count = (f: TopicFilter) => (f === "All" ? views.length + comingSoon.length : views.filter((v) => v.state === f).length);

  return (
    <Shell page="topics">
      <PageHeader eyebrow="EXPLORE" title="Topics" sub="Pick something you want to understand more deeply." />
      <div className="library-tools">
        <label className="search">
          <Icon name="search" size={18} />
          <span className="sr-only">Search topics</span>
          <input type="search" placeholder="Search topics…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="chips" role="radiogroup" aria-label="Filter topics">
          {filters.map((f) => (
            <button key={f} type="button" role="radio" aria-checked={filter === f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
              {f} <span className="chip-count">{count(f)}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{shown.length + soon.length} topics shown</p>
      {shown.length + soon.length ? (
        <div className="topic-grid">
          {shown.map((v) => (
            <TopicCard key={v.topic.id} title={v.topic.title} desc={v.topic.desc} icon={v.topic.icon} pill={v.state} progress={v.latest ? v.progress : []}
              status={v.latest ? `${v.clear} of ${v.topic.nodes.length} ideas clear` : `${v.topic.nodes.length} ideas`} onClick={() => go("topic", v.topic.id)} />
          ))}
          {soon.map((c) => <TopicCard key={c.id} title={c.title} desc={c.desc} icon={c.icon} pill="Coming soon" status={`${c.ideas} ideas`} locked />)}
        </div>
      ) : (
        <div className="empty">
          <Icon name="search" size={28} />
          <h2>{q ? `No topics match “${query}”` : `No topics are “${filter}” yet`}</h2>
          <p>Try a different word, or clear the filters.</p>
          <Button variant="secondary" onClick={() => { setQuery(""); setFilter("All"); }}>Clear search</Button>
        </div>
      )}
    </Shell>
  );
}

export function TopicDetail({ id }: { id?: string }) {
  const { sessions } = useStore();
  const topic = getTopic(id);
  if (!topic) {
    return (
      <Shell page="topics">
        <div className="empty"><Icon name="book" size={28} /><h2>Topic not found</h2><Button onClick={() => go("topics")}>All topics</Button></div>
      </Shell>
    );
  }
  const v = topicView(topic, sessions);
  const lastDone = sessions.filter((s) => s.topicId === topic.id && s.status === "completed").sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];
  const summary = lastDone ? summarise(topic, lastDone) : null;
  const taughtBefore = (nodeId: string) => sessions.some((s) => s.topicId === topic.id && s.nodes[nodeId]?.status === "mint");

  return (
    <Shell page="topics">
      <BackLink to="topics">All topics</BackLink>
      <section className="topic-detail-head">
        <span className="topic-icon large"><Icon name={topic.icon} size={34} /></span>
        <div>
          <p className="eyebrow">{topic.nodes.length} IDEAS TO EXPLORE</p>
          <h1 tabIndex={-1}>{topic.title}</h1>
          <p>{topic.detail}</p>
        </div>
        <div className="detail-actions">
          {v.active && <Button icon="play" onClick={() => go("session", v.active!.id)}>Resume paused session</Button>}
          <Button variant={v.active ? "secondary" : "primary"} iconRight="arrowRight" onClick={() => go("confidence", topic.id)}>{v.active ? "Start a new session" : "Teach this topic"}</Button>
        </div>
      </section>
      <div className="detail-grid">
        <section className="card">
          <h2>What Kai will try to understand</h2>
          <ol className="idea-list">
            {topic.nodes.map((n, i) => {
              const before = taughtBefore(n.id);
              return (
                <li className="idea-row" key={n.id}>
                  <span className={before ? "done" : ""}>{before ? <Icon name="check" size={13} /> : i + 1}</span>
                  {n.label}
                  <small className={before ? "tag tag-mint" : "tag"}>{before ? "Explained before" : "Not covered yet"}</small>
                </li>
              );
            })}
          </ol>
        </section>
        <section className="card">
          <p className="eyebrow">YOUR LAST SESSION</p>
          {summary && lastDone ? (
            <>
              <h2>{summary.revisit.length ? `${summary.revisit.length} idea${summary.revisit.length === 1 ? "" : "s"} to revisit` : "Every idea landed"}</h2>
              <p>{relativeTime(lastDone.completedAt ?? lastDone.updatedAt)} · Kai understood {summary.understood} of {summary.total} ideas{summary.repaired.length ? ` and you repaired ${summary.repaired.length} misconception${summary.repaired.length === 1 ? "" : "s"}` : ""}.</p>
              {summary.revisit.slice(0, 3).map((n) => <p key={n.id} className="revisit-line"><strong>{n.label}</strong> · {statusLabel[lastDone.nodes[n.id]?.status ?? "grey"]}</p>)}
              <div className="soft-note"><Icon name="sparkle" />Finding a gap isn’t failure. It’s the useful part.</div>
              <button type="button" className="text-link spaced" onClick={() => go("summary", lastDone.id)}>Read last reflection <Icon name="arrowRight" size={16} /></button>
            </>
          ) : (
            <>
              <h2>Nothing yet</h2>
              <p>You haven’t finished a session on {topic.title} yet. When you do, your reflection will show up here.</p>
              <div className="soft-note"><Icon name="sparkle" />Finding a gap isn’t failure. It’s the useful part.</div>
            </>
          )}
        </section>
      </div>
    </Shell>
  );
}
