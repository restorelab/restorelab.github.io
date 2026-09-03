import { RESTORELAB_VERSION } from '../../version.ts';
import type { LandingCopy } from './types';

/**
 * La copie française de la landing.
 *
 * La typographie française impose une espace insécable avant `:` `;` `!` `?`.
 * C'est ici un caractère U+00A0 littéral, donc invisible en relecture : même
 * convention que les pages de `src/content/docs/fr/`, où Markdown n'offre aucun
 * échappement. C'est `npm run check:i18n` qui garantit qu'elle est là, pas
 * l'œil du relecteur.
 *
 * Les commandes, la sortie de programme et le document YAML ne sont pas ici :
 * ils vivent dans les composants, identiques dans les deux langues. Seuls les
 * commentaires humains de l'extrait shell illustratif sont traduits.
 */
export const fr: LandingCopy = {
  meta: {
    title: 'RestoreLab — pouvez-vous vraiment restaurer ?',
    description:
      'Exercices de restauration automatisés : restaurer une sauvegarde dans un réseau isolé, la démarrer, la contrôler depuis l’intérieur, mesurer le RTO, et la détruire.',
    ogLocale: 'fr_FR',
    ogImageAlt: 'La vue d’ensemble du tableau de bord RestoreLab.',
  },

  nav: {
    primaryLabel: 'Principale',
    docs: 'Docs',
    quickStart: 'Démarrage rapide',
    api: 'API',
    github: 'GitHub',
    otherLanguage: 'English',
  },

  hero: {
    tag: 'Alpha',
    titleQuiet: 'Vos sauvegardes sont au vert.',
    titleRest: 'Mais pouvez-vous vraiment restaurer ?',
    lede: 'RestoreLab restaure vos sauvegardes dans des environnements isolés, démarre les charges de travail, valide les services, mesure votre temps de reprise réel, et nettoie tout derrière lui.',
    kicker:
      'Un binaire, une commande. Sans aucune configuration, <code>serve</code> démarre quand même, affiche une adresse d’installation à usage unique, et le navigateur fait le reste.',
    ctaDocs: 'Lire la documentation',
    ctaGithub: 'Voir sur GitHub',
    meta: [
      'AGPL-3.0',
      RESTORELAB_VERSION,
      'Proxmox VE',
      'Auto-hébergé',
      'Binaire unique',
    ],
    termNote:
      'Un exercice : une copie temporaire de la VM 101 restaurée sur le bridge isolé, démarrée, contrôlée, mesurée, puis supprimée.',
  },

  contrast: {
    label: 'L’argument',
    title: 'Ce que la vérification de sauvegarde laisse de côté',
    intro:
      'Un travail de vérification répond à une question sur un fichier. Un exercice de restauration répond à la question que vous vous posez vraiment.',
    verificationTitle: 'La vérification de sauvegarde dit',
    verification: ['La sauvegarde existe', 'La somme de contrôle est valide'],
    claimTitle: 'RestoreLab dit',
    claim: [
      'VM restaurée',
      'OS démarré',
      'PostgreSQL démarré',
      'API répondant HTTP 200',
      'Reprise effectuée en 2m06',
    ],
    pullquote:
      'Une sauvegarde qui se restaure n’est pas la même chose qu’un service qui revient.',
    outro:
      'La VM démarre mais PostgreSQL ne se lance pas. La base démarre mais le schéma est incohérent. L’API répond mais Redis n’a jamais été restauré. La reprise prend 45 minutes pour un RTO de 15 minutes. RestoreLab éprouve toute la chaîne, périodiquement, et le prouve.',
  },

  chain: {
    label: 'La chaîne',
    title: 'Neuf maillons, et un exercice les parcourt tous',
    intro:
      'Un exercice s’arrête au premier maillon qui ne tient pas, et dit lequel. Quand tous les maillons tiennent, le temps de reprise est une mesure, pas une estimation.',
    steps: [
      'la sauvegarde existe',
      'disponible',
      'la restauration réussit',
      'l’invité démarre',
      'l’OS est joignable',
      'les services démarrent',
      'l’application répond',
      'les dépendances sont utilisables',
      'RTO mesuré',
    ],
    notes: [
      {
        title: 'Isolé par défaut',
        body: 'Chaque exercice s’exécute contre une charge de travail temporaire sur un réseau isolé, jamais contre la production. Les restaurations arrivent sur un bridge dédié sans lien montant, la configuration réseau héritée de la sauvegarde est réécrite, et une exécution est refusée quand l’isolation ne peut pas être vérifiée.',
      },
      {
        title: 'Ne touche jamais la production',
        body: 'Chaque ressource temporaire est créée par RestoreLab avec la métadonnée <code class="mono">restorelab_managed=true</code>, et la suppression refuse toute charge de travail qui ne la porte pas. Les restaurations vont dans une plage de VMID réservée — 9000–9999 par défaut — jamais par-dessus une charge de travail existante.',
      },
    ],
  },

  screens: {
    label: 'Le tableau de bord',
    title: 'Le tableau de bord pilote l’outil',
    intro:
      'Il montre ce qui tourne, ce qui a tourné, ce qui est protégé et si le cluster est correctement configuré, les phases d’un exercice se remplissant en direct pendant qu’il se déroule — et il lance des exercices, les annule, détruit ce qu’ils laissent derrière eux, et rédige le catalogue de plans, le binaire lui-même validant chaque document à la frappe.',
    intro2:
      'Prouver qu’une sauvegarde peut faire revenir un service mérite d’être fait par une équipe d’exploitation, pas seulement par qui est à l’aise dans un terminal. La ligne de commande conserve toutes les capacités ; c’est elle que l’automatisation pilote.',
    shots: {
      overview: {
        caption: 'Vue d’ensemble',
        note: 'Ce qui tourne, ce qui a tourné, et combien de temps la reprise a pris.',
        alt: 'L’écran de vue d’ensemble de RestoreLab : l’exercice en cours, les exercices récents avec leur résultat et leur temps de reprise mesuré, et l’état du cluster.',
      },
      drill: {
        caption: 'Un exercice, en détail',
        note: 'Phase par phase, avec le temps de reprise mis en regard de la cible et le contrôle qui n’est pas revenu.',
        alt: 'Un exercice terminé : ses phases avec leurs durées, le temps de reprise face à la cible du plan, et les contrôles, dont l’un a échoué.',
      },
      history: {
        caption: 'Historique',
        alt: 'L’historique des exercices RestoreLab : les exercices de restauration passés avec leur charge de travail, leur résultat et leur temps de reprise mesuré.',
      },
      workloads: {
        caption: 'Charges de travail',
        alt: 'L’écran des charges de travail : chaque machine virtuelle découverte sur le cluster, ses sauvegardes et son score de confiance de restauration.',
      },
      diagnostics: {
        caption: 'Diagnostics',
        alt: 'L’écran de diagnostics, qui indique si le cluster, le stockage et le bridge isolé sont correctement configurés.',
      },
    },
  },

  quickStart: {
    label: 'Démarrage rapide',
    title: 'Une commande, puis un navigateur',
    intro:
      'Un binaire, aucun agent à installer sur les invités, aucun démon à maintenir en vie à côté. C’est tout.',
    steps: [
      'Lancez-le. L’image embarque le tableau de bord, et le volume conserve la configuration et la clé maîtresse.',
      'Ou un seul fichier, depuis la dernière version. Aucun runtime, et une somme de contrôle à côté.',
    ],
    setupIntro:
      'Sans aucune configuration, <code class="mono">serve</code> démarre quand même et affiche une adresse porteuse d’un jeton d’installation à usage unique :',
    setupBody:
      'Ouvrez-la et le navigateur demande l’adresse de votre cluster, le mot de passe d’un administrateur, et le stockage sur lequel les exercices restaurent. RestoreLab utilise ce mot de passe une seule fois, en mémoire, pour créer son propre compte de service au privilège minimal, puis le jette — seul le jeton obtenu est conservé, scellé sous une clé maîtresse qu’il génère pour vous. Il propose de créer le bridge isolé sur le même écran.',
    setupBody2:
      'Quand il a terminé, le serveur se redémarre lui-même et la page où vous êtes déjà ouvre votre session. Vous arrivez sur le tableau de bord, connecté, sans repasser par le terminal.',
    subheadTitle: 'La même chose depuis un terminal',
    subheadBody:
      'Toutes les capacités restent en ligne de commande — c’est ce que l’automatisation pilote.',
    terminal: `# Connectez votre cluster. Même traitement du mot de passe, même compte de service.
bin/restorelab connect https://pve.example.com:8006 --storage local-zfs

# voir ce qui peut être éprouvé
bin/restorelab workloads list --backups

# lancer un exercice sur la VM 101, depuis sa dernière sauvegarde
bin/restorelab recovery test 101`,
    terminalAria: 'Copier les trois commandes du terminal',
    notes: [
      {
        title: 'Regarder avant de toucher',
        body: '<code class="mono">connect --read-only</code> produit un jeton qui ne peut rien créer ni rien détruire, et qui suffit à la découverte et à <code class="mono">recovery test --dry-run</code>.',
      },
      {
        title: 'Ou depuis les sources',
        body: 'Go 1.27+ et Node, parce que le tableau de bord est compilé dans le binaire : <code class="mono">make ui &amp;&amp; go build -o bin/restorelab ./cmd/restorelab</code>. Compilé sans la chaîne d’outils front-end, il n’embarque pas d’interface et le dit, au lieu de répondre 404.',
      },
    ],
    moreLink: 'Démarrage rapide complet →',
  },

  plan: {
    label: 'Un plan de restauration',
    title: 'Quoi restaurer, où, et ce qui doit être vrai ensuite',
    intro:
      'Un plan est un unique document YAML, stocké en base et validé par le binaire. Il nomme la charge de travail, quelle sauvegarde prendre, où la copie atterrit, ce qui doit répondre une fois démarrée, et le temps de reprise face auquel elle est mesurée.',
    moreLink: 'Référence des plans et tous les types de contrôle →',
  },

  status: {
    label: 'État',
    title: 'Alpha, et précis là-dessus',
    intro:
      'La chaîne d’exercices de restauration Proxmox fonctionne de bout en bout et a été pilotée contre un cluster Proxmox VE 9 en service. L’historique des exercices est conservé automatiquement, les plans de restauration vivent dans la base, et l’API HTTP sert cet historique autant qu’elle déclenche de nouveaux exercices, via un worker qui vide une file d’attente.',
    caveat:
      'Deux choses ci-dessous sont implémentées et couvertes par des tests unitaires mais n’ont <strong>jamais été exécutées contre une vraie infrastructure</strong>, parce que le cluster sur lequel tout ceci a été construit n’a ni l’une ni l’autre : <strong>Proxmox Backup Server</strong>, et les <strong>contrôles réseau</strong>, qui ont besoin d’une route vers le bridge isolé. Tout le reste a été piloté contre un cluster en service. Voir <a href="{networkIsolation}">isolation réseau</a>.',
    areas: {
      proxmoxProvider:
        'Fournisseur Proxmox VE (restauration / durcissement / démarrage / statut / suppression)',
      pbsDiscovery: 'Découverte Proxmox Backup Server',
      recoveryEngine:
        'Moteur de restauration (isolation, capacité, nettoyage, RTO, notation)',
      networkChecks: 'Contrôles : ping, tcp, http/https, dns',
      guestAgentChecks:
        'Contrôles dans l’invité via le QEMU guest agent (aucune route réseau nécessaire)',
      cli: 'CLI (<code>init</code>, <code>provider</code>, <code>workloads</code>, <code>backups</code>, <code>recovery</code>, <code>cleanup</code>)',
      reports: 'Rapports : terminal, JSON, HTML autonome',
      oneCommandSetup:
        'Installation en une commande (<code>connect</code>) créant un compte de service au privilège minimal',
      doctorAndNetwork:
        'Diagnostics <code>doctor</code> et <code>network create</code> pour le bridge isolé',
      drillHistory:
        'Historique des exercices, SQLite par défaut, PostgreSQL en option (<code>runs</code>, <code>db</code>)',
      httpApi:
        'API HTTP + authentification par jeton et portées (<code>serve</code>, <code>token</code>)',
      confidenceScore:
        'Score de confiance de restauration, calculé depuis l’historique stocké',
      proofLevel:
        'Niveau de preuve : ce que chaque exercice a établi, et le plafond que ça met sur le score',
      triggerOverHttp:
        'Déclenchement et annulation d’exercices via HTTP, worker, file d’attente, flux d’événements en direct',
      storedPlans:
        'Plans de restauration stockés en base, édités via HTTP ou avec <code>plan</code>',
      sessionCookie:
        'Cookie de session navigateur, pour qu’un tableau de bord s’authentifie et lise le flux d’événements',
      dashboard:
        'Tableau de bord web, servi par le binaire : vue d’ensemble, historique, exercice en direct, charges de travail, diagnostics',
      launchFromBrowser:
        'Lancement et annulation d’exercices depuis le navigateur, et destruction de ce qu’ils laissent derrière eux',
      planCatalogueInBrowser:
        'Rédaction du catalogue de plans dans le navigateur, validé par le binaire à la frappe',
      setupInBrowser:
        'Installation initiale dans le navigateur, en remplacement des commandes d’installation',
      scheduledDrills:
        'Exercices planifiés : le cron d’un plan met ses propres exercices en file, sans personne',
      moreChecks: 'Contrôles SSH / PostgreSQL / MySQL, notifications',
      remoteProbes: 'Sondes distantes, RBAC, OIDC',
    },
    caveats: {
      pbsDiscovery: 'Jamais exécuté contre un vrai PBS',
      networkChecks: 'Jamais exécuté contre un vrai bridge isolé',
    },
    states: { done: 'livré', next: 'en cours', planned: 'prévu' },
    legend: {
      done: 'disponible',
      next: 'en construction',
      planned: 'pas commencé',
    },
  },

  footer: {
    ctaTitle: 'Lancez un exercice, et cessez d’estimer votre temps de reprise.',
    ctaQuickStart: 'Démarrage rapide',
    ctaGithub: 'Voir sur GitHub',
    docsTitle: 'Documentation',
    projectTitle: 'Projet',
    licenceTitle: 'Licence',
    licenceBody:
      'RestoreLab est libre d’être auto-hébergé, modifié et exécuté. Si vous le proposez comme service en réseau, les mêmes libertés doivent parvenir à vos utilisateurs.',
    baseLeft: 'RestoreLab — AGPL-3.0',
    baseRight: 'Exercices de restauration automatisés pour Proxmox VE',
    links: {
      introduction: 'Introduction',
      quickStart: 'Démarrage rapide',
      recoveryPlans: 'Plans de restauration',
      httpApi: 'API HTTP',
      apiReference: 'Référence d’API',
      repository: 'Dépôt',
      securityPolicy: 'Politique de sécurité',
      contributing: 'Contribuer',
      licence: 'Licence, AGPL-3.0',
    },
  },

  copyButton: {
    label: 'Copier',
    copied: 'Copié',
    failed: 'Échec',
    ariaPrefix: 'Copier :',
  },
};
