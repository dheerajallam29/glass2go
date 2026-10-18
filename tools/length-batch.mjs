// Compact workflow for the answer-length fix.
//   node tools/build-bank.mjs --worklist                    refresh renders/length-worklist.json
//   node tools/length-batch.mjs pick <count> [--min 1] [--max 1.5] [--skip n]   saves renders/batch.json and prints a numbered list
//   (write edits to renders/edits.txt, one per line:  N| +suffix            append to the longest wrong answer
//                                                     N| =new text         replace the longest wrong answer (its reason stays)
//                                                     N| ~new correct text shorten/reword the correct answer (its reason stays)
//                                                     several edits on one line may be joined with  ;;  )
//   node tools/length-batch.mjs apply <name>                writes data/questions/overrides.3<name>.jsonl from renders/edits.txt
import { readFileSync, writeFileSync } from "node:fs";
const [cmd, ...a] = process.argv.slice(2);
const flag = (n, d) => (a.includes(n) ? Number(a[a.indexOf(n) + 1]) : d);
if (cmd === "pick") {
  const count = Number(a[0]), min = flag("--min", 1), max = flag("--max", 1.5), skip = flag("--skip", 0);
  const list = JSON.parse(readFileSync("renders/length-worklist.json", "utf8")).filter((x) => x.ratio > min && x.ratio <= max).sort((p, q) => p.ratio - q.ratio).slice(skip, skip + count);
  const batch = list.map((x, i) => {
    const mx = Math.max(...x.w.map((t) => t.length));
    return { n: i + 1, id: x.id, at: x.w.findIndex((t) => t.length === mx), need: x.r.length - mx + 2, r: x.r, w: x.w };
  });
  writeFileSync("renders/batch.json", JSON.stringify(batch));
  for (const b of batch) console.log(`${b.n} +${b.need} ${b.id.replace(/^(fbla|deca)-/, "").slice(0, 3)} | ${list[b.n - 1].q.replace(/\s+/g, " ").slice(0, 90)} || R: ${b.r} || W: ${b.w[b.at]}`);
  console.error(`${list.length} picked`);
} else if (cmd === "apply") {
  const batch = JSON.parse(readFileSync("renders/batch.json", "utf8"));
  const by = new Map(batch.map((b) => [b.n, b]));
  const out = [];
  const bad = [];
  for (const line of readFileSync("renders/edits.txt", "utf8").split("\n").filter((l) => l.trim())) {
    const i = line.indexOf("|");
    const b = by.get(Number(line.slice(0, i)));
    if (!b) { bad.push(line.slice(0, 40)); continue; }
    const o = { id: b.id };
    let wrong = [...b.w], right = b.r;
    for (const part of line.slice(i + 1).split(";;")) {
      const p = part.replace(/^\s+/, "");
      if (p.startsWith("+")) { wrong[b.at] = wrong[b.at] + (p[1] === "," ? p.slice(1) : " " + p.slice(1).trim()); }
      else if (p.startsWith("=")) { wrong[b.at] = p.slice(1).trim(); }
      else if (p.startsWith("~")) { right = p.slice(1).trim(); }
      else bad.push(line.slice(0, 40));
    }
    if (right !== b.r) o.rt = right;
    const wt = wrong.map((t, k) => (t !== b.w[k] ? t : null));
    if (wt.some((t) => t !== null)) o.wt = wt;
    out.push(JSON.stringify(o));
  }
  writeFileSync(`data/questions/overrides.${a[0]}.jsonl`, out.join("\n") + "\n");
  console.log(`${out.length} overrides written to overrides.${a[0]}.jsonl` + (bad.length ? `, ${bad.length} lines skipped: ${bad.slice(0, 5).join(" / ")}` : ""));
}
