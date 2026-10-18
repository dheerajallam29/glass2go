// node tools/length-view.mjs <count> [min] [max]  -> saves renders/batch.json and renders/batch-view.txt (compact numbered list)
import { readFileSync, writeFileSync } from "node:fs";
const count = Number(process.argv[2] ?? 200), min = Number(process.argv[3] ?? 1.1), max = Number(process.argv[4] ?? 99);
const l = JSON.parse(readFileSync("renders/length-worklist.json", "utf8")).filter((x) => x.ratio > min && x.ratio <= max).sort((a, b) => a.ratio - b.ratio).slice(0, count);
const batch = l.map((x, i) => { const mx = Math.max(...x.w.map((t) => t.length)); return { n: i + 1, id: x.id, at: x.w.findIndex((t) => t.length === mx), need: x.r.length - mx + 2, r: x.r, w: x.w }; });
writeFileSync("renders/batch.json", JSON.stringify(batch));
const out = batch.map((b, i) => `${b.n} +${b.need} ${l[i].q.replace(/\s+/g, " ").slice(0, 75)} ## ${b.need >= 18 ? "R: " + b.r + " ## " : ""}${b.w[b.at]}`).join("\n");
writeFileSync("renders/batch-view.txt", out);
console.log(batch.length, "items,", out.length, "chars");
