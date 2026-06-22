import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, i18n } from "@renderer/i18n";
import { useDialog } from "@shared/ui/useDialog";
import { WikiSection } from "./WikiSection";
import type { CharacterWikiAttrs } from "./hooks/useCharacterWikiAttrs";
import type { WikiSectionData } from "./types";

// ── WikiContentPanel ──────────────────────────────────────────────────────

type WikiContentPanelProps = {
  attrs: Pick<
    CharacterWikiAttrs,
    "sections" | "getSectionContent" | "setSectionContent" | "setSections"
  >;
};

export function WikiContentPanel({ attrs }: WikiContentPanelProps) {
  const { t } = useTranslation();
  const dialog = useDialog();

  // ── Section label i18n resolution ──────────────────────────────────────

  const defaultSectionLabels = useMemo(
    () => t("character.defaultSections", { returnObjects: true }) as string[],
    [t],
  );

  const defaultLabelById = useMemo<Record<string, string | undefined>>(
    () => ({
      overview:    defaultSectionLabels[0],
      appearance:  defaultSectionLabels[1],
      personality: defaultSectionLabels[2],
      background:  defaultSectionLabels[3],
      relations:   defaultSectionLabels[4],
      notes:       defaultSectionLabels[5],
    }),
    [defaultSectionLabels],
  );

  /**
   * All translated default labels across every supported language.
   * Used to detect auto-generated labels that should follow app locale changes.
   */
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

  const sections: WikiSectionData[] = useMemo(() => {
    if (attrs.sections.length > 0) {
      return attrs.sections.map((sec) => {
        const defaultLabel = defaultLabelById[sec.id];
        // Only override if the stored label was itself an auto-generated default
        if (!defaultLabel || !defaultLabelSet.has(sec.label)) return sec;
        return { ...sec, label: defaultLabel };
      });
    }
    // No stored sections yet — return the default set
    return [
      { id: "overview",    label: defaultSectionLabels[0] ?? "개요" },
      { id: "appearance",  label: defaultSectionLabels[1] ?? "외관" },
      { id: "personality", label: defaultSectionLabels[2] ?? "성격" },
      { id: "background",  label: defaultSectionLabels[3] ?? "배경" },
      { id: "relations",   label: defaultSectionLabels[4] ?? "관계" },
      { id: "notes",       label: defaultSectionLabels[5] ?? "메모" },
    ];
  }, [attrs.sections, defaultLabelById, defaultLabelSet, defaultSectionLabels]);

  // ── Section CRUD ────────────────────────────────────────────────────────

  const addSection = () => {
    const id = `section_${Date.now()}`;
    attrs.setSections([
      ...sections,
      { id, label: `${sections.length + 1}. ${t("character.newSection")}` },
    ]);
  };

  const renameSection = (id: string, newLabel: string) =>
    attrs.setSections(sections.map((s) => (s.id === id ? { ...s, label: newLabel } : s)));

  const deleteSection = (id: string) => {
    void (async () => {
      const confirmed = await dialog.confirm({
        title: t("character.wiki.sectionDeleteTitle"),
        message: t("character.deleteSectionConfirm"),
        isDestructive: true,
      });
      if (!confirmed) return;
      attrs.setSections(sections.filter((s) => s.id !== id));
    })();
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-9">
      {/* Table of Contents */}
      <nav className="self-start">
        <p className="text-[11px] font-medium text-muted mb-2 uppercase tracking-wider">
          {t("character.tocLabel")}
        </p>
        <div className="flex flex-col gap-0.5 text-[13px] pl-3 border-l border-border/50">
          {sections.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="text-accent/70 no-underline hover:text-accent hover:underline leading-snug py-0.5 transition-colors"
            >
              {sec.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Sections */}
      {sections.map((sec) => (
        <WikiSection
          key={sec.id}
          id={sec.id}
          label={sec.label}
          content={attrs.getSectionContent(sec.id)}
          onRename={(val) => renameSection(sec.id, val)}
          onUpdateContent={(val) => attrs.setSectionContent(sec.id, val)}
          onDelete={() => deleteSection(sec.id)}
        />
      ))}

      {/* Add section */}
      <button
        type="button"
        onClick={addSection}
        className="self-start flex items-center gap-1.5 text-[13px] text-muted/50 hover:text-accent transition-colors cursor-pointer bg-transparent border-none pl-1"
      >
        <span className="text-[16px] leading-none">+</span>
        {t("character.addSection")}
      </button>
    </div>
  );
}
