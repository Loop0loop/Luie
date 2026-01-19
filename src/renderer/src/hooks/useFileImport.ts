/**
 * .luie 파일 임포트 로직
 */

import { useEffect, useState } from "react";
import { z } from "zod";
import { useChapterStore } from "../stores/chapterStore";
import type { Project } from "../../../shared/types";

const LuieFileSchema = z.object({
  format: z.literal("luie"),
  version: z.number(),
  chapters: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().optional(),
        order: z.number().optional(),
        content: z.string().optional(),
      }),
    )
    .optional(),
}).passthrough();

export function useFileImport(
  currentProject: Project | null,
) {
  const { items: chapters, create: createChapter, update: updateChapter } = useChapterStore();
  const [importedProjectId, setImportedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentProject || !currentProject.projectPath) {
      return;
    }

    // 이미 임포트한 프로젝트면 스킵
    if (importedProjectId === currentProject.id) {
      return;
    }

    // 이미 챕터가 있으면 임포트 안 함
    if (chapters.length > 0) {
      setImportedProjectId(currentProject.id);
      return;
    }

    const path = currentProject.projectPath;
    if (!path.endsWith(".luie")) {
      setImportedProjectId(currentProject.id);
      return;
    }

    (async () => {
      const file = await window.api.fs.readFile(path);
      if (!file.success || !file.data) {
        window.api.logger.warn("Failed to read project file", { path });
        setImportedProjectId(currentProject.id);
        return;
      }

      try {
        const parsed = LuieFileSchema.safeParse(JSON.parse(file.data as string));
        if (!parsed.success) {
          window.api.logger.warn("Invalid project file format", {
            path,
            issues: parsed.error.issues,
          });
          setImportedProjectId(currentProject.id);
          return;
        }

        const fileChapters = parsed.data.chapters ?? [];

        if (fileChapters.length === 0) {
          setImportedProjectId(currentProject.id);
          return;
        }

        for (const ch of fileChapters) {
          const created = await createChapter({
            projectId: currentProject.id,
            title: ch.title ?? "Untitled",
          });
          if (created?.id && typeof ch.content === "string") {
            await updateChapter({ id: created.id, content: ch.content });
          }
        }

        setImportedProjectId(currentProject.id);
      } catch (error) {
        window.api.logger.error("Failed to parse project file", { path, error });
        setImportedProjectId(currentProject.id);
      }
    })();
  }, [currentProject, chapters.length, createChapter, updateChapter, importedProjectId]);
}
