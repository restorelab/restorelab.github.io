// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';

export default defineConfig({
  site: 'https://restorelab.github.io',
  trailingSlash: 'always',

  vite: { plugins: [tailwindcss()] },

  integrations: [
    starlight({
      title: 'RestoreLab',
      description:
        'Automated recovery drills: restore a backup into an isolated network, boot it, check it from inside, measure the RTO, and destroy it.',

      // La landing est `src/pages/index.astro`. Starlight ne revendique pas
      // `/` tant qu'il n'y a pas de `src/content/docs/index.md`.
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/restorelab/restorelab',
        },
      ],

      customCss: ['./src/styles/theme.css'],

      plugins: [
        starlightOpenAPI([
          {
            base: 'api',
            label: 'API reference',
            schema: './spec/openapi.yaml',
          },
        ]),
      ],

      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Introduction', slug: 'start/introduction' },
            { label: 'Quick start', slug: 'start/quick-start' },
            { label: 'Your first drill', slug: 'start/first-drill' },
          ],
        },
        { label: 'Guides', items: [{ autogenerate: { directory: 'guides' } }] },
        {
          label: 'Reference',
          items: [{ autogenerate: { directory: 'reference' } }],
        },
        ...openAPISidebarGroups,
      ],

      editLink: {
        baseUrl: 'https://github.com/restorelab/restorelab.github.io/edit/master/',
      },

      lastUpdated: true,
    }),
  ],
});
