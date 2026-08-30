// The fixed 21-day sprint plan (Revised with timings and GPP project revision on Sundays).

export const TASK_KEYS = [
  "aptitude",
  "reasoning",
  "verbal",
  "cs_fundamentals",
  "java_core",
  "dsa_concept",
  "leetcode",
  "gpp_project",
] as const;

export type TaskKey = (typeof TASK_KEYS)[number];

export const TASK_LABELS: Record<TaskKey, string> = {
  aptitude: "Aptitude",
  reasoning: "Reasoning",
  verbal: "Verbal Ability",
  cs_fundamentals: "CS Fundamentals",
  java_core: "Java Core",
  dsa_concept: "DSA Concept",
  leetcode: "LeetCode",
  gpp_project: "GPP Projects",
};

export const WEEKDAY_TASK_KEYS: TaskKey[] = [
  "aptitude",
  "reasoning",
  "verbal",
  "cs_fundamentals",
  "java_core",
  "dsa_concept",
  "leetcode",
];

export const SUNDAY_TASK_KEYS: TaskKey[] = [
  "aptitude",
  "reasoning",
  "verbal",
  "dsa_concept",
  "leetcode",
  "cs_fundamentals",
  "java_core",
  "gpp_project",
];

export const WEEKDAY_TIMINGS: Record<TaskKey, { time: string; duration: string }> = {
  aptitude: { time: "7:30 – 7:55 PM", duration: "25 min" },
  reasoning: { time: "7:55 – 8:20 PM", duration: "25 min" },
  verbal: { time: "8:20 – 8:40 PM", duration: "20 min" },
  cs_fundamentals: { time: "8:40 – 9:00 PM", duration: "20 min" },
  java_core: { time: "9:45 – 10:15 PM", duration: "30 min" },
  dsa_concept: { time: "10:15 – 10:45 PM", duration: "30 min" },
  leetcode: { time: "10:45 – 11:45 PM", duration: "60 min" },
  gpp_project: { time: "12:00 – 1:00 PM", duration: "60 min" },
};

export const SUNDAY_TIMINGS: Record<TaskKey, { time: string; duration: string }> = {
  aptitude: { time: "9:00 – 10:00 AM", duration: "60 min (Full mock)" },
  reasoning: { time: "9:00 – 10:00 AM", duration: "60 min (Full mock)" },
  verbal: { time: "9:00 – 10:00 AM", duration: "60 min (Full mock)" },
  dsa_concept: { time: "10:15 – 11:15 AM", duration: "60 min" },
  leetcode: { time: "10:15 – 11:15 AM", duration: "60 min" },
  cs_fundamentals: { time: "11:15 AM – 12:00 PM", duration: "45 min" },
  java_core: { time: "11:15 AM – 12:00 PM", duration: "45 min" },
  gpp_project: { time: "12:00 – 1:00 PM", duration: "60 min" },
};

export interface DayPlan {
  day: number;
  week: 1 | 2 | 3;
  weekday: string;
  isSunday: boolean;
  taskKeys: TaskKey[];
  tasks: Partial<Record<TaskKey, string>>;
  timings: Partial<Record<TaskKey, { time: string; duration: string }>>;
}

const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function weekdayFor(day: number) {
  const idx = day % 7;
  return weekdayNames[idx];
}

const rawTasksList: Partial<Record<TaskKey, string>>[] = [
  // ── WEEK 1 (Foundation + Start Weak Areas) ──
  // Day 1 (Mon)
  {
    aptitude: "Number system, LCM/HCF",
    reasoning: "Number/letter series",
    verbal: "Reading comprehension basics",
    cs_fundamentals: "OS: Process & threads",
    java_core: "Java basics, data types",
    dsa_concept: "Arrays/Strings revision",
    leetcode: "Arrays — easy to medium (2-3 problems)",
  },
  // Day 2 (Tue)
  {
    aptitude: "Percentages",
    reasoning: "Coding-decoding",
    verbal: "Synonyms / Antonyms",
    cs_fundamentals: "DBMS: ER model, normalization",
    java_core: "OOP in Java: class, object, constructor",
    dsa_concept: "Two Pointers & Sliding Window",
    leetcode: "Two Pointers set (2-3 problems)",
  },
  // Day 3 (Wed)
  {
    aptitude: "Profit & Loss",
    reasoning: "Blood relations",
    verbal: "Sentence correction",
    cs_fundamentals: "CN: OSI / TCP-IP basics",
    java_core: "Inheritance & polymorphism",
    dsa_concept: "Hashing (HashMap/HashSet patterns)",
    leetcode: "Hashing set (2-3 problems)",
  },
  // Day 4 (Thu)
  {
    aptitude: "Ratio & Proportion",
    reasoning: "Direction sense",
    verbal: "Reading comprehension practice",
    cs_fundamentals: "OOP: the 4 pillars",
    java_core: "Abstraction & interfaces",
    dsa_concept: "Recursion basics",
    leetcode: "Recursion intro problems (2-3)",
  },
  // Day 5 (Fri)
  {
    aptitude: "Averages",
    reasoning: "Syllogisms",
    verbal: "Fill in the blanks",
    cs_fundamentals: "OS: Memory management, deadlocks",
    java_core: "Exception handling",
    dsa_concept: "Trees: traversals (in/pre/post, BFS/DFS)",
    leetcode: "Tree traversal problems (2-3)",
  },
  // Day 6 (Sat)
  {
    aptitude: "Simple & Compound Interest",
    reasoning: "Series — timed revision",
    verbal: "One-word substitution",
    cs_fundamentals: "DBMS: SQL joins, ACID",
    java_core: "String handling, StringBuilder",
    dsa_concept: "Trees: BST operations",
    leetcode: "BST problems (2-3)",
  },
  // Day 7 (Sun)
  {
    aptitude: "Mock test: Aptitude section (part of 60-min timed full mock)",
    reasoning: "Mock test: Reasoning section (part of 60-min timed full mock)",
    verbal: "Mock test: Verbal section (part of 60-min timed full mock)",
    cs_fundamentals: "CN deep dive (this week's theme, review all week)",
    java_core: "Practice mixed Java questions + revise the week",
    dsa_concept: "Mixed revision of the week's patterns",
    leetcode: "Timed mixed set, lean into weak topics",
    gpp_project: "Revise 1–2 GPP projects — full walkthrough out loud",
  },

  // ── WEEK 2 (Push Into Weak Areas: Graphs, Backtracking, DP) ──
  // Day 8 (Mon)
  {
    aptitude: "Time, Speed & Distance",
    reasoning: "Seating arrangement (linear)",
    verbal: "Para jumbles",
    cs_fundamentals: "OS: Concurrency, mutex/semaphores",
    java_core: "Collections: List, Set",
    dsa_concept: "Graphs: BFS/DFS",
    leetcode: "Graph traversal problems (2-3)",
  },
  // Day 9 (Tue)
  {
    aptitude: "Time & Work",
    reasoning: "Seating arrangement (circular)",
    verbal: "Fill in the blanks (advanced)",
    cs_fundamentals: "DBMS: Indexing, normal forms",
    java_core: "Collections: Map, Comparator/Comparable",
    dsa_concept: "Graphs: Topological sort, Union-Find",
    leetcode: "Graph ordering problems (2-3)",
  },
  // Day 10 (Wed)
  {
    aptitude: "Permutation & Combination",
    reasoning: "Puzzles",
    verbal: "One-word substitution",
    cs_fundamentals: "CN: TCP vs UDP, HTTP/HTTPS, DNS",
    java_core: "Multithreading basics",
    dsa_concept: "Backtracking: subsets, permutations",
    leetcode: "Backtracking set 1 (2-3)",
  },
  // Day 11 (Thu)
  {
    aptitude: "Probability",
    reasoning: "Logical Venn diagrams",
    verbal: "Idioms & phrases",
    cs_fundamentals: "OOP: polymorphism/inheritance deep dive",
    java_core: "Thread lifecycle, synchronization",
    dsa_concept: "Backtracking: N-Queens, Sudoku-type",
    leetcode: "Backtracking set 2 (2-3)",
  },
  // Day 12 (Fri)
  {
    aptitude: "Mixtures & Allegations",
    reasoning: "Statement-conclusion",
    verbal: "Reading comprehension (harder passages)",
    cs_fundamentals: "OS: Paging/segmentation, virtual memory",
    java_core: "Java 8: Lambda expressions",
    dsa_concept: "DP: 1D (Fibonacci, climbing stairs, house robber)",
    leetcode: "DP intro problems (2-3)",
  },
  // Day 13 (Sat)
  {
    aptitude: "Mixed quant revision",
    reasoning: "Puzzles revision",
    verbal: "Full verbal mock section",
    cs_fundamentals: "DBMS: Query optimization, isolation levels",
    java_core: "Java 8: Streams API",
    dsa_concept: "DP: 2D intro (grid paths, knapsack basics)",
    leetcode: "DP grid problems (2-3)",
  },
  // Day 14 (Sun)
  {
    aptitude: "Mock test: Aptitude section (part of 60-min timed full mock)",
    reasoning: "Mock test: Reasoning section (part of 60-min timed full mock)",
    verbal: "Mock test: Verbal section (part of 60-min timed full mock)",
    cs_fundamentals: "System Design basics (intro: scalability, load balancing)",
    java_core: "Practice mixed Java questions + revise the week",
    dsa_concept: "Mixed Graphs / Backtracking / DP revision",
    leetcode: "Timed mixed set, lean into weak topics",
    gpp_project: "Revise 1–2 different GPP projects — focus on the trickiest decision in each",
  },

  // ── WEEK 3 (Advanced + Mock-Interview Mode) ──
  // Day 15 (Mon)
  {
    aptitude: "Data Interpretation: tables",
    reasoning: "Data sufficiency",
    verbal: "Critical reasoning",
    cs_fundamentals: "OS: Deadlock handling, revision",
    java_core: "Generics",
    dsa_concept: "DP: Knapsack variations, LIS",
    leetcode: "DP advanced set 1 (2-3)",
  },
  // Day 16 (Tue)
  {
    aptitude: "Data Interpretation: bar/pie charts",
    reasoning: "Non-verbal reasoning",
    verbal: "Critical reasoning practice",
    cs_fundamentals: "DBMS: SQL practice problems",
    java_core: "Memory management, garbage collection",
    dsa_concept: "DP: String DP (LCS, edit distance)",
    leetcode: "DP advanced set 2 (2-3)",
  },
  // Day 17 (Wed)
  {
    aptitude: "Data sufficiency (quant)",
    reasoning: "Mixed puzzles",
    verbal: "Full verbal mock section",
    cs_fundamentals: "CN: Security basics (SSL, firewalls)",
    java_core: "JVM architecture",
    dsa_concept: "Graphs: Dijkstra / shortest path",
    leetcode: "Shortest-path problems (2-3)",
  },
  // Day 18 (Thu)
  {
    aptitude: "Full mock section",
    reasoning: "Full mock section",
    verbal: "Full mock section",
    cs_fundamentals: "OOP: Design patterns (Singleton, Factory)",
    java_core: "Design patterns in Java",
    dsa_concept: "Trees: advanced (LCA, diameter, serialize/deserialize)",
    leetcode: "Advanced tree problems (2-3)",
  },
  // Day 19 (Fri)
  {
    aptitude: "Weak-topic revision",
    reasoning: "Weak-topic revision",
    verbal: "Weak-topic revision",
    cs_fundamentals: "Mixed CS fundamentals mock quiz",
    java_core: "Mixed Java mock quiz",
    dsa_concept: "Mixed weak-topic problems",
    leetcode: "Whatever topic you're scoring lowest on",
  },
  // Day 20 (Sat)
  {
    aptitude: "Full mock, timed",
    reasoning: "Full mock, timed",
    verbal: "Full mock, timed",
    cs_fundamentals: "Weak-topic revision",
    java_core: "Weak-topic revision",
    dsa_concept: "Mock-interview style problem solving",
    leetcode: "2 medium/hard, timed like a real interview round",
  },
  // Day 21 (Sun)
  {
    aptitude: "Final full mock: Aptitude section (part of timed full mock)",
    reasoning: "Final full mock: Reasoning section (part of timed full mock)",
    verbal: "Final full mock: Verbal section (part of timed full mock)",
    cs_fundamentals: "Full CS fundamentals mock test",
    java_core: "Full Java mock test",
    dsa_concept: "Final revision of all patterns",
    leetcode: "2-3 problems simulating a real interview (45-60 min)",
    gpp_project: "Revise your strongest 1–2 GPP projects — tighten to under 3 min each",
  },
];

export const PLAN: DayPlan[] = rawTasksList.map((tasks, i) => {
  const day = i + 1;
  const isSun = day % 7 === 0;
  const taskKeys = isSun ? SUNDAY_TASK_KEYS : WEEKDAY_TASK_KEYS;
  const timings = isSun ? SUNDAY_TIMINGS : WEEKDAY_TIMINGS;

  return {
    day,
    week: (Math.floor((day - 1) / 7) + 1) as 1 | 2 | 3,
    weekday: weekdayFor(day),
    isSunday: isSun,
    taskKeys,
    tasks,
    timings,
  };
});

export const TOTAL_DAYS = PLAN.length; // 21
export const TOTAL_TASKS = PLAN.reduce((acc, d) => acc + d.taskKeys.length, 0); // 150 (18 weekdays * 7 + 3 Sundays * 8)

export function getDayPlan(day: number): DayPlan | undefined {
  return PLAN.find((d) => d.day === day);
}

export const SPRINT_TIMETABLE_WEEKDAYS = [
  { time: "6:00 – 7:30 PM", title: "Rest (post-college)", duration: "1h30m", type: "rest" },
  { time: "7:30 – 7:55 PM", title: "Aptitude", duration: "25 min", type: "study" },
  { time: "7:55 – 8:20 PM", title: "Reasoning", duration: "25 min", type: "study" },
  { time: "8:20 – 8:40 PM", title: "Verbal Ability", duration: "20 min", type: "study" },
  { time: "8:40 – 9:00 PM", title: "CS Fundamentals (quick round)", duration: "20 min", type: "study" },
  { time: "9:00 – 9:45 PM", title: "Dinner", duration: "45 min", type: "break" },
  { time: "9:45 – 10:15 PM", title: "Java Core", duration: "30 min", type: "study" },
  { time: "10:15 – 10:45 PM", title: "DSA Concept / Pattern", duration: "30 min", type: "study" },
  { time: "10:45 – 11:45 PM", title: "LeetCode Practice", duration: "60 min", type: "study" },
  { time: "11:45 PM – 12:00 AM", title: "Recap / wind down", duration: "15 min", type: "rest" },
  { time: "12:00 AM", title: "Sleep", duration: "~6h30m", type: "rest" },
];

export const SPRINT_TIMETABLE_SUNDAY = [
  { time: "7:30 AM", title: "Wake", duration: "—", type: "rest" },
  { time: "9:00 – 10:00 AM", title: "Full mock: Aptitude + Reasoning + Verbal (timed)", duration: "60 min", type: "study" },
  { time: "10:00 – 10:15 AM", title: "Break", duration: "15 min", type: "break" },
  { time: "10:15 – 11:15 AM", title: "DSA weak-topic problems (Graphs / DP / Backtracking / Trees)", duration: "60 min", type: "study" },
  { time: "11:15 AM – 12:00 PM", title: "CS Fundamentals / Java deep dive (week's theme)", duration: "45 min", type: "study" },
  { time: "12:00 – 1:00 PM", title: "GPP Projects Revision (1–2 projects walkthrough out loud)", duration: "60 min", type: "study" },
  { time: "1:00 – 1:30 PM", title: "Review week's mistakes, update tracker, plan next week", duration: "30 min", type: "study" },
  { time: "1:30 PM onward", title: "Fully Free — rest, errands, reset", duration: "All day", type: "rest" },
];

export const SPRINT_RULES = [
  {
    num: 1,
    title: "Phone away during study blocks",
    desc: "Even 5 minutes of scrolling breaks the whole 210-minute chain back to back.",
    icon: "📵",
  },
  {
    num: 2,
    title: "No re-planning mid-block",
    desc: "Decide what topic/problems tonight before you sit down (during 6:00–7:30 PM rest or night before). Don't burn study minutes deciding what to study.",
    icon: "🎯",
  },
  {
    num: 3,
    title: "Keep a single mistake notebook",
    desc: "Every wrong aptitude/reasoning question and failed LeetCode goes in one place. Sunday 1:00–1:30 PM is for reviewing this, not re-learning.",
    icon: "📓",
  },
  {
    num: 4,
    title: "Track daily completion",
    desc: "7-box checklist (Apti, Reasoning, Verbal, CS, Java, DSA, LeetCode) Mon–Sat, plus the 8th GPP box on Sundays.",
    icon: "✅",
  },
  {
    num: 5,
    title: "Sunday 1:30 PM onward is off-limits for study",
    desc: "You need at least one real reset in the week or the sprint breaks down by week 2.",
    icon: "🌴",
  },
];
