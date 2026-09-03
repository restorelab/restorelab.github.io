import { en } from './en';
import { fr } from './fr';
import type { Lang, LandingCopy } from './types';

export type { Lang, LandingCopy, ShotId, StatusRowId } from './types';
export { en, fr };

export const copyFor: Record<Lang, LandingCopy> = { en, fr };

/**
 * Préfixe un chemin interne par la locale courante.
 *
 * L'anglais est la locale `root` de Starlight : il est servi à la racine, sans
 * préfixe, donc un chemin anglais est déjà le bon.
 *
 * `/api/**` est exclu délibérément. Le greffon `starlight-openapi` n'a aucun
 * support i18n : il ne rend qu'un seul jeu de routes, en anglais, et
 * `/fr/api/...` n'existe pas — c'est vérifié au build. Y renvoyer serait un 404.
 */
export function localize(path: string, lang: Lang): string {
  if (lang === 'en' || path.startsWith('/api/')) return path;
  return `/fr${path}`;
}

/** L'URL de la landing dans une langue donnée, pour le lien de bascule et les `hreflang`. */
export function landingPath(lang: Lang): string {
  return lang === 'en' ? '/' : '/fr/';
}

/** L'autre langue que celle affichée. Deux locales : la bascule est un simple lien. */
export function otherLang(lang: Lang): Lang {
  return lang === 'en' ? 'fr' : 'en';
}
