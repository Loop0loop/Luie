import { useTranslation } from "react-i18next";
import { Plus, FileType } from "lucide-react";

interface TemplateGridProps {
    activeCategory: string;
    onSelectTemplate: (templateId: string) => void;
}

export function TemplateGrid({ activeCategory, onSelectTemplate }: TemplateGridProps) {
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
            <div className="max-w-350 mx-auto">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-6 gap-y-10">
                    {filteredTemplates.map((template) => (
                        <div
                            key={template.id}
                            className="group flex flex-col gap-3 cursor-pointer"
                            onClick={() => onSelectTemplate(template.id)}
                        >
                            {/* Card Container */}
                            <div className="
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
            ">

                                {/* === BLANK TEMPLATE === */}
                                {template.type === "blank" && (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-6">
                                        <div className="w-full h-full border-2 dashed border-white/10 rounded-sm flex flex-col items-center justify-center gap-3 group-hover:border-accent/40 transition-colors">
                                            <Plus className="w-8 h-8 text-neutral-500 group-hover:text-accent transition-colors" />
                                        </div>
                                    </div>
                                )}

                                {/* === NOVEL TEMPLATE (Serif, Book-like) === */}
                                {template.type === "novel" && (
                                    <div className="w-full h-full bg-zinc-900 p-5 flex flex-col">
                                        <div className="h-full bg-white/5 mx-auto w-full flex flex-col p-3 shadow-inner">
                                            <div className="text-[8px] tracking-[2px] text-zinc-500 text-center uppercase mb-3 font-serif">{t("settings.projectTemplate.preview.standardFormat")}</div>
                                            <div className="font-serif text-lg text-zinc-200 text-center font-bold pb-2 border-b border-white/10 mb-4">
                                                {t("settings.projectTemplate.preview.chapterOne")}
                                            </div>
                                            <div className="space-y-1.5 opacity-40">
                                                <div className="h-1 w-full bg-zinc-600 rounded-full" />
                                                <div className="h-1 w-11/12 bg-zinc-600 rounded-full" />
                                                <div className="h-1 w-full bg-zinc-600 rounded-full" />
                                                <div className="h-1 w-4/5 bg-zinc-600 rounded-full" />
                                            </div>
                                            <div className="mt-auto flex justify-center text-zinc-600 text-2xl font-serif">❦</div>
                                        </div>
                                    </div>
                                )}

                                {/* === SCRIPT TEMPLATE (Mono, Screenplay) === */}
                                {template.type === "script" && (
                                    <div className="w-full h-full bg-[#18181b] p-5 font-mono text-[9px] text-zinc-400 flex flex-col items-start leading-relaxed border-l-[6px] border-[#27272a] group-hover:border-accent transition-colors">
                                        <div className="flex w-full justify-between opacity-50 mb-4 tracking-widest uppercase">
                                            <span>{t("settings.projectTemplate.preview.script.int")}</span>
                                            <span>{t("settings.projectTemplate.preview.script.day")}</span>
                                        </div>

                                        <div className="w-full text-center text-zinc-300 font-bold mb-1 tracking-wider uppercase">{t("settings.projectTemplate.preview.script.character")}</div>
                                        <div className="w-full text-center mb-3">
                                            {t("settings.projectTemplate.preview.script.direction")}<br />
                                            {t("settings.projectTemplate.preview.script.dialogue")}
                                        </div>

                                        <div className="w-full text-center text-zinc-300 font-bold mb-1 tracking-wider uppercase">{t("settings.projectTemplate.preview.script.another")}</div>
                                        <div className="w-full text-center">
                                            {t("settings.projectTemplate.preview.script.anotherLine")}
                                        </div>
                                    </div>
                                )}

                                {/* === DOC TEMPLATE (Academic/General) === */}
                                {template.type === "doc" && (
                                    <div className="w-full h-full bg-surface p-5 flex flex-col items-center">
                                        <div className="text-center w-full pb-4 border-b border-white/5 mb-4">
                                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                                                <FileType className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div className="h-2 w-16 bg-zinc-700 mx-auto rounded-sm" />
                                        </div>
                                        <div className="w-full space-y-2 opacity-30">
                                            <div className="flex gap-2">
                                                <div className="h-1.5 w-1/3 bg-zinc-500" />
                                                <div className="h-1.5 w-2/3 bg-zinc-600" />
                                            </div>
                                            <div className="h-1.5 w-full bg-zinc-600" />
                                            <div className="h-1.5 w-4/5 bg-zinc-600" />
                                            <div className="h-1.5 w-full bg-zinc-600" />
                                        </div>
                                    </div>
                                )}

                                {/* Overlay Highlight for unified feel */}
                                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            </div>

                            {/* Label */}
                            <div className="text-center group-hover:transform group-hover:-translate-y-0.5 transition-transform duration-300">
                                <span className="font-medium text-[13px] text-zinc-400 group-hover:text-white transition-colors tracking-wide">
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
