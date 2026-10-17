// Turn the lossless Blender frames (renders/master, renders/draft) into the web-ready WebP tiers the
// homepage loads, plus manifests and layout data. Safe to re-run: it only encodes what is new, and it
// only publishes a tier once every one of its frames exists.
//   node encode-frames.mjs [--force]
import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const renders = join(here, "..", "renders");
const out = join(here, "..", "web", "public", "flight");
const force = process.argv.includes("--force");

const FRAMES = 253;
const SHARPEN = { sigma: 0.9, m1: 0.3, m2: 1.4 };
const pad = (n) => String(n).padStart(4, "0");
const ok = (p) => existsSync(p) && statSync(p).size > 0;

const PLAN = {
  landscape: [
    { src: "master/landscape", tiers: [{ name: "xl", w: 1920, q: 90 }, { name: "m", w: 1280, q: 88 }] },
    { src: "draft/landscape", tiers: [{ name: "draft", w: 960, q: 80 }] },
  ],
  portrait: [{ src: "master/portrait", tiers: [{ name: "p", w: 720, q: 90 }, { name: "s", w: 480, q: 86 }] }],
};

async function encodeOne(from, to, w, q) {
  if (!force && ok(to) && statSync(to).mtimeMs >= statSync(from).mtimeMs) return false;
  await sharp(from)
    .resize({ width: w, kernel: "lanczos3", withoutEnlargement: true })
    .sharpen(SHARPEN) // the denoiser leaves edges a touch soft; this restores them without halos
    .webp({ quality: q, effort: 5, smartSubsample: false, nearLossless: false })
    .toFile(to);
  return true;
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

for (const [set, groups] of Object.entries(PLAN)) {
  const manifest = { set, fps: 24, frames: FRAMES, waypoints: [1, 49, 157, 205, 253], tiers: [] };
  for (const { src, tiers } of groups) {
    const dir = join(renders, src);
    const have = [];
    for (let f = 1; f <= FRAMES; f++) if (ok(join(dir, `${pad(f)}.png`))) have.push(f);
    if (have.length < FRAMES) {
      console.log(`${set}/${src}: ${have.length}/${FRAMES} frames rendered, skipping tiers`);
      continue;
    }
    const meta = await sharp(join(dir, "0001.png")).metadata();
    for (const t of tiers) {
      const tdir = join(out, set, t.name);
      mkdirSync(tdir, { recursive: true });
      let done = 0;
      await pool(have, 3, async (f) => { if (await encodeOne(join(dir, `${pad(f)}.png`), join(tdir, `${pad(f)}.webp`), t.w, t.q)) done++; });
      const w = Math.min(t.w, meta.width);
      manifest.tiers.push({ name: t.name, width: w, height: Math.round((w * meta.height) / meta.width) });
      console.log(`${set}/${t.name}: ${FRAMES} frames (${done} newly encoded)`);
    }
  }
  // keep the DEV stand-in tier (tools/dev-fill.mjs) in the manifest while it exists
  const devDir = join(out, set, "dev");
  if (existsSync(join(devDir, "0253.webp"))) {
    const dm = await sharp(join(devDir, "0001.webp")).metadata();
    manifest.tiers.push({ name: "dev", width: dm.width, height: dm.height });
  }
  mkdirSync(join(out, set), { recursive: true });
  writeFileSync(join(out, set, "manifest.json"), JSON.stringify(manifest, null, 1));
}

// hover-tilt crops (desktop finale)
const tiltDir = join(renders, "master", "landscape", "tilt");
if (ok(join(tiltDir, "tilt.json"))) {
  const meta = JSON.parse(readFileSync(join(tiltDir, "tilt.json"), "utf8"));
  const odir = join(out, "landscape", "tilt");
  mkdirSync(odir, { recursive: true });
  const files = readdirSync(tiltDir).filter((f) => f.endsWith(".png"));
  await pool(files, 3, async (f) => {
    await sharp(join(tiltDir, f)).sharpen(SHARPEN).webp({ quality: 92, effort: 5 }).toFile(join(odir, f.replace(".png", ".webp")));
  });
  writeFileSync(join(odir, "tilt.json"), JSON.stringify(meta, null, 1));
  console.log(`landscape/tilt: ${files.length} crops`);
}

// where the trophies sit at each waypoint (fractions of the frame), for hit areas and checks
const layout = {};
for (const set of ["landscape", "portrait"]) {
  for (const p of [join(renders, "master", set, "bounds.json"), join(renders, "keys", set, "bounds.json")]) {
    if (ok(p)) { layout[set] = JSON.parse(readFileSync(p, "utf8")); break; }
  }
}
writeFileSync(join(out, "layout.json"), JSON.stringify(layout, null, 1));
console.log("layout.json written for:", Object.keys(layout).join(", "));
