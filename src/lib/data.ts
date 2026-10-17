import type { Session } from "./engine";
import type { TopicDef } from "./topics";

export type Status = "mint" | "amber" | "coral" | "grey";
export type TopicFilter = "All" | "In progress" | "Not started" | "Revisit" | "Explained";
export type TopicState = Exclude<TopicFilter, "All">;

export const statusLabel: Record<Status, string> = {
  mint: "Kai gets this",
  amber: "Kai is unsure",
  coral: "Kai has this mixed up",
  grey: "Not taught yet",
};

export const confidenceLabels = ["Not yet", "A little", "Somewhat", "Quite", "Very"];

export function todayLabel(withYear = false, date = new Date()) {
  return date.toLocaleDateString("en-GB", { weekday: withYear ? undefined : "long", day: "numeric", month: "long", year: withYear ? "numeric" : undefined }).toUpperCase();
}

export const shortDate = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function relativeTime(t: number) {
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return shortDate(t);
}

export function statusesOf(topic: TopicDef, s: Session | undefined): Status[] {
  return topic.nodes.map((n) => s?.nodes[n.id]?.status ?? "grey");
}

export interface TopicView {
  topic: TopicDef;
  state: TopicState;
  latest?: Session;
  active?: Session;
  progress: Status[];
  clear: number;
}

/** Derive a topic's state from the student's own sessions (newest first). */
export function topicView(topic: TopicDef, sessions: Session[]): TopicView {
  const mine = sessions.filter((s) => s.topicId === topic.id).sort((a, b) => b.updatedAt - a.updatedAt);
  const latest = mine[0];
  const active = mine.find((s) => s.status === "active");
  const progress = statusesOf(topic, latest);
  const clear = progress.filter((p) => p === "mint").length;
  let state: TopicState = "Not started";
  if (latest?.status === "active") state = "In progress";
  else if (latest) state = clear === topic.nodes.length ? "Explained" : "Revisit";
  return { topic, state, latest, active, progress, clear };
}
