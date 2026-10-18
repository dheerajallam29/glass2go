// Sweeps the pointer across the trophy and reports frame times and how far the sway advances per frame:
//   node scripts/trophy-bench.mjs [url]
import { chromium } from "playwright-core";
const url = process.argv[2] ?? "http://localhost:3000/deca";
const b = await chromium.launch({ channel: "chrome" });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(3500);
const box = await p.locator("[data-track]").first().boundingBox();
await p.evaluate(() => {
  window.__d = [];
  let last = performance.now();
  const tick = (t) => { window.__d.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
await p.mouse.move(box.x + 5, box.y + box.height / 2);
for (let k = 0; k <= 120; k++) {
  const x = box.x + 5 + ((box.width - 10) * (0.5 - 0.5 * Math.cos((k / 120) * Math.PI * 2)));
  await p.mouse.move(x, box.y + box.height / 2 + Math.sin(k / 9) * 60);
  await p.waitForTimeout(16);
}
const d = await p.evaluate(() => window.__d.slice(2).sort((a, b) => a - b));
const q = (x) => +d[Math.floor(x * (d.length - 1))].toFixed(1);
console.log(url, JSON.stringify({ frames: d.length, p50: q(0.5), p95: q(0.95), worst: q(1), over33: d.filter((v) => v > 33).length }));
await b.close();
