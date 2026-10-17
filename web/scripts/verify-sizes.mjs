// Check every chapter at many window sizes: does any copy overlap a trophy or leave the window?
//   node scripts/verify-sizes.mjs <url> [WxH ...]
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [url, ...sizes] = process.argv.slice(2);
const list = (sizes.length ? sizes : ["1920x1080", "1536x730", "1366x768", "1280x720", "1440x900", "2560x1080", "1024x768", "834x1112", "430x932", "390x844", "360x640"]).map((s) => s.split("x").map(Number));
const layout = JSON.parse(readFileSync(new URL("../public/flight/layout.json", import.meta.url), "utf8"));
const WP = [1, 49, 157, 205, 253];
const out = "../renders/lab/sizes";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
let bad = 0;
for (const [W, H] of list) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector("[data-ready]", { timeout: 60000 });
  await page.waitForTimeout(1200);
  const problems = [];
  for (let i = 0; i <= 4; i++) {
    if (i > 0) {
      await page.keyboard.press("ArrowDown");
      await page.waitForFunction(() => !document.querySelector("section[data-zone][data-on]"), null, { timeout: 15000 }).catch(() => {});
    }
    await page.waitForFunction(() => !!document.querySelector("section[data-zone][data-on]"), null, { timeout: 40000 });
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const s = document.querySelector("[data-set]");
      const cs = getComputedStyle(s);
      const px = (n) => parseFloat(cs.getPropertyValue(n));
      const sec = document.querySelector("section[data-zone][data-on]");
      return {
        set: s.dataset.set, ox: px("--ox"), oy: px("--oy"), fw: px("--fw"), fh: px("--fh"),
        rects: [...sec.querySelectorAll("h1,h2,p,ol,button")].map((e) => { const b = e.getBoundingClientRect(); return { t: e.tagName + ' "' + (e.textContent || "").slice(0, 28) + '"', x: b.x, y: b.y, w: b.width, h: b.height }; }),
      };
    });
    const b = layout[r.set]?.[String(WP[i])] ?? {};
    for (const k of ["deca", "fbla"]) {
      if (!b[k]) continue;
      const [x0, y0, x1, y1] = b[k];
      const t = { x: r.ox + x0 * r.fw, y: r.oy + y0 * r.fh, w: (x1 - x0) * r.fw, h: (y1 - y0) * r.fh };
      for (const q of r.rects) {
        const ix = Math.max(0, Math.min(q.x + q.w, t.x + t.w) - Math.max(q.x, t.x));
        const iy = Math.max(0, Math.min(q.y + q.h, t.y + t.h) - Math.max(q.y, t.y));
        if (ix * iy > 1) problems.push(`stop ${i}: ${q.t} overlaps ${k} (${Math.round(ix)}x${Math.round(iy)}px)`);
      }
    }
    for (const q of r.rects) if (q.x < -1 || q.y < -1 || q.x + q.w > W + 1 || q.y + q.h > H + 1) problems.push(`stop ${i}: ${q.t} leaves the window`);
    if (i === 4) await page.screenshot({ path: join(out, `${W}x${H}-finale.png`) });
  }
  console.log(`${W}x${H} (${(await page.evaluate(() => document.querySelector("[data-set]").dataset.set))}): ${problems.length ? problems.join(" | ") : "ok"}`);
  bad += problems.length;
  await page.close();
}
console.log(bad ? `${bad} problem(s)` : "all sizes clean");
await browser.close();
