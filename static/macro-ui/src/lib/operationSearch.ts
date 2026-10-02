/** What the search box looks at for one operation. */
export type SearchableOperation = {
  tag: string;
  method: string;
  path: string;
  summary?: unknown;
  operationId?: unknown;
};

/** Splits the search text into lower-case words. */
export function searchWords(phrase: string): string[] {
  return phrase.toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * True when every word occurs in the operation's method, path, summary, operation ID
 * or tag (case-insensitive). Swagger UI's own filter only matches tag names.
 */
export function matchesSearch(words: string[], op: SearchableOperation): boolean {
  if (words.length === 0) return true;
  const text = [op.method, op.path, op.summary, op.operationId, op.tag]
    .filter((part) => typeof part === 'string')
    .join(' ')
    .toLowerCase();
  return words.every((word) => text.includes(word));
}
