import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@shared/ui/ToastContext";
import { api } from "@shared/api";
import { EDITOR_AUTOSAVE_DEBOUNCE_MS } from "@shared/constants";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";

interface UseEditorAutosaveProps {
  onSave?: (title: string, content: string) => Promise<void> | void;
  title: string;
  content: string;
}

const RETRY_DELAYS = [1000, 2000, 5000];

export function useEditorAutosave({ onSave, title, content }: UseEditorAutosaveProps) {
  const { showToast } = useToast();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // 🔐 Unmount guard — prevents setState after component is gone
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    useEditorStore.getState().setSaveStatus(saveStatus);
  }, [saveStatus]);

  const lastSavedRef = useRef({ title, content });
  const retryCount = useRef(0);

  // ✅ Separate timer refs so each can be individually cleared
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performSaveRef = useRef<((currentTitle: string, currentContent: string) => void) | null>(null);

  const performSave = useCallback(async (currentTitle: string, currentContent: string) => {
    if (!onSave) return;
    // Guard: don't update state if unmounted
    if (!isMountedRef.current) return;

    setSaveStatus("saving");
    try {
      await Promise.resolve(onSave(currentTitle, currentContent));

      if (!isMountedRef.current) return;

      lastSavedRef.current = { title: currentTitle, content: currentContent };
      setSaveStatus("saved");
      retryCount.current = 0;
      api.lifecycle?.setDirty?.(false);

      // ✅ Track idle reset timer so we can cancel on unmount
      if (idleResetTimerRef.current) clearTimeout(idleResetTimerRef.current);
      idleResetTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setSaveStatus("idle");
      }, 2000);
    } catch (error) {
      api.logger.error("Autosave failed", error);

      if (!isMountedRef.current) return;
      setSaveStatus("error");

      if (retryCount.current < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[retryCount.current];
        retryCount.current++;
        showToast(`Save failed. Retrying in ${delay / 1000}s...`, "info", 2000);

        // ✅ Track retry timer so we can cancel on unmount
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            performSaveRef.current?.(currentTitle, currentContent);
          }
        }, delay);
      } else {
        showToast("Autosave failed. Check connection.", "error");
      }
    }
  }, [onSave, showToast]);

  useEffect(() => {
    performSaveRef.current = performSave;
  }, [performSave]);

  // Debounced save trigger
  useEffect(() => {
    if (!onSave) return;

    if (
      title === lastSavedRef.current.title &&
      content === lastSavedRef.current.content
    ) {
      api.lifecycle?.setDirty?.(false);
      return;
    }

    api.lifecycle?.setDirty?.(true);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      void performSave(title, content);
    }, EDITOR_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [title, content, onSave, performSave]);

  // ✅ Full cleanup on unmount: cancel ALL pending timers + reset retry state
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (idleResetTimerRef.current) clearTimeout(idleResetTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryCount.current = 0;
    };
  }, []);

  return { saveStatus };
}
