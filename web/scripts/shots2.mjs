import { chromium } from "playwright-core";
const base = process.argv[2] ?? "http://127.0.0.1:3400";
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
for (const t of ["deca", "fbla"]) {
  await p.goto(`${base}/${t}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `scripts/v-${t}.png` });
}
await p.evaluate(() => document.querySelector("#exams")?.scrollIntoView());
await p.waitForTimeout(1500);
await p.screenshot({ path: "scripts/v-tiles.png" });
// page transition
await p.locator('a[href*="/fbla/practice/accounting"]').first().click().catch(() => {});
console.log("errors:", errs);
await b.close();
