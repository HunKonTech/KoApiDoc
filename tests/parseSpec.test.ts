import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSpec } from '../static/macro-ui/src/lib/parseSpec';

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
});
