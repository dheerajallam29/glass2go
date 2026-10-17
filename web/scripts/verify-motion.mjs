import { chromium } from "playwright-core";
const base = process.argv[2] ?? "http://localhost:3200";
const b = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(base, { waitUntil: "networkidle" });
const fps = await p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 1500 ? requestAnimationFrame(f) : res(n / 1.5); }; requestAnimationFrame(f); }));
console.log("rAF fps:", Math.round(fps));
await p.waitForTimeout(6000);
const chapter = () => p.evaluate(() => [...document.querySelectorAll('ol[aria-label="Chapters"] button')].findIndex((x) => x.getAttribute("aria-current") === "step"));
for (let i = 1; i <= 4; i++) {
  const t0 = Date.now();
  await p.keyboard.press("ArrowDown");
  await p.waitForFunction((n) => [...document.querySelectorAll('ol[aria-label="Chapters"] button')].findIndex((x) => x.getAttribute("aria-current") === "step") === n, i, { timeout: 15000 }).catch(() => {});
  console.log(`move ${i}: chapter ${await chapter()} after ${Date.now() - t0} ms`);
  await p.waitForTimeout(900);
}
await p.screenshot({ path: "scripts/home-finale.png" });
// zoom into DECA
await p.locator('a[data-trophy="deca"]').hover();
await p.locator('a[data-trophy="deca"]').click();
await p.waitForTimeout(450);
await p.screenshot({ path: "scripts/zoom-mid.png" });
await p.waitForTimeout(550);
await p.screenshot({ path: "scripts/zoom-end.png" });
await p.waitForURL("**/deca/", { timeout: 8000 }).catch(() => {});
console.log("url:", p.url());
await p.waitForTimeout(250);
await p.screenshot({ path: "scripts/arrive-early.png" });
await p.waitForTimeout(1600);
await p.screenshot({ path: "scripts/hub-deca.png" });
console.log("errors:", errs);
await b.close();
