// Scrolls a page steadily and reports frame times: node scripts/scroll-bench.mjs [url]
import { chromium } from "playwright-core";
const url = process.argv[2] ?? "http://localhost:3000/deca";
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
const res = await p.evaluate(async () => {
  const deltas = [];
  let last = performance.now();
  let run = true;
  const tick = (t) => { deltas.push(t - last); last = t; if (run) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const max = document.documentElement.scrollHeight - innerHeight;
  const t0 = performance.now();
  await new Promise((done) => {
    const step = () => {
      const k = (performance.now() - t0) / 4000;
      scrollTo(0, Math.min(max, k * max));
      k < 1 ? requestAnimationFrame(step) : done();
    };
    step();
  });
  run = false;
  deltas.shift();
  deltas.sort((a, b) => a - b);
  const pct = (q) => deltas[Math.floor(q * (deltas.length - 1))];
  const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  return { frames: deltas.length, avgMs: +avg.toFixed(1), p50: +pct(0.5).toFixed(1), p95: +pct(0.95).toFixed(1), worst: +deltas[deltas.length - 1].toFixed(1), over33: deltas.filter((d) => d > 33).length, pageHeight: max };
});
console.log(url, JSON.stringify(res));
await b.close();
