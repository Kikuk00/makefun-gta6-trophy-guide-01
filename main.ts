// Leonida Platinum — GTA VI trophy guide entry (Node 22, standard library only).
// The guide itself is plain static files under app/: index.html, style.css,
// app.js, and data/trophies.json (all 55 official trophies with our own guides)
// plus data/roadmap.json. This program hands the guide in: it copies app/ and
// screenshots/ from beside this file into /output (or MAKEFUN_OUTPUT_DIR
// outside the grader) and writes /output/dossier.json with the vendored
// make.fun library, exactly as the kit's starter does. Leave
// vendor/makefun-frontend.ts unchanged: the scorer rebuilds the dossier with
// its own copy and compares the two byte for byte.
//
// Run it yourself before submitting:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The guide is app/ and its screenshots; refuse a silent empty hand-in.
for (const needed of ['app', 'screenshots', join('app', 'index.html'), join('app', 'data', 'trophies.json')]) {
  if (!existsSync(join(here, needed))) throw new Error(`missing ${needed}: run from the repository root`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's caps (reference/gate.json): text_max_bytes shapes the dossier
// text; the other limits refuse an entry the scorer would refuse anyway
// (more than 4 screenshots or one over 256 KiB; app/ over 993 files and
// directories or 48 MiB, beside /output's own 1000-entry and 64 MiB caps).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
