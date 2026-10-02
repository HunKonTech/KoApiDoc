// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../../static/macro-ui/src/ErrorBoundary';

function Renderer({ fail }: { fail: boolean }) {
  if (fail) throw new TypeError("Cannot read properties of undefined (reading 'get')");
  return <div>rendered</div>;
}

beforeEach(() => {
  // React and the boundary log caught errors; keep the test output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders the children when nothing fails', () => {
    render(
      <ErrorBoundary>
        <Renderer fail={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('rendered')).toBeTruthy();
  });

  it('shows a readable, focused message instead of an empty macro', () => {
    render(
      <ErrorBoundary>
        <Renderer fail />
      </ErrorBoundary>,
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('The specification could not be displayed');
    expect(alert.textContent).toContain(
      "Details: Cannot read properties of undefined (reading 'get')",
    );
    expect(document.activeElement).toBe(alert);
    expect(console.error).toHaveBeenCalledWith(
      'KoApiDoc: rendering the specification failed',
      expect.any(TypeError),
      expect.any(String),
    );
  });

  it('handles thrown values that are not errors', () => {
    function Thrower(): never {
      throw 'plain string';
    }
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert').textContent).toContain('Details: plain string');
  });

  it('tries again when the reset key changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="broken spec">
        <Renderer fail />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeTruthy();

    // Same key: the error stays, even if the children would render now.
    rerender(
      <ErrorBoundary resetKey="broken spec">
        <Renderer fail={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeTruthy();

    rerender(
      <ErrorBoundary resetKey="fixed spec">
        <Renderer fail={false} />
      </ErrorBoundary>,
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('rendered')).toBeTruthy();
  });
});
