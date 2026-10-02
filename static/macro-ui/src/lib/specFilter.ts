type Json = Record<string, unknown>;

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
/** Swagger UI shows operations without tags in a group with this name. */
export const UNTAGGED = 'default';

export type TagInfo = { name: string; operations: number };

export type TagFilterResult = {
  spec: Json;
  /** Operations left after filtering. */
  operations: number;
  /** Operations of the whole spec. */
  total: number;
  /** Requested tags the spec does not use (e.g. renamed since the macro was saved). */
  unknownTags: string[];
};

const isObject = (value: unknown): value is Json =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** The tags of an operation; operations without tags belong to "default", as in Swagger UI. */
function operationTags(op: Json): string[] {
  const tags = Array.isArray(op.tags)
    ? op.tags.filter((t): t is string => typeof t === 'string' && t !== '')
    : [];
  return tags.length > 0 ? tags : [UNTAGGED];
}

/** Resolves a local JSON pointer such as `#/components/pathItems/Pet`. */
function resolvePointer(spec: Json, ref: string): unknown {
  if (!ref.startsWith('#/')) return undefined;
  let node: unknown = spec;
  for (const raw of ref.slice(2).split('/')) {
    let key: string;
    try {
      key = decodeURIComponent(raw).replace(/~1/g, '/').replace(/~0/g, '~');
    } catch {
      return undefined;
    }
    if (!isObject(node) && !Array.isArray(node)) return undefined;
    node = (node as Json)[key];
  }
  return node;
}

/** A path item, or the local path item its `$ref` points to. */
function resolvePathItem(spec: Json, item: unknown): Json | null {
  if (!isObject(item)) return null;
  if (typeof item.$ref === 'string') {
    const target = resolvePointer(spec, item.$ref);
    if (isObject(target)) return target;
  }
  return item;
}

/** Calls `visit` for every operation in `paths` and `webhooks`. */
function forEachOperation(spec: Json, visit: (op: Json) => void) {
  for (const section of [spec.paths, spec.webhooks]) {
    if (!isObject(section)) continue;
    for (const raw of Object.values(section)) {
      const item = resolvePathItem(spec, raw);
      if (!item) continue;
      for (const method of METHODS) {
        const op = item[method];
        if (isObject(op)) visit(op);
      }
    }
  }
}

export function countOperations(spec: Json): number {
  let count = 0;
  forEachOperation(spec, () => count++);
  return count;
}

/**
 * The tags the spec uses, in the order Swagger UI shows them: tags declared in the
 * top-level `tags` list first, then tags only used by operations, "default" last.
 * Declared tags without operations are left out, as Swagger UI does.
 */
export function listTags(spec: Json): TagInfo[] {
  const counts = new Map<string, number>();
  forEachOperation(spec, (op) => {
    for (const tag of new Set(operationTags(op))) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  });
  const declared = Array.isArray(spec.tags)
    ? spec.tags
        .map((t) => (isObject(t) ? t.name : undefined))
        .filter((n): n is string => typeof n === 'string')
    : [];
  const order = [...new Set([...declared, ...counts.keys()])];
  const untaggedLast = (a: string, b: string) => Number(a === UNTAGGED) - Number(b === UNTAGGED);
  return order
    .filter((name) => counts.has(name))
    .sort(untaggedLast)
    .map((name) => ({ name, operations: counts.get(name)! }));
}

/**
 * Keeps only the operations that have one of `tags`, on a copy of the spec. Shared
 * parts (`components`, `definitions`, ...) are kept as they are, so local `$ref`s
 * keep working. Path items without a matching operation are removed; a path item
 * given by `$ref` is kept as a reference when all its operations match and inlined
 * otherwise. With no tags the spec is returned unchanged.
 */
export function filterByTags(spec: Json, tags: string[]): TagFilterResult {
  const total = countOperations(spec);
  if (tags.length === 0) return { spec, operations: total, total, unknownTags: [] };

  const wanted = new Set(tags);
  const known = new Set(listTags(spec).map((t) => t.name));
  let operations = 0;

  const filterSection = (section: unknown): unknown => {
    if (!isObject(section)) return section;
    const out: Json = {};
    for (const [key, raw] of Object.entries(section)) {
      const item = resolvePathItem(spec, raw);
      if (!item) continue;
      const copy: Json = {};
      let all = 0;
      let kept = 0;
      for (const [field, value] of Object.entries(item)) {
        if (METHODS.includes(field) && isObject(value)) {
          all++;
          if (!operationTags(value).some((t) => wanted.has(t))) continue;
          kept++;
        }
        copy[field] = value;
      }
      if (kept === 0) continue;
      operations += kept;
      out[key] = kept === all ? raw : copy;
    }
    return out;
  };

  const result: Json = { ...spec };
  if ('paths' in spec) result.paths = filterSection(spec.paths);
  if ('webhooks' in spec) result.webhooks = filterSection(spec.webhooks);
  if (Array.isArray(spec.tags)) {
    result.tags = spec.tags.filter((t) => !isObject(t) || wanted.has(t.name as string));
  }
  return {
    spec: result,
    operations,
    total,
    unknownTags: tags.filter((t) => !known.has(t)),
  };
}
