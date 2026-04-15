import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const normalizeBasePath = (basePath: string): string => {
  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

const githubPagesBase = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
  : '/';

const base = normalizeBasePath(
  process.env.VITE_PUBLIC_BASE || (process.env.GITHUB_ACTIONS === 'true' ? githubPagesBase : '/')
);

export default defineConfig({
  base,
  server: {
    port: 4100,
    host: 'localhost',
    strictPort: true,
  },
  preview: {
    port: 4101,
    strictPort: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'warning': path.resolve(__dirname, './lib/warning-shim.ts'),
    },
    dedupe: ['react', 'react-dom']
  },
  assetsInclude: ['**/*.css'],
  optimizeDeps: {
    include: ['react-pdf', 'pdfjs-dist'],
    esbuildOptions: {
      resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
    }
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/]
    }
  }
});
