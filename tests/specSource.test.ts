import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ConfluenceSpecSource,
  type RequestConfluence,
} from '../static/macro-ui/src/lib/confluenceSpecSource';
import {
  decodeText,
  formatBytes,
  isSupportedSpecFile,
  MAX_SPEC_BYTES,
} from '../static/macro-ui/src/lib/limits';
import { MockSpecSource, type MockAttachment } from '../static/macro-ui/src/lib/mockSpecSource';
import { describeSourceError, SpecSourceError } from '../static/macro-ui/src/lib/specSource';

const petstore = readFileSync(new URL('./fixtures/petstore.yaml', import.meta.url), 'utf8');

const files: MockAttachment[] = [
  {
    id: 'att1',
    title: 'petstore.yaml',
    mediaType: 'application/octet-stream',
    fileSize: petstore.length,
    content: petstore,
  },
  { id: 'att2', title: 'logo.png', mediaType: 'image/png', fileSize: 10, content: 'x' },
];

const code = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e instanceof SpecSourceError ? e.code : `not a SpecSourceError: ${String(e)}`;
  }
  return 'resolved';
};

afterEach(() => {
  vi.useRealTimers();
});

describe('limits', () => {
  it.each([
    ['api.json', 'application/json', true],
    ['API.YAML', 'application/octet-stream', true],
    ['api.yml', 'text/plain', true],
    ['api.yaml', '', true],
    ['api.txt', 'text/plain', false],
    ['api.json.png', 'image/png', false],
    ['api.json', 'image/png', false],
    ['api.json', 'application/zip', false],
  ])('isSupportedSpecFile(%s, %s) = %s', (title, mediaType, expected) => {
    expect(isSupportedSpecFile({ title, mediaType })).toBe(expected);
  });

  it('decodes UTF-8 and rejects binary content', () => {
    expect(decodeText(new TextEncoder().encode('árvíztűrő: ok'))).toBe('árvíztűrő: ok');
    expect(decodeText(new Uint8Array([0x7b, 0x00, 0x7d]))).toBeNull();
    expect(decodeText(new Uint8Array([0xff, 0xfe, 0x41]))).toBeNull();
  });

  it('formats sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(MAX_SPEC_BYTES)).toBe('2.0 MB');
  });
});

describe('MockSpecSource', () => {
  it('lists attachments without content', async () => {
    const list = await new MockSpecSource(files).listAttachments();
    expect(list.map((f) => f.title)).toEqual(['petstore.yaml', 'logo.png']);
    expect(list[0]).not.toHaveProperty('content');
  });

  it('loads an attachment as text', async () => {
    await expect(new MockSpecSource(files).loadAttachment('1', 'att1')).resolves.toBe(petstore);
  });

  it.each([
    ['forbidden', 'forbidden'],
    ['missing', 'missing'],
    ['toolarge', 'too-large'],
    ['notext', 'not-text'],
  ] as const)('fail=%s gives %s', async (fail, expected) => {
    expect(await code(new MockSpecSource(files, { fail }).loadAttachment('1', 'att1'))).toBe(
      expected,
    );
  });

  it('rejects unknown and unsupported attachments', async () => {
    const source = new MockSpecSource(files);
    expect(await code(source.loadAttachment('1', 'att404'))).toBe('missing');
    expect(await code(source.loadAttachment('1', 'att2'))).toBe('unsupported');
  });

  it('fail=slow delays the answer', async () => {
    vi.useFakeTimers();
    const p = new MockSpecSource(files, { fail: 'slow', slowMs: 5000 }).listAttachments();
    let done = false;
    void p.then(() => (done = true));
    await vi.advanceTimersByTimeAsync(4999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
  });
});

type Route = (path: string) => Response | Promise<Response>;

function confluence(route: Route, options?: { timeoutMs?: number }) {
  const request = vi.fn<RequestConfluence>(async (path) => route(path));
  return { request, source: new ConfluenceSpecSource(request, options) };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const meta = (extra: Record<string, unknown> = {}) => ({
  id: 'att1',
  title: 'petstore.yaml',
  mediaType: 'application/octet-stream',
  fileSize: 1000,
  pageId: '123',
  ...extra,
});

describe('ConfluenceSpecSource.listAttachments', () => {
  it('reads the v2 list, follows pagination and drops malformed items', async () => {
    const { request, source } = confluence((path) =>
      path.includes('cursor=')
        ? json({ results: [{ id: 'att3', title: 'b.json', fileSize: 5 }] })
        : json({
            results: [meta(), { title: 'no id' }, null],
            _links: { next: '/wiki/api/v2/pages/123/attachments?cursor=abc' },
          }),
    );
    const list = await source.listAttachments('123');
    expect(list).toEqual([
      { id: 'att1', title: 'petstore.yaml', mediaType: 'application/octet-stream', fileSize: 1000 },
      { id: 'att3', title: 'b.json', mediaType: '', fileSize: 5 },
    ]);
    expect(request.mock.calls.map((c) => c[0])).toEqual([
      '/wiki/api/v2/pages/123/attachments?limit=250',
      '/wiki/api/v2/pages/123/attachments?cursor=abc',
    ]);
  });

  it('does not follow links to other hosts', async () => {
    const { request, source } = confluence(() =>
      json({ results: [], _links: { next: 'https://evil.example.com/x' } }),
    );
    await source.listAttachments('123');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([
    [403, 'forbidden'],
    [401, 'forbidden'],
    [404, 'missing'],
    [500, 'failed'],
  ])('HTTP %i gives %s', async (status, expected) => {
    const { source } = confluence(() => json({}, status));
    expect(await code(source.listAttachments('123'))).toBe(expected);
  });

  it('rejects unexpected bodies', async () => {
    const { source } = confluence(() => new Response('<html>'));
    expect(await code(source.listAttachments('123'))).toBe('failed');
    const { source: s2 } = confluence(() => json({ results: 'nope' }));
    expect(await code(s2.listAttachments('123'))).toBe('failed');
  });

  it('reports network errors', async () => {
    const { source } = confluence(() => {
      throw new TypeError('Failed to fetch');
    });
    const err = await source.listAttachments('123').catch((e: unknown) => e);
    expect(describeSourceError(err)).toContain('Failed to fetch');
  });

  it('rejects page ids that are not numeric before any request', async () => {
    const { request, source } = confluence(() => json({ results: [] }));
    expect(await code(source.listAttachments('../../admin'))).toBe('missing');
    expect(request).not.toHaveBeenCalled();
  });
});

describe('ConfluenceSpecSource.loadAttachment', () => {
  const download = '/wiki/rest/api/content/123/child/attachment/att1/download';

  it('checks the metadata, then downloads the content', async () => {
    const { request, source } = confluence((path) =>
      path === download ? new Response(petstore) : json(meta()),
    );
    await expect(source.loadAttachment('123', 'att1')).resolves.toBe(petstore);
    expect(request.mock.calls.map((c) => c[0])).toEqual([
      '/wiki/api/v2/attachments/att1',
      download,
    ]);
  });

  it('adds the att prefix for the v1 download', async () => {
    const { request, source } = confluence((path) =>
      path.endsWith('/download') ? new Response('{}') : json(meta({ id: '1' })),
    );
    await source.loadAttachment('123', '1');
    expect(request.mock.calls[1][0]).toBe(download);
  });

  it.each([
    ['too large', meta({ fileSize: MAX_SPEC_BYTES + 1 }), 'too-large'],
    ['not a spec file', meta({ title: 'notes.txt' }), 'unsupported'],
    ['an image', meta({ title: 'x.json', mediaType: 'image/png' }), 'unsupported'],
    ['on another page', meta({ pageId: '999' }), 'missing'],
  ])('does not download an attachment that is %s', async (_, body, expected) => {
    const { request, source } = confluence(() => json(body));
    expect(await code(source.loadAttachment('123', 'att1'))).toBe(expected);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('rejects downloads that turn out too large or binary', async () => {
    const big = confluence((path) =>
      path === download ? new Response('x'.repeat(MAX_SPEC_BYTES + 1)) : json(meta()),
    );
    expect(await code(big.source.loadAttachment('123', 'att1'))).toBe('too-large');
    const binary = confluence((path) =>
      path === download ? new Response(new Uint8Array([0x89, 0x50, 0, 0xff])) : json(meta()),
    );
    expect(await code(binary.source.loadAttachment('123', 'att1'))).toBe('not-text');
  });

  it.each([
    [403, 'forbidden'],
    [404, 'missing'],
    [410, 'missing'],
  ])('HTTP %i on the metadata gives %s', async (status, expected) => {
    const { source } = confluence(() => json({}, status));
    expect(await code(source.loadAttachment('123', 'att1'))).toBe(expected);
  });

  it('times out', async () => {
    vi.useFakeTimers();
    const { source } = confluence(() => new Promise<Response>(() => {}), { timeoutMs: 1000 });
    const result = code(source.loadAttachment('123', 'att1'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(await result).toBe('timeout');
  });

  it('rejects attachment ids that could change the path', async () => {
    const { request, source } = confluence(() => json(meta()));
    for (const id of ['att1/../../x', 'att1?x=1', '', 'abc']) {
      expect(await code(source.loadAttachment('123', id))).toBe('missing');
    }
    expect(request).not.toHaveBeenCalled();
  });
});
