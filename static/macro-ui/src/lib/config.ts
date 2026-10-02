import type { SpecRef } from './specSource';

/** What is stored in the macro configuration. */
export type StoredConfig =
  | { source: 'inline'; spec: string }
  | { source: 'attachment'; attachmentId: string; title: string };

const EMPTY: SpecRef = { kind: 'inline', spec: '' };

/**
 * Reads the macro configuration. Accepts the new `{ source, ... }` shapes and the
 * step 1 shape `{ spec }`. Anything invalid becomes an empty inline spec, so the
 * macro shows its "no specification yet" hint instead of crashing.
 */
export function parseConfig(raw: unknown): SpecRef {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY;
  const c = raw as Record<string, unknown>;

  if (c.source === 'attachment') {
    const id = c.attachmentId;
    if ((typeof id !== 'string' || id === '') && typeof id !== 'number') return EMPTY;
    return {
      kind: 'attachment',
      attachmentId: String(id),
      title: typeof c.title === 'string' ? c.title : '',
    };
  }
  if (c.source === 'inline' || c.source === undefined) {
    return { kind: 'inline', spec: typeof c.spec === 'string' ? c.spec : '' };
  }
  return EMPTY;
}

export function toConfig(ref: SpecRef): StoredConfig {
  return ref.kind === 'inline'
    ? { source: 'inline', spec: ref.spec }
    : { source: 'attachment', attachmentId: ref.attachmentId, title: ref.title };
}
