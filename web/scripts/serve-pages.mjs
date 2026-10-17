// Serves web/out under /glass2go, the way GitHub Pages will. Usage: node scripts/serve-pages.mjs [port]
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = join(import.meta.dirname, "..", "out");
const base = "/glass2go";
const port = Number(process.argv[2] ?? 3300);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain", ".ico": "image/x-icon" };

createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let p = decodeURIComponent(url.pathname);
  if (!p.startsWith(base)) {
    res.writeHead(404).end("not under /glass2go");
    return;
  }
  p = normalize(p.slice(base.length) || "/");
  let file = join(root, p);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404, { "content-type": "text/html" }).end(readFileSync(join(root, "404.html")));
    return;
  }
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
}).listen(port, () => console.log(`http://localhost:${port}${base}/`));
