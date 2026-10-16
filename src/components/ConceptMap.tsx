import { Icon, type IconName } from "./Icon";
import { newNodesFor, nodeLabels, statusLabel, statusesFor, type Status } from "../lib/data";

const statusIcon: Record<Status, IconName | null> = { mint: "check", amber: "help", coral: "alert", grey: null };

/** Kai's understanding map. Nodes sit on a percentage grid so it scales to any width. */
export function ConceptMap({ step = 3, compact = false, onNode }: { step?: number; compact?: boolean; onNode?: (i: number) => void }) {
  const status = statusesFor(step);
  const fresh = newNodesFor(step);
  return (
    <div className={`concept-map ${compact ? "compact" : ""}`} role="group" aria-label="Kai's understanding map">
      <svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M50 12 L20 40 M50 12 L80 40 M20 40 L20 70 M80 40 L80 70 M20 70 L80 70 M50 12 L50 90" vectorEffect="non-scaling-stroke" />
      </svg>
      {nodeLabels.map((label, i) => {
        const s = status[i];
        const icon = statusIcon[s];
        return (
          <button
            key={label}
            type="button"
            tabIndex={compact ? -1 : undefined}
            onClick={() => onNode?.(i)}
            className={`map-node node-${i} ${s} ${fresh.includes(i) ? "is-new" : ""}`}
            aria-label={`${label}: ${statusLabel[s]}${onNode ? ". Show details" : ""}`}
          >
            <span className="status-icon">{icon ? <Icon name={icon} size={13} /> : <span className="dot-empty" />}</span>
            <span>{label}</span>
            {fresh.includes(i) && <i>NEW</i>}
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
