import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
