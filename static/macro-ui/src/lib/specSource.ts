import { formatBytes, MAX_SPEC_BYTES } from './limits';

/** Where the macro takes its specification from. */
export type SpecRef =
  { kind: 'inline'; spec: string } | { kind: 'attachment'; attachmentId: string; title: string };

export type AttachmentInfo = { id: string; title: string; mediaType: string; fileSize: number };

/** The UI only knows this interface, not Confluence. */
export interface SpecSource {
  listAttachments(pageId: string): Promise<AttachmentInfo[]>;
  /** Resolves to the attachment's current content as text. */
  loadAttachment(pageId: string, attachmentId: string): Promise<string>;
}

export type SpecSourceErrorCode =
  'forbidden' | 'missing' | 'too-large' | 'not-text' | 'unsupported' | 'timeout' | 'failed';

export class SpecSourceError extends Error {
  readonly code: SpecSourceErrorCode;

  constructor(code: SpecSourceErrorCode, message?: string) {
    super(message ?? defaultMessage(code));
    this.name = 'SpecSourceError';
    this.code = code;
  }
}

function defaultMessage(code: SpecSourceErrorCode): string {
  switch (code) {
    case 'forbidden':
      return 'You do not have permission to read this attachment, or the app has no access to it.';
    case 'missing':
      return 'The attachment was not found. It may have been deleted or moved to another page.';
    case 'too-large':
      return `The attachment is larger than the ${formatBytes(MAX_SPEC_BYTES)} limit.`;
    case 'not-text':
      return 'The attachment is not a text file (expected UTF-8 JSON or YAML).';
    case 'unsupported':
      return 'Only .json, .yaml and .yml attachments are supported.';
    case 'timeout':
      return 'Confluence did not respond in time. Reload the page to try again.';
    case 'failed':
      return 'Loading from Confluence failed.';
  }
}

/** A readable message for any error thrown by a SpecSource. */
export function describeSourceError(e: unknown): string {
  if (e instanceof SpecSourceError) return e.message;
  const detail = e instanceof Error ? e.message : String(e);
  return `${defaultMessage('failed')} ${detail}`.trim();
}
