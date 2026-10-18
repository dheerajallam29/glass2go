// Build the question bank: read data/questions/*.jsonl, check every question against the quality rules,
// place the correct answer evenly across A-D, and write
//   web/src/data/bank.json              what the site loads
//   data/exports/glass2go-question-bank.csv   one row per question, for the Google Sheet
//   data/bank-report.md                 counts, answer balance and every flagged question
//   node build-bank.mjs
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const cfg = JSON.parse(readFileSync(join(root, "data", "exams.json"), "utf8"));

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const words = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2));
const jaccard = (a, b) => { let i = 0; for (const w of a) if (b.has(w)) i++; return i / (a.size + b.size - i || 1); };

// small seeded random generator so the shuffle is the same on every build
function rng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const shuffle = (arr, r) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const errors = [];
const flags = [];
const all = [];
const counters = new Map();

// each configured file may have extra batches next to it: deca-core.jsonl, deca-core.02.jsonl, deca-core.03.jsonl ...
const qdir = join(root, "data", "questions");
const present = readdirSync(qdir);
const jobs = [];
for (const [file, meta] of Object.entries(cfg.files)) {
  const base = file.slice(0, -".jsonl".length);
  jobs.push([file, meta]);
  for (const f of present.filter((x) => x.startsWith(base + ".") && /^[0-9]+\.jsonl$/.test(x.slice(base.length + 1))).sort()) jobs.push([f, meta]);
}
for (const [file, meta] of jobs) {
  const lines = readFileSync(join(root, "data", "questions", file), "utf8").split(/\r?\n/).filter((l) => l.trim());
  lines.forEach((line, i) => {
    let o;
    try { o = JSON.parse(line); } catch (e) { errors.push(`${file}:${i + 1} is not valid JSON (${e.message})`); return; }
    const pool = o.p ?? meta.pool;
    const key = `${meta.track}-${pool}-${slug(o.a)}`;
    const n = (counters.get(key) ?? 0) + 1;
    counters.set(key, n);
    all.push({ id: `${key}-${String(n).padStart(3, "0")}`, track: meta.track, pool, area: o.a, diff: o.d, q: o.q, right: o.r, wrong: o.w, src: `${file}:${i + 1}` });
  });
}

// optional overrides: data/questions/overrides.jsonl swaps the options of a question by id (used to fix flagged questions)
const byId = new Map(all.map((x) => [x.id, x]));
try {
  const ov = readdirSync(qdir).filter((f) => f.startsWith("overrides") && f.endsWith(".jsonl")).sort()
    .flatMap((f) => readFileSync(join(qdir, f), "utf8").split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l)));
  for (const o of ov) {
    const q = byId.get(o.id);
    if (!q) { errors.push(`overrides: no question with id ${o.id}`); continue; }
    if (o.r) q.right = o.r;
    if (o.rt) q.right = [o.rt, q.right[1]]; // new wording for the right answer, keeping its reason
    if (o.w) q.wrong = o.w;
    if (o.map) q.wrong = q.wrong.map(([t, why]) => [o.map[t] ?? t, why]); // reword wrong options by their old text, keeping their reasons
    if (o.wt) q.wrong = q.wrong.map(([t, why], i) => [o.wt[i] ?? t, why]); // reword wrong options by position (null keeps one), keeping their reasons
    if (o.ext) { // append a clause to the longest wrong option (or to the wrong option at position o.at), keeping its reason
      const at = o.at ?? q.wrong.reduce((m, w, i) => (w[0].length > q.wrong[m][0].length ? i : m), 0);
      q.wrong = q.wrong.map(([t, why], i) => [i === at ? t + o.ext : t, why]);
    }
    if (o.q) q.q = o.q;
  }
} catch (e) { if (e.code !== "ENOENT") throw e; }

// a prompt that already appeared in the same pool is dropped after ids are assigned, so overrides keep matching their questions
let dupes = 0;
const dupeFiles = {};
{
  const seen = new Set();
  let w = 0;
  for (const q of all) {
    const k = `${q.pool}|${q.q.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim()}`;
    if (seen.has(k)) { dupes++; const fl = q.src.split(":")[0]; dupeFiles[fl] = (dupeFiles[fl] ?? 0) + 1; continue; }
    seen.add(k);
    all[w++] = q;
  }
  all.length = w;
}

// --worklist: write the questions whose correct answer is longer than every wrong answer to renders/length-worklist.json (wrong answers in source order)
if (process.argv.includes("--worklist")) {
  const ratio = (x) => x.right[0].length / Math.max(...x.wrong.map((w) => w[0].length));
  const list = all.filter((x) => ratio(x) > 1).sort((p, q) => p.track.localeCompare(q.track) || p.pool.localeCompare(q.pool) || ratio(q) - ratio(p)).map((x) => ({ id: x.id, q: x.q, r: x.right[0], w: x.wrong.map((w) => w[0]), ratio: +ratio(x).toFixed(2) }));
  writeFileSync(join(root, "renders", "length-worklist.json"), JSON.stringify(list));
  console.log(list.length + " questions where the correct answer is longer than every wrong answer");
}

// place the correct answer: every block of four questions in a pool uses each of A-D exactly once
const posSeq = new Map();
for (const q of all) {
  const k = `${q.track}/${q.pool}`;
  const s = posSeq.get(k) ?? { n: 0, block: [] };
  if (s.n % 4 === 0) s.block = shuffle([0, 1, 2, 3], rng(`${k}#${s.n}`));
  q.pos = s.block[s.n % 4];
  s.n++;
  posSeq.set(k, s);
}

for (const q of all) {
  const r = rng(q.id);
  const wrong = shuffle(q.wrong, r);
  q.options = [];
  let wi = 0;
  for (let i = 0; i < 4; i++) q.options.push(i === q.pos ? { t: q.right[0], why: q.right[1] } : { t: wrong[wi][0], why: wrong[wi++][1] });
  q.answer = q.pos;
}

// ---- quality rules ----
const seenPrompts = [];
for (const q of all) {
  const at = (m) => flags.push(`${q.id} (${q.src}): ${m}`);
  const hard = (m) => errors.push(`${q.id} (${q.src}): ${m}`);
  if (!q.q || q.q.length < 10) hard("prompt missing or too short");
  if (![1, 2, 3].includes(q.diff)) hard("difficulty must be 1, 2 or 3");
  if (q.wrong.length !== 3) hard("needs exactly 3 wrong options");
  const texts = q.options.map((o) => o.t.trim().toLowerCase());
  if (new Set(texts).size !== 4) hard("two options are identical");
  for (const o of q.options) {
    if (!o.t || !o.why || o.why.length < 10) hard(`option "${o.t}" is missing an explanation`);
    if (/\b(all|none) of the above\b/i.test(o.t)) hard(`"${o.t}" uses all/none of the above`);
    if (/[–—]/.test(o.t + o.why)) at("uses an en or em dash; prefer a comma or period");
  }
  if (/\b(which|what)\b[^?.]*\b(is|are|does|do|was|were) not\b|\bexcept\b|\bleast\b/i.test(q.q) && !/\b(NOT|EXCEPT|LEAST)\b/.test(q.q)) at("negative wording should use capitals (NOT / EXCEPT / LEAST)");
  const lens = q.options.map((o) => o.t.length);
  const rightLen = lens[q.answer];
  const others = lens.filter((_, i) => i !== q.answer);
  if (rightLen > 1.25 * Math.max(...others) && rightLen > 24) at("correct answer is much longer than every wrong answer (gives itself away)");
  const w = words(q.q);
  for (const p of seenPrompts) if (p.track === q.track && jaccard(w, p.w) > 0.75) at(`prompt is very similar to ${p.id}`);
  seenPrompts.push({ id: q.id, track: q.track, w });
  if (q.q.length > 330) at("prompt is long; consider trimming");
}

// ---- which exams use each question ----
for (const q of all) {
  q.exams = [];
  for (const [exam, rules] of Object.entries(cfg[q.track])) {
    if (rules.some((r) => r.pool === q.pool && (!r.areas || r.areas.includes(q.area)))) q.exams.push(exam);
  }
  if (!q.exams.length) errors.push(`${q.id}: not used by any exam`);
}

// ---- outputs ----
mkdirSync(join(root, "web", "src", "data"), { recursive: true });
mkdirSync(join(root, "data", "exports"), { recursive: true });
const bank = all.map((q) => ({
  id: q.id, track: q.track, pool: q.pool, area: q.area, diff: q.diff, q: q.q,
  options: q.options, answer: q.answer, exams: q.exams,
}));
writeFileSync(join(root, "web", "src", "data", "bank.json"), JSON.stringify(bank));

const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;
const header = ["ID", "Track", "Exam(s)", "Pool", "Topic", "Difficulty", "Question", "A", "B", "C", "D", "Correct", "Why A", "Why B", "Why C", "Why D", "Status", "Source", "Version"];
const rows = all.map((q) => [
  q.id, q.track.toUpperCase(), q.exams.join(", "), q.pool, q.area, q.diff, q.q,
  ...q.options.map((o) => o.t), "ABCD"[q.answer], ...q.options.map((o) => o.why),
  "AI-written, not yet owner-reviewed", cfg.sources[q.track], 1,
]);
writeFileSync(join(root, "data", "exports", "glass2go-question-bank.csv"), "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n"));

const by = (f) => all.reduce((m, q) => m.set(f(q), (m.get(f(q)) ?? 0) + 1), new Map());
const tbl = (m) => [...m.entries()].sort().map(([k, v]) => `| ${k} | ${v} |`).join("\n");
const pos = [0, 0, 0, 0];
all.forEach((q) => pos[q.answer]++);
const examCounts = Object.entries(cfg).filter(([k]) => k === "deca" || k === "fbla").flatMap(([track, ex]) =>
  Object.keys(ex).map((e) => `| ${track.toUpperCase()} ${e} | ${all.filter((q) => q.track === track && q.exams.includes(e)).length} |`));
writeFileSync(join(root, "data", "bank-report.md"), `# Question bank report

Total questions: **${all.length}** (DECA ${all.filter((q) => q.track === "deca").length}, FBLA ${all.filter((q) => q.track === "fbla").length})

## Questions available per exam
| Exam | Questions |
|---|---|
${examCounts.join("\n")}

## By topic
| Track / pool / topic | Count |
|---|---|
${tbl(by((q) => `${q.track}/${q.pool}/${q.area}`))}

## By difficulty
| Difficulty | Count |
|---|---|
${tbl(by((q) => q.diff))}

## Correct-answer position
A: ${pos[0]}, B: ${pos[1]}, C: ${pos[2]}, D: ${pos[3]}

## Hard errors (${errors.length})
${errors.map((e) => `- ${e}`).join("\n") || "none"}

## Flags to review (${flags.length})
${flags.map((e) => `- ${e}`).join("\n") || "none"}
`);

if (process.argv.includes("--dupes")) console.log(dupeFiles);
console.log(`${dupes ? dupes + " duplicate prompts skipped | " : ""}${all.length} questions | answers A/B/C/D = ${pos.join("/")} | ${errors.length} errors | ${flags.length} flags`);
if (errors.length) { console.log(errors.slice(0, 40).join("\n")); process.exit(1); }
