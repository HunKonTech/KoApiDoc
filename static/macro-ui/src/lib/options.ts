/** How much of the documentation is expanded on load. */
export type Expansion = 'collapsed' | 'tags' | 'all';

/** Display settings stored next to the spec source in the macro configuration. */
export type DisplayOptions = {
  expansion: Expansion;
  /** Show the "Schemas" (models) section below the operations. */
  showSchemas: boolean;
  /** Show the search box above the operations. */
  filter: boolean;
  /** Only show operations with one of these tags; empty means all. */
  tags: string[];
  /** Fixed height in px with scrolling inside the macro; null means automatic. */
  height: number | null;
};

export const DEFAULT_OPTIONS: Readonly<DisplayOptions> = {
  expansion: 'tags',
  showSchemas: true,
  filter: true,
  tags: [],
  height: null,
};

export const MIN_HEIGHT = 200;
export const MAX_HEIGHT = 5000;
/** Suggested value when the editor switches to a fixed height. */
export const DEFAULT_FIXED_HEIGHT = 600;
const MAX_TAGS = 200;

const EXPANSIONS: readonly Expansion[] = ['collapsed', 'tags', 'all'];
// Swagger UI's own names, in case a config was written with them.
const EXPANSION_ALIASES: Record<string, Expansion> = {
  none: 'collapsed',
  list: 'tags',
  full: 'all',
};

/**
 * Reads the `options` object of the macro configuration. A missing object (configs
 * saved before step 3) gives the defaults; every invalid field falls back to its
 * default on its own, so one bad value never hides the macro.
 */
export function parseOptions(raw: unknown): DisplayOptions {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw))
    return { ...DEFAULT_OPTIONS, tags: [] };
  const o = raw as Record<string, unknown>;
  return {
    expansion: parseExpansion(o.expansion),
    showSchemas: typeof o.showSchemas === 'boolean' ? o.showSchemas : DEFAULT_OPTIONS.showSchemas,
    filter: typeof o.filter === 'boolean' ? o.filter : DEFAULT_OPTIONS.filter,
    tags: parseTags(o.tags),
    height: parseHeight(o.height),
  };
}

function parseExpansion(value: unknown): Expansion {
  if (typeof value !== 'string') return DEFAULT_OPTIONS.expansion;
  if ((EXPANSIONS as readonly string[]).includes(value)) return value as Expansion;
  return EXPANSION_ALIASES[value] ?? DEFAULT_OPTIONS.expansion;
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const tag = item.trim();
    if (tag !== '') tags.add(tag);
    if (tags.size >= MAX_TAGS) break;
  }
  return [...tags];
}

/** A fixed height in px, clamped to a usable range; null (automatic) for anything else. */
export function parseHeight(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return null;
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(n)));
}

/** Swagger UI's `docExpansion` value for an expansion setting. */
export function toDocExpansion(expansion: Expansion): 'none' | 'list' | 'full' {
  return expansion === 'collapsed' ? 'none' : expansion === 'all' ? 'full' : 'list';
}
