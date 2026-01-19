/**
 * 챕터 관리 (생성, 수정, 삭제, 선택)
 */

import { useState, useCallback, useEffect } from "react";
import { useChapterStore } from "../stores/chapterStore";
import { useProjectStore } from "../stores/projectStore";

export function useChapterManagement() {
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [content, setContent] = useState("");

  const { currentItem: currentProject } = useProjectStore();
  const {
    items: chapters,
    create: createChapter,
    update: updateChapter,
    delete: deleteChapter,
  } = useChapterStore();

  // 활성 챕터 자동 선택 & 컨텐츠 로드
  useEffect(() => {
    if (!activeChapterId && chapters.length > 0) {
      setActiveChapterId(chapters[0].id);
      return;
    }

    if (!activeChapterId) {
      return;
    }

    const chapter = chapters.find((c) => c.id === activeChapterId);
    if (chapter) {
      setContent(chapter.content || "");
    }
  }, [activeChapterId, chapters]);

  const handleSelectChapter = useCallback((id: string) => {
    setActiveChapterId(id);
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
        setActiveChapterId(remaining[0]?.id ?? null);
      }
    },
    [deleteChapter, activeChapterId, chapters],
  );

  const handleSave = useCallback(
    async (title: string, newContent: string) => {
      window.api.logger.info(`Saving: ${title}`);
      setContent(newContent);

      if (activeChapterId && currentProject) {
        await updateChapter({
          id: activeChapterId,
          title,
          content: newContent,
        });

        // .luie 파일 동기화
        if (currentProject.projectPath?.endsWith(".luie")) {
          const payload = {
            format: "luie",
            version: 1,
            projectId: currentProject.id,
            title: currentProject.title,
            updatedAt: new Date().toISOString(),
            chapters: chapters.map((c) => ({
              id: c.id,
              title: c.title,
              order: c.order,
              content: c.id === activeChapterId ? newContent : c.content,
            })),
          };

          await window.api.fs.writeFile(
            currentProject.projectPath,
            JSON.stringify(payload, null, 2),
          );
        }
      }
    },
    [activeChapterId, updateChapter, currentProject, chapters],
  );

  const activeChapterTitle =
    chapters.find((c) => c.id === activeChapterId)?.title || "";

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
