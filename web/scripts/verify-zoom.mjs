import { chromium } from "playwright-core";
const base = process.argv[2] ?? "http://localhost:3200";
const b = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(base, { waitUntil: "networkidle" });
await p.waitForTimeout(6000);
for (let i = 1; i <= 4; i++) {
  await p.keyboard.press("ArrowDown");
  await p.waitForFunction((n) => [...document.querySelectorAll('ol[aria-label="Chapters"] button')].findIndex((x) => x.getAttribute("aria-current") === "step") === n, i, { timeout: 15000 });
  await p.waitForTimeout(800);
}
await p.evaluate(() => {
  window.__log = [];
  const t0 = performance.now();
  const tick = () => {
    const c = [...document.querySelectorAll("div")].find((d) => d.getAttribute("data-mode"));
    window.__log.push([Math.round(performance.now() - t0), location.pathname, c ? c.dataset.mode : "-", c ? getComputedStyle(c).opacity.slice(0, 4) : "-", sessionStorage.getItem("g2g-zoom")]);
    if (performance.now() - t0 < 2600) setTimeout(tick, 120);
  };
  tick();
});
await p.locator('a[data-trophy="deca"]').click();
await p.waitForTimeout(2800);
console.log((await p.evaluate(() => window.__log)).map((r) => r.join(" ")).join("\n"));
await b.close();
