import type { IconName } from "../components/Icon";

export type Status = "mint" | "amber" | "coral" | "grey";
export type TopicFilter = "All" | "In progress" | "Not started" | "Revisit";

export interface Topic {
  id: string;
  title: string;
  desc: string;
  icon: IconName;
  ideas: number;
  state: Exclude<TopicFilter, "All"> | "Ready" | "Coming soon";
  progress: Status[];
}

export const topics: Topic[] = [
  { id: "recursion", title: "Recursion", desc: "Functions that call themselves", icon: "repeat", ideas: 6, state: "Revisit", progress: ["mint", "mint", "mint", "mint", "mint", "amber"] },
  { id: "pointers", title: "Pointers & References", desc: "How variables point to memory", icon: "pointer", ideas: 7, state: "In progress", progress: ["mint", "mint", "mint", "amber", "amber", "grey", "grey"] },
  { id: "trees", title: "Binary Trees", desc: "Nodes, children and traversal", icon: "tree", ideas: 7, state: "Not started", progress: ["grey", "grey", "grey", "grey", "grey", "grey", "grey"] },
  { id: "sorting", title: "Sorting Algorithms", desc: "Ways to put data in order", icon: "sort", ideas: 8, state: "Coming soon", progress: [] },
  { id: "bigo", title: "Big-O Notation", desc: "How algorithms scale", icon: "gauge", ideas: 5, state: "Coming soon", progress: [] },
  { id: "lists", title: "Linked Lists", desc: "Connected sequences of nodes", icon: "list", ideas: 6, state: "Coming soon", progress: [] },
];

export const statusLabel: Record<Status, string> = {
  mint: "Kai gets this",
  amber: "Kai is unsure",
  coral: "Kai has this mixed up",
  grey: "Not taught yet",
};

export const nodeLabels = ["Self-call", "Base case", "Smaller sub-problem", "Call stack", "Return values combine", "Infinite recursion"];

export const nodeExplanations: Record<number, { quote: string; reason: string }> = {
  0: { quote: "Recursion is when a function calls itself to solve a problem.", reason: "You gave a clear definition, and Kai repeated it back correctly." },
  1: { quote: "It has a base case — a condition where it stops calling itself.", reason: "Kai linked the base case to stopping, and described it as “a stop sign”." },
  2: { quote: "Each call uses a smaller input, like factorial(n-1).", reason: "Your example showed the input shrinking toward the base case." },
  3: { quote: "The calls pile up on the call stack.", reason: "Kai pictured the calls stacking up, which is the key mental model." },
  4: { quote: "When it hits the base case it returns 1 and it’s done.", reason: "Kai interpreted “it’s done” to mean 1 is the final answer, rather than a value passed back up the call stack." },
  5: { quote: "—", reason: "This idea hasn’t come up yet. Try explaining what happens when there’s no base case." },
};

export function statusesFor(step: number): Status[] {
  if (step === 0) return ["grey", "grey", "grey", "grey", "grey", "grey"];
  if (step === 1) return ["mint", "amber", "grey", "grey", "grey", "grey"];
  if (step === 2) return ["mint", "mint", "amber", "grey", "grey", "grey"];
  if (step === 3) return ["mint", "mint", "mint", "mint", "coral", "grey"];
  return ["mint", "mint", "mint", "mint", "mint", "grey"];
}

/** Which nodes changed on the given step — shown with a "NEW" badge. */
export function newNodesFor(step: number): number[] {
  return [[], [0, 1], [1, 2], [2, 3, 4], [4]][step] ?? [];
}

export const studentMessages = [
  "Recursion is when a function calls itself to solve a problem.",
  "It has a base case — a condition where it stops calling itself and just returns a value.",
  "Each call uses a smaller input, like factorial(n-1), so it gets closer to the base case. The calls pile up on the call stack, then it returns 1.",
  "Not quite — the 1 goes back to the call that asked for it. Each call multiplies by its own n and returns that, all the way back up.",
];

export const kaiMessages = [
  "Hey! So… what even is recursion? My lecturer kept saying it but I zoned out.",
  "Ohh okay, a function that calls itself! But wouldn’t it keep calling itself forever? How does it know when to stop?",
  "Got it, the base case is like a stop sign. But if factorial(3) called factorial(3) again, would it ever reach it?",
  "Aha, smaller each time, and they stack up! So when the base case returns 1… that’s the answer?",
  "Ohh! It’s 1, then 2 × 1 = 2, then 3 × 2 = 6. The answer builds up on the way back!",
];

export const confidenceLabels = ["Not yet", "A little", "Somewhat", "Quite", "Very"];

export function todayLabel(withYear = false) {
  return new Date().toLocaleDateString("en-GB", { weekday: withYear ? undefined : "long", day: "numeric", month: "long", year: withYear ? "numeric" : undefined }).toUpperCase();
}
