import { defineConfig, devices } from '@playwright/test';

const PORT = 5180;

/**
 * Headless browser tests against the local mock: a production build in `--mode mock`
 * (same bundle as shipped, only @forge/bridge is replaced), served by `vite preview`.
 * No Atlassian site, no Forge tunnel. Run with `npm run test:e2e`.
 */
export default defineConfig({
  testDir: '.',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run e2e:serve --prefix ../static/macro-ui -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/index.html`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
