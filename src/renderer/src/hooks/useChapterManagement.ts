/**
 * 챕터 관리 (생성, 수정, 삭제, 선택)
 */

import { useState, useCallback } from "react";
import { useChapterStore } from "../stores/chapterStore";
import { useProjectStore } from "../stores/projectStore";
import {
  LUIE_PACKAGE_CONTAINER_DIR,
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_META_FILENAME,
  LUIE_PACKAGE_VERSION,
} from "../../../shared/constants";

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
      window.api.logger.error("No project selected");
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
        window.api.logger.error("No project selected");
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
      window.api.logger.info(`Saving: ${title}`);
      if (activeChapterId && currentProject) {
        await updateChapter({
          id: activeChapterId,
          title,
          content: newContent,
        });

        // .luie 패키지 디렉토리 동기화
        if (currentProject.projectPath?.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
          const meta = {
            format: LUIE_PACKAGE_FORMAT,
            container: LUIE_PACKAGE_CONTAINER_DIR,
            version: LUIE_PACKAGE_VERSION,
            projectId: currentProject.id,
            title: currentProject.title,
            updatedAt: new Date().toISOString(),
            chapters: chapters.map((c) => ({
              id: c.id,
              title: c.title,
              order: c.order,
              updatedAt: c.updatedAt,
            })),
          };

          await window.api.fs.writeProjectFile(
            currentProject.projectPath,
            LUIE_PACKAGE_META_FILENAME,
            JSON.stringify(meta, null, 2),
          );

          await window.api.fs.writeProjectFile(
            currentProject.projectPath,
            `manuscript/${activeChapterId}.md`,
            newContent,
          );
        }
      }
    },
    [activeChapterId, updateChapter, currentProject, chapters],
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
