const MAX_DEPTH = 200;

export type ExternalRefResult = {
  spec: Record<string, unknown>;
  /** Distinct external `$ref` targets that were removed. */
  refs: string[];
};

/**
 * Swagger UI resolves `$ref`s that point outside the document by fetching them.
 * KoApiDoc makes no network requests (and the Forge CSP would block them), so
 * every `$ref` that is not a local `#/...` pointer is replaced by a placeholder
 * schema with an explanation. The input is not modified.
 */
export function stripExternalRefs(spec: Record<string, unknown>): ExternalRefResult {
  const refs = new Set<string>();

  const walk = (node: unknown, depth: number): unknown => {
    if (depth > MAX_DEPTH || node === null || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map((item) => walk(item, depth + 1));

    const obj = node as Record<string, unknown>;
    const ref = obj.$ref;
    if (typeof ref === 'string' && !ref.startsWith('#')) {
      refs.add(ref);
      return { description: `External reference not supported: ${ref}` };
    }
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) out[key] = walk(value, depth + 1);
    return out;
  };

  const cleaned = walk(spec, 0) as Record<string, unknown>;
  return refs.size === 0 ? { spec, refs: [] } : { spec: cleaned, refs: [...refs] };
}
