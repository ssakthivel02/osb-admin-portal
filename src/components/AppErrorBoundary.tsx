import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  readonly children: ReactNode;
  readonly onError?: (error: Error, info: ErrorInfo) => void;
}

interface AppErrorBoundaryState {
  readonly hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  public override state: AppErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="app-shell" id="main-content" tabIndex={-1}>
          <section className="status-card" role="alert" aria-labelledby="error-title">
            <div>
              <p className="eyebrow">Application recovery</p>
              <h1 id="error-title">The portal could not finish loading.</h1>
              <p>
                No data was changed. Reload the page to retry. If the problem continues,
                capture the time and browser details for support.
              </p>
              <button
                className="button button--primary"
                type="button"
                onClick={() => window.location.reload()}
              >
                Reload portal
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
