/**
 * Regenerates every Marketplace image from the repository, no Atlassian site needed:
 *   - icon.svg   -> icon-144.png (app logo, 144 x 144)
 *   - banner.svg -> banner-1120x548.png and banner-560x274.png
 *   - screenshots/*.png (1840 x 900) from the local mock: a production build in
 *     `--mode mock`, served by `vite preview` (the same setup as the e2e tests).
 *
 * Run with `npm run marketing:capture` (Playwright's Chromium must be installed:
 * `npx playwright install chromium`). Sizes: see marketing/README.md.
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type Page } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SHOTS = join(HERE, 'screenshots');
const PORT = 5181;
const BASE = `http://localhost:${PORT}`;

/** Highlight screenshots: 1380 x 675 CSS pixels at 4/3 = 1840 x 900 (a typical page width). */
const SHOT_VIEWPORT = { width: 1380, height: 675 };
const SHOT_SCALE = 4 / 3;

type Scene = {
  file: string;
  query: Record<string, string>;
  /** Waits until the scene is ready and sets it up (search text, scrolling, ...). */
  prepare: (page: Page) => Promise<void>;
};

/** No focus ring and no hover effect in the picture. */
async function blur(page: Page) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

const firstOperation = (page: Page) =>
  page.locator('.ko-swagger .opblock').first().waitFor({ state: 'visible' });

const SCENES: Scene[] = [
  {
    file: '01-view-light.png',
    query: { spec: 'multi-tag' },
    prepare: firstOperation,
  },
  {
    file: '02-view-dark.png',
    query: { spec: 'multi-tag', dark: '1' },
    prepare: firstOperation,
  },
  {
    file: '03-operation-details.png',
    query: { spec: 'multi-tag', tags: 'orders' },
    prepare: async (page) => {
      await firstOperation(page);
      await page.locator('.ko-swagger .opblock-summary').first().click();
      const body = page.locator('.ko-swagger .opblock-body').first();
      await body.waitFor();
      await page
        .locator('.ko-swagger .opblock')
        .first()
        .evaluate((e) => e.scrollIntoView());
      await blur(page);
    },
  },
  {
    file: '04-search.png',
    query: { spec: 'multi-tag' },
    prepare: async (page) => {
      await firstOperation(page);
      await page.getByLabel('Search operations').fill('order');
      await page.locator('.ko-swagger .opblock').first().waitFor();
      await page.getByLabel('Search operations').evaluate((e) => e.scrollIntoView());
    },
  },
  {
    file: '05-configuration.png',
    query: { mode: 'config', spec: 'att-att1003' },
    prepare: async (page) => {
      await page.getByLabel(/^books/).waitFor();
      await page.getByLabel(/^books/).check();
      await blur(page);
    },
  },
  {
    file: '06-configuration-preview.png',
    query: { mode: 'config', spec: 'att-att1003', dark: '1' },
    prepare: async (page) => {
      await page.getByLabel(/^books/).waitFor();
      await page.getByLabel(/^books/).check();
      await page.getByRole('button', { name: 'Show preview' }).click();
      const preview = page.getByRole('region', { name: 'Preview' });
      await preview.locator('.opblock').first().waitFor();
      // The tag choice and the start of the preview below it.
      await page.locator('.ko-tags').evaluate((e) => e.scrollIntoView());
      await blur(page);
    },
  },
  {
    file: '07-external-ref-warning.png',
    query: { spec: 'att-att1004' },
    prepare: async (page) => {
      await page.getByRole('status').waitFor();
      await page.locator('.ko-swagger .info .title').waitFor();
    },
  },
  {
    file: '08-error-message.png',
    query: { spec: 'att-att1001', fail: 'forbidden' },
    prepare: (page) => page.getByRole('alert').waitFor(),
  },
];

async function startServer(): Promise<() => void> {
  const server = spawn(
    'npm',
    [
      'run',
      'e2e:serve',
      '--prefix',
      'static/macro-ui',
      '--',
      '--port',
      String(PORT),
      '--strictPort',
    ],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], detached: true },
  );
  const stop = () => {
    try {
      process.kill(-server.pid!, 'SIGTERM');
    } catch {
      // already stopped
    }
  };
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error('The preview server stopped.');
    try {
      if ((await fetch(`${BASE}/index.html`)).ok) return stop;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  stop();
  throw new Error('The preview server did not start in time.');
}

/** Renders an SVG file to a PNG of the given size. */
async function renderSvg(
  browser: Browser,
  svgFile: string,
  out: string,
  width: number,
  height: number,
  scale: number,
) {
  const svg = await readFile(join(HERE, svgFile), 'utf8');
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">${svg.replace(
      /<svg /,
      `<svg style="display:block;width:${width}px;height:${height}px" `,
    )}</body></html>`,
  );
  await page.screenshot({ path: join(HERE, out), omitBackground: true });
  await page.close();
  console.log(`marketing/${out}`);
}

async function main() {
  await mkdir(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  try {
    await renderSvg(browser, 'icon.svg', 'icon-144.png', 144, 144, 1);
    await renderSvg(browser, 'banner.svg', 'banner-1120x548.png', 560, 274, 2);
    await renderSvg(browser, 'banner.svg', 'banner-560x274.png', 560, 274, 1);

    const stop = await startServer();
    try {
      for (const scene of SCENES) {
        const context = await browser.newContext({
          viewport: SHOT_VIEWPORT,
          deviceScaleFactor: SHOT_SCALE,
          reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        const query = new URLSearchParams({ mode: 'view', ...scene.query });
        await page.goto(`${BASE}/index.html?${query}`);
        await scene.prepare(page);
        // Let fonts and the last layout settle.
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(300);
        await page.screenshot({ path: join(SHOTS, scene.file) });
        await context.close();
        console.log(`marketing/screenshots/${scene.file}`);
      }
    } finally {
      stop();
    }
  } finally {
    await browser.close();
  }
}

await main();
