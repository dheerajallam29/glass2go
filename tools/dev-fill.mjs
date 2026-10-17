// DEV ONLY: builds a small stand-in tier ("dev") from whatever has been rendered so far, holding the
// nearest available picture for frames that do not exist yet. Lets the player be built and tested
// while the real renders are still running. Delete public/flight/*/dev when the real tiers exist.
import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const renders = join(here, "..", "renders");
const out = join(here, "..", "web", "public", "flight");
const FRAMES = 253;
const pad = (n) => String(n).padStart(4, "0");

for (const [set, w, h, dirs] of [
  ["landscape", 640, 400, ["draft/landscape", "keys/landscape"]],
  ["portrait", 360, 640, ["master/portrait", "keys/portrait"]],
]) {
  const have = new Map(); // frame -> path (first source wins)
  for (const d of dirs) {
    const dir = join(renders, d);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      const m = /^(\d{4})\.png$/.exec(f);
      if (m && statSync(join(dir, f)).size > 0 && !have.has(+m[1])) have.set(+m[1], join(dir, f));
    }
  }
  const keys = [...have.keys()].sort((a, b) => a - b);
  mkdirSync(join(out, set, "dev"), { recursive: true });
  for (let n = 1; n <= FRAMES; n++) {
    const src = have.get(n) ?? have.get(keys.reduce((best, k) => (Math.abs(k - n) < Math.abs(best - n) ? k : best), keys[0]));
    await sharp(src).resize(w, h, { fit: "fill" }).webp({ quality: 82 }).toFile(join(out, set, "dev", `${pad(n)}.webp`));
  }
  console.log(set, "dev tier:", keys.length, "real frames,", FRAMES, "total");
}
