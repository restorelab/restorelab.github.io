/**
 * Compare la version affichée par le site au dernier tag du dépôt produit.
 *
 * Le site annonce un numéro de version sur sa landing et le met dans les URL
 * de téléchargement des pages de démarrage rapide — l'URL
 * `releases/latest/download/` de GitHub exige le nom de fichier exact, donc le
 * numéro se retrouve forcément dans une commande. Un numéro recopié est un
 * numéro qui vieillit, et un visiteur qui copie une commande périmée récupère
 * une archive qui n'existe pas.
 *
 * Le fichier `src/version.ts` est la source unique pour tout ce qui est
 * TypeScript. Markdown ne peut pas importer une constante : ce contrôle est ce
 * qui tient les deux ensemble.
 *
 * Sans le dépôt produit sous la main, le script **passe** : il tourne en local
 * et dans un job qui a fait le clonage, pas dans le build public, qui n'a pas
 * accès à un dépôt privé.
 *
 * Usage : `npm run check:version`
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION_FILE = path.join(SITE_ROOT, 'src', 'version.ts');

const repo = path.resolve(SITE_ROOT, process.env.RESTORELAB_REPO ?? '../RestoreLab');

if (!existsSync(path.join(repo, '.git'))) {
  console.log(
    `check-version: ${path.relative(SITE_ROOT, repo)} n'est pas un dépôt git, contrôle ignoré.`,
  );
  process.exit(0);
}

/** Le dernier tag du dépôt produit, au sens des numéros de version. */
function latestTag() {
  const tags = execFileSync('git', ['-C', repo, 'tag', '--sort=-v:refname'], {
    encoding: 'utf8',
  })
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => /^v\d+\.\d+\.\d+$/.test(t));
  return tags[0] ?? null;
}

/** La version que le site déclare. */
function declaredVersion() {
  const source = readFileSync(VERSION_FILE, 'utf8');
  const match = source.match(/RESTORELAB_VERSION\s*=\s*'([^']+)'/);
  if (!match) {
    console.error(`check-version: RESTORELAB_VERSION est introuvable dans ${VERSION_FILE}`);
    process.exit(1);
  }
  return match[1];
}

/**
 * Les fichiers de `src/` qui mentionnent une autre version, pour attraper les
 * copies oubliées.
 *
 * `spec/` est exclu volontairement : le contrat OpenAPI porte sa propre version
 * et des exemples de bannière, qui n'ont pas à suivre le tag du produit. Ce
 * contrôle vise ce qui casse pour un visiteur — une URL de téléchargement vers
 * une archive qui n'existe pas — pas une chaîne d'illustration.
 */
function filesMentioning(version) {
  const roots = [path.join(SITE_ROOT, 'src')];
  const hits = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|astro|md|mdx|yaml)$/.test(entry)) continue;
      const source = readFileSync(full, 'utf8');
      for (const [, found] of source.matchAll(/\bv(\d+\.\d+\.\d+)\b/g)) {
        if (`v${found}` !== version) {
          hits.push({ file: path.relative(SITE_ROOT, full), found: `v${found}` });
        }
      }
    }
  };

  for (const root of roots) if (existsSync(root)) walk(root);
  return hits;
}

const tag = latestTag();
const declared = declaredVersion();

if (!tag) {
  console.log('check-version: le dépôt produit n’a aucun tag de version, contrôle ignoré.');
  process.exit(0);
}

console.log(`check-version: le site annonce ${declared}, le produit est tagué ${tag}`);

const stray = filesMentioning(declared);
let failed = false;

if (declared !== tag) {
  console.error(
    `\ncheck-version: le site a pris du retard. Le produit est publié en ${tag}.`,
  );
  console.error(`  Mettre à jour ${path.relative(SITE_ROOT, VERSION_FILE)}, puis les URL de`);
  console.error('  téléchargement des pages de démarrage rapide, en anglais et en français.');
  failed = true;
}

if (stray.length > 0) {
  console.error(
    `\ncheck-version: ${stray.length} mention(s) d'une autre version que ${declared}`,
  );
  console.error('  Une version recopiée quelque part a été oubliée.\n');
  for (const { file, found } of stray) console.error(`    ${file}  →  ${found}`);
  failed = true;
}

if (failed) process.exit(1);
console.log('check-version: la version du site est à jour');
