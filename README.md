# Palmline Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/aam110/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/aam110/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![CI](https://github.com/aam110/makefun-gta6-cover-art/actions/workflows/ci.yml/badge.svg)](https://github.com/aam110/makefun-gta6-cover-art/actions/workflows/ci.yml)

**Palmline Cover Studio** turns your own photos and a caption into sun-soaked,
GTA-style poster cover art — right in the browser, fully offline, nothing uploaded.

Pick a photo (or one of the two bundled samples), choose one of four layouts —
**Trio Stack**, **Hero Left**, **Grid Four** or **Full Bleed** — and one of four
colour grades — **Vice Dusk**, **Neon Tide**, **Golden Mile** or **Midnight Chrome**.
Drag the preview to pan each panel, scroll to zoom, type a caption and a subtitle,
and export a PNG in **1080 × 1080**, **1080 × 1350** or **1920 × 1080**.

Everything on the cover is drawn in code: a striped retro sun, palm silhouettes,
a seeded city skyline with lit windows, halftone dots, scanlines, vignette and film
grain, plus bold condensed lettering with a chromatic offset and glow. The fonts
(Anton, Pacifico, Bebas Neue, Archivo Black) ship as files under `app/fonts/`
under the SIL Open Font License — see `app/fonts/OFL.txt`. No Rockstar Games
logo, artwork or font is used anywhere; this is an original fan-made studio.

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
```

Open http://localhost:8080, load a photo, pick a layout and grade, type a caption,
and hit one of the three PNG export buttons. No build step, no network request —
every script, font and image is a file under `app/`.

## Hand it in (make.fun)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` into the output directory and writes
`dossier.json` with the vendored make.fun library (`vendor/makefun-app.ts`).

## Layout

- `app/index.html` — the editor page
- `app/style.css` — the editor chrome
- `app/src/cover.js` — the render engine (layouts, grades, sun, palms, skyline, lettering)
- `app/src/main.js` — the editor UI (controls, drag-to-pan, zoom, export, shot mode)
- `app/fonts/` — OFL display fonts + `OFL.txt`
- `app/samples/` — two free-to-use sample photos (orchard at sunset, hillside shepherd)
- `screenshots/` — four real captures of the app at work (the first is the cover)
- `main.ts` — the hand-in program · `serve.ts` — local static server · `shots.json` — the screenshot scenes
