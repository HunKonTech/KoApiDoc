import { useMemo, useState } from 'react';
import { view } from '@forge/bridge';
import { parseSpec } from './lib/parseSpec';

export function ConfigMacro({ initialSpec }: { initialSpec: string }) {
  const [spec, setSpec] = useState(initialSpec);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const check = useMemo(() => (spec.trim() === '' ? null : parseSpec(spec)), [spec]);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await view.submit({ spec });
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
        void save();
      }}
    >
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
      {saveError && (
        <p className="ko-hint ko-error" role="alert">
          Saving failed: {saveError}
        </p>
      )}
      <div className="ko-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="ko-secondary" onClick={() => void view.close()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
