// Captures the README screenshots into ../docs/images. Usage: node scripts/shots.mjs [baseUrl]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:3200";
const out = join(import.meta.dirname, "..", "..", "docs", "images");
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const shot = (name) => p.screenshot({ path: join(out, `${name}.png`) });
const chapter = (n) => p.waitForFunction((i) => [...document.querySelectorAll('ol[aria-label="Chapters"] button')].findIndex((x) => x.getAttribute("aria-current") === "step") === i, n, { timeout: 20000 });

await p.goto(base, { waitUntil: "networkidle" });
await p.waitForTimeout(5000);
await shot("home-hero");
for (let i = 1; i <= 4; i++) {
  await p.keyboard.press("ArrowDown");
  await chapter(i);
  await p.waitForTimeout(1200);
  if (i === 1) await shot("home-deca");
  if (i === 3) await shot("home-ranks");
}
await shot("home-finale");

for (const t of ["deca", "fbla"]) {
  await p.goto(`${base}/${t}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  await shot(`hub-${t}`);
}
await p.evaluate(() => document.querySelector("#exams")?.scrollIntoView());
await p.waitForTimeout(1500);
await shot("tiles");

await p.goto(`${base}/deca/practice/finance`, { waitUntil: "networkidle" });
await shot("practice-setup");
await p.getByRole("button", { name: "Start practice" }).click();
await p.keyboard.press("1");
await p.keyboard.press("Enter");
await p.waitForTimeout(900);
await shot("practice-answer");
await b.close();
console.log("saved to", out);
