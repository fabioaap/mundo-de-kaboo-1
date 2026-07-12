import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// Sidebar organizada por PÚBLICO (4 seções-raiz): Desenvolvimento, Produto,
// Operação, Público. Cada doc mora na sua audiência primária; cross-links no corpo.
const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',

    // ─────────────────────────── 👩‍💻 DESENVOLVIMENTO ───────────────────────────
    {
      type: 'category',
      label: '👩‍💻 Desenvolvimento',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: '🚀 Começando',
          items: [
            'getting-started/installation',
            'getting-started/environment-variables',
            'getting-started/supabase-setup',
          ],
        },
        {
          type: 'category',
          label: '🏗️ Arquitetura',
          items: [
            'architecture/overview',
            'architecture/tech-stack',
            'architecture/data-models',
            'architecture/white-label-model',
            'architecture/media-backbone',
            'architecture/colecao-artefatos',
            'architecture/deploy-environments',
          ],
        },
        {
          type: 'category',
          label: '📐 Regras de Negócio (técnico)',
          items: ['regras-negocio/tecnico-acesso-e-rls'],
        },
        {
          type: 'category',
          label: '📝 Changelog Técnico',
          items: [
            'changelog/index',
            'changelog/2026-07-sessao-tema-e-admin',
            'changelog/2026-07-doc-sync-flow',
          ],
        },
        {
          type: 'category',
          label: '🧪 Testes',
          items: ['testes/index'],
        },
        {
          type: 'category',
          label: '🎨 Marca / Tema',
          items: ['marca-tema/index'],
        },
        {
          type: 'category',
          label: '📱 Telas',
          items: [
            'screens/overview',
            'screens/login',
            'screens/home',
            'screens/search',
            'screens/book-reader',
            'screens/audio-player',
            'screens/video-player',
            'screens/profile',
            'screens/extra-tools',
            'screens/admin-collections',
            'screens/admin-white-label',
          ],
        },
        {
          type: 'category',
          label: '🧩 Componentes',
          items: [
            'components/overview',
            'components/bottom-nav',
            'components/collection-modal',
            'components/card-3d',
            'components/page-header',
            'components/file-upload',
            'components/flipbook-viewer',
            'components/toast',
          ],
        },
        {
          type: 'category',
          label: '🪝 Hooks',
          items: [
            'hooks/overview',
            'hooks/use-orientation',
            'hooks/use-is-mobile',
            'hooks/use-screen-size',
            'hooks/use-debounce',
            'hooks/use-toast',
            'hooks/use-ref-size',
            'hooks/use-theme-background',
          ],
        },
        {
          type: 'category',
          label: '📚 Biblioteca',
          items: [
            'lib/api',
            'lib/auth',
            'lib/supabase',
            'lib/utils',
            'lib/storage',
            'lib/logger',
            'lib/offline',
          ],
        },
      ],
    },

    // ─────────────────────────────── 📊 PRODUTO ───────────────────────────────
    {
      type: 'category',
      label: '📊 Produto',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: '📐 Regras de Negócio',
          items: [
            'regras-negocio/index',
            'regras-negocio/modelo-acesso',
            'regras-negocio/ciclo-voucher',
            'regras-negocio/white-label-marcas',
            'regras-negocio/catalogo-conteudo',
          ],
        },
        {
          type: 'category',
          label: '🗺️ Jornadas',
          items: [
            'journeys/journeys',
            'journeys/auth',
            'journeys/post-login',
            'journeys/vouchers',
            'journeys/reference',
          ],
        },
        {
          type: 'category',
          label: '🎯 GTM / Growth',
          items: [
            'gtm/gtm-index',
            'gtm/gtm-marketing-figma',
            'gtm/gtm-code-backlog',
            'gtm/gtm-figma-inventory',
          ],
        },
        {
          type: 'category',
          label: '📌 Roadmap & Histórico',
          collapsed: false,
          items: [
            'roadmap-historico/historico',
            'roadmap-historico/roadmap',
            'roadmap-historico/pra-lancar',
            {
              type: 'category',
              label: '📂 Arquivo (backlogs detalhados)',
              collapsed: true,
              items: [
                'roadmap/index',
                'roadmap/roadmap-central-coruja-v1.2',
                'roadmap/plano-execucao-mini-youtube-spotify',
                'roadmap/especificacao-arquitetura-mini-youtube-spotify',
                'roadmap/especificacao-ux-ui-mini-youtube-spotify',
                'roadmap/backlog-executavel-mini-youtube-spotify',
                'roadmap/consolidado-backlog-reuniao-15abr2026',
                'roadmap/backlog-central-coruja-15abr2026',
                'roadmap/backlog-midia-canonica',
                'roadmap/checklist-go-live-v1-3',
                'roadmap/prd-vouchers-por-conteudo',
                'roadmap/qa-validation-plan-v1.2',
                'roadmap/backlog-remocao-mocks-vitrine',
                'roadmap/backlog-gaps-testes-usabilidade-2026-06-06',
                'roadmap/changelog-ajustes-kaboo-2026-06-08',
                'roadmap/backlog-organizacao-projeto-desempenho',
                'roadmap/backlog-capa-por-midia',
                'roadmap/backlog-cadastro-em-lote',
                'roadmap/backlog-modal-deslizante',
                'roadmap/backlog-livro-vincula-midias',
              ],
            },
          ],
        },
      ],
    },

    // ────────────────────────────── 🛠️ OPERAÇÃO ──────────────────────────────
    {
      type: 'category',
      label: '🛠️ Operação',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: '🧭 Como Usar (Usabilidade)',
          items: [
            'usabilidade/index',
            'usabilidade/admin-colecoes',
            'usabilidade/admin-livros',
            'usabilidade/admin-videos-musicas',
            'usabilidade/admin-formacoes',
            'usabilidade/admin-materiais',
            'usabilidade/admin-vouchers',
            'usabilidade/admin-personagens',
            'usabilidade/admin-configuracoes',
            'usabilidade/admin-usuarios',
            'usabilidade/consumidor',
          ],
        },
        {
          type: 'category',
          label: '📋 Runbooks & Go-live',
          items: [
            'operacao/runbook-operacional',
            'operacao/incidentes-white-label',
            'operacao/health-check-white-label',
            'operacao/homologacao-isolamento-marca',
            'operacao/checklist-catalogo-coruja',
          ],
        },
      ],
    },

    // ─────────────────────────────── 🌐 PÚBLICO ───────────────────────────────
    {
      type: 'category',
      label: '🌐 Público',
      collapsed: false,
      items: [
        'publico/index',
        'publico/o-que-e',
        'publico/como-funciona',
        'publico/faq',
      ],
    },

    'contributing',
  ],
};

export default sidebars;
