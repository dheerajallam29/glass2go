// Freeze the swirl at several points and screenshot them (dev server only). Usage: node scripts/verify-swirl.mjs [baseUrl]
import { chromium } from "playwright-core";
const base = process.argv[2] ?? "http://127.0.0.1:3000";
const b = await chromium.launch({ channel: "chrome", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] }).catch(() => chromium.launch());
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(`${base}/deca`, { waitUntil: "load" });
await p.waitForTimeout(3500);
await p.screenshot({ path: "scripts/s-hub.png" });
await p.evaluate(() => document.querySelector("#exams")?.scrollIntoView());
await p.waitForTimeout(1500);
await p.screenshot({ path: "scripts/s-tiles.png" });
let i = 0;
for (const v of [0.18, 0.4, 0.62, 0.82, 0.95]) {
  await p.evaluate((x) => window.__swirl(x, 760, 420), v);
  await p.waitForTimeout(200);
  await p.screenshot({ path: `scripts/s-swirl${++i}.png` });
}
console.log("errors:", errs);
await b.close();
