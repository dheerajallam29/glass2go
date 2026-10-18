import type { NextConfig } from "next";

// `npm run build:pages` sets GITHUB_PAGES=1: a fully static export served from /glass2go on GitHub Pages.
// A normal `npm run build` keeps the server build, which also serves the live question generator (/api/generate).
// Static export cannot use Cache Components / partial prerendering, so those are for the server build only.
const pages = process.env.GITHUB_PAGES === "1";
const basePath = pages ? "/glass2go" : "";

const nextConfig: NextConfig = {
  distDir: process.env.G2G_DIST ?? ".next",
  ...(pages
    ? { output: "export", basePath, trailingSlash: true, images: { unoptimized: true } }
    : { cacheComponents: true, partialPrefetching: true }),
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_STATIC: pages ? "1" : "0" },
};

export default nextConfig;
