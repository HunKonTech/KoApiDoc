import { useEffect, useMemo, useState } from 'react';
import { formatBytes, isSupportedSpecFile } from './lib/limits';
import { parseSpec } from './lib/parseSpec';
import {
  describeSourceError,
  type AttachmentInfo,
  type SpecRef,
  type SpecSource,
} from './lib/specSource';

type Props = {
  initial: SpecRef;
  pageId: string | null;
  source: SpecSource;
  onSave: (ref: SpecRef) => Promise<void>;
  onCancel: () => void;
};

type ListState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; files: AttachmentInfo[]; skipped: number };

export function ConfigMacro({ initial, pageId, source, onSave, onCancel }: Props) {
  const [kind, setKind] = useState<SpecRef['kind']>(initial.kind);
  const [spec, setSpec] = useState(initial.kind === 'inline' ? initial.spec : '');
  const [selected, setSelected] = useState(
    initial.kind === 'attachment' ? { id: initial.attachmentId, title: initial.title } : null,
  );
  const [list, setList] = useState<ListState>({ status: 'idle' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const check = useMemo(() => (spec.trim() === '' ? null : parseSpec(spec)), [spec]);

  useEffect(() => {
    if (kind !== 'attachment' || list.status !== 'idle' || !pageId) return;
    setList({ status: 'loading' });
    source.listAttachments(pageId).then(
      (all) => {
        const files = all.filter(isSupportedSpecFile);
        setList({ status: 'ready', files, skipped: all.length - files.length });
      },
      (e: unknown) => setList({ status: 'error', message: describeSourceError(e) }),
    );
  }, [kind, list.status, pageId, source]);

  const canSave = !saving && (kind === 'inline' || selected !== null);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(
        kind === 'inline'
          ? { kind: 'inline', spec }
          : { kind: 'attachment', attachmentId: selected!.id, title: selected!.title },
      );
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <form
      className="ko-config"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) void save();
      }}
    >
      <fieldset className="ko-source">
        <legend>Source</legend>
        <label>
          <input
            type="radio"
            name="ko-source"
            value="inline"
            checked={kind === 'inline'}
            onChange={() => setKind('inline')}
          />
          Pasted text
        </label>
        <label>
          <input
            type="radio"
            name="ko-source"
            value="attachment"
            checked={kind === 'attachment'}
            onChange={() => setKind('attachment')}
          />
          Page attachment
        </label>
      </fieldset>

      {kind === 'inline' ? (
        <>
          <label htmlFor="ko-spec">OpenAPI / Swagger specification (JSON or YAML)</label>
          <textarea
            id="ko-spec"
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            spellCheck={false}
            rows={20}
            placeholder={'openapi: 3.0.3\ninfo:\n  title: My API\n  version: 1.0.0\npaths: {}'}
          />
          {check && check.ok && <p className="ko-hint ko-ok">Valid {check.version} document.</p>}
          {check && !check.ok && (
            <p className="ko-hint ko-error" role="alert">
              {check.message} You can still save it, but the macro will show this error.
            </p>
          )}
        </>
      ) : (
        <AttachmentPicker pageId={pageId} list={list} selected={selected} onSelect={setSelected} />
      )}

      {saveError && (
        <p className="ko-hint ko-error" role="alert">
          Saving failed: {saveError}
        </p>
      )}
      <div className="ko-actions">
        <button type="submit" disabled={!canSave}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="ko-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function AttachmentPicker({
  pageId,
  list,
  selected,
  onSelect,
}: {
  pageId: string | null;
  list: ListState;
  selected: { id: string; title: string } | null;
  onSelect: (file: { id: string; title: string }) => void;
}) {
  if (!pageId) {
    return (
      <p className="ko-hint ko-error" role="alert">
        Attachments are available once the page has been saved.
      </p>
    );
  }
  if (list.status === 'idle' || list.status === 'loading') {
    return <p className="ko-hint">Loading attachments…</p>;
  }
  if (list.status === 'error') {
    return (
      <p className="ko-hint ko-error" role="alert">
        Could not list the attachments: {list.message}
      </p>
    );
  }

  const { files, skipped } = list;
  const missing = selected !== null && !files.some((f) => f.id === selected.id);
  if (files.length === 0 && !missing) {
    return (
      <p className="ko-hint">
        This page has no .json, .yaml or .yml attachment. Attach the specification to the page, then
        open this configuration again.
      </p>
    );
  }
  return (
    <>
      <label htmlFor="ko-attachment">Attachment</label>
      <select
        id="ko-attachment"
        value={selected?.id ?? ''}
        onChange={(e) => {
          const file = files.find((f) => f.id === e.target.value);
          if (file) onSelect({ id: file.id, title: file.title });
        }}
      >
        {selected === null && (
          <option value="" disabled>
            Choose a file…
          </option>
        )}
        {missing && (
          <option value={selected.id}>{selected.title || selected.id} (not found)</option>
        )}
        {files.map((f) => (
          <option key={f.id} value={f.id}>
            {f.title} ({formatBytes(f.fileSize)})
          </option>
        ))}
      </select>
      {missing && (
        <p className="ko-hint ko-error" role="alert">
          The saved attachment is no longer on this page. Choose another one.
        </p>
      )}
      <p className="ko-hint">
        The macro always shows the latest version of the file.
        {skipped > 0 && ` ${skipped} other attachment(s) are hidden (not .json, .yaml or .yml).`}
      </p>
    </>
  );
}
