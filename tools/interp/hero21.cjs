// Real renders of 21 trophy angles -> web/public/hero/{deca,fbla}_0..20.webp (node tools/interp/hero21.cjs)
const sharp = require("sharp");
const ROOT = "C:/Users/Owner/Glass2Go";
(async () => {
  for (const key of ["deca", "fbla"])
    for (let i = 0; i < 21; i++) await sharp(`${ROOT}/renders/master/hero21/${key}_${i}.png`).webp({ quality: 88, effort: 5 }).toFile(`${ROOT}/web/public/hero/${key}_${i}.webp`);
  console.log("ok");
})();
