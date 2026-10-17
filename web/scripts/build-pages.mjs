// Static build for GitHub Pages. A static export cannot contain API routes, so the live question
// generator is set aside for the build and put back afterwards; the page hides its UI when NEXT_PUBLIC_STATIC=1.
import { cpSync, existsSync, renameSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const api = "src/app/api";
const stash = ".api-stash";
if (existsSync(api)) renameSync(api, stash);
let status = 1;
try {
  rmSync(".next", { recursive: true, force: true });
  status = spawnSync("npx", ["next", "build"], { stdio: "inherit", shell: true, env: { ...process.env, GITHUB_PAGES: "1" } }).status ?? 1;
} finally {
  if (existsSync(stash)) renameSync(stash, api);
}
if (status === 0 && existsSync("out")) cpSync("public/.nojekyll", "out/.nojekyll", { force: true });
process.exit(status);
