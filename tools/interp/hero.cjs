// Fills in the trophy's sway: the 9 rendered angles become 33 (3 interpolated frames between each pair) so the pointer sway is continuous.
//   node tools/interp/hero.cjs   -> writes web/public/hero_new/{deca,fbla}_0..32.webp (the page reads web/public/hero)
const { spawnSync } = require("child_process");
const fs = require("fs");
const sharp = require("sharp");
const FF = require("ffmpeg-static");
const ROOT = "C:/Users/Owner/Glass2Go";
const SRC = `${ROOT}/renders/master/hero`;
const OUT = `${ROOT}/web/public/hero_new`;
const STEPS = 4; // output frames per input interval
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const key of ["deca", "fbla"]) {
    const tmp = `${ROOT}/tools/interp/tmp_hero_${key}`;
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(`${tmp}/in`, { recursive: true });
    for (let i = 0; i < 9; i++) fs.copyFileSync(`${SRC}/${key}_${i}.png`, `${tmp}/in/${String(i + 1).padStart(2, "0")}.png`);
    fs.copyFileSync(`${SRC}/${key}_8.png`, `${tmp}/in/10.png`); // a repeat of the last angle so the final interval is interpolated too
    const total = (9 - 1) * STEPS + 1;
    const r = spawnSync(FF, ["-y", "-loglevel", "error", "-framerate", "1", "-i", `${tmp}/in/%02d.png`, "-frames:v", String(total), "-vf", `minterpolate=fps=${STEPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:search_param=48`, `${tmp}/%03d.png`], { stdio: "inherit" });
    if (r.status !== 0) throw new Error("ffmpeg failed");
    for (let n = 0; n < total; n++) {
      // real renders sit on every 4th frame; use the originals there so nothing is lost
      const real = n % STEPS === 0 ? `${SRC}/${key}_${n / STEPS}.png` : `${tmp}/${String(n + 1).padStart(3, "0")}.png`;
      await sharp(real).webp({ quality: 88, effort: 5 }).toFile(`${OUT}/${key}_${n}.webp`);
    }
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(key, total, "frames");
  }
})().catch((e) => { console.error(e); process.exit(1); });
