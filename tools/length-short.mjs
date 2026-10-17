// Compact list for shortening right answers: id <tab> right text <tab> longest wrong length
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bank = JSON.parse(readFileSync(join(root, "web", "src", "data", "bank.json"), "utf8"));
const [prefix = "", margin = "10", ratio = "1.5"] = process.argv.slice(2);
let n = 0;
for (const q of bank) {
  if (!q.id.startsWith(prefix)) continue;
  const lens = q.options.map((o) => o.t.length);
  const r = lens[q.answer];
  const w = Math.max(...lens.filter((_, i) => i !== q.answer));
  if (r > Number(ratio) * w && r >= w + Number(margin)) { n++; console.log(`${q.id}\t${q.options[q.answer].t}\t${w}`); }
}
console.error(n + " listed");
