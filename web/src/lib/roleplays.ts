import data from "@/data/roleplays.json";

// DECA role-plays, built by tools/build-roleplays.mjs from data/roleplays. Original scenarios; the performance
// indicators come from DECA's public lists and the scoring follows the published 2026-27 judge's form.

export type Kind = "principles" | "individual" | "team" | "pfl";

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
export type Cluster = { id: string; name: string; blurb: string };
export type RoleplayEvent = { slug: string; abbr: string; name: string; cluster: string; kind: Kind; pathway?: string; scenarios: Scenario[] };

const DB = data as unknown as { clusters: Cluster[]; kinds: Record<Kind, KindInfo>; events: RoleplayEvent[] };

export const CLUSTERS = DB.clusters;
export const KINDS = DB.kinds;
export const EVENTS = DB.events;

export const eventBySlug = (slug: string) => EVENTS.find((e) => e.slug === slug);
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

export type RubricRow = { key: string; label: string; hint?: string; max: number; group: "Performance indicators" | "Solution" | "Career competencies" | "Overall impression"; overall?: boolean };

export function rubricFor(kind: Kind, pis: string[], finance = false): RubricRow[] {
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
