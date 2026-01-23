/**
 * .luie 파일 임포트 로직
 */

import { useEffect, useRef } from "react";
import { z } from "zod";
import { useChapterStore } from "../stores/chapterStore";
import type { Project } from "../../../shared/types";
import { LUIE_PACKAGE_EXTENSION, LUIE_PACKAGE_FORMAT } from "../../../shared/constants";

const LuieFileSchema = z.object({
  format: z.literal(LUIE_PACKAGE_FORMAT),
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
  const importedProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentProject || !currentProject.projectPath) {
      return;
    }

    // 이미 임포트한 프로젝트면 스킵
    if (importedProjectIdRef.current === currentProject.id) {
      return;
    }

    // 이미 챕터가 있으면 임포트 안 함
    if (chapters.length > 0) {
      importedProjectIdRef.current = currentProject.id;
      return;
    }

    const path = currentProject.projectPath;
    if (!path.endsWith(LUIE_PACKAGE_EXTENSION)) {
      importedProjectIdRef.current = currentProject.id;
      return;
    }

    (async () => {
      const file = await window.api.fs.readFile(path);
      if (!file.success || !file.data) {
        window.api.logger.warn("Failed to read project file", { path });
        importedProjectIdRef.current = currentProject.id;
        return;
      }

      try {
        const parsed = LuieFileSchema.safeParse(JSON.parse(file.data as string));
        if (!parsed.success) {
          window.api.logger.warn("Invalid project file format", {
            path,
            issues: parsed.error.issues,
          });
          importedProjectIdRef.current = currentProject.id;
          return;
        }

        const fileChapters = parsed.data.chapters ?? [];

        if (fileChapters.length === 0) {
          importedProjectIdRef.current = currentProject.id;
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

        importedProjectIdRef.current = currentProject.id;
      } catch (error) {
        window.api.logger.error("Failed to parse project file", { path, error });
        importedProjectIdRef.current = currentProject.id;
      }
    })();
  }, [currentProject, chapters.length, createChapter, updateChapter]);
}
