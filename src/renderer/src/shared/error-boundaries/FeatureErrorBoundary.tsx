import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { api } from "@shared/api";
import { buildRuntimeErrorData, emitOperationalLog } from "@shared/logger";

interface Props {
  children: ReactNode;
  featureName?: string;
  onError?: (error: Error, info: ErrorInfo) => void;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

export class FeatureErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    resetKey: 0,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { featureName = "Unknown", onError } = this.props;

    emitOperationalLog(
      api?.logger,
      "error",
      `FeatureErrorBoundary [${featureName}] caught an error`,
      buildRuntimeErrorData({
        scope: "feature-error-boundary",
        kind: "react-boundary",
        error,
        meta: {
          featureName,
          componentStack: errorInfo.componentStack,
        },
      }),
    );

    onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      resetKey: prev.resetKey + 1,
    }));
  };

  public render() {
    const { hasError, error, resetKey } = this.state;
    const { children, featureName = "Feature", fallback } = this.props;

    if (hasError) {
      if (fallback) return fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center h-full min-h-[160px] bg-panel rounded-lg border border-border/50">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-danger/10 text-danger shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold text-fg">
              {featureName} 영역에서 오류가 발생했습니다
            </p>
            {error && (
              <p
                className="text-xs text-muted font-mono truncate max-w-[280px]"
                title={error.message}
              >
                {error.message}
              </p>
            )}
          </div>

          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-on-accent hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            다시 시도
          </button>
        </div>
      );
    }

    return (
      <div key={resetKey} className="contents">
        {children}
      </div>
    );
  }
}
