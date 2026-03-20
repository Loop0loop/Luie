import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@shared/ui/ToastContext";
import { api } from "@shared/api";
import { EDITOR_AUTOSAVE_DEBOUNCE_MS } from "@shared/constants";
import { useEditorStatsStore } from "@renderer/features/editor/stores/editorStatsStore";

interface UseEditorAutosaveProps {
  onSave?: (title: string, content: string) => Promise<void> | void;
  title: string;
  content: string;
}

const RETRY_DELAYS = [1000, 2000, 5000];

export function useEditorAutosave({
  onSave,
  title,
  content,
}: UseEditorAutosaveProps) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // 🔐 Unmount guard — prevents setState after component is gone
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    useEditorStatsStore.getState().setSaveStatus(saveStatus);
  }, [saveStatus]);

  const lastSavedRef = useRef({ title, content });
  const latestDraftRef = useRef({ title, content });
  const retryCount = useRef(0);
  const isSaveInFlightRef = useRef(false);
  const pendingDraftRef = useRef<{ title: string; content: string } | null>(
    null,
  );

  // ✅ Separate timer refs so each can be individually cleared
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performSaveRef = useRef<
    ((currentTitle: string, currentContent: string) => void) | null
  >(null);

  const performSave = useCallback(
    async (currentTitle: string, currentContent: string) => {
      if (!onSave) return;
      // Guard: don't update state if unmounted
      if (!isMountedRef.current) return;

      if (isSaveInFlightRef.current) {
        pendingDraftRef.current = {
          title: latestDraftRef.current.title,
          content: latestDraftRef.current.content,
        };
        return;
      }

      isSaveInFlightRef.current = true;

      setSaveStatus("saving");
      try {
        await Promise.resolve(onSave(currentTitle, currentContent));

        if (!isMountedRef.current) return;

        lastSavedRef.current = { title: currentTitle, content: currentContent };
        setSaveStatus("saved");
        retryCount.current = 0;
        const latestDraft = latestDraftRef.current;
        const isLatestDraftSaved =
          latestDraft.title === currentTitle &&
          latestDraft.content === currentContent;
        api.lifecycle?.setDirty?.(!isLatestDraftSaved);

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
          const latestDraft = latestDraftRef.current;
          const stillLatestDraft =
            latestDraft.title === currentTitle &&
            latestDraft.content === currentContent;
          if (stillLatestDraft) {
            showToast(
              t("editor.autosave.retryingIn", { seconds: delay / 1000 }),
              "info",
              2000,
            );

            // ✅ Track retry timer so we can cancel on unmount
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
            retryTimerRef.current = setTimeout(() => {
              if (!isMountedRef.current) {
                return;
              }
              const latest = latestDraftRef.current;
              performSaveRef.current?.(latest.title, latest.content);
            }, delay);
          }
        } else {
          showToast(t("editor.autosave.failed"), "error");
        }
      } finally {
        isSaveInFlightRef.current = false;

        const pendingDraft = pendingDraftRef.current;
        if (pendingDraft) {
          pendingDraftRef.current = null;
          if (
            pendingDraft.title !== lastSavedRef.current.title ||
            pendingDraft.content !== lastSavedRef.current.content
          ) {
            void performSave(pendingDraft.title, pendingDraft.content);
          }
        }
      }
    },
    [onSave, showToast, t],
  );

  useEffect(() => {
    performSaveRef.current = performSave;
  }, [performSave]);

  // Debounced save trigger
  useEffect(() => {
    latestDraftRef.current = { title, content };

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
