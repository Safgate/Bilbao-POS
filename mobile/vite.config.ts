import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/mobile/',
  build: {
    outDir: '../dist-electron/mobile',
    emptyOutDir: true,
  },
});
