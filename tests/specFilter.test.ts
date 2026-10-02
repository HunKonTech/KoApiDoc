import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  countOperations,
  filterByTags,
  listTags,
  UNTAGGED,
} from '../static/macro-ui/src/lib/specFilter';
import { generateLargeSpec } from './fixtures/largeSpec';

type Json = Record<string, unknown>;

const fixture = (name: string): Json =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));

/** Every local `$ref` of the document, e.g. "#/components/schemas/Book". */
function localRefs(node: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(node)) node.forEach((n) => localRefs(n, out));
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string' && value.startsWith('#/')) out.add(value);
      else localRefs(value, out);
    }
  }
  return out;
}

function resolves(spec: Json, ref: string): boolean {
  let node: unknown = spec;
  for (const key of ref.slice(2).split('/')) {
    if (!node || typeof node !== 'object') return false;
    node = (node as Json)[key.replace(/~1/g, '/').replace(/~0/g, '~')];
  }
  return node !== undefined;
}

const multiTag = fixture('multi-tag-3.1.json');

const mixed: Json = {
  openapi: '3.1.0',
  info: { title: 'Mixed', version: '1' },
  tags: [{ name: 'b' }, { name: 'a' }, { name: 'declared-only' }],
  paths: {
    '/one': {
      summary: 'Path summary',
      parameters: [{ $ref: '#/components/parameters/Id' }],
      get: { tags: ['a'], responses: {} },
      post: { tags: ['b'], responses: {} },
    },
    '/two': { get: { responses: {} }, put: { tags: [], responses: {} } },
    '/three': { $ref: '#/components/pathItems/Three' },
    '/four': { $ref: '#/components/pathItems/Four' },
    '/broken': 'not an object',
    '/dangling': { $ref: '#/components/pathItems/Nope' },
  },
  webhooks: { ping: { post: { tags: ['hooks'], responses: {} } } },
  components: {
    parameters: { Id: { name: 'id', in: 'query' } },
    pathItems: {
      Three: { get: { tags: ['c'], responses: {} } },
      Four: { get: { tags: ['a'], responses: {} }, delete: { tags: ['c'], responses: {} } },
    },
  },
};

describe('listTags and countOperations', () => {
  it('lists the tags in Swagger UI order with operation counts', () => {
    expect(listTags(multiTag).map((t) => t.name)).toEqual(['books', 'orders', 'users', UNTAGGED]);
    expect(listTags(mixed)).toEqual([
      { name: 'b', operations: 1 },
      { name: 'a', operations: 2 },
      { name: 'c', operations: 2 },
      { name: 'hooks', operations: 1 },
      { name: UNTAGGED, operations: 2 },
    ]);
  });

  it('counts operations in paths, referenced path items and webhooks', () => {
    expect(countOperations(mixed)).toBe(8);
    expect(countOperations(generateLargeSpec({ operations: 1501 }))).toBe(1501);
  });

  it('survives specs without paths or with odd values', () => {
    expect(countOperations({ openapi: '3.0.0' })).toBe(0);
    expect(listTags({ paths: [], tags: 'x' })).toEqual([]);
    expect(listTags({ paths: { '/a': { get: { tags: [1, null, 'ok'] } } } })).toEqual([
      { name: 'ok', operations: 1 },
    ]);
  });
});

describe('filterByTags', () => {
  it('returns the same spec without tags', () => {
    const result = filterByTags(multiTag, []);
    expect(result.spec).toBe(multiTag);
    expect(result.operations).toBe(result.total);
  });

  it('keeps only the operations of the selected tags', () => {
    const { spec, operations, total, unknownTags } = filterByTags(multiTag, ['orders']);
    expect(unknownTags).toEqual([]);
    expect(operations).toBeLessThan(total);
    expect(listTags(spec).map((t) => t.name)).toEqual(['orders']);
    expect((spec.tags as Json[]).map((t) => t.name)).toEqual(['orders']);
  });

  it('does not modify the original spec', () => {
    const before = JSON.stringify(mixed);
    filterByTags(mixed, ['a']);
    expect(JSON.stringify(mixed)).toBe(before);
  });

  it('keeps components, so every local $ref still resolves', () => {
    for (const tags of [['books'], ['orders'], ['users'], ['books', 'users']]) {
      const { spec } = filterByTags(multiTag, tags);
      expect(spec.components).toBe(multiTag.components);
      for (const ref of localRefs(spec)) expect(resolves(spec, ref), ref).toBe(true);
    }
  });

  it('keeps path-level fields next to the remaining operations', () => {
    const paths = filterByTags(mixed, ['a']).spec.paths as Json;
    expect(paths['/one']).toEqual({
      summary: 'Path summary',
      parameters: [{ $ref: '#/components/parameters/Id' }],
      get: { tags: ['a'], responses: {} },
    });
  });

  it('keeps a referenced path item as $ref when all operations match, inlines it otherwise', () => {
    const paths = filterByTags(mixed, ['c']).spec.paths as Json;
    expect(paths['/three']).toEqual({ $ref: '#/components/pathItems/Three' });
    expect(paths['/four']).toEqual({ delete: { tags: ['c'], responses: {} } });
    expect(Object.keys(paths)).toEqual(['/three', '/four']);
  });

  it('selects untagged operations with the "default" tag', () => {
    const { spec, operations } = filterByTags(mixed, [UNTAGGED]);
    expect(operations).toBe(2);
    expect(Object.keys(spec.paths as Json)).toEqual(['/two']);
    expect(spec.webhooks).toEqual({});
  });

  it('filters webhooks too', () => {
    const { spec, operations } = filterByTags(mixed, ['hooks']);
    expect(operations).toBe(1);
    expect(Object.keys(spec.webhooks as Json)).toEqual(['ping']);
    expect(spec.paths).toEqual({});
  });

  it('reports tags the spec does not use', () => {
    const result = filterByTags(mixed, ['a', 'declared-only', 'gone']);
    expect(result.unknownTags).toEqual(['declared-only', 'gone']);
    expect(result.operations).toBe(2);
  });

  it('works on Swagger 2.0 documents', () => {
    const swagger: Json = {
      swagger: '2.0',
      info: { title: 'S', version: '1' },
      paths: {
        '/pets': {
          get: { tags: ['pets'], responses: { 200: { schema: { $ref: '#/definitions/Pet' } } } },
        },
        '/store': { get: { tags: ['store'], responses: {} } },
      },
      definitions: { Pet: { type: 'object' } },
    };
    const { spec } = filterByTags(swagger, ['pets']);
    expect(Object.keys(spec.paths as Json)).toEqual(['/pets']);
    expect(spec.definitions).toBe(swagger.definitions);
  });

  it('handles the large spec quickly', () => {
    const large = generateLargeSpec({ operations: 3000 });
    const start = performance.now();
    const { operations, total } = filterByTags(large, ['group-03']);
    expect(total).toBe(3000);
    expect(operations).toBe(152);
    expect(performance.now() - start).toBeLessThan(500);
  });
});
