// Steps through the homepage chapters and saves a screenshot at each: node scripts/film-check.mjs [baseUrl] [desktop|phone]
import { chromium } from "playwright-core";
const base = process.argv[2] ?? "http://localhost:3000";
const phone = process.argv[3] === "phone";
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(base + "/", { waitUntil: "networkidle" });
await p.waitForTimeout(6000);
const tag = phone ? "phone" : "desk";
await p.screenshot({ path: `scripts/film-${tag}-0.png` });
for (let i = 1; i <= 4; i++) {
  await p.keyboard.press("ArrowDown");
  await p.waitForFunction((n) => [...document.querySelectorAll('ol[aria-label="Chapters"] button')].findIndex((x) => x.getAttribute("aria-current") === "step") === n, i, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `scripts/film-${tag}-${i}.png` });
}
console.log("errors", errs.slice(0, 5));
await b.close();
