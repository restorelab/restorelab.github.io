/**
 * Le contrôle complet : tout ce qui peut avoir dérivé, en une commande.
 *
 * La dérive du site n'est pas hypothétique. Le 2026-09-03, le dépôt produit a
 * livré le planificateur et le site a continué d'annoncer « next » pour une
 * fonctionnalité livrée, sans le guide correspondant, sans trois commandes CLI
 * et sans deux routes d'API. Rien n'a prévenu : il fallait penser à lancer
 * cinq commandes différentes.
 *
 * D'où celle-ci. Elle est faite pour tourner **en local**, où le dépôt produit
 * est à côté — c'est le seul endroit d'où l'on puisse comparer le site à sa
 * source, le dépôt produit étant privé. Le hook `pre-push` l'exécute, ce qui
 * fait que la dérive se voit au moment où l'on publie plutôt que des semaines
 * après.
 *
 * Une étape dont la source est absente est **ignorée**, pas comptée en échec :
 * on peut travailler sur le site sans avoir le dépôt produit sous la main, et
 * transformer ça en mur ne ferait qu'apprendre à contourner le hook.
 *
 * Usage : `npm run check`
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(SITE_ROOT, process.env.RESTORELAB_REPO ?? '../RestoreLab');

const hasRepo = existsSync(path.join(repo, 'docs'));
const hasBinary =
  existsSync(process.env.RESTORELAB_BIN ?? path.join(repo, 'bin', 'restorelab.exe')) ||
  existsSync(path.join(repo, 'bin', 'restorelab'));

/**
 * Les étapes, dans l'ordre. `build` doit précéder `check:i18n`, qui lit `dist/`.
 * `needs` dit ce que l'étape exige pour être exécutable.
 */
const STEPS = [
  { label: 'tests unitaires', run: ['npm', 'test'], needs: null },
  { label: 'dérive de la documentation', run: ['npm', 'run', 'sync:check'], needs: 'repo' },
  { label: 'dérive de la référence CLI', run: ['npm', 'run', 'gen:cli', '--', '--check'], needs: 'binary' },
  { label: 'dérive du contrat d’API', run: ['npm', 'run', 'check:api'], needs: 'repo' },
  { label: 'version publiée', run: ['npm', 'run', 'check:version'], needs: 'repo' },
  { label: 'build du site', run: ['npm', 'run', 'build'], needs: null },
  { label: 'liens et typographie FR', run: ['npm', 'run', 'check:i18n'], needs: null },
];

const available = { repo: hasRepo, binary: hasBinary };
const results = [];
let failed = false;

for (const step of STEPS) {
  if (step.needs && !available[step.needs]) {
    results.push({ ...step, state: 'ignorée' });
    continue;
  }

  process.stdout.write(`\n──── ${step.label}\n`);
  const [command, ...args] = step.run;
  const { status } = spawnSync(command, args, {
    cwd: SITE_ROOT,
    stdio: 'inherit',
    shell: true,
  });

  const ok = status === 0;
  if (!ok) failed = true;
  results.push({ ...step, state: ok ? 'ok' : 'ÉCHEC' });
}

console.log('\n════ résumé\n');
for (const { label, state } of results) {
  const mark = { ok: '  ok    ', 'ÉCHEC': '  ÉCHEC ', 'ignorée': '  ignorée' }[state];
  console.log(`${mark} ${label}`);
}

const skipped = results.filter((r) => r.state === 'ignorée');
if (skipped.length > 0) {
  console.log('');
  if (!hasRepo) {
    console.log(`  Le dépôt produit est introuvable à ${path.relative(SITE_ROOT, repo)}.`);
    console.log('  Poser RESTORELAB_REPO dessus pour contrôler la dérive de la documentation');
    console.log('  et du contrat d’API — ce sont les deux qui se cassent en silence.');
  } else if (!hasBinary) {
    console.log('  Le binaire RestoreLab est introuvable. `go build -o bin/restorelab ./cmd/restorelab`');
    console.log('  dans le dépôt produit, ou poser RESTORELAB_BIN dessus, pour contrôler la CLI.');
  }
}

console.log('');
if (failed) {
  console.log('check: le site a dérivé, ou quelque chose est cassé. Voir ci-dessus.');
  process.exit(1);
}
console.log('check: le site est à jour.');
