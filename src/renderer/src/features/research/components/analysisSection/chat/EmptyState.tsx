import { Bot } from "lucide-react";
import { useTranslation } from "react-i18next";

const SUGGESTED_PROMPTS = [
  {
    key: "summary",
    labelKey: "analysis.emptyState.summaryLabel",
    promptKey: "analysis.emptyState.summaryPrompt",
  },
  {
    key: "relation",
    labelKey: "analysis.emptyState.relationLabel",
    promptKey: "analysis.emptyState.relationPrompt",
  },
  {
    key: "conflict",
    labelKey: "analysis.emptyState.conflictLabel",
    promptKey: "analysis.emptyState.conflictPrompt",
  },
  {
    key: "foreshadow",
    labelKey: "analysis.emptyState.foreshadowLabel",
    promptKey: "analysis.emptyState.foreshadowPrompt",
  },
] as const;

type EmptyStateProps = {
  contextLabel: string | null;
  disabled: boolean;
  onSelectPrompt: (prompt: string) => void;
};

export function EmptyState({
  contextLabel,
  disabled,
  onSelectPrompt,
}: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center gap-5 select-none animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-neutral-900/60 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-lg">
          <Bot className="w-5 h-5 text-neutral-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-fg/85">
            {t("analysis.emptyState.title")}
          </p>
          {contextLabel && (
            <p className="text-[11px] text-neutral-500 mt-1">
              context · {contextLabel}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 max-w-[320px]">
        {SUGGESTED_PROMPTS.map((item) => (
          <button
            key={item.key}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(t(item.promptKey))}
            className="text-[11px] font-medium text-neutral-300 bg-neutral-800/40 hover:bg-neutral-800/70 border border-white/5 hover:border-white/10 rounded-full px-3.5 py-1.5 transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
