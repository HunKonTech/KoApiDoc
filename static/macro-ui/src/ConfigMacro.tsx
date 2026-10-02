import { useEffect, useMemo, useState } from 'react';
import { formatBytes, isSupportedSpecFile, LARGE_SPEC_OPERATIONS } from './lib/limits';
import {
  DEFAULT_FIXED_HEIGHT,
  MAX_HEIGHT,
  MIN_HEIGHT,
  parseHeight,
  type DisplayOptions,
  type Expansion,
} from './lib/options';
import { parseSpec, type ParseErrorCode } from './lib/parseSpec';
import { countOperations, listTags, type TagInfo } from './lib/specFilter';
import {
  describeSourceError,
  type AttachmentInfo,
  type SpecRef,
  type SpecSource,
} from './lib/specSource';
import { SpecDisplay } from './ViewMacro';

const BLOCKING: ParseErrorCode[] = ['too-large', 'too-complex'];

type Props = {
  initial: SpecRef;
  initialOptions: DisplayOptions;
  pageId: string | null;
  source: SpecSource;
  onSave: (ref: SpecRef, options: DisplayOptions) => Promise<void>;
  onCancel: () => void;
};

type ListState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; files: AttachmentInfo[]; skipped: number };

/** Content of the chosen attachment, for the tag list and the preview. */
type ContentState =
  | { id: string; status: 'loading' }
  | { id: string; status: 'error'; message: string }
  | { id: string; status: 'ready'; text: string };

export function ConfigMacro({ initial, initialOptions, pageId, source, onSave, onCancel }: Props) {
  const [kind, setKind] = useState<SpecRef['kind']>(initial.kind);
  const [spec, setSpec] = useState(initial.kind === 'inline' ? initial.spec : '');
  const [selected, setSelected] = useState(
    initial.kind === 'attachment' ? { id: initial.attachmentId, title: initial.title } : null,
  );
  const [list, setList] = useState<ListState>({ status: 'idle' });
  const [content, setContent] = useState<ContentState | null>(null);
  const [options, setOptions] = useState(initialOptions);
  const [heightText, setHeightText] = useState(String(initialOptions.height ?? ''));
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const check = useMemo(() => (spec.trim() === '' ? null : parseSpec(spec)), [spec]);
  // Too big or too complex text would only slow down every page view: it is not saved.
  const blocked = check !== null && !check.ok && BLOCKING.includes(check.code);

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

  // Read the chosen attachment, so its tags can be offered and previewed.
  const selectedId = selected?.id ?? null;
  useEffect(() => {
    if (kind !== 'attachment' || !selectedId || !pageId) return;
    let cancelled = false;
    setContent({ id: selectedId, status: 'loading' });
    source.loadAttachment(pageId, selectedId).then(
      (text) => !cancelled && setContent({ id: selectedId, status: 'ready', text }),
      (e: unknown) =>
        !cancelled &&
        setContent({ id: selectedId, status: 'error', message: describeSourceError(e) }),
    );
    return () => {
      cancelled = true;
    };
  }, [kind, selectedId, pageId, source]);

  const specText =
    kind === 'inline'
      ? spec
      : content?.id === selectedId && content.status === 'ready'
        ? content.text
        : null;
  const outline = useMemo(() => {
    if (specText === null) return null;
    const parsed = parseSpec(specText);
    return parsed.ok
      ? { tags: listTags(parsed.spec), operations: countOperations(parsed.spec) }
      : null;
  }, [specText]);

  const canSave = !saving && (kind === 'inline' ? !blocked : selected !== null);
  const update = (changes: Partial<DisplayOptions>) => setOptions((o) => ({ ...o, ...changes }));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(
        kind === 'inline'
          ? { kind: 'inline', spec }
          : { kind: 'attachment', attachmentId: selected!.id, title: selected!.title },
        options,
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
              {check.message}{' '}
              {blocked
                ? 'It cannot be saved.'
                : 'You can still save it, but the macro will show this error.'}
            </p>
          )}
        </>
      ) : (
        <AttachmentPicker pageId={pageId} list={list} selected={selected} onSelect={setSelected} />
      )}

      <fieldset className="ko-group">
        <legend>Display</legend>
        <div className="ko-row">
          <label htmlFor="ko-expansion">Expand on load</label>
          <select
            id="ko-expansion"
            value={options.expansion}
            onChange={(e) => update({ expansion: e.target.value as Expansion })}
          >
            <option value="collapsed">Everything collapsed</option>
            <option value="tags">Tags open</option>
            <option value="all">Everything open</option>
          </select>
        </div>
        <label>
          <input
            type="checkbox"
            checked={options.showSchemas}
            onChange={(e) => update({ showSchemas: e.target.checked })}
          />
          Show the Schemas section
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.filter}
            onChange={(e) => update({ filter: e.target.checked })}
          />
          Show the search box
        </label>
        <TagPicker
          tags={outline?.tags ?? null}
          operations={outline?.operations ?? 0}
          selected={options.tags}
          loading={kind === 'attachment' && content?.status === 'loading'}
          onChange={(next) => update({ tags: next })}
        />
        <fieldset className="ko-group">
          <legend>Height</legend>
          <label>
            <input
              type="radio"
              name="ko-height"
              checked={options.height === null}
              onChange={() => update({ height: null })}
            />
            Automatic (as tall as the content)
          </label>
          <div className="ko-row">
            <label>
              <input
                type="radio"
                name="ko-height"
                checked={options.height !== null}
                onChange={() => {
                  const height = parseHeight(heightText) ?? DEFAULT_FIXED_HEIGHT;
                  setHeightText(String(height));
                  update({ height });
                }}
              />
              Fixed, with scrolling
            </label>
            <label htmlFor="ko-height-px" className="ko-visually-hidden">
              Height in pixels
            </label>
            <input
              id="ko-height-px"
              type="number"
              min={MIN_HEIGHT}
              max={MAX_HEIGHT}
              step={50}
              value={heightText}
              disabled={options.height === null}
              aria-describedby="ko-height-hint"
              onChange={(e) => {
                setHeightText(e.target.value);
                const height = parseHeight(e.target.value);
                if (height !== null) update({ height });
              }}
              onBlur={() => setHeightText(String(options.height ?? ''))}
            />
            <span id="ko-height-hint" className="ko-hint">
              px ({MIN_HEIGHT}–{MAX_HEIGHT})
            </span>
          </div>
        </fieldset>
      </fieldset>

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
        <button
          type="button"
          className="ko-secondary"
          aria-expanded={preview}
          aria-controls="ko-preview"
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? 'Hide preview' : 'Show preview'}
        </button>
      </div>
      {preview && (
        <section id="ko-preview" className="ko-preview" aria-label="Preview">
          {specText !== null ? (
            <SpecDisplay text={specText} options={options} />
          ) : (
            <p className="ko-hint">
              {kind === 'attachment' && content?.status === 'error'
                ? `Could not load the attachment: ${content.message}`
                : 'Choose an attachment to see the preview.'}
            </p>
          )}
        </section>
      )}
    </form>
  );
}

function TagPicker({
  tags,
  operations,
  selected,
  loading,
  onChange,
}: {
  tags: TagInfo[] | null;
  operations: number;
  selected: string[];
  loading: boolean;
  onChange: (tags: string[]) => void;
}) {
  // Saved tags the current spec does not use stay visible, so they can be removed.
  const missing = selected.filter((name) => !tags?.some((t) => t.name === name));
  const toggle = (name: string, on: boolean) =>
    onChange(on ? [...selected, name] : selected.filter((t) => t !== name));

  return (
    <fieldset className="ko-group ko-tags">
      <legend>Tags to show</legend>
      <p className="ko-hint">
        {selected.length === 0
          ? 'None selected: all operations are shown.'
          : `Only operations with the ${selected.length} selected tag(s) are shown.`}
      </p>
      {tags === null && (
        <p className="ko-hint">
          {loading
            ? 'Reading the tags of the attachment…'
            : 'The tags appear here once there is a valid specification.'}
        </p>
      )}
      {tags !== null && tags.length === 0 && (
        <p className="ko-hint">The specification has no operations.</p>
      )}
      {selected.length === 0 && operations > LARGE_SPEC_OPERATIONS && (
        <p className="ko-hint ko-suggestion" role="status">
          This is a large specification ({operations} operations). Consider showing only the tags
          your readers need: the page stays lighter and easier to read.
        </p>
      )}
      <div className="ko-tag-list">
        {tags?.map((t) => (
          <label key={t.name}>
            <input
              type="checkbox"
              checked={selected.includes(t.name)}
              onChange={(e) => toggle(t.name, e.target.checked)}
            />
            {t.name} <span className="ko-count">({t.operations})</span>
          </label>
        ))}
        {missing.map((name) => (
          <label key={name}>
            <input type="checkbox" checked onChange={() => toggle(name, false)} />
            {name} <span className="ko-count">(not in the specification)</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <button type="button" className="ko-link" onClick={() => onChange([])}>
          Show all tags
        </button>
      )}
    </fieldset>
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
