/**
 * La version publiée de RestoreLab, affichée sur la landing.
 *
 * Un seul endroit, parce qu'un numéro de version recopié est un numéro de
 * version qui vieillit. `npm run check:version` la compare au dernier tag du
 * dépôt produit et échoue quand elle a pris du retard.
 *
 * Les URL de téléchargement des pages de démarrage rapide portent aussi ce
 * numéro — Markdown ne peut pas importer une constante, et l'URL
 * `releases/latest/download/` de GitHub exige le nom de fichier exact. Le même
 * contrôle les couvre.
 */
export const RESTORELAB_VERSION = 'v0.3.0';
