import data from "@/data/roleplays.json";

// DECA and FBLA role-plays, built by tools/build-roleplays.mjs from data/roleplays and data/fbla-roleplay. Original scenarios.
// DECA indicators come from DECA's public lists and the scoring follows the published 2026-27 judge's form. FBLA events follow
// the 2026-27 national guidelines: 20 minutes of prep, 7 minutes to present, and the national role play rating sheet.

export type Kind = "principles" | "individual" | "team" | "pfl" | "fbla" | "fblaService";
export type TrackId = "deca" | "fbla";

export type Scenario = {
  id: string;
  a: string; // instructional area
  r: string; // your role
  c: string; // the business
  j: string; // the judge's role
  s: string[]; // situation paragraphs
  f?: string[]; // case facts (team events)
  m: string; // where it takes place
  d: string; // what you give the judge
  p: string[]; // performance indicators
  n: string[]; // what a strong answer includes
  q: string[]; // the judge's questions
};

export type KindInfo = { label: string; short: string; pis: number; prep: number; speak: number; ask: number; who: string };
export type Cluster = { id: string; name: string; blurb: string; track: TrackId; icon?: string };
export type KnowledgeArea = { name: string; items: number; obj: string[] };
export type RoleplayEvent = {
  slug: string;
  abbr: string;
  name: string;
  cluster: string;
  kind: Kind;
  track: TrackId;
  pathway?: string;
  team?: boolean; // FBLA: a team of up to three may compete
  areas?: KnowledgeArea[]; // FBLA: the knowledge areas from the event's study guide
  scenarios: Scenario[];
};

const DB = data as unknown as { clusters: Cluster[]; kinds: Record<Kind, KindInfo>; events: RoleplayEvent[] };

export const CLUSTERS = DB.clusters;
export const KINDS = DB.kinds;
export const EVENTS = DB.events;

export const eventBySlug = (slug: string) => EVENTS.find((e) => e.slug === slug);
export const clustersFor = (track: TrackId) => CLUSTERS.filter((c) => c.track === track);
export const eventsFor = (track: TrackId) => EVENTS.filter((e) => e.track === track);
export const isFbla = (kind: Kind) => kind === "fbla" || kind === "fblaService";
export const eventsInCluster = (cluster: string) => EVENTS.filter((e) => e.cluster === cluster);

// ---- the 2026-27 judge's evaluation form --------------------------------------------------------------------------
// Four levels on every row: Novice, Developing, Proficient, Exemplary. The point bands below are the ones printed on the form.
export const LEVELS = ["Novice", "Developing", "Proficient", "Exemplary"] as const;
export type Level = (typeof LEVELS)[number];

/** Upper bound of each of the first three levels; the fourth level is the maximum. */
const BANDS: Record<number, [number, number, number]> = {
  6: [1, 3, 5],
  7: [2, 4, 6],
  8: [2, 5, 7],
  10: [3, 6, 9],
  12: [3, 7, 11],
  17: [5, 11, 16],
};
// Overall Impression is worth 8 on most forms, 10 on Principles and 7 on PFL; its bands differ slightly
const OVERALL: Record<number, [number, number, number]> = { 8: [2, 5, 7], 10: [3, 6, 9], 7: [2, 4, 6] };

export const levelFor = (points: number, max: number, overall = false): Level => {
  const b = (overall ? OVERALL : BANDS)[max] ?? BANDS[10];
  return points <= b[0] ? "Novice" : points <= b[1] ? "Developing" : points <= b[2] ? "Proficient" : "Exemplary";
};

export type RubricGroup = "Performance indicators" | "Solution" | "Career competencies" | "Overall impression" | "The problem and your answer" | "Delivery";
export type RubricRow = { key: string; label: string; hint?: string; max: number; group: RubricGroup; overall?: boolean };

// ---- the 2026-27 FBLA role play rating sheet (100 points) --------------------------------------------------------------
// Four levels per row: Not demonstrated (0), Below expectations, Meets expectations, Exceeds expectations. Rows worth 10 are scored
// 1-6 / 7-8 / 9-10 and rows worth 20 are scored 1-9 / 10-16 / 17-20.
export const FBLA_LABELS: Record<Level, string> = { Novice: "Not demonstrated", Developing: "Below expectations", Proficient: "Meets expectations", Exemplary: "Exceeds expectations" };
export const fblaLevel = (points: number, max: number): Level => {
  if (points <= 0) return "Novice";
  const [below, meets] = max >= 20 ? [9, 16] : [6, 8];
  return points <= below ? "Developing" : points <= meets ? "Proficient" : "Exemplary";
};

function fblaRubric(service: boolean): RubricRow[] {
  const A = "The problem and your answer" as const;
  const D = "Delivery" as const;
  const understand: RubricRow = { key: "understand", label: "Understands the role play and defines the problem(s)", hint: "Describe the situation and say what has to be solved.", max: 10, group: A };
  const solution = (max: number): RubricRow => ({ key: "solution", label: "Logical solution and how to carry it out", hint: "Give a feasible solution, an implementation plan and the resources it needs.", max, group: A });
  const tail: RubricRow[] = [
    { key: "organized", label: "Statements are well organized and clearly stated", hint: "A logical sequence from opening to close.", max: 10, group: D },
    { key: "confidence", label: "Confidence, poised body language, eye contact and voice projection", hint: "Show all four to score at the top.", max: 10, group: D },
    { key: "questions", label: "Answers the judge's questions effectively", hint: "Answer completely and interact with the judge.", max: 10, group: D },
  ];
  return service
    ? [
        understand,
        { key: "position", label: "Communicates your position on the scenario", hint: "A professional position that relates to the problem.", max: 10, group: A },
        solution(10),
        { key: "empathy", label: "Shows empathy and diplomacy", hint: "Respond to the person, not just the problem.", max: 20, group: A },
        { key: "closure", label: "Resolves the conflict and closes the situation", hint: "End with the judge (the customer) satisfied.", max: 20, group: A },
        ...tail,
      ]
    : [
        understand,
        { key: "alternatives", label: "Identifies alternatives and the pros and cons of each", hint: "At least two, with their strengths and weaknesses.", max: 20, group: A },
        solution(20),
        { key: "knowledge", label: "Shows the event's knowledge areas", hint: "Four or more areas from the study guide to score at the top.", max: 20, group: A },
        ...tail,
      ];
}

export function rubricFor(kind: Kind, pis: string[], finance = false): RubricRow[] {
  if (kind === "fbla") return fblaRubric(false);
  if (kind === "fblaService") return fblaRubric(true);
  const piMax = kind === "principles" ? 12 : kind === "pfl" ? 17 : 10;
  const overallMax = kind === "principles" ? 10 : kind === "pfl" ? 7 : 8;
  return [
    ...pis.map((p, i) => ({ key: `pi${i}`, label: p, max: piMax, group: "Performance indicators" as const })),
    { key: "sol-unique", label: finance ? "Accurate" : "Unique", hint: finance ? "Demonstrate appropriate finance acumen." : "Demonstrate original thinking, fresh perspectives and an insightful approach.", max: 8, group: "Solution" as const },
    { key: "sol-practical", label: "Practical", hint: "Develop an actionable/viable solution in a real-world context.", max: 8, group: "Solution" as const },
    { key: "sol-effective", label: "Effective", hint: "Develop a solution that achieves relevant outcomes.", max: 8, group: "Solution" as const },
    { key: "cc-think", label: "Critical Thinking", hint: "Think critically to understand and solve problems.", max: 6, group: "Career competencies" as const },
    { key: "cc-comm", label: "Communication", hint: "Communicate clearly, effectively and with reason.", max: 6, group: "Career competencies" as const },
    { key: "cc-decide", label: "Decision Making", hint: "Consider the impacts of decisions.", max: 6, group: "Career competencies" as const },
    { key: "overall", label: "Overall impression", hint: "Demonstrate overall career readiness through professionalism, poise and confidence.", max: overallMax, group: "Overall impression" as const, overall: true },
  ];
}

export const totalMax = (rows: RubricRow[]) => rows.reduce((a, r) => a + r.max, 0);

/** Which events use "Accurate" in place of "Unique" for the Solution row (the finance events on the official form). */
export const usesAccurate = (ev: RoleplayEvent) => ev.cluster === "finance" && ev.kind === "individual";

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
