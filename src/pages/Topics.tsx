import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { BackLink, PageHeader, Shell } from "../components/Shell";
import { Button, TopicCard } from "../components/ui";
import { nodeLabels, topics, type TopicFilter } from "../lib/data";
import { go } from "../lib/router";

const filters: TopicFilter[] = ["All", "In progress", "Not started", "Revisit"];

export function Topics() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TopicFilter>("All");
  const shown = useMemo(() => topics.filter((t) =>
    (filter === "All" || t.state === filter) &&
    `${t.title} ${t.desc}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [query, filter]);

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
              {f} <span className="chip-count">{f === "All" ? topics.length : topics.filter((t) => t.state === f).length}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{shown.length} topics shown</p>
      {shown.length ? (
        <div className="topic-grid">
          {shown.map((t) => <TopicCard key={t.id} topic={t} status={t.state === "Coming soon" ? `${t.ideas} ideas` : `${t.ideas} ideas · ${t.state}`} onClick={() => go("topic")} />)}
        </div>
      ) : (
        <div className="empty">
          <Icon name="search" size={28} />
          <h2>No topics match “{query}”</h2>
          <p>Try a different word, or clear the filters.</p>
          <Button variant="secondary" onClick={() => { setQuery(""); setFilter("All"); }}>Clear search</Button>
        </div>
      )}
    </Shell>
  );
}

export function TopicDetail() {
  return (
    <Shell page="topics">
      <BackLink to="topics">All topics</BackLink>
      <section className="topic-detail-head">
        <span className="topic-icon large"><Icon name="repeat" size={34} /></span>
        <div>
          <p className="eyebrow">6 IDEAS TO EXPLORE</p>
          <h1 tabIndex={-1}>Recursion</h1>
          <p>Teach Kai how a function can solve a problem by calling itself.</p>
        </div>
        <Button iconRight="arrowRight" onClick={() => go("confidence")}>Teach this topic</Button>
      </section>
      <div className="detail-grid">
        <section className="card">
          <h2>What Kai will try to understand</h2>
          <ol className="idea-list">
            {nodeLabels.map((x, i) => (
              <li className="idea-row" key={x}>
                <span className={i < 4 ? "done" : ""}>{i < 4 ? <Icon name="check" size={13} /> : i + 1}</span>
                {x}
                <small className={i < 4 ? "tag tag-mint" : "tag"}>{i < 4 ? "Explained before" : "Not covered yet"}</small>
              </li>
            ))}
          </ol>
        </section>
        <section className="card">
          <p className="eyebrow">YOUR LAST SESSION</p>
          <h2>You found a useful gap</h2>
          <p>Kai thought the base case value was the final answer. Try showing what happens as the calls return.</p>
          <div className="soft-note"><Icon name="sparkle" />Finding a gap isn’t failure — it’s the useful part.</div>
          <button type="button" className="text-link spaced" onClick={() => go("summary")}>Read last reflection <Icon name="arrowRight" size={16} /></button>
        </section>
      </div>
    </Shell>
  );
}
