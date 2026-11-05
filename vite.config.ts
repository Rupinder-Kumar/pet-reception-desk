/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies /petclinic to the backend so the browser sees a single origin
// (no CORS configuration needed, and the backend stays untouched).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/petclinic': { target: 'http://localhost:9966', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Node's fetch cannot resolve relative URLs, so tests use an absolute base that MSW intercepts.
    env: { VITE_API_BASE: 'http://localhost:9966/petclinic/api' },
  },
});
