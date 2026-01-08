import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: 'localhost',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'warning': path.resolve(__dirname, './lib/warning-shim.ts'),
        },
        dedupe: ['react', 'react-dom']
      },
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
    };
});
