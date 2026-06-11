import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  Layers,
  Plus,
  ScrollText,
  Square,
} from "lucide-react";
import type { LlmRuntimeInfo, UtilitySidecarStatus } from "@shared/types";
import type { MemoryScope, RuntimePreference } from "./types";
import { RuntimeStatusDot } from "./RuntimeStatusDot";

const LLM_PREFERENCES = [
  "auto",
  "sidecar",
  "ollama",
  "openai",
  "gemini",
] as const;

function getLlmPreferenceLabel(pref: RuntimePreference): string {
  switch (pref) {
    case "auto":
      return "Auto";
    case "sidecar":
      return "Local (Sidecar)";
    case "ollama":
      return "Local (Ollama)";
    case "openai":
      return "GPT (OpenAI)";
    case "gemini":
      return "Gemini";
    default:
      return pref;
  }
}

type PromptComposerProps = {
  input: string;
  setInput: (value: string) => void;
  isStreaming: boolean;
  disabled: boolean;
  onSend: () => void;
  onStop: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  runtimeInfo: LlmRuntimeInfo | null;
  sidecarStatus: UtilitySidecarStatus | null;
  runtimePreference: RuntimePreference;
  onApplyRuntimePreference: (pref: RuntimePreference) => void;
  memoryScope: MemoryScope;
  onChangeMemoryScope: (scope: MemoryScope) => void;
  summaryActive: boolean;
  onToggleSummary: () => void;
};

export function PromptComposer({
  input,
  setInput,
  isStreaming,
  disabled,
  onSend,
  onStop,
  onKeyDown,
  runtimeInfo,
  sidecarStatus,
  runtimePreference,
  onApplyRuntimePreference,
  memoryScope,
  onChangeMemoryScope,
  summaryActive,
  onToggleSummary,
}: PromptComposerProps) {
  const [showLlmPopover, setShowLlmPopover] = useState(false);
  const [showMemoryPopover, setShowMemoryPopover] = useState(false);
  const llmRef = useRef<HTMLDivElement>(null);
  const memoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showLlmPopover && !showMemoryPopover) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (llmRef.current && !llmRef.current.contains(event.target as Node)) {
        setShowLlmPopover(false);
      }
      if (
        memoryRef.current &&
        !memoryRef.current.contains(event.target as Node)
      ) {
        setShowMemoryPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLlmPopover, showMemoryPopover]);

  const sendDisabled = disabled || (!isStreaming && !input.trim());

  return (
    <div className="bg-[#212121]/90 dark:bg-[#1f1f1f]/95 border border-neutral-800 shadow-[0_12px_32px_rgba(0,0,0,0.35)] rounded-3xl px-3 py-2 flex items-center gap-1.5 transition-all duration-300 focus-within:border-neutral-700/80 backdrop-blur-xl">
      {/* 서사 요약 드로어 토글 */}
      <button
        type="button"
        onClick={onToggleSummary}
        className={`flex w-7.5 h-7.5 items-center justify-center rounded-full border transition-all duration-150 active:scale-95 shrink-0 ${
          summaryActive
            ? "bg-neutral-700 border-neutral-600 text-fg"
            : "bg-neutral-800 border-neutral-700/40 text-neutral-400 hover:bg-neutral-750 hover:text-fg"
        }`}
        title="서사 요약"
      >
        <ScrollText className="w-3.5 h-3.5 shrink-0" />
      </button>

      {/* LLM Route 선택 */}
      <div className="relative shrink-0" ref={llmRef}>
        <button
          type="button"
          onClick={() => {
            setShowLlmPopover((prev) => !prev);
            setShowMemoryPopover(false);
          }}
          className="flex w-7.5 h-7.5 items-center justify-center rounded-full bg-neutral-800 hover:bg-neutral-750 border border-neutral-700/40 text-neutral-400 hover:text-fg transition-all duration-150 active:scale-95"
          title={`LLM Route: ${getLlmPreferenceLabel(runtimePreference)}`}
        >
          <Plus className="w-4 h-4 shrink-0" />
        </button>

        {showLlmPopover && (
          <div className="absolute bottom-12 left-0 w-44 rounded-2xl border border-neutral-800 bg-[#1a1a1a]/95 backdrop-blur-2xl shadow-2xl py-1.5 z-dropdown animate-[fadeIn_0.15s_ease-out]">
            <div className="px-3.5 py-1 text-[9px] font-bold text-neutral-500 tracking-widest uppercase">
              LLM Route
            </div>
            <div className="h-[1px] bg-neutral-800 my-1.5" />
            {LLM_PREFERENCES.map((pref) => (
              <button
                key={pref}
                type="button"
                onClick={() => {
                  onApplyRuntimePreference(pref);
                  setShowLlmPopover(false);
                }}
                className="w-full px-3.5 py-2 text-xs text-left hover:bg-neutral-800 flex items-center justify-between text-neutral-300 transition-colors"
              >
                <span className="font-medium">
                  {getLlmPreferenceLabel(pref)}
                </span>
                {runtimePreference === pref && (
                  <Check className="w-3.5 h-3.5 text-fg/80" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Memory Scope 선택 */}
      <div className="relative shrink-0" ref={memoryRef}>
        <button
          type="button"
          onClick={() => {
            setShowMemoryPopover((prev) => !prev);
            setShowLlmPopover(false);
          }}
          className={`flex w-7.5 h-7.5 items-center justify-center rounded-full border transition-all duration-150 active:scale-95 ${
            memoryScope === "with-prior"
              ? "bg-neutral-700 border-neutral-600 text-fg"
              : "bg-neutral-800 border-neutral-700/40 text-neutral-400 hover:bg-neutral-750 hover:text-fg"
          }`}
          title={`Memory Scope: ${
            memoryScope === "with-prior" ? "현재+과거" : "현재만"
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
        </button>

        {showMemoryPopover && (
          <div className="absolute bottom-12 left-0 w-40 rounded-2xl border border-neutral-800 bg-[#1a1a1a]/95 backdrop-blur-2xl shadow-2xl py-1.5 z-dropdown animate-[fadeIn_0.15s_ease-out]">
            <div className="px-3.5 py-1 text-[9px] font-bold text-neutral-500 tracking-widest uppercase">
              Memory Scope
            </div>
            <div className="h-[1px] bg-neutral-800 my-1.5" />
            <button
              type="button"
              onClick={() => {
                onChangeMemoryScope("current-only");
                setShowMemoryPopover(false);
              }}
              className="w-full px-3.5 py-2 text-xs text-left hover:bg-neutral-800 flex items-center justify-between text-neutral-300 transition-colors"
            >
              <span className="font-medium">현재 챕터만</span>
              {memoryScope === "current-only" && (
                <Check className="w-3.5 h-3.5 text-fg/80" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeMemoryScope("with-prior");
                setShowMemoryPopover(false);
              }}
              className="w-full px-3.5 py-2 text-xs text-left hover:bg-neutral-800 flex items-center justify-between text-neutral-300 transition-colors"
            >
              <span className="font-medium">현재 + 과거</span>
              {memoryScope === "with-prior" && (
                <Check className="w-3.5 h-3.5 text-fg/80" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* 입력 */}
      <textarea
        className="flex-1 text-[13px] bg-transparent border-none resize-none text-fg/90 placeholder:text-neutral-500/80 focus:outline-none min-h-[24px] max-h-[120px] py-1.5 px-1 align-middle"
        placeholder="무엇이든 부탁하세요"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        disabled={disabled}
      />

      {/* 런타임 상태 점 */}
      <RuntimeStatusDot
        runtimeInfo={runtimeInfo}
        sidecarStatus={sidecarStatus}
      />

      {/* 전송 / 중단 */}
      <button
        type="button"
        onClick={isStreaming ? onStop : onSend}
        disabled={sendDisabled}
        className="w-7.5 h-7.5 rounded-full bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-800 disabled:text-neutral-600 flex items-center justify-center shadow-md disabled:shadow-none transition-all duration-150 hover:scale-105 active:scale-95 shrink-0"
      >
        {isStreaming ? (
          <Square className="w-3.5 h-3.5 fill-current" />
        ) : (
          <ArrowUp className="w-4 h-4 stroke-[2.5]" />
        )}
      </button>
    </div>
  );
}
