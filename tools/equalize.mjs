// Makes every option of a question about the same length as the correct answer.
//   node tools/equalize.mjs view [N] [maxSpread]   writes renders/eq.json + renders/eq-view.txt for the next N questions whose options differ too much
//   node tools/equalize.mjs apply NAME             reads renders/eq.txt lines "idx.k| new text" and writes data/questions/overrides.NAME.jsonl
// k is the option number shown in the view (1-4). A wrong option is reworded by its old text; the correct one (marked *) with rt.
import { readFileSync, writeFileSync } from "node:fs";

const bank = JSON.parse(readFileSync("web/src/data/bank.json", "utf8"));
const [cmd, a, b] = process.argv.slice(2);

if (cmd === "view") {
  const n = Number(a ?? 150);
  const maxSpread = Number(b ?? 0.18);
  const pick = [];
  for (const q of bank) {
    const L = q.options.map((o) => o.t.length);
    const mean = L.reduce((x, y) => x + y, 0) / L.length;
    const target = L[q.answer];
    const worst = Math.max(...L.map((l) => Math.abs(l - target))) / Math.max(target, 1);
    if (worst > maxSpread && (Math.max(...L) - Math.min(...L)) > 6 && mean > 0) pick.push(q);
    if (pick.length >= n) break;
  }
  const lines = pick.map((q, i) => {
    const T = q.options[q.answer].t.length;
    const lo0 = Math.round(T * 0.88);
    const hi0 = Math.round(T * 1.12);
    const opts = q.options
      .map((o, k) => `   ${k + 1}${k === q.answer ? "*" : " "}${o.t.length < lo0 ? "<" : o.t.length > hi0 ? ">" : " "}[${o.t.length}] ${o.t}`)
      .join("\n");
    const lo = Math.max(1, Math.round(T * 0.88));
    const hi = Math.round(T * 1.12);
    return `${i + 1} (${lo}-${hi} chars) ${q.q.slice(0, 70)}\n${opts}`;
  });
  writeFileSync("renders/eq.json", JSON.stringify(pick.map((q) => ({ id: q.id, answer: q.answer, options: q.options.map((o) => o.t) }))));
  writeFileSync("renders/eq-view.txt", lines.join("\n"));
  console.log(`${pick.length} questions shown`);
} else if (cmd === "apply") {
  const items = JSON.parse(readFileSync("renders/eq.json", "utf8"));
  const edits = new Map();
  for (const line of readFileSync("renders/eq.txt", "utf8").split(/\r?\n/)) {
    const m = line.match(/^(\d+)\.(\d)\|\s*(.+)$/);
    if (!m) continue;
    const it = items[Number(m[1]) - 1];
    if (!it) continue;
    const k = Number(m[2]) - 1;
    const o = edits.get(it.id) ?? { id: it.id };
    if (k === it.answer) o.rt = m[3].trim();
    else (o.map ??= {})[it.options[k]] = m[3].trim();
    edits.set(it.id, o);
  }
  // warn about edits that still miss the target window so they can be redone
  let off = 0;
  for (const o of edits.values()) {
    const it = items.find((x) => x.id === o.id);
    const T = it.options[it.answer].length;
    for (const [old, nw] of Object.entries(o.map ?? {})) if (Math.abs(nw.length - T) > Math.max(3, T * 0.15)) off++;
  }
  console.log(`${off} reworded options still miss the length window by more than 15%`);
  const out = [...edits.values()].map((o) => JSON.stringify(o)).join("\n") + "\n";
  writeFileSync(`data/questions/overrides.${a}.jsonl`, out);
  console.log(`${edits.size} questions written to overrides.${a}.jsonl`);
} else console.log("usage: view [N] [maxSpread] | apply NAME");
