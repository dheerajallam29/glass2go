// Builds data/roleplays/pi-bank.json from two public DECA sources, saved as text first:
//   node tools/parse-pis.mjs <marketing-pi.txt> <case-guide.txt>
//  - the official Marketing performance-indicator list (MBA Research / DECA): Business Administration Core, Marketing cluster, pathways
//  - the 2026 classroom guide: the indicators of each sample event, which cover every other cluster
// Output: { areas: { "<cluster>|<area>": [{t, code?, level?}] }, events: { "<event>": { cluster, pathway, area, pis: [] } } }
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const [mktFile, guideFile] = process.argv.slice(2);
const out = { areas: {}, events: {} };
const add = (key, t, extra = {}) => {
  const list = (out.areas[key] ??= []);
  if (!list.some((x) => x.t.toLowerCase() === t.toLowerCase())) list.push({ t, ...extra });
};

// ---- the Marketing list ---------------------------------------------------------------------------------------------
{
  const lines = readFileSync(mktFile, "utf8").split(/\r?\n/);
  let tier = "";
  let area = "";
  let pathway = "";
  let inPIs = false;
  for (const raw of lines) {
    const l = raw.trim();
    let m;
    if ((m = l.match(/^Tier 1: Business Administration Core/))) tier = "core";
    else if ((m = l.match(/^Tier 2: (.+?) Career Cluster/))) tier = "marketing";
    else if ((m = l.match(/^Tier 3: (.+?)$/)) && !/Pathways/.test(l)) {
      tier = "pathway";
      pathway = m[1].replace(/\s*Pathway.*$/, "").trim();
    }
    if ((m = l.match(/^Instructional Area: (.+?) \(([A-Z]{2})\)/))) {
      area = m[1].trim();
      inPIs = false;
      continue;
    }
    if (/^Performance Indicators:/.test(l)) {
      inPIs = true;
      continue;
    }
    if (/^Performance Element:/.test(l) || /^Standard:/.test(l)) {
      inPIs = false;
      continue;
    }
    if (inPIs && tier && area && (m = l.match(/^(.+?) \(([A-Z]{2}:\d+)\) \((PQ|CS|SP)\)$/))) {
      const key = tier === "core" ? `core|${area}` : tier === "marketing" ? `marketing|${area}` : `marketing:${pathway}|${area}`;
      add(key, m[1].trim(), { code: m[2], level: m[3] });
    }
  }
}

// ---- the classroom guide: each sample event's own indicators --------------------------------------------------------
{
  const text = readFileSync(guideFile, "utf8");
  const parts = text.split(/CAREER CLUSTER\n/).slice(1);
  for (const p of parts) {
    const head = text.slice(Math.max(0, text.indexOf(p) - 200), text.indexOf(p));
    const ev = (head.match(/([A-Z&+\- ]+(?:SERIES|TEAM DECISION MAKING|EVENT|LITERACY)[A-Z ]*)\n?$/) ?? [])[1]?.trim() ?? "";
    const cluster = (p.match(/^([^\n_]+)/) ?? [])[1]?.trim() ?? "";
    const pathway = (p.match(/CAREER PATHWAY\n([^\n_]+)/) ?? [])[1]?.trim() ?? "";
    const area = (p.match(/INSTRUCTIONAL AREA\n([^\n]+)/) ?? [])[1]?.trim() ?? "";
    const blk = (p.match(/PERFORMANCE INDICATORS\n([\s\S]*?)(?:\n(?:PAGE|[A-Z]{2,5}-26)|\n\d+\n)/) ?? [])[1] ?? "";
    const pis = blk
      .split("\n")
      .map((s) => s.replace(/^§\s*/, "").trim())
      .filter((s) => s && !/^(Published|online|Printed|Association|District)/.test(s));
    // wrapped lines: join those that do not start with a capital or end without a period
    const joined = [];
    for (const s of pis) {
      if (joined.length && !/^[A-Z]/.test(s)) joined[joined.length - 1] += " " + s;
      else joined.push(s);
    }
    if (cluster && area && joined.length) {
      const key = `${ev || "?"}|${area}`;
      out.events[key] = { cluster, pathway, area, pis: joined };
      for (const t of joined) add(`${cluster}|${area}`, t, { sample: true });
    }
  }
}

mkdirSync("data/roleplays", { recursive: true });
writeFileSync("data/roleplays/pi-bank.json", JSON.stringify(out, null, 1));
const n = Object.values(out.areas).reduce((a, l) => a + l.length, 0);
console.log(`areas: ${Object.keys(out.areas).length}, indicators: ${n}, sample events: ${Object.keys(out.events).length}`);
for (const [k, v] of Object.entries(out.events)) console.log(" ", k, "|", v.cluster, "|", v.pathway, "|", v.pis.length);
