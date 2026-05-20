import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const normalizeBaseUrl = (baseUrl: string): string => {
  if (!baseUrl || baseUrl === '.' || baseUrl === './') {
    return '/';
  }

  const withLeadingSlash = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

const docsSiteUrl = process.env.DOCS_SITE_URL ?? 'http://localhost:4200';
const docsBaseUrl = normalizeBaseUrl(process.env.DOCS_BASE_URL ?? '/');
const docsRepoUrl = 'https://github.com/educacrossgit/Mundo-de-Kaboo-V2';

const config: Config = {
  title: 'Mundo de Kaboo',
  tagline: 'Plataforma educacional para professores do Ensino Fundamental',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: docsSiteUrl,
  baseUrl: docsBaseUrl,

  organizationName: 'educacrossgit',
  projectName: 'Mundo-de-Kaboo-V2',

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themes: ['@docusaurus/theme-mermaid'],

  plugins: [
    'docusaurus-plugin-image-zoom',
  ],

  clientModules: [
    './src/clientModules/mermaidZoom.js',
  ],

  i18n: {
    defaultLocale: 'pt-BR',
    locales: ['pt-BR'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: `${docsRepoUrl}/edit/main/docs/`,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/kaboo-social-card.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Mundo de Kaboo',
      logo: {
        alt: 'Mundo de Kaboo Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentação',
        },
        {
          href: docsRepoUrl,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentação',
          items: [
            { label: 'Introdução', to: '/docs/intro' },
            { label: 'Começando', to: '/docs/getting-started/installation' },
            { label: 'Arquitetura', to: '/docs/architecture/overview' },
          ],
        },
        {
          title: 'Referência',
          items: [
            { label: 'Telas', to: '/docs/screens/overview' },
            { label: 'Componentes', to: '/docs/components/overview' },
            { label: 'Hooks', to: '/docs/hooks/overview' },
            { label: 'Biblioteca', to: '/docs/lib/api' },
          ],
        },
        {
          title: 'Projeto',
          items: [
            { label: 'Contribuindo', to: '/docs/contributing' },
            {
              label: 'GitHub',
              href: docsRepoUrl,
            },
            { label: 'Suporte', href: 'mailto:suporte@mundodekaboo.com' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Mundo de Kaboo. Desenvolvido com Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'tsx'],
    },
    zoom: {
      selector: '.markdown img',
      background: {
        light: 'rgba(0,0,0,0.7)',
        dark: 'rgba(0,0,0,0.85)',
      },
      config: {
        margin: 32,
      },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
