import { decodeText, isSupportedSpecFile, MAX_SPEC_BYTES } from './limits';
import { SpecSourceError, type AttachmentInfo, type SpecSource } from './specSource';

/** Failure modes the mock can simulate (same names as the `?fail=` switch of the local preview). */
export type MockFailMode = 'forbidden' | 'missing' | 'toolarge' | 'notext' | 'slow';

export type MockAttachment = AttachmentInfo & { content: string | Uint8Array };

export type MockOptions = {
  fail?: MockFailMode | null;
  /** Delay of every call in `slow` mode (ms). */
  slowMs?: number;
};

/** In-memory SpecSource for tests: no Confluence, no network. */
export class MockSpecSource implements SpecSource {
  private readonly files: MockAttachment[];
  private readonly options: MockOptions;

  constructor(files: MockAttachment[], options: MockOptions = {}) {
    this.files = files;
    this.options = options;
  }

  async listAttachments(): Promise<AttachmentInfo[]> {
    await this.maybeWait();
    if (this.options.fail === 'forbidden') throw new SpecSourceError('forbidden');
    return this.files.map(({ id, title, mediaType, fileSize }) => ({
      id,
      title,
      mediaType,
      fileSize,
    }));
  }

  async loadAttachment(_pageId: string, attachmentId: string): Promise<string> {
    await this.maybeWait();
    const { fail } = this.options;
    if (fail === 'forbidden') throw new SpecSourceError('forbidden');
    const file = this.files.find((f) => f.id === attachmentId);
    if (!file || fail === 'missing') throw new SpecSourceError('missing');
    if (!isSupportedSpecFile(file)) throw new SpecSourceError('unsupported');
    if (fail === 'toolarge' || file.fileSize > MAX_SPEC_BYTES) {
      throw new SpecSourceError('too-large');
    }
    const bytes =
      fail === 'notext'
        ? new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff])
        : typeof file.content === 'string'
          ? new TextEncoder().encode(file.content)
          : file.content;
    const text = decodeText(bytes);
    if (text === null) throw new SpecSourceError('not-text');
    return text;
  }

  private async maybeWait() {
    if (this.options.fail === 'slow') {
      await new Promise((resolve) => setTimeout(resolve, this.options.slowMs ?? 20_000));
    }
  }
}
