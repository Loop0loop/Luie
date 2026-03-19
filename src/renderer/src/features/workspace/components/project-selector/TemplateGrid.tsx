import { useTranslation } from "react-i18next";
import { Plus, FileType } from "lucide-react";
import { cn } from "@renderer/lib/utils";

interface TemplateGridProps {
  activeCategory: string;
  onSelectTemplate: (templateId: string) => void;
}

export function TemplateGrid({
  activeCategory,
  onSelectTemplate,
}: TemplateGridProps) {
  const { t } = useTranslation();

  const templates = [
    {
      id: "blank",
      title: t("settings.projectTemplate.title.blank"),
      category: "all",
      type: "blank",
    },
    {
      id: "novel_basic",
      title: t("settings.projectTemplate.title.webNovel"),
      category: "novel",
      type: "novel",
    },
    {
      id: "script_basic",
      title: t("settings.projectTemplate.title.screenplay"),
      category: "script",
      type: "script",
    },
    {
      id: "essay",
      title: t("settings.projectTemplate.title.essay"),
      category: "misc",
      type: "doc",
    },
  ];

  const filteredTemplates =
    activeCategory === "all"
      ? templates
      : templates.filter(
          (t) => t.category === activeCategory || t.category === "all",
        );

  return (
    <div className="flex-1 overflow-y-auto p-8 relative z-0">
      <div className="w-full max-w-7xl mr-auto">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-10">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="group flex flex-col gap-3 cursor-pointer"
              onClick={() => onSelectTemplate(template.id)}
            >
              {/* Card Container */}
              <div
                className="
              relative aspect-3/4 w-full
              bg-surface/40 
              border border-white/5 
              rounded-md 
              overflow-hidden 
              transition-all duration-300 
              shadow-sm
              group-hover:-translate-y-1.5 
              group-hover:shadow-2xl 
              group-hover:border-white/10
              group-hover:bg-surface
            "
              >
                {/* === BLANK TEMPLATE === */}
                {template.type === "blank" && (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6">
                    <div className="w-full h-full border-2 dashed border-[var(--border-subtle)] rounded-sm flex flex-col items-center justify-center gap-3 group-hover:border-accent/40 transition-colors">
                      <Plus className="w-8 h-8 text-[var(--text-tertiary)] group-hover:text-accent transition-colors" />
                    </div>
                  </div>
                )}

                {/* === NOVEL TEMPLATE (Serif, Book-like) === */}
                {template.type === "novel" && (
                  <div className="w-full h-full bg-[var(--bg-secondary)] p-5 flex flex-col">
                    <div className="h-full bg-[var(--bg-tertiary)] mx-auto w-full flex flex-col p-3 shadow-inner">
                      <div className="text-[8px] tracking-[2px] text-[var(--text-tertiary)] text-center uppercase mb-3 font-serif">
                        {t("settings.projectTemplate.preview.standardFormat")}
                      </div>
                      <div className="font-serif text-lg text-[var(--text-primary)] text-center font-bold pb-2 border-b border-[var(--border-subtle)] mb-4">
                        {t("settings.projectTemplate.preview.chapterOne")}
                      </div>
                      <div className="space-y-1.5 opacity-40">
                        <div className="h-1 w-full bg-[var(--text-tertiary)] rounded-full" />
                        <div className="h-1 w-11/12 bg-[var(--text-tertiary)] rounded-full" />
                        <div className="h-1 w-full bg-[var(--text-tertiary)] rounded-full" />
                        <div className="h-1 w-4/5 bg-[var(--text-tertiary)] rounded-full" />
                      </div>
                      <div className="mt-auto flex justify-center text-[var(--text-tertiary)] text-2xl font-serif">
                        ❦
                      </div>
                    </div>
                  </div>
                )}

                {/* === SCRIPT TEMPLATE (Mono, Screenplay) === */}
                {template.type === "script" && (
                  <div className="w-full h-full bg-[var(--bg-secondary)] p-5 font-mono text-[9px] text-[var(--text-secondary)] flex flex-col items-start leading-relaxed border-l-[6px] border-[var(--border-subtle)] group-hover:border-accent transition-colors">
                    <div className="flex w-full justify-between opacity-50 mb-4 tracking-widest uppercase">
                      <span>
                        {t("settings.projectTemplate.preview.script.int")}
                      </span>
                      <span>
                        {t("settings.projectTemplate.preview.script.day")}
                      </span>
                    </div>

                    <div className="w-full text-center text-[var(--text-primary)] font-bold mb-1 tracking-wider uppercase">
                      {t("settings.projectTemplate.preview.script.character")}
                    </div>
                    <div className="w-full text-center mb-3">
                      {t("settings.projectTemplate.preview.script.direction")}
                      <br />
                      {t("settings.projectTemplate.preview.script.dialogue")}
                    </div>

                    <div className="w-full text-center text-[var(--text-primary)] font-bold mb-1 tracking-wider uppercase">
                      {t("settings.projectTemplate.preview.script.another")}
                    </div>
                    <div className="w-full text-center">
                      {t("settings.projectTemplate.preview.script.anotherLine")}
                    </div>
                  </div>
                )}

                {/* === DOC TEMPLATE (Academic/General) === */}
                {template.type === "doc" && (
                  <div className="w-full h-full bg-surface p-5 flex flex-col items-center">
                    <div className="text-center w-full pb-4 border-b border-[var(--border-subtle)] mb-4">
                      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                        <FileType className="h-5 w-5 text-accent" />
                      </div>
                      <div className="h-2 w-16 bg-[var(--text-tertiary)] mx-auto rounded-sm" />
                    </div>
                    <div className="w-full space-y-2 opacity-30">
                      <div className="flex gap-2">
                        <div className="h-1.5 w-1/3 bg-[var(--text-tertiary)]" />
                        <div className="h-1.5 w-2/3 bg-[var(--text-secondary)]" />
                      </div>
                      <div className="h-1.5 w-full bg-[var(--text-secondary)]" />
                      <div className="h-1.5 w-4/5 bg-[var(--text-secondary)]" />
                      <div className="h-1.5 w-full bg-[var(--text-secondary)]" />
                    </div>
                  </div>
                )}

                {/* Overlay Highlight for unified feel */}
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-linear-to-t from-bg-app/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                  )}
                />
              </div>

              {/* Label */}
              <div className="text-center group-hover:transform group-hover:-translate-y-0.5 transition-transform duration-300">
                <span className="font-medium text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors tracking-wide">
                  {template.title}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
