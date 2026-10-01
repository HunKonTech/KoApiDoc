// Local-only stand-in for @forge/bridge (see vite.config.ts, mode "mock").
// It is never part of the production build.
const params = new URLSearchParams(location.search);
const STORAGE_KEY = 'koapidoc-local-config';

const samples: Record<string, () => Promise<string>> = {
  'petstore-json': async () => (await import('../../../tests/fixtures/petstore.json?raw')).default,
  'petstore-yaml': async () => (await import('../../../tests/fixtures/petstore.yaml?raw')).default,
  bad: async () => '{"openapi": ',
  empty: async () => '',
};

async function currentSpec(): Promise<string> {
  const source = params.get('spec') ?? 'saved';
  if (source === 'saved') return localStorage.getItem(STORAGE_KEY) ?? '';
  return (await samples[source]?.()) ?? '';
}

export const view = {
  getContext: async () => ({
    extension: {
      config: { spec: await currentSpec() },
      macro: { isConfiguring: params.get('mode') === 'config' },
    },
    theme: { colorMode: params.get('dark') ? 'dark' : 'light' },
  }),
  theme: { enable: async () => {} },
  // Saving in config mode stores the spec; open the view with spec=saved to see it.
  submit: async (payload: { spec?: string }) => {
    localStorage.setItem(STORAGE_KEY, payload?.spec ?? '');
    window.parent?.postMessage({ type: 'koapidoc-submit' }, '*');
  },
  close: async () => {
    window.parent?.postMessage({ type: 'koapidoc-close' }, '*');
  },
};
