import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, i18n } from "@renderer/i18n";
import type { WikiSectionData } from "../types";

/** 저장된 section id를 보존하면서 자동 생성 label만 현재 locale에 맞춘다. */
export function useEffectiveCharacterSections(
  stored: WikiSectionData[],
): WikiSectionData[] {
  const { t } = useTranslation();

  const defaultSectionLabels = useMemo(
    () => t("character.defaultSections", { returnObjects: true }) as string[],
    [t],
  );

  const defaultLabelById = useMemo<Record<string, string | undefined>>(
    () => ({
      overview: defaultSectionLabels[0],
      appearance: defaultSectionLabels[1],
      personality: defaultSectionLabels[2],
      background: defaultSectionLabels[3],
      relations: defaultSectionLabels[4],
      notes: defaultSectionLabels[5],
    }),
    [defaultSectionLabels],
  );

  const defaultLabelSet = useMemo(() => {
    const labels = new Set<string>();
    SUPPORTED_LANGUAGES.forEach((lang) => {
      const bundle = i18n.getResourceBundle(lang, "common") as
        | { character?: { defaultSections?: string[] } }
        | undefined;
      bundle?.character?.defaultSections?.forEach((l) => labels.add(l));
    });
    return labels;
  }, []);

  return useMemo<WikiSectionData[]>(() => {
    if (stored.length > 0) {
      return stored.map((sec) => {
        const defaultLabel = defaultLabelById[sec.id];
        // NOTE: 사용자가 바꾼 label은 덮어쓰지 않고 자동 생성된 기본 label만 번역한다.
        if (!defaultLabel || !defaultLabelSet.has(sec.label)) return sec;
        return { ...sec, label: defaultLabel };
      });
    }
    return [
      { id: "overview", label: defaultSectionLabels[0] ?? "개요" },
      { id: "appearance", label: defaultSectionLabels[1] ?? "외관" },
      { id: "personality", label: defaultSectionLabels[2] ?? "성격" },
      { id: "background", label: defaultSectionLabels[3] ?? "배경" },
      { id: "relations", label: defaultSectionLabels[4] ?? "관계" },
      { id: "notes", label: defaultSectionLabels[5] ?? "메모" },
    ];
  }, [stored, defaultLabelById, defaultLabelSet, defaultSectionLabels]);
}
