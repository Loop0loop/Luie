/**
 * .luie 파일 임포트 로직
 */

import { useEffect, useRef } from "react";
import { z } from "zod";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import type { Project } from "@shared/types";
import { api } from "@shared/api";
import { i18n } from "@renderer/i18n";
import {
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_META_FILENAME,
  LUIE_MANUSCRIPT_DIR,
  LUIE_WORLD_DIR,
  LUIE_WORLD_CHARACTERS_FILE,
  LUIE_WORLD_TERMS_FILE,
  MARKDOWN_EXTENSION,
} from "@shared/constants";

const LuieMetaSchema = z.object({
  format: z.literal(LUIE_PACKAGE_FORMAT),
  version: z.number(),
  chapters: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().optional(),
        order: z.number().optional(),
        file: z.string().optional(),
        content: z.string().optional(),
      }),
    )
    .optional(),
}).passthrough();

const WorldCharactersSchema = z.object({
  characters: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

const WorldTermsSchema = z.object({
  terms: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

export function useFileImport(
  currentProject: Project | null,
) {
  const {
    items: chapters,
    isLoading: chaptersLoading,
    loadAll: loadChapters,
    create: createChapter,
    update: updateChapter,
    delete: deleteChapter,
  } = useChapterStore();
  const {
    characters,
    isLoading: charactersLoading,
    loadCharacters,
    create: createCharacter,
    delete: deleteCharacter,
  } = useCharacterStore();
  const {
    terms,
    isLoading: termsLoading,
    loadTerms,
    create: createTerm,
    delete: deleteTerm,
  } = useTermStore();
  const importedProjectIdRef = useRef<string | null>(null);
  const requestedLoadRef = useRef<string | null>(null);
  const importingProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!currentProject || !currentProject.projectPath) {
        return;
      }

      // 이미 임포트한 프로젝트면 스킵
      if (importedProjectIdRef.current === currentProject.id) {
        return;
      }

      if (requestedLoadRef.current !== currentProject.id) {
        requestedLoadRef.current = currentProject.id;
        // Ensure DB is loaded before deciding to import
        await Promise.all([
          loadChapters(currentProject.id),
          loadCharacters(currentProject.id),
          loadTerms(currentProject.id),
        ]);
        return;
      }

      if (importingProjectIdRef.current === currentProject.id) {
        return;
      }

      if (chaptersLoading || charactersLoading || termsLoading) {
        return;
      }

      // 이미 데이터가 있으면 임포트 안 함
      if (chapters.length > 0 || characters.length > 0 || terms.length > 0) {
        importedProjectIdRef.current = currentProject.id;
        return;
      }

      const path = currentProject.projectPath;
      if (!path.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
        importedProjectIdRef.current = currentProject.id;
        return;
      }

      importingProjectIdRef.current = currentProject.id;
      const createdChapterIds: string[] = [];
      const createdCharacterIds: string[] = [];
      const createdTermIds: string[] = [];

      try {
        const metaResult = await api.fs.readLuieEntry(
          path,
          LUIE_PACKAGE_META_FILENAME,
        );
        if (!metaResult.success || !metaResult.data) {
          api.logger.warn("Failed to read meta.json", { path });
          return;
        }

        const parsed = LuieMetaSchema.safeParse(JSON.parse(metaResult.data));
        if (!parsed.success) {
          api.logger.warn("Invalid project meta format", {
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

        const chapterPayloads: Array<{
          title: string;
          order?: number;
          content: string;
        }> = [];

        for (const ch of fileChapters) {
          const title = ch.title ?? i18n.t("project.defaults.untitled");
          let chapterContent = typeof ch.content === "string" ? ch.content : "";
          const entryPath = ch.file ||
            (ch.id ? `${LUIE_MANUSCRIPT_DIR}/${ch.id}${MARKDOWN_EXTENSION}` : null);

          if (typeof ch.content !== "string" && entryPath) {
            const contentResult = await api.fs.readLuieEntry(path, entryPath);
            if (!contentResult.success) {
              throw new Error(
                `LUIE_IMPORT_CHAPTER_READ_FAILED:${entryPath}:${contentResult.error?.code ?? "UNKNOWN_ERROR"}`,
              );
            }
            if (typeof contentResult.data === "string") {
              chapterContent = contentResult.data;
            }
          }

          chapterPayloads.push({
            title,
            order: typeof ch.order === "number" ? ch.order : undefined,
            content: chapterContent,
          });
        }

        const characterInputs: Array<{
          projectId: string;
          name: string;
          description?: string;
          firstAppearance?: string;
          attributes?: Record<string, unknown>;
        }> = [];
        if (characters.length === 0) {
          const charactersResult = await api.fs.readLuieEntry(
            path,
            `${LUIE_WORLD_DIR}/${LUIE_WORLD_CHARACTERS_FILE}`,
          );
          if (!charactersResult.success) {
            throw new Error(
              `LUIE_IMPORT_CHARACTERS_READ_FAILED:${charactersResult.error?.code ?? "UNKNOWN_ERROR"}`,
            );
          }
          if (charactersResult.data) {
            const parsedCharacters = WorldCharactersSchema.safeParse(JSON.parse(charactersResult.data));
            if (!parsedCharacters.success) {
              throw new Error("LUIE_IMPORT_CHARACTERS_INVALID_FORMAT");
            }
            const list = parsedCharacters.data.characters ?? [];
            for (const character of list) {
              const name = typeof character.name === "string"
                ? character.name
                : i18n.t("project.defaults.untitled");
              characterInputs.push({
                projectId: currentProject.id,
                name,
                description:
                  typeof character.description === "string"
                    ? character.description
                    : undefined,
                firstAppearance:
                  typeof character.firstAppearance === "string"
                    ? character.firstAppearance
                    : undefined,
                attributes:
                  typeof character.attributes === "object" && character.attributes !== null
                    ? (character.attributes as Record<string, unknown>)
                    : undefined,
              });
            }
          }
        }

        const termInputs: Array<{
          projectId: string;
          term: string;
          definition?: string;
          category?: string;
          firstAppearance?: string;
        }> = [];
        if (terms.length === 0) {
          const termsResult = await api.fs.readLuieEntry(
            path,
            `${LUIE_WORLD_DIR}/${LUIE_WORLD_TERMS_FILE}`,
          );
          if (!termsResult.success) {
            throw new Error(
              `LUIE_IMPORT_TERMS_READ_FAILED:${termsResult.error?.code ?? "UNKNOWN_ERROR"}`,
            );
          }
          if (termsResult.data) {
            const parsedTerms = WorldTermsSchema.safeParse(JSON.parse(termsResult.data));
            if (!parsedTerms.success) {
              throw new Error("LUIE_IMPORT_TERMS_INVALID_FORMAT");
            }
            const list = parsedTerms.data.terms ?? [];
            for (const term of list) {
              const termText = typeof term.term === "string"
                ? term.term
                : i18n.t("project.defaults.untitled");
              termInputs.push({
                projectId: currentProject.id,
                term: termText,
                definition:
                  typeof term.definition === "string" ? term.definition : undefined,
                category: typeof term.category === "string" ? term.category : undefined,
                firstAppearance:
                  typeof term.firstAppearance === "string"
                    ? term.firstAppearance
                    : undefined,
              });
            }
          }
        }

        for (const chapterInput of chapterPayloads) {
          const created = await createChapter({
            projectId: currentProject.id,
            title: chapterInput.title,
            order: chapterInput.order,
          });
          if (!created?.id) {
            throw new Error("LUIE_IMPORT_CHAPTER_CREATE_FAILED");
          }
          createdChapterIds.push(created.id);
          await updateChapter({ id: created.id, content: chapterInput.content });
          const chapterUpdateError = useChapterStore.getState().error;
          if (chapterUpdateError) {
            throw new Error(`LUIE_IMPORT_CHAPTER_UPDATE_FAILED:${chapterUpdateError}`);
          }
        }

        for (const characterInput of characterInputs) {
          const created = await createCharacter(characterInput);
          if (!created?.id) {
            throw new Error("LUIE_IMPORT_CHARACTER_CREATE_FAILED");
          }
          createdCharacterIds.push(created.id);
        }

        for (const termInput of termInputs) {
          const created = await createTerm(termInput);
          if (!created?.id) {
            throw new Error("LUIE_IMPORT_TERM_CREATE_FAILED");
          }
          createdTermIds.push(created.id);
        }

        importedProjectIdRef.current = currentProject.id;
      } catch (error) {
        api.logger.error("Failed to parse project file", { path, error });
        await Promise.allSettled([
          ...createdChapterIds.map((id) => deleteChapter(id)),
          ...createdCharacterIds.map((id) => deleteCharacter(id)),
          ...createdTermIds.map((id) => deleteTerm(id)),
        ]);
        if (
          createdChapterIds.length > 0 ||
          createdCharacterIds.length > 0 ||
          createdTermIds.length > 0
        ) {
          await api.logger.warn("Rolled back partial .luie import after failure", {
            projectId: currentProject.id,
            path,
            chapters: createdChapterIds.length,
            characters: createdCharacterIds.length,
            terms: createdTermIds.length,
          });
        }
      } finally {
        if (importingProjectIdRef.current === currentProject.id) {
          importingProjectIdRef.current = null;
        }
      }
    })();
  }, [
    currentProject,
    chapters.length,
    characters.length,
    terms.length,
    chaptersLoading,
    charactersLoading,
    termsLoading,
    loadChapters,
    loadCharacters,
    loadTerms,
    createChapter,
    updateChapter,
    deleteChapter,
    createCharacter,
    deleteCharacter,
    createTerm,
    deleteTerm,
  ]);
}
