import { useTranslation } from "react-i18next";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import { BufferedInput, BufferedTextArea } from "@shared/ui/BufferedInput";

export default function WorldTermView() {
  const { t } = useTranslation();
  const { currentTerm, updateTerm } = useTermStore();

  if (!currentTerm) {
      return (
          <div className="flex items-center justify-center h-full text-muted">
              {t("world.term.noSelection")}
          </div>
      );
  }

  return (
      <div className="p-8 h-full overflow-y-auto max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 pb-4 mb-8 border-b border-border">
          <span className="font-extrabold text-2xl text-fg">{currentTerm.term}</span>
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-6 items-start pb-8">
          <div className="text-right text-sm font-bold text-muted pt-2 uppercase tracking-wide">{t("world.term.label")}</div>
          <div className="min-w-0">
            <BufferedInput
              className="w-full p-2.5 bg-element border border-border rounded text-base text-fg outline-none focus:border-active focus:ring-1 focus:ring-active transition-all"
              value={currentTerm.term}
              onSave={(val) => updateTerm({ id: currentTerm.id, term: val })}
            />
          </div>
          <div className="text-right text-sm font-bold text-muted pt-2 uppercase tracking-wide">{t("world.term.definitionLabel")}</div>
          <div className="min-w-0">
            <BufferedTextArea
              className="w-full p-2.5 bg-element border border-border rounded text-base text-fg outline-none focus:border-active focus:ring-1 focus:ring-active transition-all font-sans leading-relaxed min-h-[200px]"
              value={currentTerm.definition || ""}
              onSave={(val) => updateTerm({ id: currentTerm.id, definition: val })}
            />
          </div>
          <div className="text-right text-sm font-bold text-muted pt-2 uppercase tracking-wide">{t("world.term.categoryLabel")}</div>
          <div className="min-w-0">
            <BufferedInput
              className="w-full p-2.5 bg-element border border-border rounded text-base text-fg outline-none focus:border-active focus:ring-1 focus:ring-active transition-all"
              value={currentTerm.category || ""}
              onSave={(val) => updateTerm({ id: currentTerm.id, category: val })}
            />
          </div>
        </div>
      </div>
  );
}
