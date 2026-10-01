import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Forge serves Custom UI from a sub path, so assets must be relative.
  base: './',
  resolve: {
    // `npm run dev:local`: swap the Forge bridge for a local mock, no Atlassian needed.
    alias: (mode === 'mock'
      ? { '@forge/bridge': fileURLToPath(new URL('./dev/bridge-mock.ts', import.meta.url)) }
      : {}) as Record<string, string>,
  },
  server: { fs: { allow: ['../..'] } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Swagger UI is large and loaded lazily; the warning is expected.
    chunkSizeWarningLimit: 2000,
  },
}));
