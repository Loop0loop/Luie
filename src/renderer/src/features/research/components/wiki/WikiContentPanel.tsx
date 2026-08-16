import { useTranslation } from "react-i18next";
import { useDialog } from "@shared/ui/useDialog";
import { WikiSection } from "./WikiSection";
import type { WikiSectionData } from "./types";

export type WikiContentModel = {
  sections: WikiSectionData[];
  getSectionContent: (id: string) => string;
  setSectionContent: (id: string, value: string) => void;
  setSections: (sections: WikiSectionData[]) => void;
};

type WikiContentPanelProps = {
  attrs: WikiContentModel;
  i18nPrefix: string;
  newSectionFallback?: string;
};

export function WikiContentPanel({
  attrs,
  i18nPrefix,
  newSectionFallback,
}: WikiContentPanelProps) {
  const { t } = useTranslation();
  const dialog = useDialog();

  const sections = attrs.sections;

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

  return (
    <div className="flex flex-col gap-9">
      {sections.length > 0 && (
        <nav className="w-full flex flex-col gap-2 rounded-panel border border-border/60 bg-surface/50 p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              {t(`${i18nPrefix}.tocLabel`, "목차")}
            </p>
            <span className="text-[10px] text-subtle font-mono">
              {sections.length} sections
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="inline-flex items-center px-2.5 py-1 rounded-control bg-surface border border-border/60 text-xs font-medium text-muted transition-all hover:border-accent hover:text-accent hover:bg-surface-hover hover:shadow-xs active:scale-95 no-underline"
              >
                {sec.label}
              </a>
            ))}
          </div>
        </nav>
      )}

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

      <button
        type="button"
        onClick={addSection}
        className="self-start flex items-center gap-1.5 text-[13px] text-muted/50 hover:text-fg transition-colors cursor-pointer bg-transparent border-none pl-1"
      >
        <span className="text-[16px] leading-none">+</span>
        {t(`${i18nPrefix}.addSection`, "+ Add section")}
      </button>
    </div>
  );
}
