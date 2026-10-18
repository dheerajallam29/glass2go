// Validates data/roleplays/*.jsonl (DECA) and data/fbla-roleplay/*.jsonl (FBLA) and writes web/src/data/roleplays.json.
//   node tools/build-roleplays.mjs
// DECA scenario line: { id, a (instructional area), r (your role), c (company), j (judge's role), s [situation paragraphs],
//   f [case facts, team events], m (meeting place), d (what you present), p [performance indicators],
//   n [what a strong answer includes], q [judge's questions] }
// FBLA scenario line: same shape, but p holds 4-5 knowledge areas the scenario lets you show (named exactly as on the rating
//   sheet), n holds what a strong answer includes (alternatives with pros and cons, solution, implementation), and q holds
//   three things the judge says while you present (FBLA has no separate question round).
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const meta = JSON.parse(readFileSync("data/roleplays/events.json", "utf8"));
const fmeta = JSON.parse(readFileSync("data/fbla-roleplay/events.json", "utf8"));
const know = JSON.parse(readFileSync("data/fbla-roleplay/knowledge.json", "utf8"));
const errors = [];

const kinds = {
  ...meta.kinds,
  fbla: { label: "FBLA Role Play", short: "Role Play", pis: 4, prep: 20, speak: 7, ask: 0, who: "individual or team of up to three" },
  fblaService: { label: "FBLA Role Play", short: "Role Play", pis: 4, prep: 20, speak: 7, ask: 0, who: "individual" },
};
const out = {
  clusters: [...meta.clusters.map((c) => ({ ...c, track: "deca" })), ...fmeta.clusters.map((c) => ({ ...c, track: "fbla" }))],
  kinds,
  events: [],
};
let total = 0;

function load(ev, file, track) {
  if (!existsSync(file)) {
    errors.push(`${ev.slug}: missing ${file}`);
    return;
  }
  const fb = track === "fbla";
  const kind = kinds[ev.kind];
  const scenarios = [];
  readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .forEach((line, i) => {
      let s;
      try {
        s = JSON.parse(line);
      } catch (e) {
        errors.push(`${ev.slug}:${i + 1} invalid JSON: ${e.message}`);
        return;
      }
      const where = `${ev.slug}:${i + 1} (${s.id})`;
      for (const k of ["id", "a", "r", "c", "j", "s", "m", "d", "p", "n", "q"]) if (!s[k] || (Array.isArray(s[k]) && !s[k].length)) errors.push(`${where}: missing ${k}`);
      const idp = fb ? ev.src : ev.slug;
      if (s.id && !s.id.startsWith(`${idp}-`)) errors.push(`${where}: id should start with ${idp}-`);
      if (fb) {
        if (Array.isArray(s.p) && (s.p.length < 4 || s.p.length > 5)) errors.push(`${where}: ${s.p.length} knowledge areas, expected 4 or 5`);
        const names = (know[ev.src]?.areas ?? []).map((a) => a.name);
        for (const p of s.p ?? []) if (!names.includes(p)) errors.push(`${where}: "${p}" is not a knowledge area of ${ev.name}`);
        if (Array.isArray(s.q) && s.q.length !== 3) errors.push(`${where}: ${s.q.length} judge cues, expected 3`);
        if (Array.isArray(s.n) && s.n.length < 4) errors.push(`${where}: fewer than 4 strong-answer notes`);
        if (!(Array.isArray(s.f) && s.f.length >= 3)) errors.push(`${where}: FBLA scenarios need case facts (f)`);
      } else {
        if (Array.isArray(s.p) && s.p.length !== kind.pis) errors.push(`${where}: ${s.p.length} performance indicators, expected ${kind.pis}`);
        if (Array.isArray(s.q) && s.q.length !== 2) errors.push(`${where}: ${s.q.length} judge questions, expected 2`);
        if (Array.isArray(s.n) && s.n.length < 3) errors.push(`${where}: fewer than 3 strong-answer notes`);
        if (ev.kind === "team" && !(Array.isArray(s.f) && s.f.length >= 3)) errors.push(`${where}: team events need case facts (f)`);
      }
      const words = (s.s ?? []).join(" ").split(/\s+/).length;
      if (words < (fb ? 90 : 45)) errors.push(`${where}: situation too short (${words} words)`);
      scenarios.push(s);
    });
  const ids = new Set(scenarios.map((s) => s.id));
  if (ids.size !== scenarios.length) errors.push(`${ev.slug}: duplicate ids`);
  if (scenarios.length < 5) errors.push(`${ev.slug}: ${scenarios.length} scenarios, expected at least 5`);
  total += scenarios.length;
  const areas = fb ? know[ev.src].areas : undefined;
  out.events.push({ ...ev, track, ...(areas ? { areas } : {}), scenarios });
}

for (const ev of meta.events) load(ev, `data/roleplays/${ev.slug}.jsonl`, "deca");
for (const ev of fmeta.events) load(ev, `data/fbla-roleplay/${ev.src}.jsonl`, "fbla");

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problems`);
  process.exit(1);
}
writeFileSync("web/src/data/roleplays.json", JSON.stringify(out));
console.log(`${out.events.length} events, ${total} scenarios, 0 problems`);
