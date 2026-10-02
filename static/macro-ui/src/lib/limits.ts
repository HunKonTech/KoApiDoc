/** Largest spec we load from an attachment (bytes). Bigger files make Swagger UI unusable anyway. */
export const MAX_SPEC_BYTES = 2 * 1024 * 1024;

export const SPEC_EXTENSIONS = ['.json', '.yaml', '.yml'] as const;

/** True for file names ending in .json, .yaml or .yml (case-insensitive). */
export function hasSpecExtension(title: string): boolean {
  const lower = title.toLowerCase();
  return SPEC_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// Confluence often stores YAML as text/plain or application/octet-stream, so the
// extension decides and the media type only rules out clearly non-text files.
const NON_TEXT_MEDIA = /^(image|audio|video|font)\/|^application\/(pdf|zip|gzip|x-tar|x-7z|vnd\.)/i;

/** True when the attachment looks like a spec file we can read as text. */
export function isSupportedSpecFile(file: { title: string; mediaType?: string }): boolean {
  return hasSpecExtension(file.title) && !NON_TEXT_MEDIA.test(file.mediaType ?? '');
}

/**
 * Decodes bytes as UTF-8 text. Returns null for content that is not text
 * (invalid UTF-8 or NUL bytes), so binary files never reach the parser.
 */
export function decodeText(bytes: ArrayBuffer | Uint8Array): string | null {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.includes(0)) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(view);
  } catch {
    return null;
  }
}

/** Human readable size, e.g. "1.4 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '?';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
