# Midnight Mile — GTA VI-style Cover Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/aam110/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/aam110/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo and caption into GTA VI-style cover art: the multi-panel poster look with bold chrome lettering, a living 3D Vice City world behind the panels, and a golden-hour or neon grade, exported as a PNG to share. Runs **100% offline** in a desktop browser from its own static files — your photos never leave your machine.

Built for the [make.fun `gta6-cover-art-01` bounty](https://make.fun/bounty/gta6-cover-art-01). An original design: no Rockstar Games logos, artwork or fonts anywhere.

## What it does

- **A living 3D world** — a real Three.js Vice City scene (towers, palms, ocean, sun) with camera parallax and drift; cover panels float in 3D space with perspective tilt. Animated sunset shimmer, drifting clouds, flickering neon, moving water reflections and floating particles — frozen into a still frame for PNG export.
- **6 layouts** — Nine Panel (classic 3×3 grid), Hero + Three, Full Bleed, Tilted Stack (rotated snapshots on a sunset backdrop), Film Bands, Turntable (3D cover view).
- **6 colour grades** — Vice Sunset, Neon Night, Golden Hour, Noir Pink, Miami Pastel, Chrome Dusk.
- **Any photo** — add your own photo to any panel, or fill every panel with one photo. Per-panel drag to pan and scroll to zoom, plus drag & drop onto a panel. No photo? Every panel starts as a real photographic sample — portraits, cars, city dusk, neon streets.
- **Pop-out hero** — the hero panel breaks out of its frame, layered over the title.
- **Cast & credits** — editable role tags with location, time and quip, press quote with five stars, volume badge, gold "ORIGINAL COVER ART" seal, billing block, tagline strip and barcode — the full movie-poster finish.
- **Chrome lettering** — striped retro-chrome 3D titles with layered gradients, outlines and glow, plus a pink neon script subtitle. Title and subtitle are freely editable.
- **PNG export** — 1080×1080, 1080×1350 and 1920×1080, rendered from the frozen frame at full quality.

## Run it

```sh
node main.ts
```

Open the printed local URL and build your cover. No build step, no network calls at runtime.

## Files

- `app/` — the cover studio (HTML, CSS, JS, Three.js scene)
- `app/samples/` — photographic sample panels
- `main.ts` / `serve.ts` — entry points per the make.fun kit
- `shots.json` — screenshot manifest
- `screenshots/` — real screenshots of the studio

## License

MIT — see LICENSE.
