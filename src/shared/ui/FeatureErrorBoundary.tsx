import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { api } from "@shared/api";

interface Props {
    children: ReactNode;
    /** Optional label shown in the error UI (e.g. "Editor", "Research") */
    featureName?: string;
    /** Called after the boundary catches an error – useful for telemetry */
    onError?: (error: Error, info: ErrorInfo) => void;
    /**
     * Custom compact fallback for small embedded regions.
     * If omitted a default panel-style fallback is shown.
     */
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    /** Bumping this forces a full re-mount of children on reset */
    resetKey: number;
}

/**
 * Feature-level error boundary.
 *
 * Unlike `GlobalErrorBoundary` (which replaces the whole app), this boundary
 * is designed to be placed **at the feature-slice level** (Editor, Research,
 * Settings…). When a render error occurs in the subtree it:
 *
 * 1. Logs the error to the main process via api.logger
 * 2. Shows a compact inline fallback for the affected slot only
 * 3. Offers a "Try Again" button that re-mounts children via key increment
 *
 * Usage:
 * ```tsx
 * <FeatureErrorBoundary featureName="Editor">
 *   <Editor … />
 * </FeatureErrorBoundary>
 * ```
 */
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

        api?.logger?.error(`FeatureErrorBoundary [${featureName}] caught an error`, {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
        });

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
            // Allow callers to supply a fully custom fallback
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
                            <p className="text-xs text-muted font-mono truncate max-w-[280px]" title={error.message}>
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

        // key prop forces full re-mount after reset
        return <div key={resetKey} className="contents">{children}</div>;
    }
}
