import { setOwn } from './json';

export type ExternalRefResult = {
  spec: Record<string, unknown>;
  /** Distinct external `$ref` targets that were removed. */
  refs: string[];
};

/** Copies `node` into `parent[key]`. */
type Task = { node: unknown; parent: Record<string, unknown> | unknown[]; key: string | number };

/**
 * Swagger UI resolves `$ref`s that point outside the document by fetching them.
 * KoApiDoc makes no network requests (and the Forge CSP would block them), so
 * every `$ref` that is not a local `#/...` pointer is replaced by a placeholder
 * schema with an explanation, however deep it is. The input is not modified.
 *
 * The walk uses its own stack, not recursion: a deeply nested document cannot
 * overflow the call stack, and parseSpec's value limit (MAX_NODES) bounds the work.
 */
export function stripExternalRefs(spec: Record<string, unknown>): ExternalRefResult {
  const refs = new Set<string>();
  const root: Record<string, unknown> = {};
  const stack: Task[] = [{ node: spec, parent: root, key: 'spec' }];

  while (stack.length > 0) {
    const { node, parent, key } = stack.pop()!;
    let copy: unknown = node;
    if (Array.isArray(node)) {
      const out: unknown[] = new Array(node.length);
      // Pushed in reverse, so the document is walked in order.
      for (let i = node.length - 1; i >= 0; i--) stack.push({ node: node[i], parent: out, key: i });
      copy = out;
    } else if (node !== null && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      const ref = obj.$ref;
      if (typeof ref === 'string' && !ref.startsWith('#')) {
        refs.add(ref);
        copy = { description: `External reference not supported: ${ref}` };
      } else {
        const out: Record<string, unknown> = {};
        const entries = Object.entries(obj);
        for (let i = entries.length - 1; i >= 0; i--) {
          stack.push({ node: entries[i][1], parent: out, key: entries[i][0] });
        }
        copy = out;
      }
    }
    if (Array.isArray(parent)) parent[key as number] = copy;
    else setOwn(parent, key as string, copy);
  }

  const cleaned = root.spec as Record<string, unknown>;
  return refs.size === 0 ? { spec, refs: [] } : { spec: cleaned, refs: [...refs] };
}
