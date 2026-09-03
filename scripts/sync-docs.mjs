#!/usr/bin/env node
/**
 * Synchronise `RestoreLab/docs/*.md` vers `src/content/docs/`.
 *
 *   node scripts/sync-docs.mjs           écrit les pages
 *   node scripts/sync-docs.mjs --check   ne rien écrire, sortir 1 sur diff
 *
 * Le dépôt source vient de RESTORELAB_REPO, défaut `../RestoreLab`.
 * Un lien `.md` que le manifeste ne résout pas fait échouer le script :
 * c'est le seul moyen de ne pas publier des liens morts en silence.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from './lib/transform.mjs';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_ROOT = path.join(SITE_ROOT, 'src', 'content', 'docs');
const MANIFEST = path.join(SITE_ROOT, 'docs.map.json');

const check = process.argv.includes('--check');

function fail(message) {
  console.error(`sync-docs: ${message}`);
  process.exit(1);
}

const repo = path.resolve(SITE_ROOT, process.env.RESTORELAB_REPO ?? '../RestoreLab');
if (!existsSync(path.join(repo, 'docs'))) {
  fail(
    `no docs directory at ${path.join(repo, 'docs')}. ` +
      `Set RESTORELAB_REPO to the RestoreLab checkout (default: ../RestoreLab).`,
  );
}

const map = JSON.parse(await readFile(MANIFEST, 'utf8'));
// Les entrées sans `dest` ne servent qu'à résoudre des liens.
const pages = map.filter((entry) => entry.dest);

let written = 0;
let unchanged = 0;

for (const entry of pages) {
  const sourcePath = path.join(repo, entry.source);
  if (!existsSync(sourcePath)) {
    fail(`missing source ${entry.source} (looked in ${sourcePath})`);
  }

  const body = await readFile(sourcePath, 'utf8');

  let rendered;
  try {
    rendered = transform({ source: entry.source, body, entry, map });
  } catch (error) {
    fail(`${entry.source}: ${error.message}`);
  }

  const destPath = path.join(CONTENT_ROOT, entry.dest);
  const existing = existsSync(destPath) ? await readFile(destPath, 'utf8') : null;

  if (check) {
    if (existing === null) {
      fail(`${entry.dest} is missing. Run: npm run sync`);
    }
    if (existing !== rendered) {
      fail(`${entry.dest} is out of date with ${entry.source}. Run: npm run sync`);
    }
    unchanged += 1;
    console.log(`  ok       ${entry.dest}`);
    continue;
  }

  if (existing === rendered) {
    unchanged += 1;
    console.log(`  unchanged ${entry.dest}`);
    continue;
  }

  await mkdir(path.dirname(destPath), { recursive: true });
  await writeFile(destPath, rendered, 'utf8');
  written += 1;
  console.log(`  wrote     ${entry.dest}  <- ${entry.source}`);
}

if (check) {
  console.log(`sync-docs: ${unchanged} file(s) up to date.`);
} else {
  console.log(`sync-docs: ${written} written, ${unchanged} unchanged, ${pages.length} total.`);
}
