export type ChapterNavigationPayload = {
  chapterId: string;
  query?: string;
};

const CHAPTER_NAV_EVENT = "luie:chapter-navigation";
const PENDING_CHAPTER_NAV_KEY = "luie:pending-chapter-navigation";
const PENDING_EDITOR_FOCUS_KEY = "luie:pending-editor-focus";

const canUseWindow = () => typeof window !== "undefined";

export const consumePendingChapterNavigation = (): ChapterNavigationPayload | null => {
  if (!canUseWindow()) return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_CHAPTER_NAV_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PENDING_CHAPTER_NAV_KEY);
    const parsed = JSON.parse(raw) as Partial<ChapterNavigationPayload>;
    if (!parsed.chapterId || typeof parsed.chapterId !== "string") return null;
    return {
      chapterId: parsed.chapterId,
      query: typeof parsed.query === "string" ? parsed.query : undefined,
    };
  } catch {
    return null;
  }
};

export const requestChapterNavigation = (payload: ChapterNavigationPayload): void => {
  if (!canUseWindow()) return;
  try {
    window.sessionStorage.setItem(PENDING_CHAPTER_NAV_KEY, JSON.stringify(payload));
    if (payload.query && payload.chapterId) {
      window.sessionStorage.setItem(
        PENDING_EDITOR_FOCUS_KEY,
        JSON.stringify({ chapterId: payload.chapterId, query: payload.query }),
      );
    }
  } catch {
    // ignore session storage failures
  }

  window.dispatchEvent(
    new CustomEvent<ChapterNavigationPayload>(CHAPTER_NAV_EVENT, {
      detail: payload,
    }),
  );
};

export const onChapterNavigationRequest = (
  handler: (payload: ChapterNavigationPayload) => void,
): (() => void) => {
  if (!canUseWindow()) return () => {};
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<ChapterNavigationPayload>;
    if (!customEvent.detail?.chapterId) return;
    handler(customEvent.detail);
  };
  window.addEventListener(CHAPTER_NAV_EVENT, listener as EventListener);
  return () => {
    window.removeEventListener(CHAPTER_NAV_EVENT, listener as EventListener);
  };
};

export const consumePendingEditorFocusQuery = (
  chapterId: string,
): string | null => {
  if (!canUseWindow()) return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_EDITOR_FOCUS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { chapterId?: string; query?: string };
    if (parsed.chapterId !== chapterId || typeof parsed.query !== "string") {
      return null;
    }
    window.sessionStorage.removeItem(PENDING_EDITOR_FOCUS_KEY);
    return parsed.query;
  } catch {
    return null;
  }
};
