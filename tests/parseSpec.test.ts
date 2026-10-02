import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_SPEC_BYTES } from '../static/macro-ui/src/lib/limits';
import { MAX_NODES, parseSpec } from '../static/macro-ui/src/lib/parseSpec';

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

describe('parseSpec', () => {
  it('parses a JSON OpenAPI 3.0 document', () => {
    const r = parseSpec(fixture('petstore.json'));
    expect(r.ok && r.version).toBe('openapi-3.0');
  });

  it('parses a YAML OpenAPI 3.0 document to the same spec as JSON', () => {
    const json = parseSpec(fixture('petstore.json'));
    const yaml = parseSpec(fixture('petstore.yaml'));
    expect(yaml.ok).toBe(true);
    expect(json.ok && yaml.ok && yaml.spec).toEqual(json.ok && json.spec);
  });

  it('detects Swagger 2.0 (quoted and unquoted version)', () => {
    for (const src of ['{"swagger":"2.0"}', 'swagger: "2.0"', 'swagger: 2.0']) {
      const r = parseSpec(src);
      expect(r.ok && r.version).toBe('swagger-2.0');
    }
  });

  it('detects OpenAPI 3.1', () => {
    const r = parseSpec('openapi: 3.1.0\ninfo: {title: x, version: "1"}');
    expect(r.ok && r.version).toBe('openapi-3.1');
  });

  it('rejects a YAML alias bomb quickly, keeps ordinary anchors', () => {
    let yaml =
      'openapi: 3.0.3\ninfo: {title: x, version: "1"}\nx-0: &a0 [lol, lol, lol, lol, lol]\n';
    for (let i = 1; i <= 12; i++) {
      yaml += `x-${i}: &a${i} [${Array(5)
        .fill(`*a${i - 1}`)
        .join(', ')}]\n`;
    }
    const started = performance.now();
    const r = parseSpec(yaml);
    expect(!r.ok && r.code).toBe('too-complex');
    expect(performance.now() - started).toBeLessThan(2000);

    const anchors = parseSpec(
      'openapi: 3.0.3\ninfo: {title: x, version: "1"}\nx-ok: &ok {description: OK}\nx-use: [*ok, *ok]\n',
    );
    expect(anchors.ok).toBe(true);
  });

  it('tolerates a BOM and surrounding whitespace', () => {
    expect(parseSpec('﻿  \n{"openapi":"3.0.0"}\n').ok).toBe(true);
  });

  it.each([null, undefined, '', '   \n\t'])('reports empty input (%j)', (input) => {
    const r = parseSpec(input);
    expect(!r.ok && r.code).toBe('empty');
  });

  it('reports JSON syntax errors without throwing', () => {
    const r = parseSpec('{"openapi": "3.0.0",');
    expect(!r.ok && r.code).toBe('syntax');
    expect(!r.ok && r.message).toContain('JSON');
  });

  it('reports YAML syntax errors without throwing', () => {
    const r = parseSpec('openapi: 3.0.0\n  bad: [unclosed');
    expect(!r.ok && r.code).toBe('syntax');
    expect(!r.ok && r.message).toContain('YAML');
  });

  it('rejects documents that are not objects', () => {
    for (const src of ['[1,2]', 'just a string', '42']) {
      const r = parseSpec(src);
      expect(!r.ok && r.code).toBe('not-object');
    }
  });

  it('rejects objects without a supported version field', () => {
    for (const src of [
      '{}',
      '{"openapi":"2.0"}',
      '{"openapi":"4.0.0"}',
      '{"swagger":"1.2"}',
      '{"openapi":3}',
    ]) {
      const r = parseSpec(src);
      expect(!r.ok && r.code).toBe('not-openapi');
    }
  });

  describe('limits', () => {
    const minimal = '{"openapi":"3.0.3","info":{"title":"x","version":"1"},"paths":{}}';
    /** The minimal spec padded with spaces to exactly `bytes` bytes. */
    const padded = (bytes: number) => minimal + ' '.repeat(bytes - minimal.length);

    it('accepts a specification of exactly 2 MB', () => {
      expect(parseSpec(padded(MAX_SPEC_BYTES)).ok).toBe(true);
    });

    it('rejects pasted text over 2 MB before parsing it', () => {
      const r = parseSpec(padded(MAX_SPEC_BYTES + 1));
      expect(!r.ok && r.code).toBe('too-large');
      expect(!r.ok && r.message).toBe('The specification is larger than the 2.0 MB limit.');
    });

    it('counts UTF-8 bytes, not characters', () => {
      // "é" is two bytes in UTF-8: the text has about half as many characters as bytes.
      const withTitleBytes = (bytes: number) =>
        minimal.replace('"x"', `"${'é'.repeat(Math.floor(bytes / 2))}${'a'.repeat(bytes % 2)}"`);
      const free = MAX_SPEC_BYTES - (minimal.length - 1);
      const exact = withTitleBytes(free);
      expect(new TextEncoder().encode(exact).byteLength).toBe(MAX_SPEC_BYTES);
      expect(exact.length).toBeLessThan(MAX_SPEC_BYTES * 0.6);
      expect(parseSpec(exact).ok).toBe(true);
      const r = parseSpec(withTitleBytes(free + 1));
      expect(!r.ok && r.code).toBe('too-large');
    });

    it('rejects JSON with too many values, not only YAML', () => {
      const values = Array<number>(MAX_NODES).fill(0);
      const json = JSON.stringify({ openapi: '3.0.3', info: { title: 'x', version: '1' }, values });
      // Within 2 MB, JSON cannot reach the limit: lift the size limit to test the count.
      const r = parseSpec(json, { maxBytes: Infinity, maxNodes: MAX_NODES });
      expect(!r.ok && r.code).toBe('too-complex');
      expect(!r.ok && r.message).toBe('The specification has more than 2,000,000 values.');
      expect(parseSpec(minimal, { maxBytes: Infinity, maxNodes: MAX_NODES }).ok).toBe(true);
    });
  });
});
