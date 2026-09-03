/**
 * Compare les routes déclarées par RestoreLab au contrat OpenAPI publié.
 *
 * C'est le seul endroit où la dérive était totalement silencieuse. La
 * documentation a `sync:check`, la référence CLI a `gen:cli --check`, mais
 * `spec/openapi.yaml` est écrit à la main : une route ajoutée côté produit
 * n'apparaissait nulle part tant que quelqu'un ne s'en apercevait pas. C'est
 * arrivé le 2026-09-03 avec les deux routes du planificateur.
 *
 * Le contrôle est **textuel** : il lit les appels `mux.Handle("MÉTHODE /chemin"`
 * de `internal/api/`. Une route enregistrée par une variable ou dans une boucle
 * lui échapperait — le code n'en fait pas aujourd'hui, et un analyseur Go
 * complet serait hors de proportion pour ce que ça garantit.
 *
 * Sans le dépôt produit sous la main, le script **passe** au lieu d'échouer :
 * il tourne en local et dans un job qui a fait le clonage, pas dans le build
 * public, qui n'a pas accès à un dépôt privé.
 *
 * Usage : `npm run check:api`
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';

const SITE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = path.join(SITE_ROOT, 'spec', 'openapi.yaml');

const repo = path.resolve(SITE_ROOT, process.env.RESTORELAB_REPO ?? '../RestoreLab');
const apiDir = path.join(repo, 'internal', 'api');

if (!existsSync(apiDir)) {
  console.log(
    `check-api-drift: ${path.relative(SITE_ROOT, apiDir)} est introuvable, contrôle ignoré.`,
  );
  console.log(
    'check-api-drift: pointer RESTORELAB_REPO sur le dépôt produit pour l’activer.',
  );
  process.exit(0);
}

/** Le préfixe que les routes portent dans le code et que le contrat met dans son `servers`. */
const PREFIX = '/api/v1';

/** Les routes déclarées dans le code, hors tableau de bord servi à la racine. */
function routesFromCode() {
  const found = new Map();

  for (const entry of readdirSync(apiDir)) {
    if (!entry.endsWith('.go') || entry.endsWith('_test.go')) continue;
    const source = readFileSync(path.join(apiDir, entry), 'utf8');

    for (const [, method, route] of source.matchAll(
      /\bHandle(?:Func)?\("([A-Z]+) (\/[^"]*)"/g,
    )) {
      if (!route.startsWith(PREFIX)) continue;
      const p = route.slice(PREFIX.length) || '/';
      found.set(`${method} ${p}`, entry);
    }
  }

  return found;
}

/** Les opérations documentées par le contrat. */
function operationsFromSpec() {
  const spec = parse(readFileSync(SPEC, 'utf8'));
  const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);
  const found = new Map();

  for (const [route, item] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(item)) {
      if (!methods.has(method)) continue;
      found.set(`${method.toUpperCase()} ${route}`, operation.operationId ?? '(sans operationId)');
    }
  }

  return found;
}

const code = routesFromCode();
const spec = operationsFromSpec();

const undocumented = [...code.keys()].filter((r) => !spec.has(r)).sort();
const stale = [...spec.keys()].filter((r) => !code.has(r)).sort();

console.log(
  `check-api-drift: ${code.size} route(s) dans le code, ${spec.size} opération(s) dans le contrat`,
);

if (undocumented.length === 0 && stale.length === 0) {
  console.log('check-api-drift: le contrat correspond au code');
  process.exit(0);
}

if (undocumented.length > 0) {
  console.error(
    `\ncheck-api-drift: ${undocumented.length} route(s) servie(s) mais absente(s) du contrat`,
  );
  console.error('  La référence d’API publiée est incomplète. Décrire ces routes dans');
  console.error('  spec/openapi.yaml, depuis le code et non depuis docs/api.md.\n');
  for (const route of undocumented) console.error(`    ${route}   (${code.get(route)})`);
}

if (stale.length > 0) {
  console.error(
    `\ncheck-api-drift: ${stale.length} opération(s) documentée(s) mais plus servie(s)`,
  );
  console.error('  Le contrat promet des routes qui répondront 404. Les retirer.\n');
  for (const route of stale) console.error(`    ${route}   (${spec.get(route)})`);
}

process.exit(1);
