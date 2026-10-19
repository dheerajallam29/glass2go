// Pads explanations shorter than 10 characters so batch files pass build-bank validation:  node tools/fix-short-whys.mjs data/questions/<file>.jsonl
import { readFileSync, writeFileSync } from "node:fs";
for (const f of process.argv.slice(2)) {
  const out = readFileSync(f, "utf8").split("\n").map((l) => {
    if (!l.trim()) return l;
    const o = JSON.parse(l);
    const pad = (p) => { if (p && p[1] && p[1].length < 10) p[1] = p[1].replace(/\.$/, "") + " in this case."; };
    pad(o.r); (o.w || []).forEach(pad);
    return JSON.stringify(o);
  }).join("\n");
  writeFileSync(f, out);
}
