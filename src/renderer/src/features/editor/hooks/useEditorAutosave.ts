import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@shared/ui/ToastContext";
import { registerSaveBufferFlush } from "@shared/ui/saveBufferRegistry";
import { api } from "@shared/api";
import { EDITOR_AUTOSAVE_DEBOUNCE_MS } from "@shared/constants";
import { useEditorStatsStore } from "@renderer/features/editor/stores/editorStatsStore";

interface UseEditorAutosaveProps {
  onSave?: (title: string, content: string) => Promise<void> | void;
  title: string;
  content: string;
}

const RETRY_DELAYS = [1000, 2000, 5000];

const clearTimerRef = (timerRef: { current: NodeJS.Timeout | null }) => {
  const timer = timerRef.current;
  if (timer) clearTimeout(timer);
  timerRef.current = null;
};

export function useEditorAutosave({
  onSave,
  title,
  content,
}: UseEditorAutosaveProps) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error" | "unsaved"
  >("idle");

  // 🔐 Unmount guard — prevents setState after component is gone
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
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
  const currentSavePromiseRef = useRef<Promise<void> | null>(null);
  const lastSaveErrorRef = useRef<unknown>(null);
  const hasLastSaveErrorRef = useRef(false);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // ✅ Separate timer refs so each can be individually cleared
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performSaveRef = useRef<
    ((currentTitle: string, currentContent: string) => Promise<void>) | null
  >(null);

  const performSave = useCallback(
    async (currentTitle: string, currentContent: string) => {
      if (!onSave) return;

      if (isSaveInFlightRef.current) {
        pendingDraftRef.current = {
          title: latestDraftRef.current.title,
          content: latestDraftRef.current.content,
        };
        return;
      }

      if (
        currentTitle === lastSavedRef.current.title &&
        currentContent === lastSavedRef.current.content
      ) {
        return;
      }

      isSaveInFlightRef.current = true;

      if (isMountedRef.current) setSaveStatus("saving");
      let savePromise: Promise<void> | null = null;
      try {
        savePromise = Promise.resolve(onSave(currentTitle, currentContent));
        currentSavePromiseRef.current = savePromise;
        await savePromise;
        lastSaveErrorRef.current = null;
        hasLastSaveErrorRef.current = false;
        lastSavedRef.current = { title: currentTitle, content: currentContent };
        retryCount.current = 0;
        const latestDraft = latestDraftRef.current;
        const isLatestDraftSaved =
          latestDraft.title === currentTitle &&
          latestDraft.content === currentContent;
        api.lifecycle?.setDirty?.(!isLatestDraftSaved);

        if (!isMountedRef.current) return;

        setSaveStatus("saved");

        // Removed idle reset logic so "saved" status stays visible
      } catch (error) {
        api.logger.error("Autosave failed", error);

        const latestDraft = latestDraftRef.current;
        const stillLatestDraft =
          latestDraft.title === currentTitle &&
          latestDraft.content === currentContent;
        if (stillLatestDraft) {
          lastSaveErrorRef.current = error;
          hasLastSaveErrorRef.current = true;
        }

        if (!isMountedRef.current) return;
        setSaveStatus("error");

        if (retryCount.current < RETRY_DELAYS.length) {
          const delay = RETRY_DELAYS[retryCount.current];
          retryCount.current++;
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
        if (currentSavePromiseRef.current === savePromise) {
          currentSavePromiseRef.current = null;
        }
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
    const previousDraft = latestDraftRef.current;
    latestDraftRef.current = { title, content };
    if (title !== previousDraft.title || content !== previousDraft.content) {
      lastSaveErrorRef.current = null;
      hasLastSaveErrorRef.current = false;
    }

    if (!onSave) return;

    if (
      title === lastSavedRef.current.title &&
      content === lastSavedRef.current.content
    ) {
      api.lifecycle?.setDirty?.(false);
      setSaveStatus("saved");
      return;
    }

    api.lifecycle?.setDirty?.(true);
    setSaveStatus("unsaved");

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      void performSave(title, content);
    }, EDITOR_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [title, content, onSave, performSave]);

  const flushLatestDraft = useCallback(async () => {
    clearTimerRef(debounceTimerRef);
    clearTimerRef(retryTimerRef);

    for (;;) {
      const currentSave = currentSavePromiseRef.current;
      if (currentSave) {
        // The flush barrier must drain each save cycle before observing the next.
        // eslint-disable-next-line no-await-in-loop
        await currentSave.catch(() => undefined);
        continue;
      }

      if (hasLastSaveErrorRef.current) {
        clearTimerRef(retryTimerRef);
        throw lastSaveErrorRef.current;
      }

      if (!isMountedRef.current) return;

      const latest = latestDraftRef.current;
      if (
        latest.title === lastSavedRef.current.title &&
        latest.content === lastSavedRef.current.content
      ) {
        return;
      }

      if (!onSaveRef.current) return;

      // A newer draft may arrive while this save is in flight.
      // eslint-disable-next-line no-await-in-loop
      await performSaveRef.current?.(latest.title, latest.content);
    }
  }, []);

  useEffect(
    () => registerSaveBufferFlush(flushLatestDraft),
    [flushLatestDraft],
  );

  // ✅ Full cleanup on unmount: cancel ALL pending timers + reset retry state
  useEffect(() => {
    return () => {
      clearTimerRef(debounceTimerRef);
      clearTimerRef(idleResetTimerRef);
      clearTimerRef(retryTimerRef);
      isMountedRef.current = false;
      const latestDraft = latestDraftRef.current;
      if (
        onSaveRef.current &&
        (latestDraft.title !== lastSavedRef.current.title ||
          latestDraft.content !== lastSavedRef.current.content)
      ) {
        void performSaveRef.current?.(latestDraft.title, latestDraft.content);
      }
      retryCount.current = 0;
    };
  }, []);

  return { saveStatus };
}
