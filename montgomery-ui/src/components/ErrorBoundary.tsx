import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional fallback — if omitted the default recovery UI is shown */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary that prevents blank-page crashes.
 *
 * Catches:
 *  - React.lazy() chunk-load failures (network issues)
 *  - Runtime render errors in any child component
 *
 * Shows a recovery UI with Retry / Go Home buttons so the user
 * is never stuck on a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log for debugging — could send to an error reporting service
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isChunkError =
        this.state.error?.message?.includes('dynamically imported module') ||
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Failed to fetch') ||
        this.state.error?.message?.includes('Load failed') ||
        this.state.error?.message?.includes('error loading');

      return (
        <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in">
          <div className="glass-card max-w-md w-full p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />

            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isChunkError ? 'Connection Issue' : 'Something went wrong'}
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isChunkError
                ? 'The page could not be loaded. Please check your internet connection and try again.'
                : 'An unexpected error occurred while loading this page.'}
            </p>

            {this.state.error && !isChunkError && (
              <p className="text-xs text-red-400 bg-red-500/5 rounded-lg p-3 font-mono break-all">
                {this.state.error.message}
              </p>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
