import { Bot } from "lucide-react";

const SUGGESTED_PROMPTS = [
  { label: "이번 챕터 요약", prompt: "이번 챕터를 한 문단으로 요약해줘." },
  { label: "인물 관계 정리", prompt: "등장인물들의 관계를 정리해줘." },
  {
    label: "설정 충돌 점검",
    prompt: "이전 설정과 충돌하는 부분이 있는지 점검해줘.",
  },
  {
    label: "복선 점검",
    prompt: "아직 회수되지 않은 복선이 있는지 알려줘.",
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
  return (
    <div className="flex flex-col items-center justify-center gap-5 select-none animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-neutral-900/60 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-lg">
          <Bot className="w-5 h-5 text-neutral-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-fg/85">
            원고에 대해 무엇이든 물어보세요
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
            key={item.label}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(item.prompt)}
            className="text-[11px] font-medium text-neutral-300 bg-neutral-800/40 hover:bg-neutral-800/70 border border-white/5 hover:border-white/10 rounded-full px-3.5 py-1.5 transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
