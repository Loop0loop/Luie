import { useTranslation } from "react-i18next";
import { useDialog } from "@shared/ui/useDialog";
import { WikiSection } from "./WikiSection";
import type { WikiSectionData } from "./types";

// ── WikiContentPanel ──────────────────────────────────────────────────────

/**
 * Structural content model shared by the wiki view of every entity type.
 * Character passes its `CharacterWikiAttrs` directly (it already matches);
 * event/faction build an adapter over their `attributes` bag.
 */
export type WikiContentModel = {
  sections: WikiSectionData[];
  getSectionContent: (id: string) => string;
  setSectionContent: (id: string, value: string) => void;
  setSections: (sections: WikiSectionData[]) => void;
};

type WikiContentPanelProps = {
  attrs: WikiContentModel;
  /** i18n namespace: "character" | "event" | "faction". */
  i18nPrefix: string;
  newSectionFallback?: string;
  /** Character signature colour (hex) for section markers. */
  accentColor?: string;
};

export function WikiContentPanel({
  attrs,
  i18nPrefix,
  newSectionFallback,
  accentColor,
}: WikiContentPanelProps) {
  const { t } = useTranslation();
  const dialog = useDialog();

  const sections = attrs.sections;

  // ── Section CRUD ────────────────────────────────────────────────────────

  const addSection = () => {
    const id = `section_${Date.now()}`;
    const label = `${sections.length + 1}. ${
      newSectionFallback ?? t(`${i18nPrefix}.newSection`, "New Section")
    }`;
    attrs.setSections([...sections, { id, label }]);
  };

  const renameSection = (id: string, newLabel: string) =>
    attrs.setSections(sections.map((s) => (s.id === id ? { ...s, label: newLabel } : s)));

  const deleteSection = (id: string) => {
    void (async () => {
      const confirmed = await dialog.confirm({
        title: t(`${i18nPrefix}.wiki.sectionDeleteTitle`, "Delete Section"),
        message: t(
          `${i18nPrefix}.deleteSectionConfirm`,
          "Are you sure you want to delete this section?",
        ),
        isDestructive: true,
      });
      if (!confirmed) return;
      attrs.setSections(sections.filter((s) => s.id !== id));
    })();
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-9">
      {/* Table of Contents — inline */}
      {sections.length > 0 && (
        <nav className="self-start flex items-center gap-2 flex-wrap">
          <p className="text-[11px] font-medium text-muted/70 uppercase tracking-wider">
            {t(`${i18nPrefix}.tocLabel`, "Contents")}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
            {sections.map((sec, i) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="text-muted no-underline hover:text-fg hover:underline transition-colors"
              >
                {sec.label}
                {i < sections.length - 1 && (
                  <span className="text-border/60 ml-1.5">·</span>
                )}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* Sections */}
      {sections.map((sec) => (
        <WikiSection
          key={sec.id}
          id={sec.id}
          label={sec.label}
          content={attrs.getSectionContent(sec.id)}
          accentColor={accentColor}
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
        {t(`${i18nPrefix}.addSection`, "+ Add section")}
      </button>
    </div>
  );
}
