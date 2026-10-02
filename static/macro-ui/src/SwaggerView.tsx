import { useId, useRef } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { matchesSearch, searchWords } from './lib/operationSearch';
import { toDocExpansion, type DisplayOptions } from './lib/options';

type Props = { spec: Record<string, unknown>; options: DisplayOptions };

/**
 * Swagger UI reads its settings only once, on mount: the caller gives this component
 * a new `key` when the options change.
 */
export default function SwaggerView({ spec, options }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(performance.now());
  const fixed = options.height !== null;

  return (
    <div
      ref={ref}
      className={fixed ? 'ko-swagger ko-fixed' : 'ko-swagger'}
      style={fixed ? { height: options.height! } : undefined}
      // A scrolling box must be reachable with the keyboard.
      {...(fixed ? { role: 'region', 'aria-label': 'API documentation', tabIndex: 0 } : {})}
    >
      <SwaggerUI
        spec={spec}
        // Read-only: no "Try it out", no network.
        supportedSubmitMethods={[]}
        docExpansion={toDocExpansion(options.expansion)}
        // -1 hides the "Schemas" section completely.
        defaultModelsExpandDepth={options.showSchemas ? 1 : -1}
        filter={options.filter}
        plugins={[searchPlugin, readOnlyPlugin]}
        onComplete={() => {
          // Time until the definition is loaded and laid out; read by the e2e performance check.
          requestAnimationFrame(() => {
            const ms = Math.round(performance.now() - started.current);
            ref.current?.setAttribute('data-ko-render-ms', String(ms));
          });
        }}
      />
    </div>
  );
}

// Minimal shapes of the Immutable.js structures Swagger UI passes to `opsFilter`.
type ImmutableMap = { get(key: string): unknown };
type ImmutableList<T> = { filter(fn: (value: T) => boolean): ImmutableList<T>; size: number };
type TagGroup = ImmutableMap & { set(key: string, value: unknown): TagGroup };
type TaggedOps = {
  map(fn: (group: TagGroup, tag: string) => TagGroup): TaggedOps;
  filter(fn: (group: TagGroup) => boolean): TaggedOps;
};

/** Searches operations by method, path, summary, operation ID and tag (Swagger UI: tag only). */
function opsFilter(taggedOps: TaggedOps, phrase: string): TaggedOps {
  const words = searchWords(phrase);
  if (words.length === 0) return taggedOps;
  return taggedOps
    .map((group, tag) =>
      group.set(
        'operations',
        (group.get('operations') as ImmutableList<ImmutableMap>).filter((op) => {
          const operation = op.get('operation') as ImmutableMap | undefined;
          return matchesSearch(words, {
            tag,
            method: String(op.get('method')),
            path: String(op.get('path')),
            summary: operation?.get('summary'),
            operationId: operation?.get('operationId'),
          });
        }),
      ),
    )
    .filter((group) => (group.get('operations') as ImmutableList<unknown>).size > 0);
}

type FilterProps = {
  layoutSelectors: { currentFilter(): string | boolean };
  layoutActions: { updateFilter(value: string): void };
  specSelectors: { loadingStatus(): string };
};

/** Replaces Swagger UI's filter box, which has no label and only matches tags. */
function FilterContainer({ layoutSelectors, layoutActions, specSelectors }: FilterProps) {
  const id = useId();
  const current = layoutSelectors.currentFilter();
  if (current === false) return null;
  return (
    <div className="ko-search">
      <label htmlFor={id}>Search operations</label>
      <input
        id={id}
        type="search"
        placeholder="Path, method, summary, operation ID or tag"
        value={typeof current === 'string' ? current : ''}
        disabled={specSelectors.loadingStatus() === 'loading'}
        onChange={(e) => layoutActions.updateFilter(e.target.value)}
      />
    </div>
  );
}

const searchPlugin = { fn: { opsFilter }, components: { FilterContainer } };

/**
 * Hides the "Authorize" dialog and the lock buttons. `supportedSubmitMethods` only turns off
 * "Try it out": with security schemes in the spec, Swagger UI would still open the spec's
 * authorization URL in a popup and post what the reader types to the spec's token URL.
 */
const hidden = () => null;
const readOnlyPlugin = {
  components: {
    AuthorizeBtnContainer: hidden,
    authorizeBtn: hidden,
    authorizeOperationBtn: hidden,
    authorizationPopup: hidden,
    auths: hidden,
  },
};
