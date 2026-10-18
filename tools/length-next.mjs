// Shows questions whose correct answer is the single longest option, from renders/length-worklist.json (written by build-bank --worklist):
//   node tools/length-next.mjs [count] [skip] [--min 1.25] [--from ratio|file:<overrides file>] [--max 99]
//   --min/--max filter by correct/longest-wrong ratio; default order is worst first.
import { readFileSync } from "node:fs";
const a = process.argv.slice(2);
const flag = (n, d) => (a.includes(n) ? a[a.indexOf(n) + 1] : d);
const nums = a.filter((x, i) => !x.startsWith("--") && !a[i - 1]?.startsWith("--")).map(Number);
const n = nums[0] ?? 100, skip = nums[1] ?? 0, min = Number(flag("--min", 1.25)), max = Number(flag("--max", 99));
let list = JSON.parse(readFileSync("renders/length-worklist.json", "utf8")).filter((x) => x.ratio > min && x.ratio <= max);
const from = flag("--from", "");
if (from.startsWith("file:")) {
  const ids = new Set(readFileSync(`data/questions/${from.slice(5)}`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).id));
  list = list.filter((x) => ids.has(x.id));
}
list.sort((p, q) => q.ratio - p.ratio);
for (const x of list.slice(skip, skip + n)) {
  console.log(`${x.id} | ${x.q.replace(/\s+/g, " ").slice(0, 140)}`);
  console.log(`  R(${x.r.length}) ${x.r}`);
  x.w.forEach((w, i) => console.log(`  ${i}(${w.length}) ${w}`));
}
console.error(`${list.length} match`);
