import { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import type { FullContext } from '@forge/bridge';
import { ConfigMacro } from './ConfigMacro';
import { ViewMacro } from './ViewMacro';
import { applyTheme } from './lib/theme';

type MacroContext = {
  isConfiguring: boolean;
  spec: string;
};

function readContext(context: FullContext): MacroContext {
  const extension = context.extension ?? {};
  const config = (extension.config ?? {}) as { spec?: unknown };
  return {
    isConfiguring: Boolean(extension.macro?.isConfiguring),
    spec: typeof config.spec === 'string' ? config.spec : '',
  };
}

export function App() {
  const [ctx, setCtx] = useState<MacroContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void applyTheme();
    view
      .getContext()
      .then((context) => setCtx(readContext(context)))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) return <div className="ko-message ko-error">Could not load the macro: {error}</div>;
  if (!ctx) return <div className="ko-message">Loading…</div>;
  return ctx.isConfiguring ? <ConfigMacro initialSpec={ctx.spec} /> : <ViewMacro spec={ctx.spec} />;
}
