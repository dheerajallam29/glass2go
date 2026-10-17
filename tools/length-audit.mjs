// Lists questions whose correct answer is longer than every wrong answer by at least <margin> characters,
// printing the wrong options so they can be reworded: node length-audit.mjs <id-prefix> [margin] [limit]
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bank = JSON.parse(readFileSync(join(root, "web", "src", "data", "bank.json"), "utf8"));
const prefix = process.argv[2] ?? "";
const margin = Number(process.argv[3] ?? 5);
const limit = Number(process.argv[4] ?? 1e9);
const ratio = Number(process.argv[5] ?? 1.25);
let n = 0, total = 0;
for (const q of bank) {
  if (!q.id.startsWith(prefix)) continue;
  total++;
  const lens = q.options.map((o) => o.t.length);
  const r = lens[q.answer];
  const wmax = Math.max(...lens.filter((_, i) => i !== q.answer));
  if (r > ratio * wmax && r >= wmax + margin && n < limit) {
    n++;
    console.log(`${q.id} [${r}] R: ${q.options[q.answer].t}`);
    console.log(`   W: ${q.options.filter((_, i) => i !== q.answer).map((o) => o.t).join(" | ")}`);
  }
}
console.error(`${n} shown of ${total} questions`);
