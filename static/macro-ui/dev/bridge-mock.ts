// Local-only stand-in for @forge/bridge (see vite.config.ts, mode "mock").
// It is never part of the production build.
//
// URL switches (set by local.html):
//   mode=config|view, dark=1
//   spec=<sample>        inline samples, "saved" (from config mode) or "att-<id>" (attachment)
//   fail=forbidden|missing|toolarge|notext|slow   simulated Confluence failures
import petstoreJson from '../../../tests/fixtures/petstore.json?raw';
import petstoreYaml from '../../../tests/fixtures/petstore.yaml?raw';
import multiTag from '../../../tests/fixtures/multi-tag-3.1.json?raw';
import externalRef from '../../../tests/fixtures/with-external-ref.json?raw';

const params = new URLSearchParams(location.search);
const STORAGE_KEY = 'koapidoc-local-config';
const PAGE_ID = '123456';
const fail = params.get('fail');
const SLOW_MS = 20_000;

type MockFile = { id: string; title: string; mediaType: string; content: string };

const attachments: MockFile[] = [
  { id: 'att1001', title: 'petstore.json', mediaType: 'application/json', content: petstoreJson },
  // Confluence often stores YAML as octet-stream.
  {
    id: 'att1002',
    title: 'petstore.yaml',
    mediaType: 'application/octet-stream',
    content: petstoreYaml,
  },
  { id: 'att1003', title: 'multi-tag-3.1.json', mediaType: 'application/json', content: multiTag },
  {
    id: 'att1004',
    title: 'with-external-ref.json',
    mediaType: 'application/json',
    content: externalRef,
  },
  { id: 'att1005', title: 'diagram.png', mediaType: 'image/png', content: '' },
];

// Step 1 shape ({ spec }) on purpose: old configs must keep working.
const samples: Record<string, () => object> = {
  'petstore-json': () => ({ spec: petstoreJson }),
  'petstore-yaml': () => ({ source: 'inline', spec: petstoreYaml }),
  'external-ref': () => ({ source: 'inline', spec: externalRef }),
  bad: () => ({ spec: '{"openapi": ' }),
  empty: () => ({ spec: '' }),
  'att-deleted': () => ({ source: 'attachment', attachmentId: 'att9999', title: 'deleted.yaml' }),
};

function currentConfig(): object {
  const name = params.get('spec') ?? 'saved';
  if (name === 'saved') {
    const saved = localStorage.getItem(STORAGE_KEY) ?? '';
    try {
      return JSON.parse(saved) as object;
    } catch {
      return { spec: saved }; // stored by the step 1 mock
    }
  }
  const file = attachments.find((f) => `att-${f.id}` === name);
  if (file) return { source: 'attachment', attachmentId: file.id, title: file.title };
  return samples[name]?.() ?? {};
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const info = (f: MockFile) => ({
  id: f.id,
  title: f.title,
  mediaType: f.mediaType,
  fileSize: fail === 'toolarge' ? 3 * 1024 * 1024 : new TextEncoder().encode(f.content).length,
  pageId: PAGE_ID,
});

/** Emulates the Confluence REST endpoints used by ConfluenceSpecSource. */
export async function requestConfluence(path: string): Promise<Response> {
  if (fail === 'slow') await new Promise((r) => setTimeout(r, SLOW_MS));
  if (fail === 'forbidden') return json({ message: 'Forbidden' }, 403);

  let m = path.match(/^\/wiki\/api\/v2\/pages\/(\d+)\/attachments/);
  if (m) {
    if (m[1] !== PAGE_ID) return json({ results: [], _links: {} });
    return json({ results: attachments.map(info), _links: {} });
  }
  m = path.match(/^\/wiki\/api\/v2\/attachments\/([^/?]+)$/);
  if (m) {
    const file = attachments.find((f) => f.id === m![1]);
    return file && fail !== 'missing' ? json(info(file)) : json({ message: 'Not found' }, 404);
  }
  m = path.match(/^\/wiki\/rest\/api\/content\/\d+\/child\/attachment\/([^/]+)\/download$/);
  if (m) {
    const file = attachments.find((f) => f.id === m![1]);
    if (!file || fail === 'missing') return new Response('Not found', { status: 404 });
    // A PNG header with NUL bytes: what a binary file renamed to .json would look like.
    const body =
      fail === 'notext' ? new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0xff]) : file.content;
    return new Response(body, { status: 200 });
  }
  return json({ message: `Not mocked: ${path}` }, 404);
}

export const view = {
  getContext: async () => ({
    extension: {
      config: currentConfig(),
      content: { id: PAGE_ID, type: 'page' },
      macro: { isConfiguring: params.get('mode') === 'config' },
    },
    theme: { colorMode: params.get('dark') ? 'dark' : 'light' },
  }),
  theme: { enable: async () => {} },
  // Saving in config mode stores the config; open the view with spec=saved to see it.
  submit: async (payload: unknown) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload ?? {}));
    window.parent?.postMessage({ type: 'koapidoc-submit' }, '*');
  },
  close: async () => {
    window.parent?.postMessage({ type: 'koapidoc-close' }, '*');
  },
};
