import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "../../../../shared/types/utils";
import { ToastContext, type ToastType } from "./ToastContext";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType, duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto min-w-[300px] max-w-sm rounded-lg shadow-lg border p-4 flex items-start gap-3 animate-in slide-in-from-right-full duration-300",
                "bg-panel border-border text-fg", // Base styles using theme tokens
              )}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-success-fg" />}
                {toast.type === "error" && <AlertCircle className="w-5 h-5 text-danger-fg" />}
                {toast.type === "loading" && <Loader2 className="w-5 h-5 text-accent animate-spin" />}
                {toast.type === "info" && <AlertCircle className="w-5 h-5 text-accent" />}
              </div>
              <div className="flex-1 text-sm leading-relaxed">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-muted hover:text-fg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
