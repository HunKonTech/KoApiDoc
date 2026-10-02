import { Component, createRef, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** A new value clears a caught error, e.g. when another spec is shown. */
  resetKey?: unknown;
};

type State = { error: Error | null; resetKey: unknown };

/**
 * Catches render errors of Swagger UI (e.g. an odd spec that parses but breaks the
 * renderer, or a failed chunk download) and shows a readable message instead of an
 * empty macro. The message gets the focus, so keyboard and screen reader users notice it.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };
  private readonly message = createRef<HTMLDivElement>();

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey === state.resetKey ? null : { error: null, resetKey: props.resetKey };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('KoApiDoc: rendering the specification failed', error, info.componentStack);
  }

  componentDidMount() {
    if (this.state.error) this.message.current?.focus();
  }

  componentDidUpdate(_: Props, prev: State) {
    if (this.state.error && !prev.error) this.message.current?.focus();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="ko-message ko-error" role="alert" tabIndex={-1} ref={this.message}>
        <strong>The specification could not be displayed</strong>
        <p>
          It was read without errors, but the renderer failed on its content. Check that the
          document follows the OpenAPI / Swagger structure, for example that every path maps to an
          object of operations.
        </p>
        <p className="ko-detail">Details: {error.message || error.name}</p>
      </div>
    );
  }
}
