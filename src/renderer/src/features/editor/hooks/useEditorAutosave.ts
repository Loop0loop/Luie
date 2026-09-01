import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@shared/ui/ToastContext";
import { registerSaveBufferFlush } from "@shared/ui/saveBufferRegistry";
import { api } from "@shared/api";
import { EDITOR_AUTOSAVE_DEBOUNCE_MS } from "@shared/constants";
import { useEditorStatsStore } from "@renderer/features/editor/stores/editorStatsStore";

interface UseEditorAutosaveProps {
  onSave?: (
    title: string,
    content: string,
    chapterId?: string,
  ) => Promise<void> | void;
  title: string;
  content: string;
  /** 현재 에디터가 표시 중인 챕터. 저장 대상 라우팅과 전환 감지에 쓴다. */
  chapterId?: string;
  /**
   * 챕터 전환 중(새 본문 미도착) true. 이 창에서 저장이 발화하면 "옛 본문을 새
   * 챕터에 쓰는" 데이터 손실이 생기므로 자동/수동 저장을 모두 무시한다.
   */
  suppressed?: boolean;
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
  chapterId,
  suppressed = false,
}: UseEditorAutosaveProps) {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error" | "unsaved"
  >("idle");

  // NOTE: unmount 이후 완료되는 save가 state를 갱신하지 않게 막는다.
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

  // NOTE: 저장이 "어느 챕터의 draft인지"는 챕터가 바뀌기 전까지 유지돼야 한다.
  // 전환 커밋 이후 effect가 다시 실행되기 전의 draft는 이전 챕터의 것이다.
  const savedChapterRef = useRef<string | undefined>(chapterId);
  const suppressedRef = useRef(suppressed);

  useEffect(() => {
    suppressedRef.current = suppressed;
  }, [suppressed]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performSaveRef = useRef<
    (
      currentTitle: string,
      currentContent: string,
      targetChapterId?: string,
    ) => Promise<void>
  >(null);

  const performSave = useCallback(
    async (
      currentTitle: string,
      currentContent: string,
      targetChapterId?: string,
    ) => {
      if (!onSave) return;
      // 전환 창 억제는 "대상 불명의 저장"(옛 본문이 store의 새 챕터로 향하는 경로)만
      // 막는다. 직전 챕터를 명시하는 전환 flush는 데이터 손실 방지 장치라 허용한다.
      if (suppressedRef.current && targetChapterId === undefined) return;

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
        // NOTE: targetChapterId가 없으면 "이 draft가 마지막으로 유효했던 챕터"로
        // 저장한다. 전환 직후 콜백이 store의 새 챕터를 읽어버리는 것을 막는 3번째
        // 인자 라우팅이다. 대상 챕터가 없는 에디터(스냅샷 뷰어 등)는 기존 2인자
        // 호출 모양을 유지한다.
        const resolvedChapterId = targetChapterId ?? savedChapterRef.current;
        savePromise =
          resolvedChapterId === undefined
            ? Promise.resolve(onSave(currentTitle, currentContent))
            : Promise.resolve(
                onSave(currentTitle, currentContent, resolvedChapterId),
              );
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

  useEffect(() => {
    const previousDraft = latestDraftRef.current;
    latestDraftRef.current = { title, content };
    if (title !== previousDraft.title || content !== previousDraft.content) {
      lastSaveErrorRef.current = null;
      hasLastSaveErrorRef.current = false;
    }

    if (!onSave) return;

    // 전환 창에서는 타이머를 포함해 모든 저장 활동을 멈춘다. 새 본문 도착(suppressed
    // 해제) 후 마지막 저장 기준과 다르면 그때 다시 판정한다.
    if (suppressed) {
      clearTimerRef(debounceTimerRef);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 전환 창 진입은 상태 전환 자체다. 푸터가 "unsaved"로 남아 새 챕터 기준 오경고를 내는 걸 막는다.
      setSaveStatus("idle");
      return;
    }

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
  }, [title, content, onSave, performSave, suppressed]);

  // NOTE: 챕터 전환 커밋에서 "직전 챕터의 미저장 분"을 그 챕터로 즉시 저장한다.
  // store의 activeChapter는 이미 새 챕터라, 3번째 인자로 직전 챕터를 명시하지
  // 않으면 옛 본문이 새 챕터를 덮어쓴다. debounce effect보다 아래에 있어야 같은
  // 커밋에서 나중에 실행된다.
  useEffect(() => {
    if (savedChapterRef.current === chapterId) return;
    const previousChapterId = savedChapterRef.current;
    savedChapterRef.current = chapterId;

    clearTimerRef(debounceTimerRef);
    clearTimerRef(retryTimerRef);

    const latest = latestDraftRef.current;
    const hasUnsavedChanges =
      latest.title !== lastSavedRef.current.title ||
      latest.content !== lastSavedRef.current.content;
    if (onSaveRef.current && previousChapterId && hasUnsavedChanges) {
      void performSaveRef.current?.(
        latest.title,
        latest.content,
        previousChapterId,
      );
    }
    // 전환 창(suppressed) 동안 draft 판정이 다시 발화하지 않게 기준을 맞춘다.
    lastSavedRef.current = { title: latest.title, content: latest.content };
  }, [chapterId]);

  const flushLatestDraft = useCallback(async () => {
    // 전환 창에서의 수동 저장은 옛 본문을 새 챕터에 쓸 위험이 있어 무시한다.
    if (suppressedRef.current) return;
    clearTimerRef(debounceTimerRef);
    clearTimerRef(retryTimerRef);

    for (;;) {
      const currentSave = currentSavePromiseRef.current;
      if (currentSave) {
        // eslint-disable-next-line no-await-in-loop -- 다음 draft를 확인하기 전에 현재 save cycle을 끝내야 한다.
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

      // eslint-disable-next-line no-await-in-loop -- save 중 들어온 최신 draft까지 순차 반영해야 한다.
      await performSaveRef.current?.(latest.title, latest.content);
    }
  }, []);

  useEffect(
    () => registerSaveBufferFlush(flushLatestDraft),
    [flushLatestDraft],
  );

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
