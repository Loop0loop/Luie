import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../components/common/ToastContext";
import { api } from "../services/api";
import { EDITOR_AUTOSAVE_DEBOUNCE_MS } from "../../../shared/constants";
import { useEditorStore } from "../stores/editorStore";

interface UseEditorAutosaveProps {
  onSave?: (title: string, content: string) => Promise<void> | void;
  title: string;
  content: string;
}

const RETRY_DELAYS = [1000, 2000, 5000];

export function useEditorAutosave({ onSave, title, content }: UseEditorAutosaveProps) {
  const { showToast } = useToast();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  
  useEffect(() => {
    useEditorStore.getState().setSaveStatus(saveStatus);
  }, [saveStatus]);

  const lastSavedRef = useRef({ title, content });
  const retryCount = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const performSaveRef = useRef<((currentTitle: string, currentContent: string) => void) | null>(null);

  const performSave = useCallback(async (currentTitle: string, currentContent: string) => {
    if (!onSave) return;

    setSaveStatus("saving");
    try {
      await Promise.resolve(onSave(currentTitle, currentContent));
      lastSavedRef.current = { title: currentTitle, content: currentContent };
      setSaveStatus("saved");
      retryCount.current = 0;
      api.lifecycle?.setDirty?.(false);
      
      // Reset to idle after a delay for UI
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      api.logger.error("Autosave failed", error);
      setSaveStatus("error");

      if (retryCount.current < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[retryCount.current];
        retryCount.current++;
        showToast(`Save failed. Retrying in ${delay / 1000}s...`, "info", 2000);
        setTimeout(() => {
          performSaveRef.current?.(currentTitle, currentContent);
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
    
    // Don't save if nothing changed from LAST SUCCESSFUL save
    if (
      title === lastSavedRef.current.title &&
      content === lastSavedRef.current.content
    ) {
      api.lifecycle?.setDirty?.(false);
      return;
    }

    api.lifecycle?.setDirty?.(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      void performSave(title, content);
    }, EDITOR_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [title, content, onSave, performSave]);

  return { saveStatus };
}

