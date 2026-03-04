import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      electron([
        {
          // Main process entry file
          entry: 'electron/main.ts',
          onstart(options) {
            options.startup();
          },
          vite: {
            build: {
              outDir: 'dist-electron',
              rollupOptions: {
                external: ['better-sqlite3', 'bufferutil', 'utf-8-validate'],
              },
            },
          },
        },
        {
          // Preload script entry file (must be CJS for Electron's preload context)
          entry: 'electron/preload.ts',
          onstart(options) {
            options.reload();
          },
          vite: {
            plugins: [
              {
                // vite-plugin-electron's mergeConfig concatenates the 'formats' array
                // (['es'] from the plugin + ['cjs'] from us = ['es','cjs']).
                // This post-hook mutates the resolved config to keep only CJS.
                name: 'force-preload-cjs',
                enforce: 'post' as const,
                configResolved(cfg: any) {
                  if (cfg.build?.lib?.formats) {
                    cfg.build.lib.formats = ['cjs'];
                  }
                },
              },
            ],
            build: {
              outDir: 'dist-electron',
              lib: {
                entry: 'electron/preload.ts',
                formats: ['cjs'],
                fileName: () => 'preload',
              },
              rollupOptions: {
                output: {
                  entryFileNames: 'preload.js',
                },
              },
            },
          },
        },
      ]),
      renderer(),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5173,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
    },
  };
});