// Midnight Mile — make.fun gta6-cover-art-01 entry program (Node 22, stdlib only).
//
// This program hands the entry in: it copies this repository's app/ and
// screenshots/ into the output directory and writes /output/dossier.json
// with the vendored make.fun library, exactly as the kit requires.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The app itself is plain static files under app/ (see README.md): a
// GTA VI-style cover maker with a living Three.js Vice City world, six
// layouts, six grades and PNG export at 1080x1080, 1080x1350, 1920x1080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (see the kit's RULES.txt): the dossier text is
// capped at 160 KiB; screenshots at 4 files of 256 KiB each; app/ at 993
// files and 48 MiB in all, paths under 1000 bytes.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
