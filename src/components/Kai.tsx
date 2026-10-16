import { Icon } from "./Icon";

export type KaiMood = "curious" | "thinking" | "aha" | "sleepy";

/** Kai, the study buddy. Decorative unless `label` is given. */
export function Kai({ mood = "curious", size = "md", label }: { mood?: KaiMood; size?: "sm" | "md" | "lg"; label?: string }) {
  return (
    <div className={`kai kai-${size} kai-${mood}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <span className="eye eye-left" /><span className="eye eye-right" />
      <span className="mouth" />
      {mood === "curious" && <span className="brow" />}
      {mood === "thinking" && <span className="thought">•••</span>}
      {mood === "aha" && <span className="spark"><Icon name="sparkle" size={size === "sm" ? 12 : 18} /></span>}
    </div>
  );
}
