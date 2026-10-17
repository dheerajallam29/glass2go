// node pdf-text.mjs <file.pdf> -- print the text of a PDF (used to read FBLA's public event guidelines)
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const mod = require("pdf-parse");
const parse = mod.default ?? mod.PDFParse ?? mod;
const buf = readFileSync(process.argv[2]);
let text;
if (typeof parse === "function" && !/^class/.test(String(parse))) text = (await parse(buf)).text;
else { const p = new mod.PDFParse({ data: buf }); text = (await p.getText()).text; }
console.log(text);
