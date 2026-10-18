// New stage film: master PNGs -> normalised sizes -> 48 fps (minterpolate) -> WebP tiers in web/public/flight_new, then swap into flight.
//   node tools/interp/newfilm.cjs            (builds flight_new, does not touch flight)
//   node tools/interp/newfilm.cjs --swap     (backs the live flight up to tools/interp/flight_backup2 and publishes flight_new)
const { spawnSync } = require("child_process");
const fs = require("fs");
const sharp = require("sharp");
const FF = require("ffmpeg-static");
const ROOT = "C:/Users/Owner/Glass2Go";
const PUB = `${ROOT}/web/public`;
const N = 253;
const pad = (n) => String(n).padStart(4, "0");
const SHARPEN = { sigma: 0.9, m1: 0.3, m2: 1.4 };
const JOBS = [
  { set: "landscape", tier: "m", w: 1280, h: 800, q: 88 },
  { set: "portrait", tier: "p", w: 720, h: 1280, q: 90 },
  { set: "portrait", tier: "s", w: 480, h: 853, q: 86 },
];

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function build() {
  // landscape frames rendered before the speed-up are 1920 wide; bring everything to one size first
  const lsrc = `${ROOT}/renders/master/landscape`;
  const norm = `${ROOT}/renders/master/landscape_1280`;
  fs.mkdirSync(norm, { recursive: true });
  await pool(Array.from({ length: N }, (_, i) => i + 1), 4, async (f) => {
    const to = `${norm}/${pad(f)}.png`;
    if (fs.existsSync(to)) return;
    await sharp(`${lsrc}/${pad(f)}.png`).resize({ width: 1280, height: 800, kernel: "lanczos3" }).png().toFile(to);
  });
  console.log("landscape normalised to 1280x800");

  for (const { set, tier, w, h, q } of JOBS) {
    const out = `${PUB}/flight_new/${set}/${tier}`;
    fs.mkdirSync(out, { recursive: true });
    if (fs.readdirSync(out).length >= 2 * N - 1) { console.log("skip", set, tier); continue; }
    const src = set === "landscape" ? norm : `${ROOT}/renders/master/${set}`;
    const tmp = `${ROOT}/tools/interp/tmp_${set}_${tier}`;
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    const t0 = Date.now();
    const r = spawnSync(FF, ["-y", "-loglevel", "error", "-framerate", "24", "-start_number", "1", "-i", `${src}/%04d.png`, "-frames:v", String(N * 2 - 1), "-vf", `scale=${w}:${h}:flags=lanczos,minterpolate=fps=48:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`, `${tmp}/%04d.png`], { stdio: "inherit" });
    if (r.status !== 0) throw new Error("ffmpeg failed");
    const items = Array.from({ length: 2 * N - 1 }, (_, i) => i + 1);
    await pool(items, 3, async (n) => {
      const dst = `${out}/${pad(n)}.webp`;
      // odd frames are the real renders (encoded from the master); even frames are the interpolated in-betweens
      const from = n % 2 === 1 ? `${src}/${pad((n + 1) / 2)}.png` : fs.existsSync(`${tmp}/${pad(n)}.png`) ? `${tmp}/${pad(n)}.png` : `${src}/${pad(n / 2)}.png`;
      await sharp(from).resize({ width: w, height: h, kernel: "lanczos3" }).sharpen(SHARPEN).webp({ quality: n % 2 === 1 ? q : 80, effort: 5 }).toFile(dst);
    });
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log("done", set, tier, ((Date.now() - t0) / 1000).toFixed(0) + "s");
  }

  // hover-tilt crops (the finale)
  const tdir = `${ROOT}/renders/master/landscape/tilt`;
  const odir = `${PUB}/flight_new/landscape/tilt`;
  fs.mkdirSync(odir, { recursive: true });
  const files = fs.readdirSync(tdir).filter((f) => f.endsWith(".png"));
  await pool(files, 3, async (f) => sharp(`${tdir}/${f}`).sharpen(SHARPEN).webp({ quality: 92, effort: 5 }).toFile(`${odir}/${f.replace(".png", ".webp")}`));
  fs.copyFileSync(`${tdir}/tilt.json`, `${odir}/tilt.json`);
  console.log("tilt crops:", files.length);
}

function swap() {
  const BK = `${ROOT}/tools/interp/flight_backup2`;
  fs.mkdirSync(BK, { recursive: true });
  const tiers = { landscape: ["m"], portrait: ["p", "s"] };
  for (const [set, ts] of Object.entries(tiers)) {
    for (const t of ts) {
      const src = `${PUB}/flight_new/${set}/${t}`;
      const dst = `${PUB}/flight/${set}/${t}`;
      if (fs.readdirSync(src).length !== 2 * N - 1) throw new Error("incomplete " + src);
      fs.mkdirSync(`${BK}/${set}`, { recursive: true });
      if (!fs.existsSync(`${BK}/${set}/${t}`)) fs.renameSync(dst, `${BK}/${set}/${t}`); else fs.rmSync(dst, { recursive: true, force: true });
      fs.renameSync(src, dst);
    }
  }
  // 1920 tier is retired: the new film is rendered at 1280 wide
  if (fs.existsSync(`${PUB}/flight/landscape/xl`)) {
    if (!fs.existsSync(`${BK}/landscape/xl`)) fs.renameSync(`${PUB}/flight/landscape/xl`, `${BK}/landscape/xl`); else fs.rmSync(`${PUB}/flight/landscape/xl`, { recursive: true, force: true });
  }
  const lm = `${PUB}/flight/landscape/manifest.json`;
  const M = JSON.parse(fs.readFileSync(lm, "utf8"));
  M.tiers = M.tiers.filter((t) => t.name !== "xl");
  fs.writeFileSync(lm, JSON.stringify(M, null, 1));
  // tilt crops
  const tsrc = `${PUB}/flight_new/landscape/tilt`;
  fs.rmSync(`${PUB}/flight/landscape/tilt`, { recursive: true, force: true });
  fs.renameSync(tsrc, `${PUB}/flight/landscape/tilt`);
  // where the trophies sit, keyed to the 48 fps frame numbers (2k-1)
  const layout = {};
  for (const set of ["landscape", "portrait"]) {
    const b = JSON.parse(fs.readFileSync(`${ROOT}/renders/master/${set}/bounds.json`, "utf8"));
    const o = {};
    for (const k of Object.keys(b)) o[String(2 * Number(k) - 1)] = b[k];
    layout[set] = o;
  }
  fs.writeFileSync(`${PUB}/flight/layout.json`, JSON.stringify(layout, null, 1));
  console.log("swapped");
}

(async () => {
  if (process.argv.includes("--swap")) return swap();
  await build();
})().catch((e) => { console.error(e); process.exit(1); });
