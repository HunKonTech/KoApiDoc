import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPTIONS,
  MAX_HEIGHT,
  MIN_HEIGHT,
  parseHeight,
  parseOptions,
  toDocExpansion,
} from '../static/macro-ui/src/lib/options';

describe('parseOptions', () => {
  it.each([undefined, null, 'tags', 42, [], {}])('gives the defaults for %j', (raw) => {
    expect(parseOptions(raw)).toEqual(DEFAULT_OPTIONS);
  });

  it('does not share the default tag list', () => {
    const options = parseOptions(undefined);
    options.tags.push('x');
    expect(DEFAULT_OPTIONS.tags).toEqual([]);
  });

  it('reads a complete object', () => {
    expect(
      parseOptions({
        expansion: 'all',
        showSchemas: false,
        filter: false,
        tags: ['pets', 'store'],
        height: 800,
      }),
    ).toEqual({
      expansion: 'all',
      showSchemas: false,
      filter: false,
      tags: ['pets', 'store'],
      height: 800,
    });
  });

  it('replaces only the invalid fields with defaults', () => {
    expect(
      parseOptions({
        expansion: 'sideways',
        showSchemas: 'no',
        filter: 0,
        tags: 'pets',
        height: -5,
      }),
    ).toEqual(DEFAULT_OPTIONS);
    expect(parseOptions({ expansion: 'collapsed', showSchemas: 'no' })).toEqual({
      ...DEFAULT_OPTIONS,
      expansion: 'collapsed',
    });
  });

  it.each([
    ['none', 'collapsed'],
    ['list', 'tags'],
    ['full', 'all'],
  ] as const)('accepts the Swagger UI name %s', (value, expected) => {
    expect(parseOptions({ expansion: value }).expansion).toBe(expected);
  });

  it('cleans the tag list', () => {
    expect(parseOptions({ tags: [' pets ', 'pets', '', 42, null, 'store'] }).tags).toEqual([
      'pets',
      'store',
    ]);
  });

  it('caps the number of tags', () => {
    const tags = Array.from({ length: 500 }, (_, i) => `t${i}`);
    expect(parseOptions({ tags }).tags).toHaveLength(200);
  });

  it('ignores unknown fields', () => {
    expect(parseOptions({ tryItOut: true, theme: 'dark' })).toEqual(DEFAULT_OPTIONS);
  });
});

describe('parseHeight', () => {
  it.each([
    [null, null],
    [undefined, null],
    ['', null],
    ['auto', null],
    [0, null],
    [-100, null],
    [Number.NaN, null],
    [Number.POSITIVE_INFINITY, null],
    [600, 600],
    ['640', 640],
    [612.6, 613],
    [10, MIN_HEIGHT],
    [1e6, MAX_HEIGHT],
  ])('%j -> %j', (raw, expected) => {
    expect(parseHeight(raw)).toBe(expected);
  });
});

describe('helpers', () => {
  it('maps the expansion to Swagger UI', () => {
    expect(toDocExpansion('collapsed')).toBe('none');
    expect(toDocExpansion('tags')).toBe('list');
    expect(toDocExpansion('all')).toBe('full');
  });
});
