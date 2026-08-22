/**
 * Error Boundary.
 *
 * A failure in one component must never take down the application. Boundaries
 * are placed around the shell and around each routed page, so an isolated
 * rendering failure degrades to a recoverable error state.
 *
 * A class component is required: React exposes no hook equivalent of
 * `componentDidCatch`.
 */
import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { ErrorState } from "@components/feedback";

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

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public override state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidUpdate(previousProps: ErrorBoundaryProps): void {
    // Recover when the boundary's scope changes, typically on navigation.
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Reporting is intentionally not implemented: the monitoring provider is
    // connected in a later phase, and this boundary must not depend on it.
    void error;
    void errorInfo;
  }

  private readonly handleReset = (): void => {
    this.setState({ hasError: false });
  };

  public override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback(this.handleReset);

    return (
      <ErrorState
        titleKey="errors:boundary.title"
        descriptionKey="errors:boundary.description"
        onRetry={this.handleReset}
      />
    );
  }
}
