// Goes to a homepage chapter, waits for its caption to appear, then samples the picture behind the caption for several seconds.
// A dark patch that fades or a frame that swaps shows up as a change in these numbers:  node scripts/settle-check.mjs [chapterIndex] [url] [desktop|phone]
import { chromium } from "playwright-core";
import sharp from "sharp";
const chapter = Number(process.argv[2] ?? 2);
const base = process.argv[3] ?? "http://localhost:3000";
const phone = process.argv[4] === "phone";
const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: phone, isMobile: phone });
const p = await ctx.newPage();
await p.goto(base + "/", { waitUntil: "networkidle" });
await p.waitForTimeout(6000);
for (let i = 1; i <= chapter; i++) {
  await p.keyboard.press("ArrowDown");
  await p.waitForFunction((n) => [...document.querySelectorAll('ol[aria-label="Chapters"] button')].findIndex((x) => x.getAttribute("aria-current") === "step") === n, i, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(i < chapter ? 3500 : 0);
}
// the caption is the element that fades in with data-on
await p.waitForFunction(() => [...document.querySelectorAll("[data-on]")].some((e) => e.querySelector("h1, h2") && getComputedStyle(e).opacity > 0.95), null, { timeout: 20000 });
const box = await p.evaluate(() => {
  const e = [...document.querySelectorAll("[data-on]")].find((x) => x.querySelector("h1, h2") && getComputedStyle(x).opacity > 0.95);
  const r = e.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
const t0 = Date.now();
const out = [];
for (const at of [0, 500, 1000, 1500, 2000, 3000, 4000]) {
  await p.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
  const buf = await p.screenshot({ path: `scripts/settle-${phone ? "ph" : "d"}${chapter}-${at}.png` });
  const meta = await sharp(buf).metadata();
  const left = Math.max(0, Math.round(box.x)), top = Math.max(0, Math.round(box.y));
  const width = Math.min(meta.width - left, Math.round(box.w)), height = Math.min(meta.height - top, Math.round(box.h));
  const { data, info } = await sharp(buf).extract({ left, top, width, height }).raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  for (let k = 0; k < data.length; k += info.channels) sum += (data[k] + data[k + 1] + data[k + 2]) / 3;
  out.push(`${at}ms: ${(sum / (data.length / info.channels)).toFixed(1)}`);
}
console.log(out.join(" | "));
await b.close();
