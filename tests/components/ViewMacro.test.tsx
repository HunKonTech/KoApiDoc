// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockSpecSource, type MockAttachment } from '../../static/macro-ui/src/lib/mockSpecSource';
import type { SpecRef } from '../../static/macro-ui/src/lib/specSource';
import { ViewMacro } from '../../static/macro-ui/src/ViewMacro';

// Swagger UI is not under test here; a stub shows what it would receive.
vi.mock('../../static/macro-ui/src/SwaggerView', () => ({
  default: ({ spec }: { spec: { info?: { title?: string } } }) => (
    <div data-testid="swagger">{spec.info?.title}</div>
  ),
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
});
