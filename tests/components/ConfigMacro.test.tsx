// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigMacro } from '../../static/macro-ui/src/ConfigMacro';
import { DEFAULT_OPTIONS, type DisplayOptions } from '../../static/macro-ui/src/lib/options';
import { generateLargeSpec } from '../fixtures/largeSpec';
import { MAX_SPEC_BYTES } from '../../static/macro-ui/src/lib/limits';
import { MockSpecSource, type MockAttachment } from '../../static/macro-ui/src/lib/mockSpecSource';
import type { SpecRef, SpecSource } from '../../static/macro-ui/src/lib/specSource';

// Swagger UI is not under test here; the stub shows what the preview would render.
vi.mock('../../static/macro-ui/src/SwaggerView', () => ({
  default: ({ spec, options }: { spec: { paths?: object }; options: DisplayOptions }) => (
    <div data-testid="swagger">
      {Object.keys(spec.paths ?? {}).join(',')} {options.expansion}
    </div>
  ),
}));

const taggedSpec = JSON.stringify({
  openapi: '3.0.3',
  info: { title: 'Tagged', version: '1' },
  tags: [{ name: 'pets' }, { name: 'store' }],
  paths: {
    '/pets': { get: { tags: ['pets'], responses: {} }, post: { tags: ['pets'], responses: {} } },
    '/orders': { get: { tags: ['store'], responses: {} } },
    '/health': { get: { responses: {} } },
  },
});

const files: MockAttachment[] = [
  { id: 'att1', title: 'api.json', mediaType: 'application/json', fileSize: 2048, content: '{}' },
  {
    id: 'att2',
    title: 'api.yaml',
    mediaType: 'application/octet-stream',
    fileSize: 10,
    content: '',
  },
  { id: 'att3', title: 'logo.png', mediaType: 'image/png', fileSize: 10, content: '' },
  {
    id: 'att4',
    title: 'tagged.json',
    mediaType: 'application/json',
    fileSize: 10,
    content: taggedSpec,
  },
];

afterEach(cleanup);

function setup(
  initial: SpecRef,
  {
    source = new MockSpecSource(files) as SpecSource,
    pageId = '1' as string | null,
    options = DEFAULT_OPTIONS as DisplayOptions,
  } = {},
) {
  const onSave = vi.fn<(ref: SpecRef, options: DisplayOptions) => Promise<void>>(async () => {});
  const onCancel = vi.fn();
  render(
    <ConfigMacro
      initial={initial}
      initialOptions={options}
      pageId={pageId}
      source={source}
      onSave={onSave}
      onCancel={onCancel}
    />,
  );
  return { onSave, onCancel, user: userEvent.setup() };
}

describe('ConfigMacro', () => {
  it('saves pasted text in the new config shape', async () => {
    const { onSave, user } = setup({ kind: 'inline', spec: '' });
    await user.type(screen.getByLabelText(/OpenAPI \/ Swagger specification/), 'swagger: "2.0"');
    expect(screen.getByText('Valid swagger-2.0 document.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      { kind: 'inline', spec: 'swagger: "2.0"' },
      DEFAULT_OPTIONS,
    );
  });

  it('does not save pasted text over the size limit', async () => {
    const huge = `openapi: 3.0.3\ninfo: {title: x, version: "1"}\nx-pad: ${'a'.repeat(MAX_SPEC_BYTES)}\n`;
    const { onSave, user } = setup({ kind: 'inline', spec: huge });
    expect(screen.getByRole('alert').textContent).toBe(
      'The specification is larger than the 2.0 MB limit. It cannot be saved.',
    );
    const save = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    await user.click(save);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('lists only spec attachments with their size and saves the choice', async () => {
    const { onSave, user } = setup({ kind: 'inline', spec: '' });
    await user.click(screen.getByLabelText('Page attachment'));
    const select = await screen.findByLabelText('Attachment');
    const options = [...select.querySelectorAll('option')].map((o) => o.textContent);
    expect(options).toEqual([
      'Choose a file…',
      'api.json (2.0 KB)',
      'api.yaml (10 B)',
      'tagged.json (10 B)',
    ]);
    expect(screen.getByText(/1 other attachment\(s\) are hidden/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);

    await user.selectOptions(select, 'att2');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      { kind: 'attachment', attachmentId: 'att2', title: 'api.yaml' },
      DEFAULT_OPTIONS,
    );
  });

  it('preselects the saved attachment', async () => {
    setup({ kind: 'attachment', attachmentId: 'att1', title: 'api.json' });
    const select = (await screen.findByLabelText('Attachment')) as HTMLSelectElement;
    expect(select.value).toBe('att1');
  });

  it('flags a saved attachment that no longer exists', async () => {
    setup({ kind: 'attachment', attachmentId: 'att9', title: 'old.yaml' });
    expect((await screen.findByRole('alert')).textContent).toMatch(/no longer on this page/);
    expect(screen.getByText('old.yaml (not found)')).toBeTruthy();
  });

  it('explains an empty attachment list', async () => {
    setup(
      { kind: 'attachment', attachmentId: 'att1', title: '' },
      { source: new MockSpecSource([]) },
    );
    await screen.findByText(/no longer on this page/);
    cleanup();
    setup({ kind: 'inline', spec: '' }, { source: new MockSpecSource([files[2]]) });
    await userEvent.setup().click(screen.getByLabelText('Page attachment'));
    expect(
      await screen.findByText(/This page has no .json, .yaml or .yml attachment/),
    ).toBeTruthy();
  });

  it('shows a listing error', async () => {
    setup(
      { kind: 'attachment', attachmentId: 'att1', title: '' },
      { source: new MockSpecSource(files, { fail: 'forbidden' }) },
    );
    expect((await screen.findByRole('alert')).textContent).toMatch(
      /Could not list the attachments: You do not have permission/,
    );
  });

  it('needs a saved page for attachments', () => {
    setup({ kind: 'attachment', attachmentId: 'att1', title: '' }, { pageId: null });
    expect(screen.getByRole('alert').textContent).toMatch(/once the page has been saved/);
  });

  it('shows save errors and calls cancel', async () => {
    const { onSave, onCancel, user } = setup({ kind: 'inline', spec: 'openapi: 3.0.0' });
    onSave.mockRejectedValueOnce(new Error('bridge down'));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('bridge down'));
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('saves the display options', async () => {
    const { onSave, user } = setup({ kind: 'inline', spec: taggedSpec });
    await user.selectOptions(screen.getByLabelText('Expand on load'), 'all');
    await user.click(screen.getByLabelText('Show the Schemas section'));
    await user.click(screen.getByLabelText('Show the search box'));
    await user.click(screen.getByLabelText(/^store/));
    await user.click(screen.getByLabelText('Fixed, with scrolling'));
    const height = screen.getByLabelText('Height in pixels') as HTMLInputElement;
    expect(height.value).toBe('600');
    await user.clear(height);
    await user.type(height, '800');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      { kind: 'inline', spec: taggedSpec },
      { expansion: 'all', showSchemas: false, filter: false, tags: ['store'], height: 800 },
    );
  });

  it('lists the tags of the spec with their operation counts', async () => {
    const { user } = setup({ kind: 'inline', spec: '' });
    expect(screen.getByText(/tags appear here once there is a valid specification/)).toBeTruthy();
    await user.click(screen.getByLabelText(/OpenAPI \/ Swagger specification/));
    await user.paste(taggedSpec);
    const labels = [...document.querySelectorAll('.ko-tag-list label')].map((l) => l.textContent);
    expect(labels).toEqual(['pets (2)', 'store (1)', 'default (1)']);
    expect(screen.getByText('None selected: all operations are shown.')).toBeTruthy();
  });

  it('reads the tags of the chosen attachment', async () => {
    setup({ kind: 'attachment', attachmentId: 'att4', title: 'tagged.json' });
    expect(await screen.findByLabelText(/^pets/)).toBeTruthy();
  });

  it('keeps saved tags the spec no longer has, so they can be removed', async () => {
    const { onSave, user } = setup(
      { kind: 'inline', spec: taggedSpec },
      { options: { ...DEFAULT_OPTIONS, tags: ['pets', 'gone'] } },
    );
    expect(screen.getByText('Only operations with the 2 selected tag(s) are shown.')).toBeTruthy();
    await user.click(screen.getByLabelText(/^gone \(not in the specification\)/));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave.mock.calls[0][1]).toMatchObject({ tags: ['pets'] });

    await user.click(screen.getByRole('button', { name: 'Show all tags' }));
    expect(screen.getByText('None selected: all operations are shown.')).toBeTruthy();
  });

  it('clamps the fixed height', async () => {
    const { onSave, user } = setup(
      { kind: 'inline', spec: '' },
      { options: { ...DEFAULT_OPTIONS, height: 400 } },
    );
    const height = screen.getByLabelText('Height in pixels') as HTMLInputElement;
    await user.clear(height);
    await user.type(height, '50');
    await user.tab();
    expect(height.value).toBe('200');
    await user.click(screen.getByLabelText('Automatic (as tall as the content)'));
    expect(height.disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave.mock.calls[0][1]).toMatchObject({ height: null });
  });

  it('shows a live preview with the current options', async () => {
    const { user } = setup({ kind: 'inline', spec: taggedSpec });
    const toggle = screen.getByRole('button', { name: 'Show preview' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect((await screen.findByTestId('swagger')).textContent).toBe('/pets,/orders,/health tags');

    await user.click(screen.getByLabelText(/^pets/));
    await user.selectOptions(screen.getByLabelText('Expand on load'), 'collapsed');
    expect((await screen.findByTestId('swagger')).textContent).toBe('/pets collapsed');

    await user.click(screen.getByRole('button', { name: 'Hide preview' }));
    expect(screen.queryByTestId('swagger')).toBeNull();
  });

  it('previews the chosen attachment', async () => {
    const { user } = setup({ kind: 'attachment', attachmentId: 'att4', title: 'tagged.json' });
    await user.click(screen.getByRole('button', { name: 'Show preview' }));
    expect((await screen.findByTestId('swagger')).textContent).toContain('/pets');
  });

  it('suggests choosing tags for a large spec', async () => {
    const large = JSON.stringify(generateLargeSpec({ operations: 1200 }));
    const { user } = setup({ kind: 'inline', spec: large });
    expect(screen.getByRole('status').textContent).toContain(
      'This is a large specification (1200 operations).',
    );
    await user.click(screen.getByLabelText(/^group-00/));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
