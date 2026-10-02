import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { stripExternalRefs } from './lib/externalRefs';
import { DEFAULT_OPTIONS, type DisplayOptions } from './lib/options';
import { parseSpec } from './lib/parseSpec';
import { filterByTags } from './lib/specFilter';
import { describeSourceError, type SpecRef, type SpecSource } from './lib/specSource';

// Swagger UI is large: load it only when there is a valid spec to show.
const SwaggerView = lazy(() => import('./SwaggerView'));

type Props = {
  specRef: SpecRef;
  pageId: string | null;
  source: SpecSource;
  options?: DisplayOptions;
};

type LoadState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; text: string };

export function ViewMacro({ specRef, pageId, source, options = DEFAULT_OPTIONS }: Props) {
  const attachmentId = specRef.kind === 'attachment' ? specRef.attachmentId : null;
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    if (attachmentId === null) return;
    if (!pageId) {
      setLoad({ status: 'error', message: 'The page of this macro is not known.' });
      return;
    }
    let cancelled = false;
    setLoad({ status: 'loading' });
    // Always fetch the current content, so a new attachment version shows up on reload.
    source.loadAttachment(pageId, attachmentId).then(
      (text) => !cancelled && setLoad({ status: 'ready', text }),
      (e: unknown) => !cancelled && setLoad({ status: 'error', message: describeSourceError(e) }),
    );
    return () => {
      cancelled = true;
    };
  }, [attachmentId, pageId, source]);

  if (specRef.kind === 'inline') return <SpecDisplay text={specRef.spec} options={options} />;

  const name = specRef.title || 'the attachment';
  if (load.status === 'loading') {
    return <div className="ko-message">Loading {name}…</div>;
  }
  if (load.status === 'error') {
    return (
      <div className="ko-message ko-error" role="alert">
        <strong>Could not load {name}</strong>
        <p>{load.message}</p>
      </div>
    );
  }
  return <SpecDisplay text={load.text} options={options} />;
}

/** Parses the spec text and shows it with the given display options (also used as preview). */
export function SpecDisplay({ text, options }: { text: string; options: DisplayOptions }) {
  const parsed = useMemo(() => {
    const result = parseSpec(text);
    return result.ok ? { ...result, ...stripExternalRefs(result.spec) } : result;
  }, [text]);
  const result = useMemo(
    () => (parsed.ok ? { ...parsed, ...filterByTags(parsed.spec, options.tags) } : parsed),
    [parsed, options.tags],
  );
  // Swagger UI reads its settings once: remount it when they change.
  const optionsKey = JSON.stringify(options);

  if (!result.ok) {
    if (result.code === 'empty') {
      return (
        <div className="ko-message">
          <strong>KoApiDoc</strong>
          <p>
            No specification yet. Edit the macro and paste an OpenAPI / Swagger document (JSON or
            YAML), or choose a .json / .yaml attachment of this page.
          </p>
        </div>
      );
    }
    return (
      <div className="ko-message ko-error" role="alert">
        <strong>Invalid specification</strong>
        <p>{result.message}</p>
      </div>
    );
  }

  return (
    <>
      {result.refs.length > 0 && <ExternalRefWarning refs={result.refs} />}
      {result.unknownTags.length > 0 && (
        <div className="ko-message ko-warning" role="status">
          <strong>Some selected tags are not in the specification</strong>
          <p>
            Not found: {result.unknownTags.join(', ')}. Edit the macro to update the tag selection.
          </p>
        </div>
      )}
      {options.tags.length > 0 && result.operations === 0 ? (
        <div className="ko-message" role="status">
          <strong>No operations to show</strong>
          <p>None of the {result.total} operations has one of the selected tags.</p>
        </div>
      ) : (
        <ErrorBoundary resetKey={`${text}\n${optionsKey}`}>
          <Suspense fallback={<div className="ko-message">Loading API documentation…</div>}>
            <SwaggerView key={optionsKey} spec={result.spec} options={options} />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
}

const SHOWN_REFS = 5;

function ExternalRefWarning({ refs }: { refs: string[] }) {
  return (
    <div className="ko-message ko-warning" role="status">
      <strong>External references are not supported</strong>
      <p>
        The specification refers to other files, which KoApiDoc does not load. Those parts are shown
        as placeholders:
      </p>
      <ul>
        {refs.slice(0, SHOWN_REFS).map((ref) => (
          <li key={ref}>
            <code>{ref}</code>
          </li>
        ))}
        {refs.length > SHOWN_REFS && <li>and {refs.length - SHOWN_REFS} more</li>}
      </ul>
    </div>
  );
}
