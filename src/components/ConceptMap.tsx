import { Icon, type IconName } from "./Icon";
import { statusLabel, type Status } from "../lib/data";
import type { TopicDef } from "../lib/topics";

const statusIcon: Record<Status, IconName | null> = { mint: "check", amber: "help", coral: "alert", grey: null };

/** Kai's understanding map. Nodes sit on a percentage grid so it scales to any width. */
export function ConceptMap({ topic, statuses, fresh = [], disputed = [], compact = false, onNode }: {
  topic: TopicDef;
  statuses: Record<string, Status>;
  fresh?: string[];
  disputed?: string[];
  compact?: boolean;
  onNode?: (id: string) => void;
}) {
  const pos = Object.fromEntries(topic.nodes.map((n) => [n.id, n]));
  return (
    <div className={`concept-map ${compact ? "compact" : ""} nodes-${topic.nodes.length}`} role="group" aria-label="Kai's understanding map">
      <svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={topic.edges.map(([a, b]) => `M${pos[a].x} ${pos[a].y} L${pos[b].x} ${pos[b].y}`).join(" ")} vectorEffect="non-scaling-stroke" />
      </svg>
      {topic.nodes.map((n) => {
        const s = statuses[n.id] ?? "grey";
        const icon = statusIcon[s];
        const isNew = fresh.includes(n.id);
        return (
          <button
            key={n.id}
            type="button"
            tabIndex={compact ? -1 : undefined}
            onClick={() => onNode?.(n.id)}
            style={{ left: `${n.x}%`, top: `${n.y}%` }}
            className={`map-node ${s} ${isNew ? "is-new" : ""}`}
            aria-label={`${n.label}: ${statusLabel[s]}${disputed.includes(n.id) ? ", disputed by you" : ""}${onNode ? ". Show details" : ""}`}
          >
            <span className="status-icon">{icon ? <Icon name={icon} size={13} /> : <span className="dot-empty" />}</span>
            <span>{n.label}</span>
            {isNew && <i>NEW</i>}
            {!isNew && disputed.includes(n.id) && <i className="disputed">DISPUTED</i>}
          </button>
        );
      })}
    </div>
  );
}

export function Legend() {
  return (
    <ul className="legend" aria-label="Map legend">
      <li><i className="mint" /><Icon name="check" size={12} />Kai gets this</li>
      <li><i className="amber" /><Icon name="help" size={12} />Kai is unsure</li>
      <li><i className="coral" /><Icon name="alert" size={12} />Mixed up</li>
      <li><i className="grey" />Not taught</li>
    </ul>
  );
}
