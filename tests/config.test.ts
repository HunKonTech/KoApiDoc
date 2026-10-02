import { describe, expect, it } from 'vitest';
import { parseConfig, parseMacroConfig, toConfig } from '../static/macro-ui/src/lib/config';
import { DEFAULT_OPTIONS, type DisplayOptions } from '../static/macro-ui/src/lib/options';
import type { SpecRef } from '../static/macro-ui/src/lib/specSource';

const EMPTY = { kind: 'inline', spec: '' };

describe('parseConfig', () => {
  it('reads the step 1 shape { spec } as inline', () => {
    expect(parseConfig({ spec: 'openapi: 3.0.0' })).toEqual({
      kind: 'inline',
      spec: 'openapi: 3.0.0',
    });
  });

  it('reads the inline shape', () => {
    expect(parseConfig({ source: 'inline', spec: '{}' })).toEqual({ kind: 'inline', spec: '{}' });
  });

  it('reads the attachment shape', () => {
    expect(parseConfig({ source: 'attachment', attachmentId: 'att42', title: 'api.yaml' })).toEqual(
      { kind: 'attachment', attachmentId: 'att42', title: 'api.yaml' },
    );
  });

  it('accepts a numeric attachment id and a missing title', () => {
    expect(parseConfig({ source: 'attachment', attachmentId: 42 })).toEqual({
      kind: 'attachment',
      attachmentId: '42',
      title: '',
    });
  });

  it.each([
    null,
    undefined,
    'openapi: 3.0.0',
    42,
    [],
    {},
    { spec: 42 },
    { source: 'inline' },
    { source: 'url', url: 'https://example.com/openapi.json' },
    { source: 'attachment' },
    { source: 'attachment', attachmentId: '' },
    { source: 'attachment', attachmentId: { id: 1 } },
  ])('falls back to an empty inline spec for %j', (raw) => {
    expect(parseConfig(raw)).toEqual(EMPTY);
  });
});

describe('toConfig', () => {
  it.each<SpecRef>([
    { kind: 'inline', spec: 'swagger: "2.0"' },
    { kind: 'attachment', attachmentId: 'att1', title: 'a.json' },
  ])('round-trips %j', (ref) => {
    expect(parseConfig(JSON.parse(JSON.stringify(toConfig(ref))))).toEqual(ref);
  });

  it('writes the new shape', () => {
    expect(toConfig({ kind: 'inline', spec: 'x' })).toEqual({ source: 'inline', spec: 'x' });
  });
});

describe('parseMacroConfig (step 3 options)', () => {
  const options: DisplayOptions = {
    expansion: 'collapsed',
    showSchemas: false,
    filter: true,
    tags: ['pets'],
    height: 700,
  };

  it.each([
    [{ spec: 'openapi: 3.0.0' }, { kind: 'inline', spec: 'openapi: 3.0.0' }],
    [
      { source: 'attachment', attachmentId: 'att1', title: 'a.yaml' },
      { kind: 'attachment', attachmentId: 'att1', title: 'a.yaml' },
    ],
  ])('reads old configs %j with the default options', (raw, ref) => {
    expect(parseMacroConfig(raw)).toEqual({ ref, options: DEFAULT_OPTIONS });
  });

  it('gives defaults for anything that is not a config', () => {
    expect(parseMacroConfig(null)).toEqual({ ref: EMPTY, options: DEFAULT_OPTIONS });
    expect(parseMacroConfig('x')).toEqual({ ref: EMPTY, options: DEFAULT_OPTIONS });
  });

  it('reads the options next to the source', () => {
    expect(parseMacroConfig({ source: 'inline', spec: '{}', options })).toEqual({
      ref: { kind: 'inline', spec: '{}' },
      options,
    });
  });

  it('keeps the source when the options are invalid', () => {
    expect(parseMacroConfig({ source: 'inline', spec: '{}', options: 'broken' })).toEqual({
      ref: { kind: 'inline', spec: '{}' },
      options: DEFAULT_OPTIONS,
    });
  });

  it('round-trips the options through the stored JSON', () => {
    const ref: SpecRef = { kind: 'attachment', attachmentId: 'att7', title: 'api.json' };
    const stored = JSON.parse(JSON.stringify(toConfig(ref, options)));
    expect(stored).toEqual({
      source: 'attachment',
      attachmentId: 'att7',
      title: 'api.json',
      options,
    });
    expect(parseMacroConfig(stored)).toEqual({ ref, options });
  });

  it('copies the tag list', () => {
    const stored = toConfig({ kind: 'inline', spec: '' }, options);
    expect(stored.options?.tags).not.toBe(options.tags);
  });
});
