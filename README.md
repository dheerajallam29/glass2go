# Glass2Go

**Free practice for DECA and FBLA.** Exams built from the competitions' published blueprints, a reason behind every
answer, and roleplays / case studies scored against a rubric.

Live site: **https://dheerajallam29.github.io/glass2go/**

> Independent student project. Not affiliated with DECA Inc., FBLA or FBL Canada. Every question and scenario here is
> original practice material, written with AI and not yet reviewed by an official source.

## What is in it

- **A Blender-rendered homepage film.** Five stops, 48 fps, with a zoom through the trophy's glass into each competition.
- **~4,900 practice questions.** DECA clusters (Core, BMA, Finance, Hospitality, Marketing, Entrepreneurship, PFL) and nine
  FBLA objective tests, each with a correct answer and a short reason for every option.
- **Practice modes.** By topic, missed questions, spaced review (1, 2, 4, 7, 14 days), flagged, and a timed mini-exam.
  Progress, ranks (Bronze to Glass) and mastery are stored in the browser only.
- **Roleplays and events.** Timed prep and present phases with a self-scoring rubric, for 11 DECA and 10 FBLA events.
- **Feedback effects.** Ripples, sparkles, streaks and glass-shatter bursts, plus floating glass shards behind every page.

## Repository layout

| Path | What it holds |
|---|---|
| `web/` | The Next.js site. `src/app` routes, `src/components` UI, `src/lib` logic, `src/data/bank.json` the built question bank, `public/` the film frames and trophy renders. |
| `data/` | Question source (`questions/*.jsonl`), exam definitions (`exams.json`), generated report and CSV export. |
| `tools/` | Node scripts: `build-bank.mjs` (validates and builds the bank), `length-audit.mjs`, `interp/` (in-between frame generation). |
| `blender/` | `flight.py` renders the film, tilt crops and transparent trophy hero shots. |
| `trophy_preview/` | `build_trophies.py` builds the two trophy models; `logos/` holds the artwork they use. |
| `.github/workflows/` | GitHub Pages deploy. |

## Run it

```bash
cd web
npm install
npm run dev
```

Rebuild the question bank after editing `data/questions`:

```bash
node tools/build-bank.mjs
```

### Live question generator (optional)

The server build can write fresh questions on demand. Copy `web/.env.example` to `web/.env.local` and set
`ANTHROPIC_API_KEY`. The GitHub Pages build is static, so it hides this feature.

## Deploying

Every push to `main` builds the static site (`npm run build:pages`) and publishes it with GitHub Actions. In the repo,
open **Settings → Pages** and set **Source** to **GitHub Actions** if it is not already.

## Re-rendering the film (optional, slow)

`renders/` is not committed. Full renders take hours: `blender/render_all.sh` produces the 24 fps masters, and
`tools/interp/run.cjs` interpolates them to 48 fps WebP tiers in `web/public/flight/`.
