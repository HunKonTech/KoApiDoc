import { useEffect, useMemo, useState } from 'react';
import { requestConfluence, view } from '@forge/bridge';
import type { FullContext } from '@forge/bridge';
import { ConfigMacro } from './ConfigMacro';
import { ViewMacro } from './ViewMacro';
import { parseMacroConfig, toConfig } from './lib/config';
import { ConfluenceSpecSource } from './lib/confluenceSpecSource';
import type { DisplayOptions } from './lib/options';
import type { SpecRef } from './lib/specSource';
import { applyTheme } from './lib/theme';

type MacroContext = {
  isConfiguring: boolean;
  specRef: SpecRef;
  options: DisplayOptions;
  pageId: string | null;
};

function readContext(context: FullContext): MacroContext {
  const extension = context.extension ?? {};
  const pageId = extension.content?.id;
  const { ref, options } = parseMacroConfig(extension.config);
  return {
    isConfiguring: Boolean(extension.macro?.isConfiguring),
    specRef: ref,
    options,
    pageId: typeof pageId === 'string' || typeof pageId === 'number' ? String(pageId) : null,
  };
}

export function App() {
  const [ctx, setCtx] = useState<MacroContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const source = useMemo(() => new ConfluenceSpecSource(requestConfluence), []);

  useEffect(() => {
    void applyTheme();
    view
      .getContext()
      .then((context) => setCtx(readContext(context)))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <div className="ko-message ko-error" role="alert">
        Could not load the macro: {error}
      </div>
    );
  }
  if (!ctx) return <div className="ko-message">Loading…</div>;
  return ctx.isConfiguring ? (
    <ConfigMacro
      initial={ctx.specRef}
      initialOptions={ctx.options}
      pageId={ctx.pageId}
      source={source}
      onSave={(ref, options) => view.submit(toConfig(ref, options))}
      onCancel={() => void view.close()}
    />
  ) : (
    <ViewMacro specRef={ctx.specRef} options={ctx.options} pageId={ctx.pageId} source={source} />
  );
}
