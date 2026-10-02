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

  /** `levels` objects nested under `key`, with `leaf` at the bottom. */
  const nest = (levels: number, leaf: unknown, key = 'a') => {
    let node = leaf;
    for (let i = 0; i < levels; i++) node = { [key]: node };
    return node;
  };
  /** The value `levels` steps down `key`, walked without recursion. */
  const bottom = (node: unknown, levels: number, key = 'a') => {
    for (let i = 0; i < levels; i++) node = (node as Record<string, unknown>)[key];
    return node;
  };

  it.each([205, 5_000, 20_000])('replaces an external ref %i levels deep', (levels) => {
    const ref = `https://example.com/deep-${levels}.json`;
    const spec = { openapi: '3.0.3', deep: nest(levels, { $ref: ref }) };
    const r = stripExternalRefs(spec);
    expect(r.refs).toEqual([ref]);
    expect(bottom(r.spec.deep, levels)).toEqual({
      description: `External reference not supported: ${ref}`,
    });
    // The input is not modified.
    expect(bottom(spec.deep, levels)).toEqual({ $ref: ref });
  });

  it('replaces refs in arrays and keeps deep local refs', () => {
    const local = { $ref: '#/components/schemas/Item' };
    const spec = {
      openapi: '3.0.3',
      list: [1, { $ref: 'https://example.com/a.json' }, nest(300, [local])],
    };
    const r = stripExternalRefs(spec);
    expect(r.refs).toEqual(['https://example.com/a.json']);
    const list = r.spec.list as unknown[];
    expect(list[0]).toBe(1);
    expect(list[1]).toEqual({
      description: 'External reference not supported: https://example.com/a.json',
    });
    expect(bottom(list[2], 300)).toEqual([local]);
    expect(bottom(list[2], 300)).not.toBe(bottom(spec.list[2], 300));
  });

  it('lists the targets in document order', () => {
    const r = stripExternalRefs({
      openapi: '3.0.3',
      a: { x: { $ref: 'https://example.com/1.json' }, y: [{ $ref: 'https://example.com/2.json' }] },
      b: { $ref: 'https://example.com/3.json' },
    });
    expect(r.refs).toEqual([
      'https://example.com/1.json',
      'https://example.com/2.json',
      'https://example.com/3.json',
    ]);
    expect(Object.keys(r.spec)).toEqual(['openapi', 'a', 'b']);
  });

  it('replaces the ref of the deep malicious fixture', () => {
    const r = stripExternalRefs(fixture('malicious/deep-external-ref.json'));
    expect(r.refs).toEqual(['https://attacker.example.com/deep.json']);
    expect(JSON.stringify(r.spec)).not.toContain('"$ref":"https:');
  });

  it('reports each external target once', () => {
    const ref = { $ref: 'https://example.com/a.json' };
    const r = stripExternalRefs({ openapi: '3.0.0', a: ref, b: [ref, ref] });
    expect(r.refs).toEqual(['https://example.com/a.json']);
  });

  it('copies "__proto__" keys as own keys, without changing prototypes', () => {
    const spec = JSON.parse(
      '{"openapi":"3.0.3","paths":{"__proto__":{"__proto__":{"polluted":true},' +
        '"get":{"responses":{"200":{"$ref":"https://example.com/r.json"}}}}}}',
    ) as Record<string, unknown>;
    const r = stripExternalRefs(spec);
    expect(r.refs).toEqual(['https://example.com/r.json']);
    const paths = r.spec.paths as Record<string, unknown>;
    expect(Object.getPrototypeOf(paths)).toBe(Object.prototype);
    expect(Object.keys(paths)).toEqual(['__proto__']);
    const item = Object.getOwnPropertyDescriptor(paths, '__proto__')?.value as Record<
      string,
      unknown
    >;
    expect(Object.getPrototypeOf(item)).toBe(Object.prototype);
    expect(Object.keys(item)).toEqual(['__proto__', 'get']);
    expect(JSON.stringify(item)).toContain('External reference not supported');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
