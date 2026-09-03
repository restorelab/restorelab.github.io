import type { LandingCopy } from './types';

/**
 * La copie anglaise de la landing — les chaînes d'origine, sorties du markup
 * sans être retouchées. Les entités `&rsquo;` sont devenues des apostrophes
 * typographiques littérales : ces chaînes sont maintenant rendues comme du
 * texte, pas comme du HTML, donc une entité s'afficherait telle quelle.
 */
export const en: LandingCopy = {
  meta: {
    title: 'RestoreLab — can you actually recover?',
    description:
      'Automated recovery drills: restore a backup into an isolated network, boot it, check it from inside, measure the RTO, and destroy it.',
    ogLocale: 'en_US',
    ogImageAlt: 'The RestoreLab dashboard overview.',
  },

  nav: {
    primaryLabel: 'Primary',
    docs: 'Docs',
    quickStart: 'Quick start',
    api: 'API',
    github: 'GitHub',
    otherLanguage: 'Français',
  },

  hero: {
    tag: 'Alpha',
    titleQuiet: 'Your backups are green.',
    titleRest: 'But can you actually recover?',
    lede: 'RestoreLab restores your backups into isolated environments, boots the workloads, validates the services, measures your real recovery time, and cleans everything up.',
    kicker:
      'One binary, one command. With nothing configured, <code>serve</code> starts anyway, prints a one-time setup address, and the browser does the rest.',
    ctaDocs: 'Read the docs',
    ctaGithub: 'View on GitHub',
    meta: ['AGPL-3.0', 'Go 1.27+', 'Proxmox VE', 'Self-hosted', 'Single binary'],
    termNote:
      'One drill: a temporary copy of VM 101 restored onto the isolated bridge, booted, checked, measured, and removed.',
  },

  contrast: {
    label: 'The argument',
    title: 'What backup verification leaves out',
    intro:
      'A verification job answers a question about a file. A recovery drill answers the question you actually have.',
    verificationTitle: 'Backup verification says',
    verification: ['Backup exists', 'Checksum valid'],
    claimTitle: 'RestoreLab says',
    claim: [
      'VM restored',
      'OS booted',
      'PostgreSQL started',
      'API returned HTTP 200',
      'Recovery completed in 2m06',
    ],
    pullquote:
      'A backup that restores is not the same thing as a service that comes back.',
    outro:
      'The VM boots but PostgreSQL does not start. The database starts but the schema is inconsistent. The API answers but Redis was never restored. Recovery takes 45 minutes against a 15-minute RTO. RestoreLab tests the whole chain, on a schedule, and proves it.',
  },

  chain: {
    label: 'The chain',
    title: 'Nine links, and a drill walks all of them',
    intro:
      'A drill stops at the first link that does not hold, and reports which one. When every link holds, the recovery time is the measurement, not an estimate.',
    steps: [
      'backup exists',
      'available',
      'restore succeeds',
      'guest boots',
      'OS reachable',
      'services start',
      'application responds',
      'dependencies usable',
      'RTO measured',
    ],
    notes: [
      {
        title: 'Isolated by default',
        body: 'Every drill runs against a temporary workload on an isolated network, never against production. Restores land on a dedicated bridge with no uplink, the network configuration inherited from the backup is rewritten, and a run is refused when isolation cannot be verified.',
      },
      {
        title: 'Never touches production',
        body: 'Every temporary resource is created by RestoreLab with <code class="mono">restorelab_managed=true</code> metadata, and delete refuses any workload that does not carry it. Restores go to a reserved VMID range — 9000–9999 by default — never over an existing workload.',
      },
    ],
  },

  screens: {
    label: 'The dashboard',
    title: 'The dashboard runs the tool',
    intro:
      'It shows what is running, what has run, what is protected and whether the cluster is configured correctly, with a drill’s phases filling in live while it happens — and it starts drills, cancels them, destroys what they leave behind, and writes the plan catalogue with the binary itself validating each document as you type.',
    intro2:
      'Proving a backup can recover a service is worth doing by an operations team, not only by whoever is comfortable in a terminal. The command line keeps every capability; it is what automation drives.',
    shots: {
      overview: {
        caption: 'Overview',
        note: 'What is running, what has run, and how long recovery took.',
        alt: 'The RestoreLab overview screen: the drill currently running, the recent drills with their outcome and measured recovery time, and the state of the cluster.',
      },
      drill: {
        caption: 'A drill, in detail',
        note: 'Phase by phase, with the recovery time set against the target and the check that did not come back.',
        alt: "A finished drill: its phases with their durations, the recovery time against the plan's target, and the checks, one of which failed.",
      },
      history: {
        caption: 'History',
        alt: 'RestoreLab drill history: past recovery drills with their workload, outcome and measured recovery time.',
      },
      workloads: {
        caption: 'Workloads',
        alt: 'The workloads screen: every virtual machine discovered on the cluster, its backups and its recovery confidence score.',
      },
      diagnostics: {
        caption: 'Diagnostics',
        alt: 'The diagnostics screen, reporting whether the cluster, the storage and the isolated bridge are configured correctly.',
      },
    },
  },

  quickStart: {
    label: 'Quick start',
    title: 'Two commands, then a browser',
    intro:
      'One binary, no agent to install on the guests, no daemon to keep alive beside it. That is the whole of it.',
    steps: [
      'Build the binary. Go 1.27+ is required until the first binary release.',
      'Start it. Nothing has to be configured first.',
    ],
    setupIntro:
      'With nothing configured, <code class="mono">serve</code> starts anyway and prints an address carrying a one-time setup token:',
    setupBody:
      'Open it and the browser asks for your cluster’s address, an administrator’s password, and the storage drills restore onto. RestoreLab uses that password once, in memory, to create its own least-privilege service account, then throws it away — only the resulting token is stored, sealed with a master key it generates for you. It offers to create the isolated bridge on the same screen.',
    setupBody2:
      'When it finishes, the server restarts itself and the page you are already on opens your session. You land on the dashboard, connected, without going back to the terminal.',
    subheadTitle: 'The same thing from a terminal',
    subheadBody:
      'Every capability stays on the command line — it is what automation drives.',
    terminal: `# Connect your cluster. Same password handling, same service account.
bin/restorelab connect https://pve.example.com:8006 --storage local-zfs

# see what can be recovery-tested
bin/restorelab workloads list --backups

# run a drill on VM 101, from its latest backup
bin/restorelab recovery test 101`,
    terminalAria: 'Copy the three terminal commands',
    notes: [
      {
        title: 'Look before touching',
        body: '<code class="mono">connect --read-only</code> produces a token that cannot create or destroy anything, and is enough for discovery and <code class="mono">recovery test --dry-run</code>.',
      },
      {
        title: 'Building without the front end',
        body: 'A binary built without the front-end toolchain has no interface compiled in and says so instead of 404ing; <code class="mono">make ui</code> is what compiles it.',
      },
    ],
    moreLink: 'Full quick start →',
  },

  plan: {
    label: 'A recovery plan',
    title: 'What to restore, where, and what must be true afterwards',
    intro:
      'A plan is one YAML document, stored in the database and validated by the binary. It names the workload, which backup to take, where the copy lands, what must answer once it boots, and the recovery time it is measured against.',
    moreLink: 'Plan reference and every check type →',
  },

  status: {
    label: 'Status',
    title: 'Alpha, and specific about it',
    intro:
      'The Proxmox recovery drill pipeline works end to end and has been driven against a live Proxmox VE 9 cluster. Drill history is kept automatically, recovery plans live in the database, and the HTTP API both serves that history and triggers new drills through a worker that drains a queue.',
    caveat:
      'Two things below are implemented and unit-tested but have <strong>never run against real infrastructure</strong>, because the cluster this was built on has neither: <strong>Proxmox Backup Server</strong>, and the <strong>network checks</strong>, which need a route to the isolated bridge. Everything else has been driven against a live cluster. See <a href="{networkIsolation}">network isolation</a>.',
    areas: {
      proxmoxProvider:
        'Proxmox VE provider (restore / harden / start / status / delete)',
      pbsDiscovery: 'Proxmox Backup Server discovery',
      recoveryEngine:
        'Recovery engine (isolation, capacity, cleanup, RTO, grading)',
      networkChecks: 'Checks: ping, tcp, http/https, dns',
      guestAgentChecks:
        'In-guest checks through the QEMU guest agent (no network path needed)',
      cli: 'CLI (<code>init</code>, <code>provider</code>, <code>workloads</code>, <code>backups</code>, <code>recovery</code>, <code>cleanup</code>)',
      reports: 'Reports: terminal, JSON, self-contained HTML',
      oneCommandSetup:
        'One-command setup (<code>connect</code>) creating a least-privilege service account',
      doctorAndNetwork:
        '<code>doctor</code> diagnostics and <code>network create</code> for the isolated bridge',
      drillHistory:
        'Drill history, SQLite by default, PostgreSQL optional (<code>runs</code>, <code>db</code>)',
      httpApi:
        'HTTP API + token auth and scopes (<code>serve</code>, <code>token</code>)',
      confidenceScore:
        'Recovery confidence score, computed from the stored history',
      triggerOverHttp:
        'Triggering and cancelling drills over HTTP, worker, queue, live event stream',
      storedPlans:
        'Recovery plans stored in the database, edited over HTTP or with <code>plan</code>',
      sessionCookie:
        'Browser session cookie, so a dashboard can authenticate and read the event stream',
      dashboard:
        'Web dashboard, served from the binary: overview, history, live drill, workloads, diagnostics',
      launchFromBrowser:
        'Launching and cancelling drills from the browser, and destroying what they leave behind',
      planCatalogueInBrowser:
        'Writing the plan catalogue in the browser, validated by the binary as you type',
      setupInBrowser:
        'First-run setup in the browser, replacing the install commands',
      scheduledDrills:
        "Scheduled drills: a plan's cron queues its own drills, unattended",
      moreChecks: 'SSH / PostgreSQL / MySQL checks, notifications',
      remoteProbes: 'Remote probes, RBAC, OIDC',
    },
    caveats: {
      pbsDiscovery: 'Never run against a real PBS',
      networkChecks: 'Never run against a real isolated bridge',
    },
    states: { done: 'done', next: 'next', planned: 'planned' },
    legend: { done: 'shipped', next: 'being built', planned: 'not started' },
  },

  footer: {
    ctaTitle: 'Run one drill, and stop estimating your recovery time.',
    ctaQuickStart: 'Quick start',
    ctaGithub: 'View on GitHub',
    docsTitle: 'Documentation',
    projectTitle: 'Project',
    licenceTitle: 'Licence',
    licenceBody:
      'RestoreLab is free to self-host, modify and run. If you offer it as a network service, the same freedoms must reach your users.',
    baseLeft: 'RestoreLab — AGPL-3.0',
    baseRight: 'Automated recovery drills for Proxmox VE',
    links: {
      introduction: 'Introduction',
      quickStart: 'Quick start',
      recoveryPlans: 'Recovery plans',
      httpApi: 'HTTP API',
      apiReference: 'API reference',
      repository: 'Repository',
      securityPolicy: 'Security policy',
      contributing: 'Contributing',
      licence: 'Licence, AGPL-3.0',
    },
  },

  copyButton: {
    label: 'Copy',
    copied: 'Copied',
    failed: 'Failed',
    ariaPrefix: 'Copy:',
  },
};
