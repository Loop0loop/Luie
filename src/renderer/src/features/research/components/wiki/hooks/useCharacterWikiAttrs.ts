import { useMemo, useCallback, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { parseStructuredAttributes } from "@renderer/features/research/utils/parseStructuredAttributes";
import {
  type RadarAxis,
  type WikiSectionData,
  type CustomField,
  DEFAULT_CHARACTER_COLOR,
  DEFAULT_RADAR_AXES,
} from "../types";

// ── Public shape ──────────────────────────────────────────────────────────

export type CharacterWikiAttrs = {
  // Identity
  tagline: string;
  roles: string[];
  keywords: string[];
  // Visual
  characterColor: string;
  generatedImage: string | null;
  generatedQuote: string | null;
  radarAxes: RadarAxis[];
  // Sections
  sections: WikiSectionData[];
  customFields: CustomField[];
  /** Read any attribute by key (including section content and template fields). */
  getSectionContent: (id: string) => string;
  // Setters — identity
  setTagline: (v: string) => void;
  addRole: (role: string) => void;
  removeRole: (role: string) => void;
  addKeyword: (kw: string) => void;
  removeKeyword: (kw: string) => void;
  // Setters — visual
  setCharacterColor: (v: string) => void;
  setGeneratedImage: (v: string) => void;
  setGeneratedQuote: (v: string) => void;
  setRadarAxes: (axes: RadarAxis[]) => void;
  // Setters — sections
  setSectionContent: (id: string, content: string) => void;
  setSections: (sections: WikiSectionData[]) => void;
  setCustomFields: (fields: CustomField[]) => void;
  /** Generic setter for any attribute key (e.g. template fields). */
  setAttr: (key: string, value: unknown) => void;
};

// ── Hook ──────────────────────────────────────────────────────────────────

export function useCharacterWikiAttrs(): CharacterWikiAttrs {
  const { character, updateCharacter } = useCharacterStore(
    useShallow((s) => ({
      character: s.currentItem,
      updateCharacter: s.updateCharacter,
    })),
  );

  const attrs = useMemo(
    () => parseStructuredAttributes(character?.attributes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [character?.attributes],
  );

  /**
   * Keep a ref so update callbacks don't list `attrs` as a dependency —
   * this avoids re-creating every setter on each keystroke while still
   * reading the latest attribute state at call time.
   */
  const attrsRef = useRef(attrs);
  attrsRef.current = attrs;

  const update = useCallback(
    (key: string, value: unknown) => {
      if (!character) return;
      updateCharacter({
        id: character.id,
        attributes: { ...attrsRef.current, [key]: value },
      });
    },
    [character, updateCharacter],
  );

  // ── Derived read values ───────────────────────────────────────────────

  const tagline = (attrs.tagline as string) ?? "";
  const roles = useMemo(() => (attrs.roles as string[]) ?? [], [attrs.roles]);
  const keywords = useMemo(
    () => (attrs.keywords as string[]) ?? [],
    [attrs.keywords],
  );
  const characterColor =
    (attrs.characterColor as string) ?? DEFAULT_CHARACTER_COLOR;
  const generatedImage = (attrs.generatedImage as string) ?? null;
  const generatedQuote = (attrs.generatedQuote as string) ?? null;
  const radarAxes = useMemo(
    () => (attrs.radarAxes as RadarAxis[]) ?? DEFAULT_RADAR_AXES,
    [attrs.radarAxes],
  );
  const sections = useMemo(
    () => (attrs.sections as WikiSectionData[]) ?? [],
    [attrs.sections],
  );
  const customFields = useMemo(
    () => (attrs.customFields as CustomField[]) ?? [],
    [attrs.customFields],
  );
  const getSectionContent = useCallback(
    (id: string) => (attrsRef.current[id] as string) ?? "",
    [],
  );

  // ── Setters ───────────────────────────────────────────────────────────

  const setTagline = useCallback((v: string) => update("tagline", v), [update]);

  const setCharacterColor = useCallback(
    (v: string) => update("characterColor", v),
    [update],
  );
  const setGeneratedImage = useCallback(
    (v: string) => update("generatedImage", v),
    [update],
  );
  const setGeneratedQuote = useCallback(
    (v: string) => update("generatedQuote", v),
    [update],
  );
  const setRadarAxes = useCallback(
    (axes: RadarAxis[]) => update("radarAxes", axes),
    [update],
  );

  const setSectionContent = useCallback(
    (id: string, content: string) => update(id, content),
    [update],
  );
  const setSections = useCallback(
    (s: WikiSectionData[]) => update("sections", s),
    [update],
  );
  const setCustomFields = useCallback(
    (f: CustomField[]) => update("customFields", f),
    [update],
  );

  const setAttr = useCallback(
    (key: string, value: unknown) => update(key, value),
    [update],
  );

  const addRole = useCallback(
    (role: string) => {
      const cur = (attrsRef.current.roles as string[]) ?? [];
      if (!cur.includes(role)) update("roles", [...cur, role]);
    },
    [update],
  );
  const removeRole = useCallback(
    (role: string) => {
      const cur = (attrsRef.current.roles as string[]) ?? [];
      update("roles", cur.filter((r) => r !== role));
    },
    [update],
  );
  const addKeyword = useCallback(
    (kw: string) => {
      const cur = (attrsRef.current.keywords as string[]) ?? [];
      if (!cur.includes(kw)) update("keywords", [...cur, kw]);
    },
    [update],
  );
  const removeKeyword = useCallback(
    (kw: string) => {
      const cur = (attrsRef.current.keywords as string[]) ?? [];
      update("keywords", cur.filter((k) => k !== kw));
    },
    [update],
  );

  return {
    tagline,
    roles,
    keywords,
    characterColor,
    generatedImage,
    generatedQuote,
    radarAxes,
    sections,
    customFields,
    getSectionContent,
    setTagline,
    addRole,
    removeRole,
    addKeyword,
    removeKeyword,
    setCharacterColor,
    setGeneratedImage,
    setGeneratedQuote,
    setRadarAxes,
    setSectionContent,
    setSections,
    setCustomFields,
    setAttr,
  };
}
