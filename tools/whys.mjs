// Writes a fuller reason for every option, and can fix an option's wording at the same time.
//   node tools/whys.mjs view [N]    next N questions that still have a thin reason -> renders/why.json + renders/why-view.txt
//   node tools/whys.mjs view-range FROM TO TAG   bank positions FROM..TO-1 (skipping finished ones) -> renders/why-TAG.json + why-TAG-view.txt (for parallel helpers)
//   node tools/whys.mjs apply NAME  reads renders/why.txt -> data/questions/overrides.NAME.jsonl, and logs the ids in data/why-done.txt
// why.txt lines:  "idx.k| reason for option k"   and   "idx.k=| new wording for option k"   (k is the option number, 1-4)
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";

const bank = JSON.parse(readFileSync("web/src/data/bank.json", "utf8"));
const DONE = "data/why-done.txt";
const done = new Set(existsSync(DONE) ? readFileSync(DONE, "utf8").split(/\r?\n/).filter(Boolean) : []);
const [cmd, a, b, c] = process.argv.slice(2);

if (cmd === "view") {
  const n = Number(a ?? 80);
  const pick = bank.filter((q) => !done.has(q.id)).slice(0, n);
  const lines = pick.map((q, i) => {
    const T = q.options[q.answer].t.length;
    const w = Math.max(4, Math.round(T * 0.12));
    const opts = q.options
      .map((o, k) => `  ${k + 1}${k === q.answer ? "*" : " "}${Math.abs(o.t.length - T) > w ? (o.t.length < T ? "<" : ">") : " "}[${o.t.length}] ${o.t}`)
      .join("\n");
    return `${i + 1} (${T - w}-${T + w}) [${q.area}] ${q.q}\n${opts}`;
  });
  writeFileSync("renders/why.json", JSON.stringify(pick.map((q) => ({ id: q.id, answer: q.answer, options: q.options.map((o) => o.t) }))));
  writeFileSync("renders/why-view.txt", lines.join("\n"));
  console.log(`${pick.length} shown, ${bank.length - done.size} still thin`);
} else if (cmd === "view-range") {
  const from = Number(a), to = Number(b), tag = c;
  const pick = bank.slice(from, to).filter((q) => !done.has(q.id));
  const lines = pick.map((q, i) => {
    const T = q.options[q.answer].t.length;
    const w = Math.max(4, Math.round(T * 0.12));
    const opts = q.options
      .map((o, k) => `  ${k + 1}${k === q.answer ? "*" : " "}${Math.abs(o.t.length - T) > w ? (o.t.length < T ? "<" : ">") : " "}[${o.t.length}] ${o.t}`)
      .join("\n");
    return `${i + 1} (${T - w}-${T + w}) [${q.area}] ${q.q}\n${opts}`;
  });
  writeFileSync(`renders/why-${tag}.json`, JSON.stringify(pick.map((q) => ({ id: q.id, answer: q.answer, options: q.options.map((o) => o.t) }))));
  writeFileSync(`renders/why-${tag}-view.txt`, lines.join("\n"));
  console.log(`${pick.length} questions in renders/why-${tag}-view.txt`);
} else if (cmd === "apply") {
  const tag = b; // optional: apply NAME TAG reads renders/why-TAG.json and renders/why-TAG.txt
  const items = JSON.parse(readFileSync(tag ? `renders/why-${tag}.json` : "renders/why.json", "utf8"));
  const why = new Map(); // id -> {k: text}
  const edit = new Map();
  for (const line of readFileSync("renders/why.txt", "utf8").split(/\r?\n/)) {
    const m = line.match(/^(\d+)\.(\d)(=?)\|\s*(.+)$/);
    if (!m) continue;
    const it = items[Number(m[1]) - 1];
    if (!it) continue;
    const k = Number(m[2]) - 1;
    (m[3] ? edit : why).set(`${it.id}#${k}`, m[4].trim());
  }
  const out = [];
  const problems = [];
  for (const it of items) {
    const o = { id: it.id };
    const finalT = it.options.map((t, k) => edit.get(`${it.id}#${k}`) ?? t);
    if (new Set(finalT.map((t) => t.toLowerCase())).size < 4) {
      problems.push(`${it.id}: edits would duplicate an option, edits dropped`);
      finalT.splice(0, 4, ...it.options);
    }
    const ww = {};
    let missing = 0;
    it.options.forEach((t, k) => {
      const nt = finalT[k];
      if (nt !== t) {
        if (k === it.answer) o.rt = nt;
        else (o.map ??= {})[t] = nt;
      }
      const w = why.get(`${it.id}#${k}`);
      if (!w) {
        missing++;
        return;
      }
      if (k === it.answer) o.rw = w;
      else ww[nt] = w;
    });
    if (Object.keys(ww).length) o.ww = ww;
    if (missing) problems.push(`${it.id}: ${missing} option(s) have no reason (keeps the old one)`);
    out.push(JSON.stringify(o));
  }
  writeFileSync(`data/questions/overrides.${a}.jsonl`, out.join("\n") + "\n");
  appendFileSync(DONE, items.map((i) => i.id).join("\n") + "\n");
  console.log(`${items.length} questions written to overrides.${a}.jsonl`);
  console.log(problems.length ? problems.join("\n") : "no problems");
} else console.log("usage: view [N] | apply NAME");
