import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ConfirmDialog, PromptDialog } from "./Modal";
import { useToast, type ToastType } from "./ToastContext";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
};

type PromptOptions = {
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type DialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  toast: (message: string, type: ToastType, duration?: number) => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const [promptState, setPromptState] = useState<PromptOptions | null>(null);

  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);
  const promptResolveRef = useRef<((value: string | null) => void) | null>(null);

  const closeConfirm = useCallback((result: boolean) => {
    setConfirmState(null);
    confirmResolveRef.current?.(result);
    confirmResolveRef.current = null;
  }, []);

  const closePrompt = useCallback((result: string | null) => {
    setPromptState(null);
    promptResolveRef.current?.(result);
    promptResolveRef.current = null;
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState(options);
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      promptResolveRef.current = resolve;
      setPromptState(options);
    });
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType, duration?: number) => {
      showToast(message, type, duration);
    },
    [showToast],
  );

  useEffect(() => {
    return () => {
      confirmResolveRef.current?.(false);
      confirmResolveRef.current = null;
      promptResolveRef.current?.(null);
      promptResolveRef.current = null;
    };
  }, []);

  const contextValue = useMemo<DialogContextValue>(
    () => ({
      confirm,
      prompt,
      toast,
    }),
    [confirm, prompt, toast],
  );

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
      <ConfirmDialog
        isOpen={Boolean(confirmState)}
        title={confirmState?.title ?? ""}
        message={confirmState?.message ?? ""}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        isDestructive={confirmState?.isDestructive}
        onConfirm={() => closeConfirm(true)}
        onCancel={() => closeConfirm(false)}
      />
      <PromptDialog
        isOpen={Boolean(promptState)}
        title={promptState?.title ?? ""}
        message={promptState?.message}
        defaultValue={promptState?.defaultValue}
        placeholder={promptState?.placeholder}
        confirmLabel={promptState?.confirmLabel}
        cancelLabel={promptState?.cancelLabel}
        onConfirm={(value) => closePrompt(value)}
        onCancel={() => closePrompt(null)}
      />
    </DialogContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}
