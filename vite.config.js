import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // The repo-root index.html is the hand-authored landing served by
    // server.js; the React course app builds from its own entry.
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./src/index.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    globals: true,
  },
});
