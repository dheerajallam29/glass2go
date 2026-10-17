// node sheet.mjs <dir> <out.png> [cols] [cellWidth]  -- tile every PNG in a folder into one contact sheet
import sharp from "sharp";
import { readdirSync } from "node:fs";
import { join } from "node:path";
const [dir, out, cols = "3", cell = "640"] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
const tiles = await Promise.all(files.map((f) => sharp(join(dir, f)).resize({ width: +cell }).png().toBuffer({ resolveWithObject: true })));
const h = Math.max(...tiles.map((t) => t.info.height));
const rows = Math.ceil(tiles.length / +cols);
const pad = 8;
const comp = tiles.map((t, i) => ({ input: t.data, left: pad + (i % +cols) * (+cell + pad), top: pad + Math.floor(i / +cols) * (h + pad) }));
await sharp({ create: { width: pad + +cols * (+cell + pad), height: pad + rows * (h + pad), channels: 3, background: "#777" } }).composite(comp).png().toFile(out);
console.log(files.join(", "));
