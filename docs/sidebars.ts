import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: '🚀 Começando',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/environment-variables',
        'getting-started/supabase-setup',
      ],
    },
    {
      type: 'category',
      label: '🏗️ Arquitetura',
      collapsed: false,
      items: [
        'architecture/overview',
        'architecture/tech-stack',
        'architecture/data-models',
      ],
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
      ],
    },
    {
      type: 'category',
      label: '🧩 Componentes',
      items: [
        'components/overview',
        'components/bottom-nav',
        'components/collection-modal',
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
    {
      type: 'category',
      label: '🗺️ Jornadas',
      collapsed: false,
      items: [
        'journeys/journeys',
        'journeys/auth',
        'journeys/post-login',
        'journeys/reference',
      ],
    },
    'contributing',
  ],
};

export default sidebars;
