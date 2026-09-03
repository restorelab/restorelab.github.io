# restorelab.github.io

The RestoreLab website and documentation: <https://restorelab.github.io/>.

An [Astro](https://astro.build) site using the
[Starlight](https://starlight.astro.build) documentation theme, plus
[starlight-openapi](https://starlight-openapi.vercel.app) for the HTTP API
reference. It is a presentation layer only — RestoreLab itself lives in
[restorelab/restorelab](https://github.com/restorelab/restorelab).

## Generated content — do not edit here

Most of the documentation is **generated** and is overwritten by the next sync.
Editing it in this repository loses your work. Edit the source instead, in
`restorelab/restorelab`, then re-run the sync.

| Generated here | Source |
| :--- | :--- |
| `src/content/docs/guides/*.md` | `docs/*.md` in restorelab/restorelab |
| `src/content/docs/reference/architecture.md` | `docs/architecture.md` |
| `src/content/docs/reference/security.md` | `docs/security.md` |
| `src/content/docs/reference/cli.md` | the `restorelab` binary's own help output |
| `public/openapi.yaml` | `spec/openapi.yaml` (copied at build time) |

`docs.map.json` is the manifest that drives the sync: it maps each source file
to its destination, route, title and sidebar order. Entries with `"dest": null`
exist only so cross-links in the Markdown resolve to a real URL. A `.md` link
the manifest cannot resolve makes the sync fail — that is deliberate, it is the
only thing stopping dead links from shipping silently.

Everything else — the landing page, the theme, `src/content/docs/start/`,
`spec/openapi.yaml`, the scripts — is written and maintained here.

## Commands

Run from the root of the repository.

| Command | What it does |
| :--- | :--- |
| `npm install` | Installs dependencies. |
| `npm run dev` | Starts the Astro dev server on <http://localhost:4321>. |
| `npm run build` | Builds the production site into `dist/`. `prebuild` copies `spec/openapi.yaml` into `public/` and lints it first, so a broken spec fails the build. |
| `npm run preview` | Serves `dist/` locally, to check the built site before deploying. |
| `npm run sync` | Pulls `docs/*.md` from the RestoreLab checkout and writes the generated pages listed above. Reads the source repository from `RESTORELAB_REPO` (default `../RestoreLab`). |
| `npm run sync:check` | Same transformation, writes nothing, exits 1 if any generated page is missing or out of date. Use it in CI or before a release. |
| `npm run gen:cli` | Regenerates `src/content/docs/reference/cli.md` from the `restorelab` binary's help output. Needs a built binary on `PATH`. |
| `npm run screenshots` | Drives the RestoreLab dashboard with Playwright and writes the landing-page screenshots into `public/img/`. |
| `npm run lint:api` | Lints `spec/openapi.yaml` with Redocly. |
| `npm test` | Runs the unit tests of the sync/transform helpers (`node --test scripts/lib/*.test.mjs`). |

`npm run sync`, `gen:cli` and `screenshots` are run by hand, from a machine that
has the RestoreLab source or binary; their output is committed. Only `npm ci`,
`npm test` and `npm run build` run in CI.

## Layout

```
.
├── .github/workflows/     deploy.yml (Pages) and sync-docs.yml (dormant)
├── docs.map.json          the sync manifest: source -> destination, route, title
├── public/                static assets served as-is (favicon, img/, openapi.yaml)
├── scripts/
│   ├── sync-docs.mjs      the documentation sync (--check for a dry run)
│   ├── gen-cli.mjs        CLI reference generator
│   ├── copy-spec.mjs      copies spec/openapi.yaml into public/ before a build
│   ├── screenshots.mjs    Playwright capture of the dashboard
│   └── lib/               transform.mjs and its tests
├── spec/openapi.yaml      the HTTP API specification, hand-maintained here
├── src/
│   ├── assets/            images imported by pages
│   ├── components/        Astro components used by the landing page
│   ├── content/docs/
│   │   ├── start/         hand-written getting-started pages
│   │   ├── guides/        generated
│   │   └── reference/     generated (architecture, security, cli)
│   ├── content.config.ts  the Starlight content collections
│   ├── pages/index.astro  the landing page
│   └── styles/theme.css   the theme
└── astro.config.mjs       Starlight, sidebar and OpenAPI configuration
```

## Deployment

Every push to `master` triggers `.github/workflows/deploy.yml`, which runs
`npm ci`, `npm test` and `npm run build`, uploads `dist/` as a Pages artifact
and deploys it to GitHub Pages. A failing test or build stops the deployment.
The workflow can also be started by hand from the Actions tab. Deployments are
serialised on the `pages` concurrency group and never cancelled mid-flight.

`.github/workflows/sync-docs.yml` would run the documentation sync and open a
pull request with the result, but it is **dormant**: manual trigger only, for as
long as `restorelab/restorelab` is private. The header of that file lists what
to enable when the main repository goes public. Until then, run `npm run sync`
locally and commit the result.
