/**
 * Le contrat de la copie de la landing.
 *
 * Les composants de `src/components/` ne portent plus de texte : ils reçoivent
 * leur tranche de ce dictionnaire. Une seule copie du markup sert les deux
 * langues, donc une évolution de design se fait une fois.
 *
 * Ce qui n'est PAS ici, délibérément :
 * - les transcriptions de terminal et le document YAML du plan, qui sont de la
 *   sortie de programme et un vrai fichier du dépôt — les traduire mentirait ;
 * - les numéros de section, les noms de fichiers d'images, les états de la
 *   table de capacités : de la structure, pas de la copie.
 */

export type Lang = 'en' | 'fr';

/** Une chaîne qui contient du markup inline de confiance, rendue avec `set:html`. */
type Html = string;

/**
 * Les lignes de la table de capacités, désignées par identifiant stable.
 * L'état et l'ordre vivent dans `StatusTable.astro` ; seul le libellé est
 * traduit. `Record<StatusRowId, string>` fait échouer la compilation si une
 * langue en oublie une.
 */
export type StatusRowId =
  | 'proxmoxProvider'
  | 'pbsDiscovery'
  | 'recoveryEngine'
  | 'networkChecks'
  | 'guestAgentChecks'
  | 'cli'
  | 'reports'
  | 'oneCommandSetup'
  | 'doctorAndNetwork'
  | 'drillHistory'
  | 'httpApi'
  | 'confidenceScore'
  | 'proofLevel'
  | 'triggerOverHttp'
  | 'storedPlans'
  | 'sessionCookie'
  | 'dashboard'
  | 'launchFromBrowser'
  | 'planCatalogueInBrowser'
  | 'setupInBrowser'
  | 'scheduledDrills'
  | 'notifications'
  | 'valueAssertions'
  | 'checkRecipes'
  | 'remoteProbes';

/** Les captures du tableau de bord, désignées par leur nom de fichier. */
export type ShotId =
  | 'overview'
  | 'drill'
  | 'history'
  | 'workloads'
  | 'diagnostics';

export interface LandingCopy {
  meta: {
    title: string;
    description: string;
    /** `og:locale`, p. ex. `en_US`. */
    ogLocale: string;
    ogImageAlt: string;
  };

  nav: {
    /** `aria-label` de la navigation principale. */
    primaryLabel: string;
    docs: string;
    quickStart: string;
    api: string;
    github: string;
    /** Libellé du lien vers l'autre langue : « Français » sur `/`, « English » sur `/fr/`. */
    otherLanguage: string;
  };

  hero: {
    tag: string;
    /** Première moitié du titre, en gris. */
    titleQuiet: string;
    /** Seconde moitié, la question. */
    titleRest: string;
    lede: string;
    kicker: Html;
    ctaDocs: string;
    ctaGithub: string;
    meta: string[];
    termNote: string;
  };

  contrast: {
    label: string;
    title: string;
    intro: string;
    verificationTitle: string;
    verification: string[];
    claimTitle: string;
    claim: string[];
    pullquote: string;
    outro: string;
  };

  chain: {
    label: string;
    title: string;
    intro: string;
    steps: string[];
    notes: { title: string; body: Html }[];
  };

  screens: {
    label: string;
    title: string;
    intro: string;
    intro2: string;
    /** Légende et texte alternatif de chaque capture. `note` n'existe que sur les deux grandes. */
    shots: Record<ShotId, { caption: string; alt: string; note?: string }>;
  };

  quickStart: {
    label: string;
    title: string;
    intro: string;
    /** Le texte de l'étape ; la commande vit dans le composant. */
    steps: string[];
    setupIntro: Html;
    setupBody: string;
    setupBody2: string;
    subheadTitle: string;
    subheadBody: string;
    /** L'extrait shell illustratif : les commandes sont identiques, les commentaires traduits. */
    terminal: string;
    terminalAria: string;
    notes: { title: string; body: Html }[];
    moreLink: string;
  };

  plan: {
    label: string;
    title: string;
    intro: string;
    moreLink: string;
  };

  status: {
    label: string;
    title: string;
    intro: string;
    /**
     * Contient `{networkIsolation}`, que le composant remplace par le chemin
     * localisé du guide d'isolation réseau — un lien dans une phrase, dont la
     * cible dépend de la langue.
     */
    caveat: Html;
    areas: Record<StatusRowId, string>;
    caveats: Partial<Record<StatusRowId, string>>;
    /** Le texte de la pastille. La classe CSS reste `pill--done` etc. */
    states: Record<'done' | 'next' | 'planned', string>;
    /** La glose qui suit la pastille dans la légende. */
    legend: Record<'done' | 'next' | 'planned', string>;
  };

  footer: {
    ctaTitle: string;
    ctaQuickStart: string;
    ctaGithub: string;
    docsTitle: string;
    projectTitle: string;
    licenceTitle: string;
    licenceBody: string;
    baseLeft: string;
    baseRight: string;
    links: {
      introduction: string;
      quickStart: string;
      recoveryPlans: string;
      httpApi: string;
      apiReference: string;
      repository: string;
      securityPolicy: string;
      contributing: string;
      licence: string;
    };
  };

  /** Libellés des boutons de copie, lus depuis des `data-` par le script inline. */
  copyButton: {
    label: string;
    copied: string;
    failed: string;
    /**
     * Préfixe de l'`aria-label`, séparateur inclus — la ponctuation dépend de
     * la langue. Suivi d'une espace puis de la commande.
     */
    ariaPrefix: string;
  };
}
