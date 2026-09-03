/**
 * Transformation des documents markdown de RestoreLab en pages Starlight.
 *
 * Deux fonctions publiques :
 *   - rewriteLinks(body, entry, map) : réécrit les liens `.md` vers les routes
 *     du site, et lève une Error sur une cible absente du manifeste ;
 *   - transform({ source, body, entry, map }) : produit le fichier final,
 *     frontmatter et bannière comprises.
 */

/** Le lien markdown à réécrire : `](cible.md)` ou `](cible.md#ancre)`. */
const MD_LINK = /\]\(([^)\s]+?\.md)(#[^)\s]*)?\)/g;

/** Un lien qui porte un schéma d'URL ou une racine de site n'est pas à nous. */
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i;

/** Le dernier segment d'un chemin, quel que soit le séparateur. */
function basename(path) {
  return path.split(/[\/]/).pop();
}

/**
 * Indexe le manifeste par basename de source. `deployment.md`,
 * `./deployment.md` et `docs/deployment.md` désignent donc la même page.
 */
function indexByBasename(map) {
  const index = new Map();
  for (const entry of map) {
    index.set(basename(entry.source), entry);
  }
  return index;
}

/**
 * Réécrit les liens `.md` d'un document vers les routes du site.
 *
 * @param {string} body markdown source
 * @param {{source: string}} entry entrée de manifeste du document courant
 * @param {Array<{source: string, route: string}>} map manifeste complet
 * @returns {string}
 * @throws {Error} si une cible `.md` interne est absente du manifeste
 */
export function rewriteLinks(body, entry, map) {
  const index = indexByBasename(map);

  return body.replace(MD_LINK, (match, target, anchor = '') => {
    if (EXTERNAL.test(target)) return match;

    const found = index.get(basename(target));
    if (!found) {
      throw new Error(
        `Unresolved link: ${target} is referenced by ${entry.source} ` +
          `but no entry of docs.map.json has that source. ` +
          `Add it to the manifest (with "dest": null if the page is written by hand).`,
      );
    }

    return `](${found.route}${anchor})`;
  });
}

/**
 * Échappe une valeur de frontmatter, via JSON.stringify, quand YAML pourrait
 * s'y perdre : deux-points suivi d'un espace, dièse de commentaire, indicateur
 * réservé en tête, espaces en bord.
 */
function yamlScalar(value) {
  const text = String(value);
  const needsQuotes =
    text === '' ||
    /^\s|\s$/.test(text) ||
    /: /.test(text) ||
    /:$/.test(text) ||
    / #/.test(text) ||
    /^[-?:,\[\]{}#&*!|>'"%@`]/.test(text);
  return needsQuotes ? JSON.stringify(text) : text;
}

/** Retire le titre de niveau 1 de tête, et la ligne vide qui le suit. */
function stripLeadingH1(body) {
  const lines = body.split('\n');
  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i += 1;
  if (i >= lines.length || !/^#\s+\S/.test(lines[i])) return body;

  lines.splice(i, 1);
  if (lines[i] !== undefined && lines[i].trim() === '') lines.splice(i, 1);
  return lines.slice(i).join('\n');
}

/**
 * Produit la page Starlight d'un document source.
 *
 * @param {object} args
 * @param {string} args.source chemin relatif affiché dans la bannière
 * @param {string} args.body markdown source
 * @param {object} args.entry entrée de `docs.map.json`
 * @param {Array<object>} args.map manifeste complet
 * @returns {string}
 */
export function transform({ source, body, entry, map }) {
  const normalized = body.replace(/\r\n/g, '\n');
  const linked = rewriteLinks(normalized, entry, map);
  const content = stripLeadingH1(linked).replace(/\s+$/, '');

  const frontmatter = [
    '---',
    `title: ${yamlScalar(entry.title)}`,
    `description: ${yamlScalar(entry.description)}`,
  ];
  if (entry.order !== undefined && entry.order !== null) {
    frontmatter.push('sidebar:', `  order: ${entry.order}`);
  }
  frontmatter.push('---');

  const banner =
    `<!-- Generated from ${source} in github.com/restorelab/restorelab. ` +
    `Do not edit here. -->`;

  return `${frontmatter.join('\n')}\n\n${banner}\n\n${content}\n`;
}
