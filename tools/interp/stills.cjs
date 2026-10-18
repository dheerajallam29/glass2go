// Waypoint stills (renders_hi, 1920x1200) -> web/public/flight/landscape/hi/<48fps frame>.webp
const sharp = require("sharp");
const fs = require("fs");
const ROOT = "C:/Users/Owner/Glass2Go";
const out = `${ROOT}/web/public/flight/landscape/hi`;
fs.mkdirSync(out, { recursive: true });
(async () => {
  for (const f of [1, 49, 157, 205, 253]) {
    const n = 2 * f - 1; // the site plays at 48 fps, so 24 fps frame f is frame 2f-1
    await sharp(`${ROOT}/renders_hi/master/landscape/${String(f).padStart(4, "0")}.png`)
      .sharpen({ sigma: 0.9, m1: 0.3, m2: 1.4 })
      .webp({ quality: 92, effort: 5 })
      .toFile(`${out}/${String(n).padStart(4, "0")}.webp`);
  }
  console.log("ok", fs.readdirSync(out));
})();
