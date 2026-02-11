/**
 * .luie 파일 임포트 로직
 */

import { useEffect, useRef } from "react";
import { z } from "zod";
import { useChapterStore } from "../stores/chapterStore";
import { useCharacterStore } from "../stores/characterStore";
import { useTermStore } from "../stores/termStore";
import type { Project } from "../../../shared/types";
import { api } from "../services/api";
import { i18n } from "../i18n";
import {
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_META_FILENAME,
  LUIE_MANUSCRIPT_DIR,
  LUIE_WORLD_DIR,
  LUIE_WORLD_CHARACTERS_FILE,
  LUIE_WORLD_TERMS_FILE,
  MARKDOWN_EXTENSION,
} from "../../../shared/constants";

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
  } = useChapterStore();
  const {
    characters,
    isLoading: charactersLoading,
    loadCharacters,
    createCharacter,
  } = useCharacterStore();
  const { terms, isLoading: termsLoading, loadTerms, createTerm } = useTermStore();
  const importedProjectIdRef = useRef<string | null>(null);
  const requestedLoadRef = useRef<string | null>(null);

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

      if (chaptersLoading || charactersLoading || termsLoading) {
        return;
      }

      // 이미 데이터가 있으면 임포트 안 함
      if (chapters.length > 0 || characters.length > 0 || terms.length > 0) {
        importedProjectIdRef.current = currentProject.id;
        return;
      }

      const path = currentProject.projectPath;
      if (!path.endsWith(LUIE_PACKAGE_EXTENSION)) {
        importedProjectIdRef.current = currentProject.id;
        return;
      }

      try {
        const metaResult = await api.fs.readLuieEntry(
          path,
          LUIE_PACKAGE_META_FILENAME,
        );
        if (!metaResult.success || !metaResult.data) {
          api.logger.warn("Failed to read meta.json", { path });
          importedProjectIdRef.current = currentProject.id;
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

        for (const ch of fileChapters) {
          const created = await createChapter({
            projectId: currentProject.id,
            title: ch.title ?? i18n.t("project.defaults.untitled"),
            order: typeof ch.order === "number" ? ch.order : undefined,
          });
          if (created?.id) {
            let chapterContent = typeof ch.content === "string" ? ch.content : null;
            const entryPath = ch.file ||
              (ch.id ? `${LUIE_MANUSCRIPT_DIR}/${ch.id}${MARKDOWN_EXTENSION}` : null);

            if (!chapterContent && entryPath) {
              const contentResult = await api.fs.readLuieEntry(path, entryPath);
              if (contentResult.success && typeof contentResult.data === "string") {
                chapterContent = contentResult.data;
              }
            }

            if (typeof chapterContent === "string") {
              await updateChapter({ id: created.id, content: chapterContent });
            }
          }
        }

        if (characters.length === 0) {
          const charactersResult = await api.fs.readLuieEntry(
            path,
            `${LUIE_WORLD_DIR}/${LUIE_WORLD_CHARACTERS_FILE}`,
          );
          if (charactersResult.success && charactersResult.data) {
            const parsedCharacters = WorldCharactersSchema.safeParse(
              JSON.parse(charactersResult.data),
            );
            if (parsedCharacters.success) {
              const list = parsedCharacters.data.characters ?? [];
              for (const character of list) {
                const name = typeof character.name === "string" ? character.name : i18n.t("project.defaults.untitled");
                await createCharacter({
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
        }

        if (terms.length === 0) {
          const termsResult = await api.fs.readLuieEntry(
            path,
            `${LUIE_WORLD_DIR}/${LUIE_WORLD_TERMS_FILE}`,
          );
          if (termsResult.success && termsResult.data) {
            const parsedTerms = WorldTermsSchema.safeParse(
              JSON.parse(termsResult.data),
            );
            if (parsedTerms.success) {
              const list = parsedTerms.data.terms ?? [];
              for (const term of list) {
                const termText = typeof term.term === "string" ? term.term : i18n.t("project.defaults.untitled");
                await createTerm({
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
        }

        importedProjectIdRef.current = currentProject.id;
      } catch (error) {
        api.logger.error("Failed to parse project file", { path, error });
        importedProjectIdRef.current = currentProject.id;
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
    createCharacter,
    createTerm,
  ]);
}
