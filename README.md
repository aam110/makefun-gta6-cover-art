# Solstice Press — GTA VI-style Cover Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/aam110/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/aam110/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo and caption into GTA VI-style cover art: the multi-panel
poster look with bold lettering and a Vice City sunset or neon grade, exported
as a PNG to share. Runs **100% offline** in a desktop browser from its own
static files — your photos never leave your machine.

Built for the [make.fun `gta6-cover-art-01` bounty](https://make.fun/bounty/gta6-cover-art-01). An original design: no
Rockstar Games logos, artwork or fonts anywhere.

## What it does

- **5 layouts** — Nine Panel (classic 3×3 grid), Hero + Three, Full Bleed,
  Tilted Stack (rotated snapshots on a sunset backdrop), Film Bands.
- **5 colour grades** — Vice Sunset, Neon Night, Golden Hour, Noir Pink,
  Miami Pastel. Each is a gradient-map grade applied per panel.
- **Any photo** — add your own photo to any panel, or fill every panel with
  one photo. Per-panel **drag to pan** and **scroll to zoom** (or the zoom
  buttons), plus drag & drop onto a panel. No photo? Every panel starts as a
  **procedural scene drawn in code** — sunset beach, city dusk, neon street,
  pier dawn, palm alley, desert road — seeded and reshufflable.
- **Code-drawn lettering** — four masthead styles (Sunset Chrome, Silver
  Chrome, Neon Tube, Poster Ink) built from system font stacks with layered
  gradients, outlines and glow, plus a fully vector-drawn "VI" badge,
  starburst sticker and ribbon tag. Title and subtitle are freely editable.
- **Retro finish** — film grain, vignette, scanlines and halftone dots, each
  toggleable. A 0–5 "wanted stars" row sits on every cover.
- **PNG export** in the three common post sizes: **1080 × 1080**,
  **1080 × 1350** and **1920 × 1080**. The preview is the same render as the
  export, so what you see is what you get.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies, no network requests. `app/` is plain static
files; any static HTTP server works.

## How it works

| File | What it does |
| --- | --- |
| `app/index.html` | Editor shell: controls, live preview canvas, export bar |
| `app/style.css` | Dark neon editor UI |
| `app/src/main.js` | Editor wiring: pickers, pan/zoom, uploads, export, `?shot=` modes |
| `app/src/cover.js` | Cover engine: layout geometry, panel painting, title block, export |
| `app/src/art.js` | Procedural art: six seeded scenes, palms, skylines, grades, grain |
| `app/src/lettering.js` | Masthead styles, subtitle, vector VI badge, ribbon, wanted stars |
| `main.ts` | Entry program: copies `app/` + `screenshots/` to `/output`, writes `dossier.json` |
| `serve.ts` | Tiny static server for local testing |

There are **no image or font files** in the app: every scene, palm,
skyline and texture is drawn on canvas at runtime, and typography uses system
font stacks plus vector paths drawn in code.

## Screenshots

`screenshots/` holds four JPEGs taken with headless Chromium from this app:

1. `1-cover.jpg` — an exported wide cover (Nine Panel, Vice Sunset)
2. `2-editor.jpg` — the editor with a photo loaded (Hero + Three, Neon Night)
3. `3-cover-portrait.jpg` — an exported portrait cover (Full Bleed, Golden Hour)
4. `4-cover-square.jpg` — an exported square cover (Tilted Stack, Miami Pastel)

The `?shot=cover` and `?shot=editor` query modes (see `shots.json`) render the
app's own drawing at the screenshot size for capture; the exported covers in
the screenshots are the app's own render output, unedited.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the kit's vendored
`vendor/makefun-app.ts`.

## License

MIT — see `LICENSE`.
