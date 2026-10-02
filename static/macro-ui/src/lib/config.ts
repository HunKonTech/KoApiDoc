import { parseOptions, type DisplayOptions } from './options';
import type { SpecRef } from './specSource';

/** What is stored in the macro configuration. */
export type StoredConfig = (
  { source: 'inline'; spec: string } | { source: 'attachment'; attachmentId: string; title: string }
) & { options?: DisplayOptions };

/** Everything the macro needs from its configuration. */
export type MacroConfig = { ref: SpecRef; options: DisplayOptions };

const EMPTY: SpecRef = { kind: 'inline', spec: '' };

const isObject = (raw: unknown): raw is Record<string, unknown> =>
  raw !== null && typeof raw === 'object' && !Array.isArray(raw);

/**
 * Reads the spec source of the macro configuration. Accepts the new `{ source, ... }`
 * shapes and the step 1 shape `{ spec }`. Anything invalid becomes an empty inline
 * spec, so the macro shows its "no specification yet" hint instead of crashing.
 */
export function parseConfig(raw: unknown): SpecRef {
  if (!isObject(raw)) return EMPTY;
  const c = raw;

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

/** Reads the spec source and the display options; configs without options get the defaults. */
export function parseMacroConfig(raw: unknown): MacroConfig {
  return { ref: parseConfig(raw), options: parseOptions(isObject(raw) ? raw.options : undefined) };
}

export function toConfig(ref: SpecRef, options?: DisplayOptions): StoredConfig {
  const base: StoredConfig =
    ref.kind === 'inline'
      ? { source: 'inline', spec: ref.spec }
      : { source: 'attachment', attachmentId: ref.attachmentId, title: ref.title };
  return options ? { ...base, options: { ...options, tags: [...options.tags] } } : base;
}
