import { useCallback, useEffect, useMemo, useRef } from "react";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import {
  ensureChapterContent,
  peekChapterContent,
  setChapterContent,
} from "@renderer/features/manuscript/stores/chapterContentStore";
import { useShallow } from "zustand/react/shallow";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { api } from "@shared/api";
import type { ChapterListItem } from "@shared/types";
import {
  consumePendingChapterNavigation,
  onChapterNavigationRequest,
} from "@renderer/features/workspace/services/chapterNavigation";
import { useProjectLayoutStore } from "@renderer/features/workspace/stores/projectLayoutStore";

export function useChapterManagement() {
  const pendingChapterIdRef = useRef<string | null>(null);
  const lastSavedRef = useRef<{
    chapterId: string;
    title: string;
    content: string;
  } | null>(null);
  const currentProject = useProjectStore((state) => state.currentItem);
  const {
    items: chapters,
    currentItem: currentChapter,
    setCurrent: setCurrentChapter,
    create: createChapter,
    update: updateChapter,
    delete: deleteChapter,
    applyOptimisticTitle,
  } = useChapterStore(
    useShallow((state) => ({
      items: state.items,
      currentItem: state.currentItem,
      setCurrent: state.setCurrent,
      create: state.create,
      update: state.update,
      delete: state.delete,
      applyOptimisticTitle: state.applyOptimisticTitle,
    })),
  );

  const projectChapters = useMemo(
    () => chapters.filter((c) => c.projectId === currentProject?.id),
    [chapters, currentProject?.id],
  );

  const activeChapter = useMemo(() => {
    if (
      currentChapter &&
      currentChapter.projectId === currentProject?.id &&
      projectChapters.some((chapter) => chapter.id === currentChapter.id)
    ) {
      return (
        projectChapters.find((chapter) => chapter.id === currentChapter.id) ??
        currentChapter
      );
    }

    return projectChapters[0];
  }, [currentChapter, currentProject?.id, projectChapters]);

  const upsertProjectLayout = useProjectLayoutStore((state) => state.upsertProjectLayout);
  const getProjectLayout = useProjectLayoutStore((state) => state.getProjectLayout);

  const activeChapterId = activeChapter?.id ?? null;

  // NOTE: 본문은 여기서 반환하지 않는다. 이 훅은 사이드바를 포함해 20곳 이상에서 쓰이는데
  // 본문을 반환하면 목록만 그리는 컴포넌트까지 본문 변경에 리렌더된다. 본문이 필요한
  // 화면은 `useChapterContent(chapterId)`로 직접 구독한다.

  const handleSelectChapter = useCallback(
    (id: string) => {
      if (!currentProject) {
        pendingChapterIdRef.current = id;
        return;
      }

      const target = chapters.find(
        (chapter) =>
          chapter.id === id && chapter.projectId === currentProject.id,
      );

      if (!target) {
        pendingChapterIdRef.current = id;
        api.logger.warn("handleSelectChapter: target chapter not found", {
          chapterId: id,
          currentProjectId: currentProject.id,
        });
        return;
      }

      pendingChapterIdRef.current = null;
      if (currentChapter?.id === target.id) {
        return;
      }
      setCurrentChapter(target);

      upsertProjectLayout(currentProject.id, {
        editor: {
          activeChapterId: target.id,
          scrollYByChapter: getProjectLayout(currentProject.id).editor.scrollYByChapter,
        },
      });
    },
    [chapters, currentChapter?.id, currentProject, setCurrentChapter, upsertProjectLayout, getProjectLayout],
  );

  useEffect(() => {
    const pending = consumePendingChapterNavigation();
    if (pending?.chapterId) {
      handleSelectChapter(pending.chapterId);
    }

    return onChapterNavigationRequest((payload) => {
      if (!payload.chapterId) return;
      handleSelectChapter(payload.chapterId);
    });
  }, [handleSelectChapter]);

  useEffect(() => {
    if (!currentProject) {
      lastSavedRef.current = null;
      if (currentChapter) {
        setCurrentChapter(null);
      }
      return;
    }

    const pendingChapterId = pendingChapterIdRef.current;
    if (pendingChapterId) {
      const pendingTarget = chapters.find(
        (chapter) =>
          chapter.id === pendingChapterId &&
          chapter.projectId === currentProject.id,
      );
      if (pendingTarget) {
        pendingChapterIdRef.current = null;
        if (currentChapter?.id !== pendingTarget.id) {
          setCurrentChapter(pendingTarget);
        }
        return;
      }
    }

    const isCurrentChapterValid =
      currentChapter?.projectId === currentProject.id &&
      chapters.some((chapter) => chapter.id === currentChapter.id);

    if (isCurrentChapterValid) {
      return;
    }

    const savedLayout = getProjectLayout(currentProject.id);
    const persistedChapterId = savedLayout.editor.activeChapterId;
    let nextChapter: ChapterListItem | null = null;
    
    if (persistedChapterId) {
      nextChapter = chapters.find((chapter) => chapter.projectId === currentProject.id && chapter.id === persistedChapterId) ?? null;
    }
    
    if (!nextChapter) {
      nextChapter = chapters.find((chapter) => chapter.projectId === currentProject.id) ?? null;
    }
    
    if ((nextChapter?.id ?? null) !== (currentChapter?.id ?? null)) {
      setCurrentChapter(nextChapter);
    }
  }, [chapters, currentChapter, currentProject, setCurrentChapter, getProjectLayout]);

  const handleAddChapter = useCallback(async () => {
    if (!currentProject) {
      api.logger.error("No project selected");
      return;
    }

    const created = await createChapter({
      projectId: currentProject.id,
      title: `Chapter ${projectChapters.length + 1}`,
    });
    if (created) {
      setCurrentChapter(created);
    }
  }, [
    currentProject,
    createChapter,
    projectChapters.length,
    setCurrentChapter,
  ]);

  const handleRenameChapter = useCallback(
    async (id: string, title: string) => {
      await updateChapter({ id, title });
    },
    [updateChapter],
  );

  const handleDuplicateChapter = useCallback(
    async (id: string) => {
      if (!currentProject) {
        api.logger.error("No project selected");
        return;
      }

      const source = projectChapters.find((c) => c.id === id);
      if (!source) {
        return;
      }

      const created = await createChapter({
        projectId: currentProject.id,
        title: `${source.title} Copy`,
      });

      // NOTE: 복제는 원본 본문을 필요로 하므로 캐시를 채운 뒤 읽는다. 목록에는 본문이 없어
      // 폴백할 곳이 없다 — 조회가 실패하면 본문 없이 복제하고, 사용자가 원본을 다시 열면
      // 캐시가 채워진다. 빈 본문으로 원본을 덮어쓰는 경로는 없다(새로 만든 챕터에만 쓴다).
      await ensureChapterContent(source.id);
      const sourceContent = peekChapterContent(source.id) ?? "";

      if (created?.id && sourceContent) {
        await updateChapter({ id: created.id, content: sourceContent });
      }

      if (created) {
        setCurrentChapter(created);
      }
    },
    [
      projectChapters,
      currentProject,
      createChapter,
      updateChapter,
      setCurrentChapter,
    ],
  );

  const handleDeleteChapter = useCallback(
    async (id: string) => {
      const chaptersInCurrentProject = chapters.filter(
        (chapter) => chapter.projectId === currentProject?.id,
      );
      const currentIndex = chaptersInCurrentProject.findIndex(
        (chapter) => chapter.id === id,
      );
      const remaining = chaptersInCurrentProject.filter(
        (chapter) => chapter.id !== id,
      );
      const deletingActiveChapter = activeChapterId === id;

      await deleteChapter(id);

      if (deletingActiveChapter) {
        const nextIndex = Math.min(currentIndex, remaining.length - 1);
        const fallback = nextIndex >= 0 ? remaining[nextIndex] : null;
        setCurrentChapter(fallback ?? null);
      }
    },
    [
      chapters,
      currentProject?.id,
      deleteChapter,
      activeChapterId,
      setCurrentChapter,
    ],
  );

  const handleSave = useCallback(
    async (title: string, newContent: string, targetChapterId?: string) => {
      if (!currentProject) return;

      const chapterId = targetChapterId ?? activeChapterId;
      if (!chapterId) return;

      const chapterBelongsToCurrentProject = chapters.some(
        (c) => c.id === chapterId && c.projectId === currentProject.id,
      );

      if (!chapterBelongsToCurrentProject) {
        api.logger.warn(
          "handleSave: Blocked stale chapter save after project switch",
          {
            chapterId,
            currentProjectId: currentProject.id,
          },
        );
        return;
      }

      const chapterForSave = chapters.find((c) => c.id === chapterId) ?? null;
      const fallbackTitle = chapterForSave?.title ?? "";

      const normalizedTitle = title.trim() || fallbackTitle;
      const previousTitle = chapterForSave?.title ?? "";
      // NOTE: 변경 감지 기준은 본문 캐시다. 목록에는 본문이 없으므로 캐시가 유일한 출처다.
      // 캐시가 비어 있으면(아직 로딩 전) 빈 문자열과 비교되는데, 이때 Editor는 로딩 게이트에
      // 걸려 마운트되지 않으므로 저장이 발화하지 않는다.
      const previousContent = peekChapterContent(chapterId) ?? "";
      const lastSaved = lastSavedRef.current;
      if (
        lastSaved &&
        lastSaved.chapterId === chapterId &&
        lastSaved.title === normalizedTitle &&
        lastSaved.content === newContent
      ) {
        return;
      }

      if (newContent !== previousContent) {
        // NOTE: 캐시가 화면이 읽는 본문의 출처이므로 optimistic 갱신에 반드시 포함한다.
        // 빠지면 저장 직후 다른 챕터를 갔다 돌아왔을 때 이전 본문이 보인다.
        //
        // WARNING: 본문을 목록 store(`items`)에도 쓰면 안 된다. 자동 저장마다 items 배열
        // 참조가 바뀌어 사이드바를 포함한 모든 목록 구독자가 리렌더된다(O2).
        setChapterContent(chapterId, newContent);
      }

      if (normalizedTitle !== previousTitle) {
        applyOptimisticTitle(chapterId, normalizedTitle);
      }

      if (normalizedTitle !== previousTitle) {
        await updateChapter({
          id: chapterId,
          title: normalizedTitle,
        });
      }

      lastSavedRef.current = {
        chapterId,
        title: normalizedTitle,
        content: newContent,
      };

      void api
        .autoSave(chapterId, newContent, currentProject.id)
        .then((response) => {
          if (!response.success) {
            api.logger.warn("Auto-save enqueue failed", {
              chapterId,
              projectId: currentProject.id,
              error: response.error,
            });
          }
        })
        .catch((error) => {
          api.logger.warn("Auto-save enqueue failed", {
            chapterId,
            projectId: currentProject.id,
            error,
          });
        });

    },
    [
      activeChapterId,
      updateChapter,
      currentProject,
      chapters,
      applyOptimisticTitle,
    ],
  );

  const activeChapterTitle = activeChapter?.title || "";

  return {
    chapters,
    activeChapterId,
    activeChapterTitle,
    handleSelectChapter,
    handleAddChapter,
    handleRenameChapter,
    handleDuplicateChapter,
    handleDeleteChapter,
    handleSave,
  };
}
