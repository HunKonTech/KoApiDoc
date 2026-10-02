import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * End-to-end checks of the macro on the local mock (dev/bridge-mock.ts). The URL
 * switches are the ones of local.html: mode, spec, fail, dark and the display options.
 */
const open = (page: Page, query: Record<string, string>) =>
  page.goto(`/index.html?${new URLSearchParams({ mode: 'view', ...query })}`);

const swagger = (page: Page) => page.locator('.ko-swagger .swagger-ui');
/** Operations under paths (webhooks are listed separately by Swagger UI). */
const operations = (page: Page) => page.locator('.ko-swagger .opblock:not(.webhooks .opblock)');
const alert = (page: Page) => page.getByRole('alert');

// Every test: no request leaves localhost and no uncaught exception happens.
let external: string[];
let pageErrors: string[];
test.beforeEach(async ({ page, baseURL }) => {
  external = [];
  pageErrors = [];
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith(baseURL!) && !/^(data|blob):/.test(url)) external.push(url);
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
});
test.afterEach(() => {
  expect(external, 'requests outside localhost').toEqual([]);
  expect(pageErrors, 'uncaught exceptions').toEqual([]);
});

test.describe('sources and formats', () => {
  test('old { spec } config (step 1) with JSON', async ({ page }) => {
    await open(page, { spec: 'petstore-json' });
    await expect(page.locator('.info .title')).toContainText('Petstore');
    await expect(operations(page).first()).toBeVisible();
  });

  test('pasted YAML', async ({ page }) => {
    await open(page, { spec: 'petstore-yaml' });
    await expect(page.locator('.info .title')).toContainText('Petstore');
  });

  for (const [id, title] of [
    ['att1001', 'Petstore'],
    ['att1002', 'Petstore'],
    ['att1003', 'Bookshop API'],
  ]) {
    test(`old attachment config: ${id}`, async ({ page }) => {
      await open(page, { spec: `att-${id}` });
      await expect(page.locator('.info .title')).toContainText(title);
    });
  }

  test('OpenAPI 3.1 with tags and webhooks', async ({ page }) => {
    await open(page, { spec: 'att-att1003' });
    await expect(page.locator('.opblock-tag-section')).toHaveCount(3);
    await expect(page.getByText('Webhooks', { exact: true })).toBeVisible();
  });

  test('external $ref: warning, the rest is shown, nothing is fetched', async ({ page }) => {
    await open(page, { spec: 'att-att1004' });
    await expect(page.getByRole('status')).toContainText('External references are not supported');
    await expect(page.locator('.info .title')).toContainText('External ref API');
  });
});

test.describe('error states', () => {
  for (const [fail, message] of [
    ['forbidden', /do not have permission/],
    ['missing', /not found/],
    ['toolarge', /larger than the 2\.0 MB limit/],
    ['notext', /not a text file/],
  ] as const) {
    test(`fail=${fail}`, async ({ page }) => {
      await open(page, { spec: 'att-att1001', fail });
      await expect(alert(page)).toContainText('Could not load petstore.json');
      await expect(alert(page)).toContainText(message);
    });
  }

  test('deleted attachment', async ({ page }) => {
    await open(page, { spec: 'att-deleted' });
    await expect(alert(page)).toContainText('Could not load deleted.yaml');
  });

  test('invalid and empty specs', async ({ page }) => {
    await open(page, { spec: 'bad' });
    await expect(alert(page)).toContainText('Invalid specification');
    await open(page, { spec: 'empty' });
    await expect(page.getByText(/No specification yet/)).toBeVisible();
  });

  test('a spec that breaks the renderer shows the error boundary, focused', async ({ page }) => {
    await open(page, { spec: 'broken-structure' });
    await expect(alert(page)).toContainText('The specification could not be displayed');
    await expect(alert(page)).toBeFocused();
  });

  test('an attachment above 2 MB gives the limit message', async ({ page }) => {
    await open(page, { spec: 'att-att2003' });
    await expect(alert(page)).toContainText('larger than the 2.0 MB limit');
  });
});

test.describe('display options', () => {
  test('defaults: tags open, operations closed, schemas and search box shown', async ({ page }) => {
    await open(page, { spec: 'multi-tag' });
    await expect(operations(page)).toHaveCount(5);
    await expect(page.locator('.opblock.is-open')).toHaveCount(0);
    await expect(page.locator('.ko-swagger .models')).toBeVisible();
    await expect(page.getByLabel('Search operations')).toBeVisible();
  });

  test('expansion: collapsed and all', async ({ page }) => {
    await open(page, { spec: 'multi-tag', expansion: 'collapsed' });
    await expect(page.locator('.opblock-tag-section')).toHaveCount(3);
    await expect(operations(page)).toHaveCount(0);

    await open(page, { spec: 'multi-tag', expansion: 'all' });
    await expect(page.locator('.opblock.is-open').first()).toBeVisible();
  });

  test('schemas section and search box can be hidden', async ({ page }) => {
    await open(page, { spec: 'multi-tag', schemas: '0', filter: '0' });
    await expect(operations(page).first()).toBeVisible();
    await expect(page.locator('.ko-swagger .models')).toHaveCount(0);
    await expect(page.getByLabel('Search operations')).toHaveCount(0);
  });

  test('search box finds operations by path, summary and operation ID', async ({ page }) => {
    await open(page, { spec: 'multi-tag' });
    const search = page.getByLabel('Search operations');
    await search.fill('/books/{bookId}');
    await expect(operations(page)).toHaveCount(1);
    await search.fill('place order');
    await expect(operations(page)).toHaveCount(1);
    await expect(operations(page)).toContainText('/orders');
    await search.fill('getme');
    await expect(operations(page)).toContainText('/users/me');
    await search.fill('');
    await expect(operations(page)).toHaveCount(5);
  });

  test('tag filter shows only the selected tags', async ({ page }) => {
    await open(page, { spec: 'multi-tag', tags: 'orders,users' });
    await expect(page.locator('.opblock-tag-section')).toHaveCount(2);
    await expect(operations(page)).toHaveCount(2);
    // Shared components are kept: the schemas still resolve.
    await expect(page.locator('.ko-swagger .models')).toContainText('Order');
  });

  test('unknown tags give a warning', async ({ page }) => {
    await open(page, { spec: 'multi-tag', tags: 'orders,archive' });
    await expect(page.getByRole('status')).toContainText('Not found: archive.');
    await expect(operations(page)).toHaveCount(1);
  });

  test('fixed height scrolls inside the macro and is keyboard reachable', async ({ page }) => {
    await open(page, { spec: 'multi-tag', expansion: 'all', height: '400' });
    const region = page.getByRole('region', { name: 'API documentation' });
    await expect(region).toBeVisible();
    const box = await region.boundingBox();
    expect(box?.height).toBe(400);
    expect(await region.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
    await page.keyboard.press('Tab');
    await expect(region).toBeFocused();
  });

  test('automatic height grows with the content', async ({ page }) => {
    await open(page, { spec: 'multi-tag', expansion: 'all' });
    await expect(page.locator('.opblock.is-open').first()).toBeVisible();
    const swaggerBox = await page.locator('.ko-swagger').boundingBox();
    expect(swaggerBox!.height).toBeGreaterThan(1000);
    await expect(page.getByRole('region', { name: 'API documentation' })).toHaveCount(0);
  });

  test('dark theme uses Swagger UI dark mode with the options', async ({ page }) => {
    await open(page, { spec: 'multi-tag', dark: '1', tags: 'books', schemas: '0' });
    await expect(page.locator('html')).toHaveAttribute('data-ko-theme', 'dark');
    await expect(page.locator('html')).toHaveClass(/dark-mode/);
    await expect(operations(page)).toHaveCount(3);
    const background = await swagger(page).evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(background).not.toBe('rgb(255, 255, 255)');
  });
});

test.describe('configuration', () => {
  test('lists the attachments and saves source and options', async ({ page }) => {
    await open(page, { mode: 'config', spec: 'att-att1003' });
    const attachment = page.getByLabel('Attachment', { exact: true });
    await expect(attachment).toHaveValue('att1003');
    // The PNG is hidden.
    await expect(attachment.locator('option')).toHaveCount(7);

    await page.getByLabel('Expand on load').selectOption('all');
    await page.getByLabel('Show the Schemas section').uncheck();
    await page.getByLabel(/^orders/).check();
    await page.getByLabel('Fixed, with scrolling').check();
    await page.getByLabel('Height in pixels').fill('500');
    await page.getByRole('button', { name: 'Save' }).click();

    const saved = await page.evaluate(() => localStorage.getItem('koapidoc-local-config'));
    expect(JSON.parse(saved!)).toEqual({
      source: 'attachment',
      attachmentId: 'att1003',
      title: 'multi-tag-3.1.json',
      options: {
        expansion: 'all',
        showSchemas: false,
        filter: true,
        tags: ['orders'],
        height: 500,
      },
    });

    await open(page, { spec: 'saved' });
    await expect(operations(page)).toHaveCount(1);
    await expect(page.locator('.opblock.is-open')).toHaveCount(1);
    await expect(page.locator('.ko-swagger .models')).toHaveCount(0);
    expect((await page.locator('.ko-swagger').boundingBox())?.height).toBe(500);
  });

  test('live preview follows the options', async ({ page }) => {
    await open(page, { mode: 'config', spec: 'multi-tag' });
    await page.getByRole('button', { name: 'Show preview' }).click();
    const preview = page.getByRole('region', { name: 'Preview' });
    const previewOps = preview.locator('.opblock:not(.webhooks .opblock)');
    await expect(previewOps).toHaveCount(5);
    await page.getByLabel(/^books/).check();
    await expect(previewOps).toHaveCount(3);
    await page.getByLabel('Expand on load').selectOption('collapsed');
    await expect(previewOps).toHaveCount(0);
  });
});

test.describe('large specifications', () => {
  // Rendering times for docs/STEP-3.md; printed and attached to the report. Swagger UI
  // virtualizes long lists, so only the visible operations are in the DOM.
  for (const [id, count, last] of [
    ['att2001', 1500, 'op1499'],
    ['att2002', 2000, 'op1999'],
  ] as const) {
    test(`renders ${id} (${count} operations)`, async ({ page }, testInfo) => {
      testInfo.setTimeout(120_000);
      const started = Date.now();
      await open(page, { spec: `att-${id}` });
      await expect(operations(page).first()).toBeVisible({ timeout: 90_000 });
      await expect(page.locator('.ko-swagger[data-ko-render-ms]')).toHaveCount(1);
      const total = Date.now() - started;
      const swaggerMs = await page.locator('.ko-swagger').getAttribute('data-ko-render-ms');

      // The last operation is reachable through the search box.
      const searchStarted = Date.now();
      await page.getByLabel('Search operations').fill(last);
      await expect(operations(page)).toHaveCount(1);
      const searchMs = Date.now() - searchStarted;

      const line = `${id}: ${count} operations, first operations visible after ${total} ms (Swagger UI ready after ${swaggerMs} ms), search ${searchMs} ms`;
      console.log(line);
      testInfo.annotations.push({ type: 'performance', description: line });
    });
  }

  test('tag filter on a large spec', async ({ page }) => {
    await open(page, { spec: 'att-att2001', tags: 'group-01' });
    await expect(page.locator('.ko-swagger .opblock-tag')).toHaveCount(1);
  });

  test('the configuration suggests choosing tags', async ({ page }) => {
    await open(page, { mode: 'config', spec: 'att-att2002' });
    await expect(page.getByRole('status')).toContainText(
      'This is a large specification (2000 operations).',
    );
  });
});

test.describe('accessibility (axe)', () => {
  const cases: [string, Record<string, string>][] = [
    ['view, light', { spec: 'multi-tag', expansion: 'all' }],
    ['view, dark', { spec: 'multi-tag', expansion: 'all', dark: '1' }],
    ['view, fixed height and tags', { spec: 'multi-tag', height: '400', tags: 'books' }],
    ['view, Swagger 2.0 YAML', { spec: 'petstore-yaml', expansion: 'all' }],
    ['view, external $ref warning', { spec: 'external-ref' }],
    ['view, load error', { spec: 'att-att1001', fail: 'forbidden' }],
    ['view, error boundary', { spec: 'broken-structure' }],
    ['config, inline', { mode: 'config', spec: 'multi-tag' }],
    ['config, attachment, dark', { mode: 'config', spec: 'att-att1003', dark: '1' }],
  ];
  for (const [name, query] of cases) {
    test(name, async ({ page }) => {
      await open(page, query);
      await expect(page.locator('#root > *').first()).toBeVisible();
      if (query.mode !== 'config' && !query.fail && query.spec !== 'broken-structure') {
        await expect(operations(page).first()).toBeVisible();
      } else if (query.mode === 'config') {
        await expect(page.getByText(/tag\(s\) are shown|operations are shown/)).toBeVisible();
      }
      const result = await new AxeBuilder({ page })
        // The macro is a fragment of a Confluence page: page-level landmark and
        // heading rules belong to the host page, not to the macro frame.
        .disableRules(['region', 'landmark-one-main', 'page-has-heading-one'])
        .analyze();
      const blocking = result.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(
        blocking.map((v) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`),
      ).toEqual([]);
    });
  }
});
