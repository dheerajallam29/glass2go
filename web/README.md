# Glass2Go web app

Next.js 16 (App Router, React 19). See the [repository README](../README.md) for the project overview.

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # server build (includes the live question generator)
npm run build:pages  # static export for GitHub Pages, served from /glass2go
```

Checks that drive a real browser (Playwright) live in `scripts/`:
`verify-practice.mjs`, `verify-motion.mjs`, `verify-zoom.mjs`. `serve-pages.mjs` serves `out/` the way Pages will.
