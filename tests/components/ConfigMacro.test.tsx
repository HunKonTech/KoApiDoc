// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigMacro } from '../../static/macro-ui/src/ConfigMacro';
import { MockSpecSource, type MockAttachment } from '../../static/macro-ui/src/lib/mockSpecSource';
import type { SpecRef, SpecSource } from '../../static/macro-ui/src/lib/specSource';

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
];

afterEach(cleanup);

function setup(
  initial: SpecRef,
  { source = new MockSpecSource(files) as SpecSource, pageId = '1' as string | null } = {},
) {
  const onSave = vi.fn(async () => {});
  const onCancel = vi.fn();
  render(
    <ConfigMacro
      initial={initial}
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
    expect(onSave).toHaveBeenCalledWith({ kind: 'inline', spec: 'swagger: "2.0"' });
  });

  it('lists only spec attachments with their size and saves the choice', async () => {
    const { onSave, user } = setup({ kind: 'inline', spec: '' });
    await user.click(screen.getByLabelText('Page attachment'));
    const select = await screen.findByLabelText('Attachment');
    const options = [...select.querySelectorAll('option')].map((o) => o.textContent);
    expect(options).toEqual(['Choose a file…', 'api.json (2.0 KB)', 'api.yaml (10 B)']);
    expect(screen.getByText(/1 other attachment\(s\) are hidden/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);

    await user.selectOptions(select, 'att2');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({
      kind: 'attachment',
      attachmentId: 'att2',
      title: 'api.yaml',
    });
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
});
