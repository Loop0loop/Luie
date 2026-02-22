/**
 * 챕터 관리 (생성, 수정, 삭제, 선택)
 */

import { useState, useCallback } from "react";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { LUIE_PACKAGE_EXTENSION } from "@shared/constants";
import { api } from "@shared/api";

export function useChapterManagement() {
  const [requestedChapterId, setRequestedChapterId] = useState<string | null>(null);

  const { currentItem: currentProject } = useProjectStore();
  const {
    items: chapters,
    create: createChapter,
    update: updateChapter,
    delete: deleteChapter,
  } = useChapterStore();

  const activeChapterId =
    requestedChapterId && chapters.some((c) => c.id === requestedChapterId)
      ? requestedChapterId
      : (chapters[0]?.id ?? null);

  const activeChapter = activeChapterId
    ? chapters.find((c) => c.id === activeChapterId)
    : undefined;

  const content = activeChapter?.content ?? "";

  const handleSelectChapter = useCallback((id: string) => {
    setRequestedChapterId(id);
  }, []);

  const handleAddChapter = useCallback(async () => {
    if (!currentProject) {
      api.logger.error("No project selected");
      return;
    }

    await createChapter({
      projectId: currentProject.id,
      title: `Chapter ${chapters.length + 1}`,
    });
  }, [currentProject, createChapter, chapters.length]);

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

      const source = chapters.find((c) => c.id === id);
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
    },
    [chapters, currentProject, createChapter, updateChapter],
  );

  const handleDeleteChapter = useCallback(
    async (id: string) => {
      await deleteChapter(id);
      if (activeChapterId === id) {
        const remaining = chapters.filter((c) => c.id !== id);
        setRequestedChapterId(remaining[0]?.id ?? null);
      }
    },
    [deleteChapter, activeChapterId, chapters],
  );

  const handleSave = useCallback(
    async (title: string, newContent: string) => {
      api.logger.info(`Saving: ${title}`);
      if (activeChapterId && currentProject) {
        await updateChapter({
          id: activeChapterId,
          title,
          content: newContent,
        });

        try {
          await api.autoSave(activeChapterId, newContent, currentProject.id);
        } catch (error) {
          api.logger.warn("Auto snapshot failed", error);
        }

        if (currentProject.projectPath?.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
          // Package export is handled in main process (debounced)
          api.logger.info("Luie package export scheduled", {
            projectId: currentProject.id,
          });
        }
      }
    },
    [activeChapterId, updateChapter, currentProject],
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
