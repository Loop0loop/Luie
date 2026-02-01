import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { api } from "../../services/api";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // In a real app, log to Sentry/LogRocket here
    api?.logger?.error("GlobalErrorBoundary caught an error", error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-app text-fg p-8 text-center select-none">
          <div className="w-16 h-16 rounded-full bg-danger-fg/10 flex items-center justify-center mb-6 text-danger-fg">
            <AlertTriangle className="w-8 h-8" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted mb-8 max-w-md">
            The application encountered an unexpected error. We apologize for the inconvenience.
          </p>

          <div className="bg-panel border border-border rounded-lg p-4 mb-8 w-full max-w-lg text-left overflow-auto max-h-48">
            <code className="text-xs font-mono text-danger-fg block break-words">
              {this.state.error?.toString()}
            </code>
          </div>

          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-fg rounded-lg font-medium hover:opacity-90 transition-opacity"
            style={{ 
              backgroundColor: "var(--color-accent-bg)", 
              color: "var(--color-accent-fg)" 
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
