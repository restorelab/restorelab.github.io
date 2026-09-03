import assert from 'node:assert/strict';
import test from 'node:test';

import { en } from '../../src/i18n/landing/en.ts';
import { fr } from '../../src/i18n/landing/fr.ts';

/**
 * Le contrat entre les deux dictionnaires de la landing.
 *
 * `LandingCopy` le décrit en TypeScript, mais rien ne le vérifie : le build
 * d'Astro efface les types sans les contrôler, et `astro check` demanderait
 * deux dépendances de plus. Une clé oubliée dans `fr.ts` rendrait donc
 * `undefined` dans la page, en silence. D'où ces tests, qui importent les
 * modules pour de vrai.
 */

/** Aplatit un dictionnaire en couples `chemin` → `valeur`. */
function leaves(value, path = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => leaves(item, `${path}[${i}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) =>
      leaves(item, path ? `${path}.${key}` : key),
    );
  }
  return [[path, value]];
}

const english = new Map(leaves(en));
const french = new Map(leaves(fr));

/**
 * Les valeurs qui doivent rester identiques : marques, sigles, identifiants de
 * licence, et une ligne faite uniquement de noms de commandes.
 *
 * Tout le reste doit différer. C'est ce qui attrape une chaîne anglaise
 * recopiée dans `fr.ts` — l'erreur la plus probable en ajoutant une section.
 */
const UNTRANSLATED = new Set([
  'nav.docs',
  'nav.api',
  'nav.github',
  'hero.tag',
  'hero.meta[0]',
  'hero.meta[1]',
  'hero.meta[2]',
  'screens.shots.diagnostics.caption',
  'status.areas.cli',
  'footer.docsTitle',
  'footer.licenceTitle',
  'footer.baseLeft',
  'footer.links.introduction',
  'footer.links.licence',
]);

test('les deux langues ont exactement les mêmes clés', () => {
  const missingInFrench = [...english.keys()].filter((k) => !french.has(k));
  const extraInFrench = [...french.keys()].filter((k) => !english.has(k));

  assert.deepEqual(missingInFrench, [], 'clés absentes de fr.ts');
  assert.deepEqual(extraInFrench, [], 'clés en trop dans fr.ts');
});

test('aucune valeur vide', () => {
  for (const [lang, dict] of [
    ['en', english],
    ['fr', french],
  ]) {
    for (const [key, value] of dict) {
      assert.equal(typeof value, 'string', `${lang}: ${key} n'est pas une chaîne`);
      assert.ok(value.trim().length > 0, `${lang}: ${key} est vide`);
    }
  }
});

test('les tableaux positionnels ont la même longueur', () => {
  // Ces tableaux sont parcourus en parallèle de données qui vivent dans les
  // composants — les deux commandes du démarrage rapide, par exemple. Une
  // longueur différente ferait rendre `undefined`.
  const arrays = [
    ['hero.meta', (d) => d.hero.meta],
    ['contrast.verification', (d) => d.contrast.verification],
    ['contrast.claim', (d) => d.contrast.claim],
    ['chain.steps', (d) => d.chain.steps],
    ['chain.notes', (d) => d.chain.notes],
    ['quickStart.steps', (d) => d.quickStart.steps],
    ['quickStart.notes', (d) => d.quickStart.notes],
  ];
  for (const [label, pick] of arrays) {
    assert.equal(pick(fr).length, pick(en).length, `${label} : longueurs différentes`);
  }
});

test('la copie française est bien traduite', () => {
  const identical = [...english]
    .filter(([key, value]) => french.get(key) === value)
    .map(([key]) => key);

  const unexpected = identical.filter((key) => !UNTRANSLATED.has(key));
  assert.deepEqual(unexpected, [], 'chaînes restées en anglais dans fr.ts');

  // La liste blanche ne doit pas pourrir : une entrée qui ne correspond plus à
  // une valeur réellement identique est une entrée à retirer.
  const stale = [...UNTRANSLATED].filter((key) => !identical.includes(key));
  assert.deepEqual(stale, [], 'entrées obsolètes de UNTRANSLATED');
});

test('le lien de l’encadré de statut reste substituable', () => {
  // `StatusTable.astro` remplace ce marqueur par le chemin localisé du guide
  // d'isolation réseau. Sans lui, l'encadré perdrait son lien en silence.
  for (const [lang, dict] of [
    ['en', en],
    ['fr', fr],
  ]) {
    assert.ok(
      dict.status.caveat.includes('{networkIsolation}'),
      `${lang}: status.caveat a perdu {networkIsolation}`,
    );
  }
});

test('les états de la table gardent des clés stables', () => {
  // La classe CSS est construite depuis la clé (`pill--done`), pas depuis le
  // libellé : les clés doivent rester anglaises dans les deux langues.
  for (const dict of [en, fr]) {
    assert.deepEqual(Object.keys(dict.status.states), ['done', 'next', 'planned']);
    assert.deepEqual(Object.keys(dict.status.legend), ['done', 'next', 'planned']);
  }
});
