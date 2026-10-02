import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { stripExternalRefs } from './lib/externalRefs';
import { parseSpec } from './lib/parseSpec';
import { describeSourceError, type SpecRef, type SpecSource } from './lib/specSource';

// Swagger UI is large: load it only when there is a valid spec to show.
const SwaggerView = lazy(() => import('./SwaggerView'));

type Props = { specRef: SpecRef; pageId: string | null; source: SpecSource };

type LoadState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; text: string };

export function ViewMacro({ specRef, pageId, source }: Props) {
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

  if (specRef.kind === 'inline') return <SpecView text={specRef.spec} />;

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
  return <SpecView text={load.text} />;
}

function SpecView({ text }: { text: string }) {
  const result = useMemo(() => {
    const parsed = parseSpec(text);
    return parsed.ok ? { ...parsed, ...stripExternalRefs(parsed.spec) } : parsed;
  }, [text]);

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
      <Suspense fallback={<div className="ko-message">Loading API documentation…</div>}>
        <SwaggerView spec={result.spec} />
      </Suspense>
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
