/**
 * Error Boundary.
 *
 * A failure in one component must never take down the application. Boundaries
 * are placed around the shell, around the route table, and around the
 * dashboard's content outlet, so an isolated rendering failure degrades to a
 * recoverable error state while the header and navigation keep working.
 *
 * A class component is required: React exposes no hook equivalent of
 * `componentDidCatch`.
 *
 * Stale-tab recovery — "Try again" must actually recover:
 *  - A route chunk that could not be loaded (a tab left open across a
 *    deploy, or a network drop) cannot be retried in place: `React.lazy`
 *    caches the rejected import for the life of the page. The only correct
 *    recovery is loading the current build, so the boundary says Atlas was
 *    updated and its button reloads — automatically when the connection
 *    comes back if the person was offline. (`lazyWithRetry` already retried
 *    and reloaded once before the error got here.)
 *  - Any other error: "Try again" clears the failed queries' error state
 *    and REMOUNTS the section (a new key), so it renders from scratch
 *    instead of re-throwing the same state. A section that fails again
 *    straight away twice is not going to recover by itself; the boundary
 *    then offers a full reload instead of looping.
 */
import { Component, Fragment } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorState } from '@components/feedback';
import { isChunkLoadError } from '@utils/lazy-with-retry.utils';

/** Remounts after which the fallback offers a full reload instead. */
const MAX_IN_PLACE_RETRIES = 2;

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
  /**
   * Changing this value resets the boundary. The router passes the current
   * location so navigating away from a failed page recovers automatically.
   */
  readonly resetKey?: string;
  /** Custom fallback. Receives a function that clears the error. */
  readonly fallback?: (reset: () => void) => ReactNode;
}

interface InnerProps extends ErrorBoundaryProps {
  /** Clears TanStack Query's error state for queries under this boundary. */
  readonly onReset: () => void;
}

interface ErrorBoundaryState {
  readonly error: unknown;
  readonly hasError: boolean;
  /** Bumped on every in-place retry: the children's key, so they remount. */
  readonly attempt: number;
  /** In-place retries since the last successful render or navigation. */
  readonly retries: number;
}

function reloadPage(): void {
  window.location.reload();
}

class ErrorBoundaryInner extends Component<InnerProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    error: null,
    hasError: false,
    attempt: 0,
    retries: 0,
  };

  public static getDerivedStateFromError(
    error: unknown
  ): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public override componentDidUpdate(previousProps: InnerProps): void {
    // Recover when the boundary's scope changes, typically on navigation.
    if (previousProps.resetKey !== this.props.resetKey) {
      if (this.state.hasError) {
        this.props.onReset();
        this.setState((state) => ({
          hasError: false,
          error: null,
          attempt: state.attempt + 1,
          retries: 0,
        }));
      } else if (this.state.retries !== 0) {
        this.setState({ retries: 0 });
      }
    }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Reporting is intentionally not implemented: the monitoring provider is
    // connected in a later phase, and this boundary must not depend on it.
    void error;
    void errorInfo;
  }

  public override componentWillUnmount(): void {
    window.removeEventListener('online', reloadPage);
  }

  private readonly handleRetry = (): void => {
    this.props.onReset();
    this.setState((state) => ({
      hasError: false,
      error: null,
      attempt: state.attempt + 1,
      retries: state.retries + 1,
    }));
  };

  public override render(): ReactNode {
    if (!this.state.hasError) {
      return (
        <Fragment key={this.state.attempt}>{this.props.children}</Fragment>
      );
    }

    if (this.props.fallback) return this.props.fallback(this.handleRetry);

    if (isChunkLoadError(this.state.error)) {
      const offline =
        typeof navigator !== 'undefined' && navigator.onLine === false;
      if (offline) {
        // Back online → load the current build where the person is.
        window.removeEventListener('online', reloadPage);
        window.addEventListener('online', reloadPage, { once: true });
      }
      return (
        <ErrorState
          titleKey={
            offline
              ? 'errors:boundary.offlineTitle'
              : 'errors:boundary.updatedTitle'
          }
          descriptionKey={
            offline
              ? 'errors:boundary.offlineDescription'
              : 'errors:boundary.updatedDescription'
          }
          retryLabelKey="errors:boundary.reload"
          onRetry={reloadPage}
        />
      );
    }

    if (this.state.retries >= MAX_IN_PLACE_RETRIES) {
      return (
        <ErrorState
          titleKey="errors:boundary.title"
          descriptionKey="errors:boundary.persistentDescription"
          retryLabelKey="errors:boundary.reload"
          onRetry={reloadPage}
        />
      );
    }

    return (
      <ErrorState
        titleKey="errors:boundary.title"
        descriptionKey="errors:boundary.description"
        onRetry={this.handleRetry}
      />
    );
  }
}

export function ErrorBoundary(props: ErrorBoundaryProps): JSX.Element {
  const { reset } = useQueryErrorResetBoundary();
  return <ErrorBoundaryInner {...props} onReset={reset} />;
}
