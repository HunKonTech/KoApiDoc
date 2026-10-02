import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { stripExternalRefs } from '../static/macro-ui/src/lib/externalRefs';
import { parseSpec } from '../static/macro-ui/src/lib/parseSpec';

const fixture = (name: string) => {
  const r = parseSpec(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
  if (!r.ok) throw new Error(r.message);
  return r.spec;
};

describe('stripExternalRefs', () => {
  it('keeps a document with only local refs unchanged', () => {
    const spec = fixture('multi-tag-3.1.json');
    const r = stripExternalRefs(spec);
    expect(r.refs).toEqual([]);
    expect(r.spec).toBe(spec);
  });

  it('replaces http(s) and relative file refs and lists them', () => {
    const spec = fixture('with-external-ref.json');
    const before = JSON.stringify(spec);
    const r = stripExternalRefs(spec);
    expect(r.refs.sort()).toEqual([
      './common.yaml#/Tag',
      'http://example.com/schemas/user.json#/User',
      'https://example.com/schemas/error.json',
    ]);
    const out = JSON.stringify(r.spec);
    expect(out).not.toMatch(/"\$ref":"(https?:|\.\/)/);
    expect(out).toContain('"$ref":"#/components/schemas/Item"');
    expect(out).toContain(
      'External reference not supported: https://example.com/schemas/error.json',
    );
    // The input is not modified.
    expect(JSON.stringify(spec)).toBe(before);
  });

  it('reports each external target once', () => {
    const ref = { $ref: 'https://example.com/a.json' };
    const r = stripExternalRefs({ openapi: '3.0.0', a: ref, b: [ref, ref] });
    expect(r.refs).toEqual(['https://example.com/a.json']);
  });
});
