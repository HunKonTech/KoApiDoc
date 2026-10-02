import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Content Security Policy of the built macro page, in addition to the Forge CSP. Nothing may
 * leave the page: no remote images (tracking pixels), requests, frames or form posts.
 * `style-src 'unsafe-inline'` is needed for the style attributes of Swagger UI and React.
 */
const BUILD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "form-action 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

/** The dev server keeps the looser policy of index.html (its HMR client uses inline scripts). */
const strictCsp = (): Plugin => ({
  name: 'koapidoc-strict-csp',
  apply: 'build',
  transformIndexHtml(html) {
    const out = html.replace(
      /(http-equiv="Content-Security-Policy"\s+content=")[^"]*(")/,
      `$1${BUILD_CSP}$2`,
    );
    if (out === html) throw new Error('index.html: Content-Security-Policy meta tag not found');
    return out;
  },
});

export default defineConfig(({ mode }) => ({
  plugins: [react(), strictCsp()],
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
