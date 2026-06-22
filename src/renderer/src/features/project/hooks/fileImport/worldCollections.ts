import { z } from "zod";
import { api } from "@shared/api";
import {
  LUIE_WORLD_CHARACTERS_FILE,
  LUIE_WORLD_DIR,
  LUIE_WORLD_TERMS_FILE,
} from "@shared/constants";
import { i18n } from "@renderer/i18n";

export interface CharacterImportInput {
  projectId: string;
  name: string;
  description?: string;
  firstAppearance?: string;
  attributes?: Record<string, unknown>;
}

export interface TermImportInput {
  projectId: string;
  term: string;
  definition?: string;
  category?: string;
  firstAppearance?: string;
}

const WorldCharactersSchema = z
  .object({
    characters: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

const WorldTermsSchema = z
  .object({
    terms: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

export const readCharacterImportInputs = async (
  path: string,
  projectId: string,
  hasExistingCharacters: boolean,
): Promise<CharacterImportInput[]> => {
  if (hasExistingCharacters) return [];

  const charactersResult = await api.fs.readLuieEntry(
    path,
    `${LUIE_WORLD_DIR}/${LUIE_WORLD_CHARACTERS_FILE}`,
  );
  if (!charactersResult.success) {
    throw new Error(
      `LUIE_IMPORT_CHARACTERS_READ_FAILED:${charactersResult.error?.code ?? "UNKNOWN_ERROR"}`,
    );
  }
  if (!charactersResult.data) return [];

  const parsedCharacters = WorldCharactersSchema.safeParse(
    JSON.parse(charactersResult.data),
  );
  if (!parsedCharacters.success) {
    throw new Error("LUIE_IMPORT_CHARACTERS_INVALID_FORMAT");
  }

  return (parsedCharacters.data.characters ?? []).map((character) => {
    const name =
      typeof character.name === "string"
        ? character.name
        : i18n.t("project.defaults.untitled");

    return {
      projectId,
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
        typeof character.attributes === "object" &&
        character.attributes !== null
          ? (character.attributes as Record<string, unknown>)
          : undefined,
    };
  });
};

export const readTermImportInputs = async (
  path: string,
  projectId: string,
  hasExistingTerms: boolean,
): Promise<TermImportInput[]> => {
  if (hasExistingTerms) return [];

  const termsResult = await api.fs.readLuieEntry(
    path,
    `${LUIE_WORLD_DIR}/${LUIE_WORLD_TERMS_FILE}`,
  );
  if (!termsResult.success) {
    throw new Error(
      `LUIE_IMPORT_TERMS_READ_FAILED:${termsResult.error?.code ?? "UNKNOWN_ERROR"}`,
    );
  }
  if (!termsResult.data) return [];

  const parsedTerms = WorldTermsSchema.safeParse(JSON.parse(termsResult.data));
  if (!parsedTerms.success) {
    throw new Error("LUIE_IMPORT_TERMS_INVALID_FORMAT");
  }

  return (parsedTerms.data.terms ?? []).map((term) => {
    const termText =
      typeof term.term === "string"
        ? term.term
        : i18n.t("project.defaults.untitled");

    return {
      projectId,
      term: termText,
      definition:
        typeof term.definition === "string" ? term.definition : undefined,
      category: typeof term.category === "string" ? term.category : undefined,
      firstAppearance:
        typeof term.firstAppearance === "string"
          ? term.firstAppearance
          : undefined,
    };
  });
};
