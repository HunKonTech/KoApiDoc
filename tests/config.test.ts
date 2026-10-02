import { describe, expect, it } from 'vitest';
import { parseConfig, toConfig } from '../static/macro-ui/src/lib/config';
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
