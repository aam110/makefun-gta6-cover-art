// Palmline Cover Studio — the hand-in program (Node 22, standard library only).
//
// What it does, in order:
//   1. Reads the entry layout from beside this file: app/ (the studio) and
//      screenshots/ (four JPEGs of the studio at work).
//   2. Copies both trees into the output directory — /output inside the grader,
//      or $MAKEFUN_OUTPUT_DIR anywhere else.
//   3. Writes /output/dossier.json with buildDossier from vendor/makefun-app.ts,
//      using the bounty gate's caps, so the dossier the judge reads is exactly
//      the one the scorer rebuilds from the same files.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The gate's caps, as the competition states them: the dossier text cap shapes
// the bytes; the rest refuse an entry the scorer would refuse.
const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function countEntries(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    n += 1;
    if (statSync(p).isDirectory()) n += countEntries(p);
  }
  return n;
}

function handIn() {
  const appDir = join(here, 'app');
  const shotsDir = join(here, 'screenshots');
  if (!existsSync(appDir)) throw new Error('hand-in needs app/ beside main.ts');
  if (!existsSync(shotsDir)) throw new Error('hand-in needs screenshots/ beside main.ts');

  mkdirSync(outDir, { recursive: true });
  cpSync(appDir, join(outDir, 'app'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outDir, GATE_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  const appEntries = countEntries(join(outDir, 'app'));
  const shotFiles = readdirSync(join(outDir, 'screenshots')).filter((f) => !f.startsWith('.'));
  console.log(`Palmline handed in: app/ (${appEntries} entries) + ${shotFiles.length} screenshots -> ${outDir}`);
  console.log(`dossier.json: ${dossier.length} bytes`);
}

handIn();
