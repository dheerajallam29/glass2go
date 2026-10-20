// Makes every option of a question about the same length as the correct answer.
//   node tools/equalize.mjs view [N] [maxSpread]   writes renders/eq.json + renders/eq-view.txt for the next N questions whose options differ too much
//   node tools/equalize.mjs apply NAME             reads renders/eq.txt lines "idx.k| new text" and writes data/questions/overrides.NAME.jsonl
// k is the option number shown in the view (1-4). A wrong option is reworded by its old text; the correct one (marked *) with rt.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const bank = JSON.parse(readFileSync("web/src/data/bank.json", "utf8"));
const [cmd, a, b] = process.argv.slice(2);

if (cmd === "view") {
  const n = Number(a ?? 150);
  const maxSpread = Number(b ?? 0.12);
  const pick = [];
  for (const q of bank) {
    const L = q.options.map((o) => o.t.length);
    const mean = L.reduce((x, y) => x + y, 0) / L.length;
    const target = L[q.answer];
    const worst = Math.max(...L.map((l) => Math.abs(l - target))) / Math.max(target, 1);
    const slack = Math.max(4, Math.round(target * maxSpread));
    if (Math.max(...L.map((l) => Math.abs(l - target))) > slack && mean > 0) pick.push(q);
    if (pick.length >= n) break;
  }
  const lines = pick.map((q, i) => {
    const T = q.options[q.answer].t.length;
    const slack0 = Math.max(4, Math.round(T * 0.12));
    const lo0 = T - slack0;
    const hi0 = T + slack0;
    const opts = q.options
      .map((o, k) => `   ${k + 1}${k === q.answer ? "*" : " "}${o.t.length < lo0 ? "<" : o.t.length > hi0 ? ">" : " "}[${o.t.length}] ${o.t}`)
      .join("\n");
    const lo = Math.max(1, T - slack0);
    const hi = T + slack0;
    return `${i + 1} (${lo}-${hi} chars) ${q.q.slice(0, 45)}\n${opts}`;
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
  const misses = [];
  for (const o of edits.values()) {
    const idx = items.findIndex((x) => x.id === o.id) + 1;
    const it = items[idx - 1];
    const T = it.options[it.answer].length;
    const w = Math.max(4, Math.round(T * 0.12));
    for (const [old, nw] of Object.entries(o.map ?? {})) {
      if (Math.abs(nw.length - T) > w) misses.push(`${idx}.${it.options.indexOf(old) + 1} wants ${T - w}-${T + w}, has ${nw.length}`);
    }
  }
  console.log(`${misses.length} reworded options still miss the window`);
  if (misses.length) writeFileSync("renders/eq-misses.txt", misses.join(String.fromCharCode(10)));
  // never let an edit create two identical options in one question
  for (const [id, o] of [...edits]) {
    const it = items.find((x) => x.id === id);
    const finals = it.options.map((t, k) => (k === it.answer ? o.rt ?? t : o.map?.[t] ?? t).trim().toLowerCase());
    if (new Set(finals).size < finals.length) {
      console.log(`dropped (would duplicate an option): ${id}`);
      edits.delete(id);
    }
  }
  // flag edited questions where the correct answer would end up strictly longest
  const longest = [];
  for (const o of edits.values()) {
    const idx = items.findIndex((x) => x.id === o.id) + 1;
    const it = items[idx - 1];
    const fin = it.options.map((t, k) => (k === it.answer ? o.rt ?? t : o.map?.[t] ?? t));
    const T = fin[it.answer].length;
    const mw = Math.max(...fin.filter((_, k) => k !== it.answer).map((t) => t.length));
    if (mw < T) longest.push(`${idx} correct ${T}, longest wrong ${mw}`);
  }
  console.log(`${longest.length} edited questions leave the correct answer strictly longest (see renders/eq-longest.txt)`);
  writeFileSync("renders/eq-longest.txt", longest.join(String.fromCharCode(10)));
  const out = [...edits.values()].map((o) => JSON.stringify(o)).join("\n") + "\n";
  writeFileSync(`data/questions/overrides.${a}.jsonl`, out);
  console.log(`${edits.size} questions written to overrides.${a}.jsonl`);
} else console.log("usage: view [N] [maxSpread] | apply NAME");
