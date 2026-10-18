// Validates data/roleplays/*.jsonl against the 2026-27 DECA role-play format and writes web/src/data/roleplays.json.
//   node tools/build-roleplays.mjs
// Scenario line: { id, a (instructional area), r (your role), c (company), j (judge's role), s [situation paragraphs],
//   f [case facts, team events], m (meeting place), d (what you present), p [performance indicators],
//   n [what a strong answer includes], q [judge's questions] }
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const meta = JSON.parse(readFileSync("data/roleplays/events.json", "utf8"));
const errors = [];
const out = { clusters: meta.clusters, kinds: meta.kinds, events: [] };
let total = 0;

for (const ev of meta.events) {
  const file = `data/roleplays/${ev.slug}.jsonl`;
  if (!existsSync(file)) {
    errors.push(`${ev.slug}: missing ${file}`);
    continue;
  }
  const kind = meta.kinds[ev.kind];
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
      if (s.id && !s.id.startsWith(`${ev.slug}-`)) errors.push(`${where}: id should start with ${ev.slug}-`);
      if (Array.isArray(s.p) && s.p.length !== kind.pis) errors.push(`${where}: ${s.p.length} performance indicators, expected ${kind.pis}`);
      if (Array.isArray(s.q) && s.q.length !== 2) errors.push(`${where}: ${s.q.length} judge questions, expected 2`);
      if (Array.isArray(s.n) && s.n.length < 3) errors.push(`${where}: fewer than 3 strong-answer notes`);
      if (ev.kind === "team" && !(Array.isArray(s.f) && s.f.length >= 3)) errors.push(`${where}: team events need case facts (f)`);
      const words = (s.s ?? []).join(" ").split(/\s+/).length;
      if (words < 45) errors.push(`${where}: situation too short (${words} words)`);
      scenarios.push(s);
    });
  const ids = new Set(scenarios.map((s) => s.id));
  if (ids.size !== scenarios.length) errors.push(`${ev.slug}: duplicate ids`);
  if (scenarios.length < 5) errors.push(`${ev.slug}: ${scenarios.length} scenarios, expected at least 5`);
  total += scenarios.length;
  out.events.push({ ...ev, scenarios });
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problems`);
  process.exit(1);
}
writeFileSync("web/src/data/roleplays.json", JSON.stringify(out));
console.log(`${out.events.length} events, ${total} scenarios, 0 problems`);
