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

      // L'anglais est la locale `root` : il reste servi à la racine, sans
      // préfixe, donc aucune URL déjà publiée ne change. Le français vit sous
      // `/fr/`. Les pages non traduites tombent automatiquement sur la version
      // anglaise avec un bandeau, ce qui rend `/fr/` navigable en entier même
      // si seules la vitrine et l'onboarding sont traduits.
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        fr: { label: 'Français', lang: 'fr' },
      },

      // La landing est `src/pages/index.astro` (et `src/pages/fr/index.astro`).
      // Starlight ne revendique pas `/` tant qu'il n'y a pas de
      // `src/content/docs/index.md`.
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/restorelab/restorelab',
        },
      ],

      customCss: ['./src/styles/theme.css'],

      components: {
        // Masque le sélecteur de langue sur `/api/**`, qui n'a pas de version
        // française. Voir le commentaire du composant.
        LanguageSelect: './src/components/starlight/LanguageSelect.astro',
        Head: './src/components/starlight/Head.astro',
      },

      plugins: [
        starlightOpenAPI([
          {
            base: 'api',
            label: 'API reference',
            schema: './spec/openapi.yaml',
          },
        ]),
      ],

      // Les entrées internes sont désignées par `slug` sans la portion de
      // langue : Starlight reprend alors le titre du frontmatter de la page
      // dans la locale courante, donc les libellés se traduisent tout seuls.
      // Seuls les libellés de groupe, qui n'ont pas de page, portent un
      // `translations`.
      sidebar: [
        {
          label: 'Start here',
          translations: { fr: 'Pour commencer' },
          items: [
            { slug: 'start/introduction' },
            { slug: 'start/quick-start' },
            { slug: 'start/first-drill' },
          ],
        },
        {
          label: 'Guides',
          translations: { fr: 'Guides' },
          items: [{ autogenerate: { directory: 'guides' } }],
        },
        {
          label: 'Reference',
          translations: { fr: 'Référence' },
          items: [{ autogenerate: { directory: 'reference' } }],
        },
        // `starlight-openapi` n'a aucun support i18n : ses libellés internes
        // restent anglais. Le libellé du groupe, lui, nous appartient.
        ...openAPISidebarGroups.map((group) =>
          group.label === 'API reference'
            ? { ...group, translations: { fr: 'Référence API' } }
            : group,
        ),
      ],

      editLink: {
        baseUrl: 'https://github.com/restorelab/restorelab.github.io/edit/master/',
      },

      lastUpdated: true,
    }),
  ],
});
