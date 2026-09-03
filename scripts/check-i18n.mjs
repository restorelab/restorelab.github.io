/**
 * Contrôles du site français.
 *
 * Trois choses qu'aucun compilateur ne voit :
 *
 * 1. **Les liens internes des pages françaises résolvent** — contrôlé sur le
 *    `dist/` bâti, seul endroit où l'on connaisse les routes réelles. Le piège
 *    est `/api/**`, rendu par `starlight-openapi` qui n'a aucun support i18n :
 *    la référence n'existe qu'en anglais, sans préfixe, et un `/fr/api/...`
 *    serait un 404.
 *
 * 2. **La typographie française** — apostrophe typographique, et espace
 *    insécable avant `:` `;` `!` `?`. Contrôlé sur les SOURCES, pas sur le HTML
 *    bâti : une page française porte du chrome qui ne nous appartient pas, à
 *    commencer par les résumés anglais des opérations d'API dans la barre
 *    latérale, et les signaler serait un faux positif permanent. Ces caractères
 *    sont invisibles en relecture, donc ce contrôle en tient lieu.
 *
 * 3. **La référence d'API ne propose pas de version française** qui n'existe
 *    pas — ni dans son sélecteur de langue, ni dans ses `hreflang`.
 *
 * Pour les liens, seules les pages RÉELLEMENT traduites comptent : celles qui
 * servent l'anglais par repli portent le bandeau de Starlight. Le contrôle
 * s'étend donc tout seul à mesure que des pages sont traduites.
 *
 * Usage : `npm run check:i18n`, après un build.
 */

import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, posix, relative, sep } from 'node:path';

const DIST = 'dist';
const LANDING_COPY = 'src/i18n/landing/fr.ts';
const DOCS_FR = 'src/content/docs/fr';

const failures = [];
const fail = (where, message) => failures.push({ where, message });

/** Tous les fichiers d'un arbre, en chemins POSIX relatifs à `root`. */
async function walk(dir, root = dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, root)));
    else out.push(relative(root, full).split(sep).join('/'));
  }
  return out;
}

// ═══════════════════════════════════════════════ typographie, sur les sources

/**
 * Le texte français d'une page Markdown : la prose et les valeurs du
 * frontmatter, sans le code.
 *
 * Les blocs et le code inline partent, et c'est essentiel : une commande ou une
 * sortie de programme porte des apostrophes droites parfaitement légitimes, et
 * dans un bloc préformaté il n'y a aucun retour à la ligne à empêcher, donc
 * l'espace insécable n'y aurait pas de sens.
 */
function proseOfMarkdown(source) {
  const lines = [];
  let inFence = false;
  let inFrontmatter = false;

  source.split('\n').forEach((line, index) => {
    if (index === 0 && line.trim() === '---') {
      inFrontmatter = true;
      return;
    }
    if (inFrontmatter) {
      if (line.trim() === '---') inFrontmatter = false;
      // La valeur est de la copie ; la clé et son deux-points ne le sont pas.
      else lines.push(line.replace(/^\s*[A-Za-z_][\w-]*:\s*/, ''));
      return;
    }
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    lines.push(line.replace(/`[^`]*`/g, ' '));
  });

  return lines.join('\n');
}

/**
 * Les littéraux de chaîne d'un module TypeScript, hors commentaires.
 *
 * Les littéraux gabarits sont écartés : dans `fr.ts` ils ne portent que
 * l'extrait shell, du code. Les balises inline (`<code>`, `<strong>`) sont
 * retirées, leurs attributs n'étant pas de la copie.
 */
function stringsOfModule(source) {
  const out = [];
  let inBlockComment = false;

  for (const line of source.split('\n')) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('/*')) inBlockComment = true;
    const isComment = inBlockComment || trimmed.startsWith('*') || trimmed.startsWith('//');
    if (trimmed.endsWith('*/')) inBlockComment = false;
    if (isComment) continue;

    for (const match of line.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)) {
      const raw = match[1] ?? match[2] ?? '';
      out.push(raw.replace(/\\'/g, "'").replace(/<[^>]+>/g, ' '));
    }
  }

  return out.join('\n');
}

function checkTypography(where, text) {
  for (const match of text.matchAll(/[A-Za-zÀ-ÿ]'[A-Za-zÀ-ÿ]/g)) {
    fail(where, `apostrophe droite : ${JSON.stringify(match[0])} — attendu ’`);
  }
  for (const match of text.matchAll(/[A-Za-zÀ-ÿ0-9»)\]] [:;!?]/g)) {
    fail(
      where,
      `espace normale avant ponctuation double : ${JSON.stringify(match[0])} — attendu U+00A0`,
    );
  }
}

const markdownFiles = (await walk(DOCS_FR)).filter((f) => f.endsWith('.md'));
for (const file of markdownFiles) {
  const source = readFileSync(join(DOCS_FR, file), 'utf8');
  checkTypography(`${DOCS_FR}/${file}`, proseOfMarkdown(source));
}
checkTypography(LANDING_COPY, stringsOfModule(readFileSync(LANDING_COPY, 'utf8')));

// ═════════════════════════════════════════════════ liens, sur le dist bâti

/** Le bandeau que Starlight pose sur une page non traduite. */
const FALLBACK_NOTICE = 'pas encore disponible dans votre langue';

const built = await walk(DIST);

const routes = new Set(
  built
    .filter((f) => f.endsWith('index.html'))
    .map((f) => '/' + posix.dirname(f).replace(/^\.$/, '') + '/')
    .map((r) => r.replace('//', '/')),
);
const assets = new Set(built.map((f) => '/' + f));

const frenchPages = built.filter((f) => f.startsWith('fr/') && f.endsWith('index.html'));
if (frenchPages.length === 0) {
  console.error(
    'check-i18n: aucune page française dans dist/. Lancer `npm run build` d’abord.',
  );
  process.exit(1);
}

let translated = 0;
let byFallback = 0;

for (const file of frenchPages) {
  const html = readFileSync(join(DIST, file), 'utf8');
  const page = '/' + posix.dirname(file) + '/';

  for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
    if (/^\/(?:_astro|pagefind|img|favicon)/.test(href)) continue;
    const target = href.endsWith('/') ? href : href + '/';
    if (!routes.has(target) && !assets.has(href)) fail(page, `lien mort : ${href}`);
  }

  if (html.includes(FALLBACK_NOTICE)) byFallback += 1;
  else translated += 1;
}

// ═══════════════════════════════════════════════════════ la référence d'API

const apiPages = built.filter((f) => f.startsWith('api/') && f.endsWith('index.html'));
for (const file of apiPages) {
  const html = readFileSync(join(DIST, file), 'utf8');
  if (html.includes('/fr/api/')) {
    fail('/' + posix.dirname(file) + '/', 'propose /fr/api/, qui n’existe pas');
  }
}

console.log(
  `check-i18n: typographie — ${markdownFiles.length} page(s) Markdown + la copie de la landing`,
);
console.log(
  `check-i18n: liens — ${translated} page(s) traduite(s), ${byFallback} servie(s) par repli`,
);
console.log(`check-i18n: ${apiPages.length} page(s) de référence d’API vérifiée(s)`);

if (failures.length > 0) {
  console.error(`\ncheck-i18n: ${failures.length} problème(s)\n`);
  for (const { where, message } of failures) console.error(`  ${where}  ${message}`);
  process.exit(1);
}

console.log('check-i18n: tout est conforme');
