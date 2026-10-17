// Turn the small supplied logo PNGs into razor-sharp high-resolution RGBA PNGs by tracing them
// to vector shapes and rasterizing the vectors at 2048px. Flat-colour logos only.
//   node vectorize-logos.mjs
import sharp from "sharp";
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ImageTracer = require("imagetracerjs");
const here = dirname(fileURLToPath(import.meta.url));
const logos = join(here, "..", "trophy_preview", "logos");

const UP = 10; // upscale before tracing so the antialiased edge becomes a smooth curve

// Flat logos use a handful of exact colours. Take the most common non-white ones, skipping any
// within a small distance of an already chosen colour (antialiasing noise).
async function dominantColours(img, k) {
  const { data, info } = await img.clone().raw().toBuffer({ resolveWithObject: true });
  const hist = new Map();
  for (let i = 0; i < data.length; i += info.channels) {
    const key = data[i] << 16 | data[i + 1] << 8 | data[i + 2];
    hist.set(key, (hist.get(key) ?? 0) + 1);
  }
  const ranked = [...hist.entries()].sort((x, y) => y[1] - x[1]).map(([c]) => ({ r: c >> 16, g: (c >> 8) & 255, b: c & 255 }));
  const out = [];
  for (const c of ranked) {
    if (Math.min(c.r, c.g, c.b) > 235) continue; // the white ground
    if (out.every((o) => Math.hypot(o.r - c.r, o.g - c.g, o.b - c.b) > 40)) out.push(c);
    if (out.length === k) break;
  }
  return out.map((c) => ({ ...c, a: 255 }));
}

async function trace(name, k) {
  const src = sharp(join(logos, `${name}_logo.png`)).flatten({ background: "#ffffff" });
  const meta = await src.metadata();
  const colours = [{ r: 255, g: 255, b: 255, a: 255 }];
  colours.push(...(await dominantColours(src, k)));

  // 1. Undo the antialiasing: every pixel is (coverage x logo colour) over white. Work out which
  //    colour and how much, as a per-colour coverage mask.
  const { data, info } = await src.clone().raw().toBuffer({ resolveWithObject: true });
  const W = [255, 255, 255];
  const pix = info.width * info.height;
  const masks = colours.slice(1).map(() => new Uint8Array(pix));
  for (let p = 0; p < pix; p++) {
    const px = [data[p * info.channels], data[p * info.channels + 1], data[p * info.channels + 2]];
    let best = -1, bestRes = Infinity, bestA = 0;
    colours.slice(1).forEach((c, ci) => {
      const d = [W[0] - c.r, W[1] - c.g, W[2] - c.b];
      const dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
      const a = Math.max(0, Math.min(1, ((W[0] - px[0]) * d[0] + (W[1] - px[1]) * d[1] + (W[2] - px[2]) * d[2]) / dd));
      const res = Math.hypot(px[0] - (W[0] - a * d[0]), px[1] - (W[1] - a * d[1]), px[2] - (W[2] - a * d[2]));
      if (res < bestRes) { bestRes = res; best = ci; bestA = a; }
    });
    if (bestA > 0) masks[best][p] = Math.round(bestA * 255);
  }
  // 2. Upscale each coverage mask smoothly, then take the strongest layer per high-res pixel.
  const bw = info.width * UP, bh = info.height * UP;
  const big = [];
  for (const m of masks) {
    big.push(await sharp(Buffer.from(m), { raw: { width: info.width, height: info.height, channels: 1 } })
      .blur(1.1) // the source has stair-stepped edges on some shapes; this smooths them
      .resize(bw, bh, { kernel: "lanczos3" }).extractChannel(0).raw().toBuffer());
  }
  const out = new Uint8ClampedArray(bw * bh * 4);
  for (let p = 0; p < bw * bh; p++) {
    let best = -1, bestV = 0, sum = 0;
    for (let ci = 0; ci < big.length; ci++) { const v = big[ci][p]; sum += v; if (v > bestV) { bestV = v; best = ci; } }
    const c = best >= 0 && bestV > 127 ? colours[best + 1] : colours[0];
    out[p * 4] = c.r; out[p * 4 + 1] = c.g; out[p * 4 + 2] = c.b; out[p * 4 + 3] = 255;
  }
  // 3. A median filter removes 1-2 pixel specks and dashes left by the source's rough edges,
  //    then every pixel snaps back to its nearest flat logo colour.
  const rgb = Buffer.alloc(bw * bh * 3);
  for (let p = 0; p < bw * bh; p++) { rgb[p * 3] = out[p * 4]; rgb[p * 3 + 1] = out[p * 4 + 1]; rgb[p * 3 + 2] = out[p * 4 + 2]; }
  const med = await sharp(rgb, { raw: { width: bw, height: bh, channels: 3 } }).median(33).raw().toBuffer();
  for (let p = 0; p < bw * bh; p++) {
    let bi = 0, bd = Infinity;
    colours.forEach((c, ci) => {
      const d = Math.hypot(med[p * 3] - c.r, med[p * 3 + 1] - c.g, med[p * 3 + 2] - c.b);
      if (d < bd) { bd = d; bi = ci; }
    });
    const c = colours[bi];
    out[p * 4] = c.r; out[p * 4 + 1] = c.g; out[p * 4 + 2] = c.b;
  }
  const imgd = { width: bw, height: bh, data: out };

  const svgRaw = ImageTracer.imagedataToSVG(imgd, {
    pal: colours,
    colorsampling: 0,
    numberofcolors: colours.length,
    mincolorratio: 0,
    colorquantcycles: 1,
    ltres: 0.8,
    qtres: 0.8,
    pathomit: 40,
    rightangleenhance: false,
    blurradius: 3,
    blurdelta: 24,
    strokewidth: 0,
    roundcoords: 2,
    viewbox: true,
    desc: false,
    layering: 0,
  });

  // drop the white background paths; keep only the logo's own colours
  const svg = svgRaw.replace(/<path[^>]*fill="rgb\(255,255,255\)"[^>]*\/>/g, "");
  writeFileSync(join(logos, `${name}_logo.svg`), svg);

  const png = await sharp(Buffer.from(svg), { density: 72 })
    .resize({ width: 2048, kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(logos, `${name}_logo_hd.png`), png);

  // fidelity check: rasterize back down to the original size and compare to the original
  const back = await sharp(png).resize(meta.width, meta.height, { fit: "fill" }).flatten({ background: "#fff" }).raw().toBuffer();
  const orig = await src.clone().raw().toBuffer(); if (orig.length !== back.length) console.log("length mismatch", orig.length, back.length);
  let sum = 0;
  for (let i = 0; i < orig.length; i++) sum += Math.abs(orig[i] - back[i]);
  console.log(name, "colours:", colours.slice(1).map((c) => `rgb(${c.r},${c.g},${c.b})`).join(" "),
    "mean abs diff vs original:", (sum / orig.length).toFixed(2), "of 255");
}

await trace("deca", 1);
await trace("fbla", 3);
