import type { Status } from "./data";
import type { KaiMood } from "../components/Kai";
import type { IdeaNode, Rule, TopicDef } from "./topics";

/**
 * Kai's "brain". Everything runs locally in the browser: Kai only learns from the
 * student's words, inherits their errors and omissions, and never knows the answer.
 */

export interface NodeState {
  status: Status;
  /** What Kai currently believes about this idea. */
  belief?: string;
  /** The student's words that produced the belief. */
  evidence?: string;
  disputed?: boolean;
  /** Kai held a misconception about this idea at some point in the session. */
  everCoral?: boolean;
  askedWhy?: boolean;
}

export interface Message {
  from: "kai" | "student";
  text: string;
  at: number;
  mood?: KaiMood;
  /** Kai's map right after this message (Kai messages only), used for replay. */
  snapshot?: Record<string, Status>;
  changed?: string[];
}

export interface Challenge { node: string; kind: "right" | "wrong"; note: string; at: number }

export interface Session {
  id: string;
  topicId: string;
  status: "active" | "completed";
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  messages: Message[];
  nodes: Record<string, NodeState>;
  lastChanged: string[];
  confidenceBefore: number | null;
  confidenceAfter: number | null;
  tryAttempts: number;
  trySuccess: boolean;
  nextChecked: string[];
  challenges: Challenge[];
  transcriptRemoved?: boolean;
}

export interface Change { id: string; from: Status; to: Status }

const normalise = (s: string) => s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ");

function sentencesOf(text: string) {
  const parts = text.split(/(?<=[.!?;])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [text.trim()];
}

interface Hit { rule: Rule; index: number; sentence: string }

function match(rules: Rule[], sentences: string[], lowered: string[], mint: (id: string) => boolean): Hit | null {
  let best: Hit | null = null;
  for (const rule of rules) {
    if (rule.requiresMint && !rule.requiresMint.every(mint)) continue;
    for (let i = lowered.length - 1; i >= 0; i--) {
      const s = lowered[i];
      if (rule.all.every((r) => r.test(s)) && !(rule.none ?? []).some((r) => r.test(s))) {
        if (!best || i > best.index) best = { rule, index: i, sentence: sentences[i] };
        break;
      }
    }
  }
  return best;
}

const clip = (s: string) => (s.length > 220 ? `${s.slice(0, 217)}…` : s);

export function emptyNodes(topic: TopicDef): Record<string, NodeState> {
  return Object.fromEntries(topic.nodes.map((n) => [n.id, { status: "grey" as Status }]));
}

/** Update Kai's understanding from one explanation. Kai adopts whatever it is told. */
export function analyse(topic: TopicDef, current: Record<string, NodeState>, text: string) {
  const sentences = sentencesOf(text);
  const lowered = sentences.map(normalise);
  const nodes: Record<string, NodeState> = Object.fromEntries(Object.entries(current).map(([k, v]) => [k, { ...v }]));
  const changes: Change[] = [];
  const mint = (id: string) => nodes[id]?.status === "mint";

  for (const node of topic.nodes) {
    const state = nodes[node.id] ?? { status: "grey" };
    const before = state.status;
    const wrong = match(node.wrong, sentences, lowered, mint);
    const right = match(node.correct, sentences, lowered, mint);
    let next: NodeState | null = null;

    // When both appear, whatever the student said last is what Kai walks away believing.
    if (wrong && (!right || wrong.index > right.index)) {
      next = { status: "coral", belief: wrong.rule.belief, evidence: clip(wrong.sentence), everCoral: true };
    } else if (right) {
      if (before !== "mint" || state.disputed) next = { status: "mint", belief: node.gotIt, evidence: clip(right.sentence) };
    } else if (before === "grey" || before === "amber") {
      const vague = match(node.vague, sentences, lowered, mint);
      if (vague?.rule.belief) next = { status: "coral", belief: vague.rule.belief, evidence: clip(vague.sentence), everCoral: true };
      else if (vague && before === "grey") next = { status: "amber", evidence: clip(vague.sentence) };
    }

    if (next && (next.status !== before || next.belief !== state.belief)) {
      nodes[node.id] = { ...state, ...next, disputed: false, everCoral: state.everCoral || next.everCoral, askedWhy: state.askedWhy };
      changes.push({ id: node.id, from: before, to: next.status });
    }
  }
  return { nodes, changes };
}

const pick = <T,>(xs: T[], seed: number) => xs[Math.abs(seed) % xs.length];
const lcFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export interface ReplyOptions {
  pace: "Relaxed" | "Normal" | "Curious";
  simple: boolean;
  previous: string[];
}

/** Compose Kai's reply: acknowledge what changed (including inherited mistakes), then ask ONE question. */
export function reply(topic: TopicDef, nodes: Record<string, NodeState>, changes: Change[], text: string, opts: ReplyOptions) {
  const turn = opts.previous.length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const byId = (id: string) => topic.nodes.find((n) => n.id === id)!;
  const parts: string[] = [];
  let mood: KaiMood = "curious";
  const askedWhy: string[] = [];

  if (!changes.length) {
    if (opts.previous.some((p) => normalise(p) === normalise(text))) {
      return { text: "I think you said that one already. Could you explain it a different way? Hearing it differently really helps me.", mood: "thinking" as KaiMood, askedWhy };
    }
    if (words < 4) {
      return { text: "Could you say a bit more? I’m still really new to this.", mood: "curious" as KaiMood, askedWhy };
    }
    parts.push(pick([
      "Hmm, I’m not sure that changed my picture yet.",
      "Okay… I don’t think I followed that part.",
      "Sorry, I’m a bit lost. I couldn’t connect that to anything yet.",
    ], turn));
    mood = "thinking";
  }

  const mints = changes.filter((c) => c.to === "mint").map((c) => byId(c.id));
  const corals = changes.filter((c) => c.to === "coral").map((c) => nodes[c.id].belief!).filter(Boolean);
  const ambers = changes.filter((c) => c.to === "amber").map((c) => byId(c.id));
  const repaired = changes.filter((c) => c.from === "coral" && c.to === "mint");

  if (repaired.length) {
    parts.push(opts.simple ? "Oh! I had that wrong before." : pick(["Ohh! Wait, I had that totally wrong before.", "Ahh, that clears up what I was mixing up!"], turn));
    mood = "aha";
  }
  // Keep replies short: one "got it" line when Kai is also voicing a (mis)belief.
  mints.slice(0, corals.length ? 1 : 2).forEach((n, i) => {
    parts.push(opts.simple
      ? `Okay! So ${n.gotIt}.`
      : pick([`Ohh, so ${n.gotIt}!`, `Okay, I think I get it: ${n.gotIt}.`, `Nice, that makes sense. So ${n.gotIt}.`], turn + i));
  });
  if (mints.length > (corals.length ? 1 : 2)) parts.push("That’s a lot clicking at once!");
  if (mints.length) mood = "aha";
  corals.forEach((b) => {
    parts.push(opts.simple ? `So ${b}? Okay.` : `Wait, so ${b}? Okay… I think that makes sense.`);
    if (!mints.length) mood = "thinking";
  });

  // Pick the one question to ask next.
  let question: string | undefined;
  if (ambers.length) question = ambers[0].clarify;
  if (!question && opts.pace === "Curious") {
    const w = mints.find((n) => n.why && !nodes[n.id].askedWhy);
    if (w) { question = w.why; askedWhy.push(w.id); }
  }
  if (!question) {
    const amber = topic.nodes.find((n) => nodes[n.id].status === "amber");
    const grey = topic.nodes.find((n) => nodes[n.id].status === "grey");
    question = amber?.clarify ?? grey?.ask;
  }
  if (!question) {
    const anyCoral = topic.nodes.some((n) => nodes[n.id].status === "coral");
    question = anyCoral
      ? "I think I’ve got the whole picture now! Want to watch me try an example?"
      : "I think I actually understand all of it now! Want to watch me try an example, or shall we wrap up?";
  }
  if (opts.pace === "Relaxed" && changes.length) question = `No rush. ${question}`;
  parts.push(question);
  return { text: parts.join(" "), mood, askedWhy };
}

export function snapshot(nodes: Record<string, NodeState>) {
  return Object.fromEntries(Object.entries(nodes).map(([k, v]) => [k, v.status])) as Record<string, Status>;
}

export function statusList(topic: TopicDef, nodes: Record<string, NodeState | Status> | undefined): Status[] {
  return topic.nodes.map((n) => {
    const v = nodes?.[n.id];
    return (typeof v === "string" ? v : v?.status) ?? "grey";
  });
}

export type StepResult = { text: string; status: "mint" | "coral" | "amber"; node: IdeaNode };

/** Kai applies its inherited understanding to the worked example, step by step, stopping where it breaks. */
export function runExample(topic: TopicDef, nodes: Record<string, NodeState>) {
  const steps: StepResult[] = [];
  for (const step of topic.example.steps) {
    const node = topic.nodes.find((n) => n.id === step.node)!;
    const s = nodes[step.node]?.status ?? "grey";
    if (s === "mint") { steps.push({ text: step.ok, status: "mint", node }); continue; }
    if (s === "coral") { steps.push({ text: step.wrong, status: "coral", node }); return { steps, outcome: "wrong" as const, failed: node }; }
    steps.push({ text: `I don’t know what to do next. Nobody explained ${lcFirst(node.label)} to me properly yet.`, status: "amber", node });
    return { steps, outcome: "stuck" as const, failed: node };
  }
  return { steps, outcome: "success" as const, failed: null };
}

export const canTry = (topic: TopicDef, nodes: Record<string, NodeState>) =>
  topic.nodes.filter((n) => nodes[n.id]?.status !== "grey").length >= 3;

export function summarise(topic: TopicDef, s: Session) {
  const state = (id: string) => s.nodes[id] ?? { status: "grey" as Status };
  const repaired = topic.nodes.filter((n) => state(n.id).status === "mint" && state(n.id).everCoral);
  const clear = topic.nodes.filter((n) => state(n.id).status === "mint" && !state(n.id).everCoral);
  const revisit = topic.nodes.filter((n) => state(n.id).status !== "mint");
  const mixedUp = revisit.filter((n) => state(n.id).status === "coral");
  const understood = clear.length + repaired.length;
  const total = topic.nodes.length;
  const before = s.confidenceBefore, after = s.confidenceAfter;
  const gaps = revisit.length + repaired.length;

  let insight = "Explaining it out loud showed you exactly where your understanding is solid and where it’s still forming.";
  if (before != null && before >= 4 && gaps > 0) insight = `You felt confident going in, and Kai still found ${gaps} gap${gaps === 1 ? "" : "s"}. That’s exactly what this is for.`;
  else if (before != null && before <= 2 && understood >= total / 2) insight = `You knew more than you thought: Kai understood ${understood} of ${total} ideas from your explanations.`;
  else if (before != null && after != null && after < before) insight = "Your confidence went down a little. That’s an honest, useful signal about what to study next.";
  else if (before != null && after != null && after > before) insight = "Your confidence went up after teaching. Explaining it yourself is what builds that.";
  else if (understood === total) insight = "Every idea landed. You can explain this topic clearly in your own words.";

  const nextSteps = [
    ...revisit.map((n) => `Teach Kai about ${lcFirst(n.label)}: ${lcFirst(n.hint)}`),
    ...topic.extraSteps,
  ].slice(0, 4);

  return { clear, repaired, revisit, mixedUp, understood, total, insight, nextSteps };
}
