import { lazy, Suspense, useMemo } from 'react';
import { parseSpec } from './lib/parseSpec';

// Swagger UI is large: load it only when there is a valid spec to show.
const SwaggerView = lazy(() => import('./SwaggerView'));

export function ViewMacro({ spec }: { spec: string }) {
  const result = useMemo(() => parseSpec(spec), [spec]);

  if (!result.ok) {
    if (result.code === 'empty') {
      return (
        <div className="ko-message">
          <strong>KoApiDoc</strong>
          <p>
            No specification yet. Edit the macro and paste an OpenAPI / Swagger document (JSON or
            YAML) into the configuration.
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
    <Suspense fallback={<div className="ko-message">Loading API documentation…</div>}>
      <SwaggerView spec={result.spec} />
    </Suspense>
  );
}
