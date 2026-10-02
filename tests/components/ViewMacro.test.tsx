// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_OPTIONS, type DisplayOptions } from '../../static/macro-ui/src/lib/options';
import { MockSpecSource, type MockAttachment } from '../../static/macro-ui/src/lib/mockSpecSource';
import type { SpecRef } from '../../static/macro-ui/src/lib/specSource';
import { ViewMacro } from '../../static/macro-ui/src/ViewMacro';
import { generateLargeSpec } from '../fixtures/largeSpec';

// Swagger UI is not under test here; a stub shows what it would receive.
vi.mock('../../static/macro-ui/src/SwaggerView', () => ({
  default: ({
    spec,
    options,
  }: {
    spec: { info?: { title?: string }; paths?: object };
    options: DisplayOptions;
  }) => {
    if (spec.info?.title === 'Crash') throw new Error('renderer exploded');
    return (
      <div
        data-testid="swagger"
        data-paths={Object.keys(spec.paths ?? {}).join(',')}
        data-options={JSON.stringify(options)}
      >
        {spec.info?.title}
      </div>
    );
  },
}));

// jsdom changes import.meta.url, so resolve from the project root instead.
const fixture = (name: string) => readFileSync(resolve('tests/fixtures', name), 'utf8');

const files: MockAttachment[] = [
  {
    id: 'att1',
    title: 'multi-tag-3.1.json',
    mediaType: 'application/json',
    fileSize: 100,
    content: fixture('multi-tag-3.1.json'),
  },
];
const attachment: SpecRef = {
  kind: 'attachment',
  attachmentId: 'att1',
  title: 'multi-tag-3.1.json',
};

afterEach(cleanup);

describe('ViewMacro', () => {
  const source = new MockSpecSource(files);

  it('renders an inline spec', async () => {
    render(
      <ViewMacro
        specRef={{ kind: 'inline', spec: fixture('petstore.yaml') }}
        pageId="1"
        source={source}
      />,
    );
    expect((await screen.findByTestId('swagger')).textContent).toBe('Petstore');
  });

  it('shows the hint for an empty inline spec', () => {
    render(<ViewMacro specRef={{ kind: 'inline', spec: '' }} pageId="1" source={source} />);
    expect(screen.getByText(/No specification yet/)).toBeTruthy();
  });

  it('shows parse errors', () => {
    render(
      <ViewMacro specRef={{ kind: 'inline', spec: '{"openapi": ' }} pageId="1" source={source} />,
    );
    expect(screen.getByRole('alert').textContent).toContain('Invalid specification');
  });

  it('loads an attachment: loading, then Swagger UI', async () => {
    render(<ViewMacro specRef={attachment} pageId="1" source={source} />);
    expect(screen.getByText('Loading multi-tag-3.1.json…')).toBeTruthy();
    expect((await screen.findByTestId('swagger')).textContent).toBe('Bookshop API');
  });

  it.each([
    ['forbidden', /permission/],
    ['missing', /not found/],
    ['toolarge', /larger than the 2\.0 MB limit/],
    ['notext', /not a text file/],
  ] as const)('shows a readable error for fail=%s', async (fail, message) => {
    render(
      <ViewMacro specRef={attachment} pageId="1" source={new MockSpecSource(files, { fail })} />,
    );
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Could not load multi-tag-3.1.json');
    expect(alert.textContent).toMatch(message);
  });

  it('says so when the page is unknown', async () => {
    render(<ViewMacro specRef={attachment} pageId={null} source={source} />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/page of this macro/);
  });

  it('warns about external refs and still renders the rest', async () => {
    render(
      <ViewMacro
        specRef={{ kind: 'inline', spec: fixture('with-external-ref.json') }}
        pageId="1"
        source={source}
      />,
    );
    expect(screen.getByRole('status').textContent).toContain(
      'External references are not supported',
    );
    expect(screen.getByText('https://example.com/schemas/error.json')).toBeTruthy();
    expect((await screen.findByTestId('swagger')).textContent).toBe('External ref API');
  });

  describe('display options', () => {
    const inline = (spec: string): SpecRef => ({ kind: 'inline', spec });
    const bookshop = inline(fixture('multi-tag-3.1.json'));
    const swagger = () => screen.findByTestId('swagger');

    it('uses the defaults for old configs without options', async () => {
      render(<ViewMacro specRef={bookshop} pageId="1" source={source} />);
      expect(JSON.parse((await swagger()).dataset.options!)).toEqual(DEFAULT_OPTIONS);
    });

    it('passes the options to Swagger UI', async () => {
      const options: DisplayOptions = {
        expansion: 'all',
        showSchemas: false,
        filter: false,
        tags: [],
        height: 500,
      };
      render(<ViewMacro specRef={bookshop} pageId="1" source={source} options={options} />);
      expect(JSON.parse((await swagger()).dataset.options!)).toEqual(options);
    });

    it('shows only the operations of the selected tags', async () => {
      render(
        <ViewMacro
          specRef={bookshop}
          pageId="1"
          source={source}
          options={{ ...DEFAULT_OPTIONS, tags: ['orders'] }}
        />,
      );
      expect((await swagger()).dataset.paths).toBe('/orders');
    });

    it('warns about selected tags the spec does not use', async () => {
      render(
        <ViewMacro
          specRef={bookshop}
          pageId="1"
          source={source}
          options={{ ...DEFAULT_OPTIONS, tags: ['orders', 'archive'] }}
        />,
      );
      expect(screen.getByRole('status').textContent).toContain('Not found: archive.');
      expect(await swagger()).toBeTruthy();
    });

    it('says so when no operation has a selected tag', () => {
      render(
        <ViewMacro
          specRef={bookshop}
          pageId="1"
          source={source}
          options={{ ...DEFAULT_OPTIONS, tags: ['archive'] }}
        />,
      );
      expect(screen.getByText('No operations to show')).toBeTruthy();
      expect(screen.queryByTestId('swagger')).toBeNull();
    });

    it('shows a large spec without a warning to readers', async () => {
      const large = inline(JSON.stringify(generateLargeSpec({ operations: 1200 })));
      render(<ViewMacro specRef={large} pageId="1" source={source} />);
      expect(await swagger()).toBeTruthy();
      expect(screen.queryByRole('status')).toBeNull();
    });

    it('shows the error boundary message when the renderer fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      render(
        <ViewMacro
          specRef={inline('openapi: 3.0.0\ninfo: {title: Crash, version: "1"}\npaths: {}')}
          pageId="1"
          source={source}
        />,
      );
      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toContain('The specification could not be displayed');
      expect(alert.textContent).toContain('renderer exploded');
      vi.restoreAllMocks();
    });
  });
});
