import { load as loadYaml } from 'js-yaml';

export type SpecVersion = 'swagger-2.0' | 'openapi-3.0' | 'openapi-3.1';

export type ParseErrorCode = 'empty' | 'syntax' | 'too-complex' | 'not-object' | 'not-openapi';

export type ParseResult =
  | { ok: true; spec: Record<string, unknown>; version: SpecVersion }
  | { ok: false; code: ParseErrorCode; message: string };

const fail = (code: ParseErrorCode, message: string): ParseResult => ({ ok: false, code, message });

/**
 * Most values a YAML document may expand to. YAML aliases (`*name`) are shared, not
 * copied, so a few hundred bytes can stand for billions of values ("billion laughs");
 * walking such a tree would freeze the reader's browser. A 2 MB specification has far
 * fewer values (the 2 MB test spec: about 40 000).
 */
export const MAX_YAML_NODES = 2_000_000;

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * Parses an OpenAPI / Swagger document given as JSON or YAML text.
 * Never throws: every problem is reported as a readable message.
 */
export function parseSpec(input: string | null | undefined): ParseResult {
  const raw = input ?? '';
  const text = (raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw).trim();
  if (text === '') {
    return fail('empty', 'The specification is empty.');
  }

  let doc: unknown;
  const looksLikeJson = text.startsWith('{') || text.startsWith('[');
  try {
    // YAML 1.2 is a superset of JSON, but JSON.parse gives better JSON error messages.
    doc = looksLikeJson ? JSON.parse(text) : loadYaml(text);
  } catch (e) {
    return fail(
      'syntax',
      `Could not parse the specification as ${looksLikeJson ? 'JSON' : 'YAML'}: ${errorText(e)}`,
    );
  }

  if (!looksLikeJson && exceedsNodes(doc, MAX_YAML_NODES)) {
    return fail(
      'too-complex',
      `The YAML document expands to more than ${MAX_YAML_NODES.toLocaleString('en')} values through anchors and aliases (*name). Remove the nested aliases or use JSON.`,
    );
  }

  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    return fail('not-object', 'The specification must be an object (a JSON or YAML mapping).');
  }
  const spec = doc as Record<string, unknown>;

  const version = detectVersion(spec);
  if (!version) {
    return fail(
      'not-openapi',
      'Missing or unsupported "openapi" / "swagger" field. Supported: Swagger 2.0, OpenAPI 3.0.x and 3.1.x.',
    );
  }
  return { ok: true, spec, version };
}

function detectVersion(spec: Record<string, unknown>): SpecVersion | null {
  const swagger = spec.swagger;
  if (swagger !== undefined) {
    // Unquoted `swagger: 2.0` is read as the number 2 by YAML.
    return swagger === '2.0' || swagger === 2 ? 'swagger-2.0' : null;
  }
  const openapi = spec.openapi;
  if (typeof openapi === 'string') {
    if (/^3\.0(\.\d+)?$/.test(openapi)) return 'openapi-3.0';
    if (/^3\.1(\.\d+)?$/.test(openapi)) return 'openapi-3.1';
  }
  return null;
}

/** True when walking `doc` (shared nodes counted every time they occur) visits more than `max` values. */
function exceedsNodes(doc: unknown, max: number): boolean {
  const stack: unknown[] = [doc];
  let count = 0;
  while (stack.length > 0) {
    const node = stack.pop();
    if (++count > max) return true;
    if (node !== null && typeof node === 'object') {
      for (const value of Object.values(node)) stack.push(value);
    }
  }
  return false;
}
