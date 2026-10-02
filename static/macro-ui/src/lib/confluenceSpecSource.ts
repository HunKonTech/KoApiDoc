import { decodeText, isSupportedSpecFile, MAX_SPEC_BYTES } from './limits';
import { SpecSourceError, type AttachmentInfo, type SpecSource } from './specSource';

/** Same shape as `requestConfluence` from @forge/bridge; injected so it can be mocked in tests. */
export type RequestConfluence = (path: string, init?: RequestInit) => Promise<Response>;

export const DEFAULT_TIMEOUT_MS = 15_000;
/** Safety net against endless pagination. 5 x 250 attachments is plenty for one page. */
const MAX_LIST_PAGES = 5;

const PAGE_ID = /^\d+$/;
const ATTACHMENT_ID = /^(att)?\d+$/;

/**
 * Reads attachments of the current page through `requestConfluence`, i.e. with
 * the permissions of the viewing user. Endpoints (see docs/STEP-2.md):
 * - list:     GET /wiki/api/v2/pages/{id}/attachments
 * - metadata: GET /wiki/api/v2/attachments/{id}
 * - content:  GET /wiki/rest/api/content/{pageId}/child/attachment/{id}/download
 */
export class ConfluenceSpecSource implements SpecSource {
  private readonly request: RequestConfluence;
  private readonly timeoutMs: number;

  constructor(request: RequestConfluence, options: { timeoutMs?: number } = {}) {
    this.request = request;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async listAttachments(pageId: string): Promise<AttachmentInfo[]> {
    checkId(pageId, PAGE_ID);
    const result: AttachmentInfo[] = [];
    let path: string | null = `/wiki/api/v2/pages/${pageId}/attachments?limit=250`;
    for (let i = 0; path && i < MAX_LIST_PAGES; i++) {
      const body = await this.getJson(path);
      const results = (body as { results?: unknown }).results;
      if (!Array.isArray(results)) throw badResponse('attachment list');
      for (const item of results) {
        const info = toAttachmentInfo(item);
        if (info) result.push(info);
      }
      const next = (body as { _links?: { next?: unknown } })._links?.next;
      // Only follow links that stay on the same API.
      path = typeof next === 'string' && next.startsWith('/wiki/api/v2/') ? next : null;
    }
    return result;
  }

  async loadAttachment(pageId: string, attachmentId: string): Promise<string> {
    checkId(pageId, PAGE_ID);
    checkId(attachmentId, ATTACHMENT_ID);

    // Check the metadata first so that big or binary files are never downloaded.
    const meta = await this.getJson(`/wiki/api/v2/attachments/${attachmentId}`);
    const info = toAttachmentInfo(meta);
    if (!info) throw badResponse('attachment');
    // Only attachments of this page: not of another page, blog post or custom content,
    // and not one whose owner Confluence does not report.
    const { pageId: page, blogPostId, customContentId } = meta as Record<string, unknown>;
    const owner = page ?? blogPostId ?? customContentId;
    if ((typeof owner !== 'string' && typeof owner !== 'number') || String(owner) !== pageId) {
      throw new SpecSourceError('missing');
    }
    if (!isSupportedSpecFile(info)) throw new SpecSourceError('unsupported');
    if (info.fileSize > MAX_SPEC_BYTES) throw new SpecSourceError('too-large');

    const id = attachmentId.startsWith('att') ? attachmentId : `att${attachmentId}`;
    const response = await this.send(
      `/wiki/rest/api/content/${pageId}/child/attachment/${id}/download`,
    );
    const bytes = await this.withTimeout(readBytes(response));
    if (bytes.byteLength > MAX_SPEC_BYTES) throw new SpecSourceError('too-large');
    const text = decodeText(bytes);
    if (text === null) throw new SpecSourceError('not-text');
    return text;
  }

  private async getJson(path: string): Promise<unknown> {
    const response = await this.send(path);
    try {
      const body: unknown = await this.withTimeout(response.json());
      if (body === null || typeof body !== 'object') throw new Error('not an object');
      return body;
    } catch (e) {
      if (e instanceof SpecSourceError) throw e;
      throw badResponse('response');
    }
  }

  private async send(path: string): Promise<Response> {
    let response: Response;
    try {
      response = await this.withTimeout(
        this.request(path, { headers: { Accept: 'application/json' } }),
      );
    } catch (e) {
      if (e instanceof SpecSourceError) throw e;
      throw new SpecSourceError(
        'failed',
        `Could not reach Confluence: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    if (response.ok) return response;
    if (response.status === 401 || response.status === 403) throw new SpecSourceError('forbidden');
    if (response.status === 404 || response.status === 410) throw new SpecSourceError('missing');
    throw new SpecSourceError('failed', `Confluence answered with HTTP ${response.status}.`);
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new SpecSourceError('timeout')), this.timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }
}

function checkId(id: string, pattern: RegExp) {
  // IDs end up in URL paths: never let anything else through.
  if (!pattern.test(id)) throw new SpecSourceError('missing', `Invalid identifier: "${id}".`);
}

function badResponse(what: string) {
  return new SpecSourceError('failed', `Confluence returned an unexpected ${what}.`);
}

function toAttachmentInfo(item: unknown): AttachmentInfo | null {
  if (item === null || typeof item !== 'object') return null;
  const { id, title, mediaType, fileSize } = item as Record<string, unknown>;
  if ((typeof id !== 'string' && typeof id !== 'number') || typeof title !== 'string') return null;
  return {
    id: String(id),
    title,
    mediaType: typeof mediaType === 'string' ? mediaType : '',
    fileSize: typeof fileSize === 'number' && fileSize >= 0 ? fileSize : 0,
  };
}

async function readBytes(response: Response): Promise<Uint8Array> {
  if (typeof response.arrayBuffer === 'function') {
    return new Uint8Array(await response.arrayBuffer());
  }
  // Fallback for bridge responses without arrayBuffer(): text() replaces invalid bytes with U+FFFD.
  const text = await response.text();
  if (text.includes('�')) return new Uint8Array([0]);
  return new TextEncoder().encode(text);
}
