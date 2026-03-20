/**
 * 챕터 관리 (생성, 수정, 삭제, 선택)
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useShallow } from "zustand/react/shallow";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { api } from "@shared/api";
import { hasReadableLuieAttachment } from "@shared/projectAttachment";
import {
  consumePendingChapterNavigation,
  onChapterNavigationRequest,
} from "@renderer/features/workspace/services/chapterNavigation";

export function useChapterManagement() {
  const pendingChapterIdRef = useRef<string | null>(null);
  const lastSavedRef = useRef<{
    chapterId: string;
    title: string;
    content: string;
  } | null>(null);
  const currentProject = useProjectStore((state) => state.currentItem);
  const hasLuieAttachment = hasReadableLuieAttachment(currentProject);
  const {
    items: chapters,
    currentItem: currentChapter,
    setCurrent: setCurrentChapter,
    create: createChapter,
    update: updateChapter,
    delete: deleteChapter,
  } = useChapterStore(
    useShallow((state) => ({
      items: state.items,
      currentItem: state.currentItem,
      setCurrent: state.setCurrent,
      create: state.create,
      update: state.update,
      delete: state.delete,
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

  const activeChapterId = activeChapter?.id ?? null;

  const content = activeChapter?.content ?? "";

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
    },
    [chapters, currentChapter?.id, currentProject, setCurrentChapter],
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

    const nextChapter =
      chapters.find((chapter) => chapter.projectId === currentProject.id) ??
      null;
    if ((nextChapter?.id ?? null) !== (currentChapter?.id ?? null)) {
      setCurrentChapter(nextChapter);
    }
  }, [chapters, currentChapter, currentProject, setCurrentChapter]);

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

      if (created?.id && source.content) {
        await updateChapter({ id: created.id, content: source.content });
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
      const lastSaved = lastSavedRef.current;
      if (
        lastSaved &&
        lastSaved.chapterId === chapterId &&
        lastSaved.title === normalizedTitle &&
        lastSaved.content === newContent
      ) {
        return;
      }

      api.logger.info(`Saving: ${normalizedTitle}`);
      await updateChapter({
        id: chapterId,
        title: normalizedTitle,
        content: newContent,
      });

      lastSavedRef.current = {
        chapterId,
        title: normalizedTitle,
        content: newContent,
      };

      try {
        await api.autoSave(chapterId, newContent, currentProject.id);
      } catch (error) {
        api.logger.warn("Auto snapshot failed", error);
      }

      if (hasLuieAttachment) {
        api.logger.info("Luie package export scheduled", {
          projectId: currentProject.id,
        });
      }
    },
    [
      activeChapterId,
      updateChapter,
      currentProject,
      chapters,
      hasLuieAttachment,
    ],
  );

  const activeChapterTitle = activeChapter?.title || "";

  return {
    chapters,
    activeChapterId,
    content,
    activeChapterTitle,
    handleSelectChapter,
    handleAddChapter,
    handleRenameChapter,
    handleDuplicateChapter,
    handleDeleteChapter,
    handleSave,
  };
}
