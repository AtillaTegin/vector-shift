import { defineConfig } from 'vite';

// base './' so the built dist/ loads from file:// inside Electron.
export default defineConfig({
  base: './',
  server: { port: 5173, open: false },
  build: { target: 'es2022', chunkSizeWarningLimit: 4000 },
});
