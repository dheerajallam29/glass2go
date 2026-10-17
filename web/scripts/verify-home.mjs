// Drive the homepage like a visitor in headless Chrome: play each chapter, screenshot where it lands,
// measure how smoothly it played, and check that no words overlap a trophy.
//   node scripts/verify-home.mjs <url> <outDir> [--mobile] [--reduced] [--w 1440 --h 900] [--hover]
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [url = "http://localhost:3000", out = "../renders/lab", ...flags] = process.argv.slice(2);
const flag = (n) => flags.includes(n);
const val = (n, d) => (flags.includes(n) ? Number(flags[flags.indexOf(n) + 1]) : d);
const mobile = flag("--mobile");
const W = val("--w", mobile ? 390 : 1440);
const H = val("--h", mobile ? 844 : 900);
mkdirSync(out, { recursive: true });

const layout = JSON.parse(readFileSync(new URL("../public/flight/layout.json", import.meta.url), "utf8"));

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: mobile ? 2 : 1,
  hasTouch: mobile,
  isMobile: mobile,
  reducedMotion: flag("--reduced") ? "reduce" : "no-preference",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !/hmr|favicon/.test(m.text()) && errors.push(m.text()));
await page.addInitScript(() => {
  window.__ticks = [];
  const loop = (t) => { window.__ticks.push(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
});

await page.goto(url, { waitUntil: "load" });
await page.waitForSelector("[data-ready]", { timeout: 60000 });
await page.waitForTimeout(1500);

const stageVars = () => page.evaluate(() => {
  const s = document.querySelector("[data-set]");
  const cs = getComputedStyle(s);
  const px = (n) => parseFloat(cs.getPropertyValue(n));
  return { set: s.dataset.set, ox: px("--ox"), oy: px("--oy"), fw: px("--fw"), fh: px("--fh") };
});
const activeZone = () => page.evaluate(() => document.querySelector("section[data-zone][data-on]")?.dataset.zone ?? null);

async function copyRects() {
  return page.evaluate(() => {
    const sec = document.querySelector("section[data-zone][data-on]");
    if (!sec) return [];
    return [...sec.querySelectorAll("h1,h2,p,ol,button")].map((e) => {
      const r = e.getBoundingClientRect();
      return { tag: e.tagName, x: r.x, y: r.y, w: r.width, h: r.height, text: (e.textContent || "").slice(0, 40) };
    });
  });
}

const WP = [1, 49, 157, 205, 253];
const report = [];
const names = ["hero", "deca", "fbla", "ranks", "finale"];

async function play(dir) {
  await page.evaluate(() => { window.__ticks = []; });
  const t0 = Date.now();
  await page.keyboard.press(dir > 0 ? "ArrowDown" : "ArrowUp");
  const before = await activeZone();
  // wait for the words to disappear (move started) and a chapter to show again (move finished)
  await page.waitForFunction(() => !document.querySelector("section[data-zone][data-on]"), null, { timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => !!document.querySelector("section[data-zone][data-on]"), null, { timeout: 30000 });
  const ms = Date.now() - t0;
  const ticks = await page.evaluate(() => window.__ticks.slice());
  const gaps = ticks.slice(1).map((t, i) => t - ticks[i]);
  return { before, ms, fps: gaps.length ? 1000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0, worst: gaps.length ? Math.max(...gaps) : 0 };
}

const shoot = async (name) => { await page.waitForTimeout(1300); await page.screenshot({ path: join(out, `${name}.png`) }); };

await shoot("0-hero");
for (let i = 1; i <= 4; i++) {
  const m = await play(1);
  await shoot(`${i}-${names[i]}`);
  const sv = await stageVars();
  const rects = await copyRects();
  const b = layout[sv.set]?.[String(WP[i])] ?? {};
  const trophy = {};
  for (const k of ["deca", "fbla"]) if (b[k]) {
    const [x0, y0, x1, y1] = b[k];
    trophy[k] = { x: sv.ox + x0 * sv.fw, y: sv.oy + y0 * sv.fh, w: (x1 - x0) * sv.fw, h: (y1 - y0) * sv.fh };
  }
  const overlaps = [];
  for (const r of rects) for (const [k, t] of Object.entries(trophy)) {
    const ix = Math.max(0, Math.min(r.x + r.w, t.x + t.w) - Math.max(r.x, t.x));
    const iy = Math.max(0, Math.min(r.y + r.h, t.y + t.h) - Math.max(r.y, t.y));
    if (ix * iy > 1) overlaps.push(`${r.tag} "${r.text}" overlaps ${k} by ${Math.round(ix)}x${Math.round(iy)}px`);
  }
  const offscreen = rects.filter((r) => r.x < -1 || r.y < -1 || r.x + r.w > W + 1 || r.y + r.h > H + 1).map((r) => `${r.tag} "${r.text}" leaves the window`);
  report.push({ chapter: names[i], playMs: m.ms, fps: +m.fps.toFixed(1), worstFrameMs: Math.round(m.worst), overlaps, offscreen });
}

// finale: the trophies must look and act like buttons
const hits = await page.evaluate(() => [...document.querySelectorAll("a[data-trophy]")].map((a) => {
  const r = a.getBoundingClientRect();
  const p = a.querySelector("span")?.getBoundingClientRect();
  return { k: a.dataset.trophy, cursor: getComputedStyle(a).cursor, rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], pill: p ? [Math.round(p.x), Math.round(p.y), Math.round(p.width), Math.round(p.height)] : null, href: a.getAttribute("href") };
}));
if (flag("--hover") && !mobile) {
  const a = hits[0].rect;
  await page.mouse.move(a[0] + a[2] * 0.15, a[1] + a[3] * 0.4, { steps: 8 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(out, "5-hover-deca-left.png") });
  await page.mouse.move(a[0] + a[2] * 0.85, a[1] + a[3] * 0.4, { steps: 8 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(out, "5-hover-deca-right.png") });
}

// and back up again
const back = [];
for (let i = 3; i >= 0; i--) { back.push(await play(-1)); }
await shoot("6-back-at-hero");

console.log(JSON.stringify({ viewport: [W, H], set: (await stageVars()).set, report, hits, backMs: back.map((b) => b.ms) }, null, 1));
console.log(errors.length ? "PAGE ERRORS:\n" + [...new Set(errors)].join("\n") : "no page errors");
await browser.close();
