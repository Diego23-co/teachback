import type { IconName } from "../components/Icon";
import type { Status } from "./data";

/**
 * A rule matches one sentence of the student's explanation when every `all` pattern
 * matches and no `none` pattern does. `belief` is what Kai comes to believe when the
 * rule produces a misconception (explicit, or inferred from a vague explanation).
 */
export interface Rule {
  all: RegExp[];
  none?: RegExp[];
  belief?: string;
  /** Inferred misconceptions only kick in once Kai already understands these ideas. */
  requiresMint?: string[];
}

export interface IdeaNode {
  id: string;
  label: string;
  /** Position on the map, in % of the map's width / height. */
  x: number;
  y: number;
  /** Explained clearly → Kai gets this (mint). */
  correct: Rule[];
  /** Explicitly wrong → Kai adopts the misconception (coral). */
  wrong: Rule[];
  /** Mentioned without explaining → Kai is unsure (amber), or infers a wrong idea if the rule has a belief. */
  vague: Rule[];
  /** Kai's belief once the idea is understood, phrased so it reads after "so…". */
  gotIt: string;
  /** Kai's question to introduce the idea. */
  ask: string;
  /** Kai's question when the idea was only mentioned. */
  clarify: string;
  /** Extra "why?" question asked at the Curious pace. */
  why?: string;
  /** Gentle nudge shown to the student (never the answer). */
  hint: string;
}

export interface TraceStep { node: string; ok: string; wrong: string }

export interface TopicDef {
  id: string;
  title: string;
  desc: string;
  detail: string;
  icon: IconName;
  intro: string;
  nodes: IdeaNode[];
  edges: [string, string][];
  example: { question: string; code: string; steps: TraceStep[]; success: string };
  samples: string[];
  extraSteps: string[];
}

export interface ComingSoon { id: string; title: string; desc: string; icon: IconName; ideas: number }

const recursion: TopicDef = {
  id: "recursion",
  title: "Recursion",
  desc: "Functions that call themselves",
  detail: "Teach Kai how a function can solve a problem by calling itself.",
  icon: "repeat",
  intro: "Hey! So… what even is recursion? My lecturer kept saying it but I zoned out. Can you explain it like I’ve never heard of it?",
  nodes: [
    {
      id: "self-call", label: "Self-call", x: 50, y: 12,
      correct: [
        { all: [/\b(call|calls|calling|called|invoke|invokes|invoking|runs?|uses?)\b[^.]*\b(itself|its own|the same function|itself again)\b/] },
        { all: [/\b(function|method)\b/, /\bitself\b/] },
      ],
      wrong: [
        { all: [/\b(recursion|it|a recursive function)\b[^.]*\b(is|'s)\b[^.]*\b(just|basically|exactly|simply|the same as)\b[^.]*\b(loop|iteration)\b/], none: [/\bnot\b/], belief: "recursion is just a normal loop with a fancy name" },
      ],
      vague: [{ all: [/\b(repeat\w*|loop\w*|over and over|again and again)\b/] }],
      gotIt: "a recursive function solves a problem by calling itself",
      ask: "So what actually makes a function “recursive”?",
      clarify: "You said it repeats… but what is doing the repeating? Is it a loop, or something else?",
      why: "Why would a function ever want to call itself though? Isn’t that a bit weird?",
      hint: "Say who calls whom: what does a recursive function call?",
    },
    {
      id: "base-case", label: "Base case", x: 22, y: 40,
      correct: [
        { all: [/\b(base case|base condition|stopping (case|condition|point)|terminating (case|condition)|exit condition)\b/, /\b(stop\w*|end\w*|return\w*|no longer|no more|doesn'?t call|does not call|without calling|terminat\w*|finish\w*|directly|simple enough)\b/] },
        { all: [/\b(stop\w*|end\w*)\b/, /\b(condition|when|once|until)\b/, /\b(call\w*|recurs\w*)\b/] },
      ],
      wrong: [
        { all: [/\b(stop\w*|end\w*)\b[^.]*\b(when|once|because)\b[^.]*\b(computer|it gets tired|runs? out|time)\b/], none: [/overflow|crash|base case/], belief: "the function just stops on its own when the computer runs out of memory or time" },
      ],
      vague: [{ all: [/\b(stop\w*|base case|finish\w*)\b/] }],
      gotIt: "a recursive function needs a base case: a condition where it stops calling itself and returns an answer directly",
      ask: "But wouldn’t it keep calling itself forever? How does it know when to stop?",
      clarify: "You mentioned stopping, but what exactly tells it to stop? Is there some kind of rule?",
      why: "Why does it need a special stopping case at all?",
      hint: "Describe the condition that ends the calls, and what the function does then.",
    },
    {
      id: "smaller", label: "Smaller sub-problem", x: 78, y: 40,
      correct: [
        { all: [/\b(smaller|simpler|reduc\w*|decreas\w*|shrink\w*|closer to|one less|minus (one|1)|n ?- ?1|sub-?problems?)\b/] },
      ],
      wrong: [
        { all: [/\b(same|identical)\b[^.]*\b(input|argument|value|number|problem|parameter)\b/], none: [/\bnot\b|\bnever\b|n't\b/], belief: "each recursive call can use exactly the same input as before" },
      ],
      vague: [{ all: [/\b(different|new|another|changed?|changes)\b[^.]*\b(input|argument|value|number|parameter)\b/] }],
      gotIt: "each recursive call works on a smaller version of the problem, so it gets closer to the base case",
      ask: "If factorial(3) just called factorial(3) again, would it ever reach the base case?",
      clarify: "So the input changes each time, but changes how? Bigger? Smaller? Random?",
      why: "Why does the input need to get smaller, though?",
      hint: "Explain what happens to the input on each call, and why that matters.",
    },
    {
      id: "call-stack", label: "Call stack", x: 78, y: 70,
      correct: [
        { all: [/\bstack\b/, /\b(pil\w*|push\w*|wait\w*|paus\w*|frames?|stor\w*|kept|keep\w*|on top|each call|unfinished|remember\w*|memory|add\w*|pop\w*)\b/] },
        { all: [/\beach call\b[^.]*\b(wait\w*|paus\w*|unfinished|on hold)\b/] },
      ],
      wrong: [
        { all: [/\b(previous|old|earlier|first) calls?\b[^.]*\b(disappear\w*|gone|deleted|is done|are done|thrown away|forgotten|finishe?s?d? first)\b/], belief: "once a function calls itself, the earlier call is finished and forgotten" },
      ],
      vague: [{ all: [/\b(stack|wait\w*|pending)\b/] }],
      gotIt: "every unfinished call waits on the call stack until the call it made returns",
      ask: "When factorial(3) calls factorial(2), what happens to factorial(3)? Does it just… vanish?",
      clarify: "You mentioned the stack or waiting. What is actually being kept there, and for how long?",
      why: "Why does the computer need to keep the earlier calls around?",
      hint: "Describe what happens to each call while it waits for the one it called.",
    },
    {
      id: "return-combine", label: "Return values combine", x: 22, y: 70,
      correct: [
        { all: [/\b(return\w*|pass\w*|send\w*|go(es)?|went|giv\w*|hand\w*|com(e|es|ing))\b[^.]*\b(back|up)\b/], none: [/\bcome up with\b/] },
        { all: [/(multipl\w*|combin\w*|\btimes\b|×|\*)/, /\b(result\w*|return\w*|answers?|values?|back|way up|caller|factorial)\b/] },
        { all: [/\bunwind\w*\b/] },
      ],
      wrong: [
        {
          all: [/\b(base case|returns? (1|one)|hits the (base case|bottom))\b/, /\b(final|whole|overall|actual|real) (answer|result|output)\b|\b(it'?s|that'?s|and) (done|finished|over|the answer)\b|\bthe answer\b/],
          none: [/\b(back|caller)\b|\b(way|goes|passed|passes|sent|go) up\b|multipl|combin/],
          belief: "when the base case returns its value, that value is the final answer of the whole function",
        },
      ],
      vague: [
        { all: [/\b(base case|bottom|returns? (1|one))\b/, /\breturn\w*\b/], none: [/\b(back|caller)\b|\b(way|goes|passed|passes|sent|go) up\b|multipl|combin/], requiresMint: ["smaller"], belief: "when the base case returns its value, that value is the final answer of the whole function" },
        { all: [/\breturn\w*\b/] },
      ],
      gotIt: "each call hands its result back to the call that made it, and the results combine on the way back up",
      ask: "Okay, so the calls stack up and eventually hit the base case… then what? Where does the final answer come from?",
      clarify: "You said it returns something, but returns it to whom? What happens to that value next?",
      why: "Why doesn’t the base case’s value just become the answer?",
      hint: "Follow the value returned by the base case: who receives it, and what do they do with it?",
    },
    {
      id: "infinite", label: "Infinite recursion", x: 50, y: 90,
      correct: [
        { all: [/\b(no|without|missing|forget\w*|forgot|never reach\w*|doesn'?t (have|reach)|lack\w*|never gets? smaller)\b[^.]*\b(base case|stop\w*|smaller|reach)\b/, /\b(forever|infinite\w*|never (stop|end)\w*|overflow\w*|crash\w*|runs? out|endless\w*)\b/] },
        { all: [/\bstack overflow\b/] },
        { all: [/\binfinite recursion\b/, /\b(forever|never|overflow|crash\w*|runs? out)\b/] },
      ],
      wrong: [
        { all: [/\b(no|without)\b[^.]*\bbase case\b/, /\b(just|simply|automatically|eventually)\b[^.]*\b(stop\w*|end\w*|return\w*|finish\w*)\b/], none: [/crash|overflow|never/], belief: "without a base case, the function would just stop by itself eventually" },
      ],
      vague: [{ all: [/\b(forever|infinite\w*|overflow|endless\w*|never stop\w*)\b/] }],
      gotIt: "without a base case (or an input that shrinks) the calls never stop, and the program crashes with a stack overflow",
      ask: "What would happen if someone forgot to write the base case?",
      clarify: "You said it might go on forever, but can a computer really do that? What actually happens in the end?",
      hint: "Explain what happens to the call stack when the calls never stop.",
    },
  ],
  edges: [["self-call", "base-case"], ["self-call", "smaller"], ["base-case", "return-combine"], ["smaller", "call-stack"], ["call-stack", "return-combine"], ["self-call", "infinite"]],
  example: {
    question: "Kai tries: what does factorial(3) return?",
    code: "def factorial(n):\n  if n == 1:\n    return 1\n  return n * factorial(n - 1)",
    steps: [
      { node: "self-call", ok: "factorial(3) isn’t 1, so factorial calls itself", wrong: "It’s just a loop… so I loop 3 times? Doing what?" },
      { node: "smaller", ok: "It calls factorial(2), then factorial(1): smaller each time", wrong: "It calls factorial(3) again… and again… I’m going in circles!" },
      { node: "base-case", ok: "factorial(1) is the base case, so it returns 1 straight away", wrong: "I keep going until the computer runs out of memory…?" },
      { node: "call-stack", ok: "factorial(3) and factorial(2) are waiting on the call stack", wrong: "factorial(3) and factorial(2) are finished and forgotten…" },
      { node: "return-combine", ok: "The 1 goes back up: 2 × 1 = 2, then 3 × 2 = 6", wrong: "So the answer is just 1?" },
    ],
    success: "factorial(3) is 6! The results multiply on the way back up.",
  },
  samples: [
    "Recursion is when a function calls itself to solve a problem.",
    "It has a base case, a condition where it stops calling itself and just returns a value.",
    "Each call uses a smaller input, like factorial(n-1), so it gets closer to the base case. The calls pile up on the call stack, then it returns 1.",
    "Not quite. The 1 goes back to the call that asked for it. Each call multiplies by its own n and returns that, all the way back up.",
    "If there is no base case the calls never stop, so the call stack keeps growing until the program crashes with a stack overflow.",
  ],
  extraSteps: ["Trace fib(4) by hand and count the calls", "Try Binary Trees next, since tree code uses recursion everywhere"],
};

const pointers: TopicDef = {
  id: "pointers",
  title: "Pointers & References",
  desc: "How variables point to memory",
  detail: "Teach Kai what a pointer really stores and why changing *p changes x.",
  icon: "pointer",
  intro: "Hiii! Pointers are the scariest part of my course. Everyone says “it’s just an address” and I nod along. Can you explain what a pointer actually is?",
  nodes: [
    {
      id: "variable", label: "Variable", x: 50, y: 9,
      correct: [{ all: [/\bvariables?\b/, /\b(stor\w*|hold\w*|contain\w*|keep\w*|box|named|name for|label|location|place in memory|memory|slot)\b/] }],
      wrong: [{ all: [/\bvariables?\b[^.]*\b(is|are) (just )?(the|a) (value|number) itself\b/], belief: "a variable is just the value itself, not a place where a value lives" }],
      vague: [{ all: [/\bvariables?\b/] }],
      gotIt: "a variable is a named spot in memory that holds a value",
      ask: "Wait, before pointers: what’s a variable actually, from the computer’s point of view?",
      clarify: "You mentioned variables, but where does a variable actually live?",
      why: "Why does it matter that a variable lives somewhere in memory?",
      hint: "Describe a variable as something stored somewhere in memory.",
    },
    {
      id: "address", label: "Memory address", x: 22, y: 29,
      correct: [
        { all: [/\baddress\w*\b/, /\b(memory|location|where|place|number|spot|locat\w*|lives?)\b/] },
        { all: [/&\s*\w+/, /\b(address|where|location)\b/] },
      ],
      wrong: [{ all: [/\baddress\b[^.]*\b(is|means) (just )?(the )?(name|value)\b/], belief: "a memory address is just the variable’s name" }],
      vague: [{ all: [/\b(address\w*|location)\b/] }],
      gotIt: "every variable lives at a memory address, like a house number",
      ask: "Okay so variables live in memory… how does the computer find one? Is there a way to say where it is?",
      clarify: "So memory has addresses. Is an address the value, or something else?",
      hint: "Explain what a memory address is and how you get one (for example &x).",
    },
    {
      id: "pointer", label: "Pointer stores address", x: 78, y: 29,
      correct: [
        { all: [/\bpointers?\b/, /\b(stor\w*|hold\w*|contain\w*|keep\w*|is|are|points?)\b[^.]*\baddress\w*\b/] },
        { all: [/\bpoints? to\b/, /\b(memory location|address|where)\b/] },
      ],
      wrong: [{ all: [/\bpointers?\b[^.]*\b(holds?|stores?|contains?|keeps?|is|gets?|has)\b[^.]*\b(copy|copies|duplicate|same value|the value)\b/], none: [/\baddress\b/, /\bnot (a |the |its )?(own )?(copy|value)\b/, /\bby value\b/], belief: "a pointer holds its own copy of the value" }],
      vague: [
        { all: [/\bpointers?\b/, /\b(points?|refer\w*|link\w*|connect\w*)\b/], requiresMint: ["variable"], belief: "a pointer is like a copy of the variable it points to" },
        { all: [/\bpointers?\b/] },
      ],
      gotIt: "a pointer is a variable that stores the memory address of another variable",
      ask: "So where do pointers come in? What does a pointer actually store?",
      clarify: "You said a pointer points to something, but what is actually stored inside the pointer?",
      why: "Why store an address instead of just copying the value?",
      hint: "Say exactly what a pointer stores, and what it doesn’t.",
    },
    {
      id: "deref", label: "Dereferencing", x: 22, y: 51,
      correct: [{ all: [/(dereferenc\w*|\*\s?\w+|\bfollow\w*|\bgo(es)? to|\baccess\w*|\blook\w* at|\bread\w*|\bchang\w*|\bupdat\w*|\bmodif\w*|\bwrit\w*)/, /\b(address|it points to|pointed|points to|value at|stored at|stored there|target|that location)\b/] }],
      wrong: [{ all: [/(dereferenc\w*|\*\s?p\b)/, /\b(delet\w*|creat\w*|copy|copies|new variable)\b/], none: [/\bnot\b|n't\b/], belief: "dereferencing a pointer makes a new copy of the value" }],
      vague: [{ all: [/(dereferenc\w*|\basterisk\b|\bstar\b|\*\w)/] }],
      gotIt: "dereferencing (*p) follows the address so you can read or change the value stored there",
      ask: "If a pointer only has an address, how do I get to the actual value? Like, how would I change it?",
      clarify: "You mentioned the star / dereferencing. What does it actually do?",
      hint: "Explain what *p does: where does it go, and what can you do there?",
    },
    {
      id: "aliasing", label: "Aliasing", x: 78, y: 51,
      correct: [
        { all: [/\b(both|two|same|alias\w*|either)\b/, /\b(same (memory|value|variable|location|address|thing|object|place)|shar\w*|refer to the same|point to the same|also chang\w*|changes? (x|the original|both)|chang\w* (x|the original) too)\b/] },
        { all: [/\b(original|x)\b[^.]*\b(also|too|as well|will|would)\b[^.]*\b(chang\w*|updat\w*|becom\w*)\b/] },
      ],
      wrong: [{ all: [/\b(x|the original|original variable)\b[^.]*\b(stays?|remains?|still|doesn'?t change|unchanged)\b/], none: [/\bcopy|by value\b/], belief: "changing the value through a pointer leaves the original variable unchanged" }],
      vague: [{ all: [/\b(both|same thing|alias\w*)\b/] }],
      gotIt: "a pointer and the original variable refer to the same memory, so a change through one shows up in the other",
      ask: "If I change the value through the pointer, what happens to the original variable?",
      clarify: "So they’re connected somehow, but if one changes, does the other change too? Why?",
      hint: "Explain why changing *p also changes x.",
    },
    {
      id: "null", label: "Null pointer", x: 22, y: 73,
      correct: [{ all: [/\b(null|nullptr|nil)\b/, /\b(nothing|no (valid )?(address|object|variable|memory)|doesn'?t point|does not point|points to nothing|not pointing|invalid|crash\w*|segfault|segmentation|error)\b/] }],
      wrong: [{ all: [/\b(null|nullptr)\b/, /\b(holds?|stores?|is|means|gives|reads?|returns?)\b[^.]*\b(zero|0|empty value)\b/], none: [/address (0|zero)/], belief: "a null pointer stores the value 0, so reading it just gives you 0" }],
      vague: [{ all: [/\b(null|nullptr)\b/] }],
      gotIt: "a null pointer doesn’t point to any valid memory, so dereferencing it is an error",
      ask: "What if a pointer isn’t pointing at anything yet? Is that even allowed?",
      clarify: "You mentioned null. What happens if I try to use a null pointer?",
      hint: "Explain what null means for a pointer and what happens if you dereference it.",
    },
    {
      id: "passref", label: "Pass by reference", x: 78, y: 73,
      correct: [
        { all: [/\b(pass\w*|send\w*|giv\w*)\b/, /\b(by reference|a pointer|the address|a reference)\b/, /\b(chang\w*|modif\w*|updat\w*|original|caller|same|outside)\b/] },
        { all: [/\bby value\b/, /\bcopy\b/, /\b(doesn'?t|does not|won'?t|not)\b[^.]*\b(chang\w*|affect\w*)\b/] },
      ],
      wrong: [{ all: [/\b(copy|by value)\b/, /\b(chang\w*|modif\w*|updat\w*)\b[^.]*\b(original|caller|x)\b/], none: [/\b(doesn'?t|does not|won'?t|not|never|can'?t)\b/], belief: "changing a copy inside a function also changes the original variable" }],
      vague: [{ all: [/\bpass\w*\b[^.]*\b(function|parameter|argument)\b/] }],
      gotIt: "passing a pointer or reference lets a function change the caller’s original variable, while passing by value only gives it a copy",
      ask: "Why would I pass a pointer into a function instead of just the value?",
      clarify: "You talked about passing things to functions. What’s the difference between giving it a copy and giving it the address?",
      hint: "Compare passing by value (a copy) with passing a pointer or reference.",
    },
  ],
  edges: [["variable", "address"], ["address", "pointer"], ["pointer", "deref"], ["deref", "aliasing"], ["deref", "null"], ["aliasing", "passref"]],
  example: {
    question: "Kai tries: what does print(x) show?",
    code: "int x = 5;\nint *p = &x;\n*p = 9;\nprint(x);",
    steps: [
      { node: "variable", ok: "x is a spot in memory holding 5", wrong: "x is just the number 5…?" },
      { node: "address", ok: "&x gives the address where x lives", wrong: "&x is… just the name x?" },
      { node: "pointer", ok: "p stores that address, not a copy of 5", wrong: "p gets its own copy of 5" },
      { node: "deref", ok: "*p = 9 follows the address and writes 9 there", wrong: "*p = 9 makes a new copy holding 9" },
      { node: "aliasing", ok: "x lives at that address, so x is now 9", wrong: "x was never touched, so it’s still 5?" },
    ],
    success: "It prints 9! x and *p are the same memory.",
  },
  samples: [
    "A variable is a named box in memory that holds a value.",
    "Every variable lives at a memory address, which is like its house number. You get it with &x.",
    "A pointer is a variable that stores the address of another variable, not a copy of its value.",
    "Dereferencing with *p follows the address, so *p = 9 changes the value stored at that address. Both x and *p refer to the same memory, so x changes too.",
    "A null pointer doesn't point to anything, so dereferencing it crashes. Passing a pointer to a function lets it change the original variable, but passing by value only gives a copy.",
  ],
  extraSteps: ["Draw boxes and arrows for int **pp = &p", "Write a swap(a, b) function with pointers"],
};

const trees: TopicDef = {
  id: "trees",
  title: "Binary Trees",
  desc: "Nodes, children and traversal",
  detail: "Teach Kai how binary trees are built, measured and searched.",
  icon: "tree",
  intro: "Hey! We just started trees and I drew a literal tree in my notes… I don’t think that’s right. What is a binary tree?",
  nodes: [
    {
      id: "node", label: "Node", x: 50, y: 9,
      correct: [{ all: [/\bnodes?\b/, /\b(value|data|key|hold\w*|stor\w*|contain\w*)\b/, /\b(link\w*|pointer\w*|connect\w*|children|child|left|right|reference\w*)\b/] }],
      wrong: [],
      vague: [{ all: [/\bnodes?\b/] }],
      gotIt: "a tree is made of nodes, and each node holds a value plus links to its children",
      ask: "What is a tree actually made of? Like, what are the pieces?",
      clarify: "You said nodes. What’s inside a node?",
      hint: "Describe what a single node contains.",
    },
    {
      id: "root", label: "Root", x: 22, y: 29,
      correct: [{ all: [/\broot\b/, /\b(top|first|start\w*|no parent|without a parent|entry|begin\w*|highest)\b/], none: [/\b(smallest|minimum|lowest value)\b/] }],
      wrong: [{ all: [/\broot\b/, /\b(smallest|minimum|lowest value|least)\b/], none: [/\bnot\b|n't\b/], belief: "the root is always the smallest value in the tree" }],
      vague: [{ all: [/\broot\b/] }],
      gotIt: "the root is the top node of the tree, the one with no parent where everything starts",
      ask: "Where does a tree start? Is there a special node?",
      clarify: "You mentioned the root. What makes the root special?",
      hint: "Explain where the root is and what makes it different.",
    },
    {
      id: "children", label: "Left & right child", x: 78, y: 29,
      correct: [
        { all: [/\b(at most|up to|maximum of|max|no more than|only|zero, one or|0, 1 or)\b[^.]*\b(two|2)\b/, /\b(child\w*|kids|nodes|branches|subtrees?)\b/] },
        { all: [/\bleft\b/, /\bright\b/, /\b(child\w*|subtrees?)\b/] },
      ],
      wrong: [{ all: [/\b(any number of|as many|unlimited|more than two|three|lots of)\b[^.]*\b(child\w*|kids|branches)\b/], none: [/\b(not|can'?t|cannot|never)\b/], belief: "a node in a binary tree can have any number of children" }],
      vague: [{ all: [/\b(child\w*|parent\w*|branch\w*|kids)\b/] }],
      gotIt: "each node has at most two children: a left child and a right child",
      ask: "How many children can one node have? Is there a limit?",
      clarify: "You mentioned children. How many can a node have, and do they have names?",
      why: "Why is it called “binary”?",
      hint: "Say how many children a node can have, and what “binary” means here.",
    },
    {
      id: "leaf", label: "Leaf", x: 22, y: 51,
      correct: [{ all: [/\b(leaf|leaves)\b/, /\b(no child\w*|without child\w*|zero child\w*|0 child\w*|no kids|bottom|doesn'?t have (any )?child\w*|has no)\b/] }],
      wrong: [{ all: [/\b(leaf|leaves)\b/, /\b(one child|single child|only child)\b/], none: [/\bno\b/], belief: "a leaf is a node with only one child" }],
      vague: [{ all: [/\b(leaf|leaves|bottom)\b/] }],
      gotIt: "a leaf is a node with no children, at the bottom of the tree",
      ask: "What about the nodes right at the bottom? Do they have a name?",
      clarify: "You said leaf. What makes a node a leaf?",
      hint: "Explain how you can tell a node is a leaf.",
    },
    {
      id: "height", label: "Height", x: 78, y: 51,
      correct: [{ all: [/\b(height|depth|levels?)\b/, /\b(longest|edges|steps|path|count\w*|number of|how (far|many|deep|tall)|root to|from the root|down to)\b/], none: [/\b(number of|total|how many) nodes\b/] }],
      wrong: [{ all: [/\bheight\b/, /\b(number of nodes|total nodes|how many nodes)\b/], none: [/\b(path|longest)\b/], belief: "the height of a tree is the total number of nodes in it" }],
      vague: [{ all: [/\b(height|depth|levels?|tall|deep)\b/] }],
      gotIt: "the height is the number of edges on the longest path from the root down to a leaf",
      ask: "How would I measure how tall a tree is?",
      clarify: "You mentioned height or levels. How exactly do you count it?",
      hint: "Explain how to count a tree’s height.",
    },
    {
      id: "traversal", label: "Traversal order", x: 22, y: 73,
      correct: [{ all: [/\b(travers\w*|visit\w*|walk\w*|go through|in-?order|pre-?order|post-?order|level-?order|breadth|depth-first|dfs|bfs)\b/, /\b(every|each|all|order|left|right|root|then|first)\b/] }],
      wrong: [{ all: [/\b(travers\w*|visit\w*)\b/, /\b(only one|just one) (way|order)\b/], belief: "there is only one way to go through a tree" }],
      vague: [{ all: [/\b(travers\w*|visit\w*|go through)\b/] }],
      gotIt: "a traversal visits every node in a set order, like in-order (left, node, right)",
      ask: "If I wanted to print every value in the tree, how would I go through it?",
      clarify: "You said traverse. In what order would I visit the nodes?",
      hint: "Describe a traversal order, for example left subtree, then node, then right subtree.",
    },
    {
      id: "bst", label: "Search tree rule", x: 78, y: 73,
      correct: [{ all: [/\b(binary search tree|bst|search tree)\b/, /\b(left|smaller|less)\b/, /\b(right|bigger|greater|larger)\b/] }],
      wrong: [{ all: [/\b(sorted|ordered)\b|smaller[^.]*\bleft\b|\bleft\b[^.]*\bsmaller|\bless\b[^.]*\bleft\b/], none: [/\b(search|bst)\b/, /\bnot (always |necessarily |all )?(sorted|ordered)/], belief: "every binary tree keeps smaller values on the left and bigger values on the right" }],
      vague: [{ all: [/\b(search\w*|sorted|ordered)\b/] }],
      gotIt: "only a binary search tree keeps smaller values in the left subtree and bigger ones in the right; a plain binary tree doesn’t have to",
      ask: "Are the values in a binary tree in any particular order? Could I find a number quickly?",
      clarify: "You mentioned order or searching. Is that true for every binary tree, or a special kind?",
      hint: "Explain the binary search tree rule, and whether every binary tree follows it.",
    },
  ],
  edges: [["node", "root"], ["node", "children"], ["children", "leaf"], ["root", "height"], ["leaf", "height"], ["root", "traversal"], ["children", "bst"]],
  example: {
    question: "Kai tries: find 6 in this search tree. Is it a leaf, and how tall is the tree?",
    code: "        8\n       / \\\n      3   10\n     / \\\n    1   6",
    steps: [
      { node: "root", ok: "Start at the root, 8, the top node", wrong: "The root is the smallest… so I start at 1?" },
      { node: "bst", ok: "It’s a search tree and 6 < 8, so go left", wrong: "All binary trees are sorted, so any tree works like this… right?" },
      { node: "children", ok: "8’s left child is 3; 6 > 3, so go to 3’s right child", wrong: "3 could have loads of children… which one is 6?" },
      { node: "leaf", ok: "6 has no children, so it’s a leaf", wrong: "6 has no children… so it can’t be a leaf? Leaves have one child." },
      { node: "height", ok: "Longest path 8 → 3 → 6 has 2 edges, so the height is 2", wrong: "There are 5 nodes, so the height is 5?" },
    ],
    success: "Found it! 6 is a leaf, and the tree’s height is 2.",
  },
  samples: [
    "A binary tree is made of nodes. Each node holds a value and links to its children.",
    "The root is the top node with no parent. Each node has at most two children, a left child and a right child.",
    "A leaf is a node with no children. The height is the number of edges on the longest path from the root down to a leaf.",
    "A traversal visits every node in an order, like in-order: left subtree, then the node, then the right subtree.",
    "Only a binary search tree keeps smaller values on the left and bigger values on the right. A normal binary tree is not sorted.",
  ],
  extraSteps: ["Insert 5, 2, 9, 1 into an empty search tree on paper", "Write the in-order traversal of the example tree"],
};

export const topicDefs: TopicDef[] = [recursion, pointers, trees];

export const comingSoon: ComingSoon[] = [
  { id: "sorting", title: "Sorting Algorithms", desc: "Ways to put data in order", icon: "sort", ideas: 8 },
  { id: "bigo", title: "Big-O Notation", desc: "How algorithms scale", icon: "gauge", ideas: 5 },
  { id: "lists", title: "Linked Lists", desc: "Connected sequences of nodes", icon: "list", ideas: 6 },
];

export function getTopic(id: string | undefined): TopicDef | undefined {
  return topicDefs.find((t) => t.id === id);
}

export type NodeStatuses = Record<string, Status>;
