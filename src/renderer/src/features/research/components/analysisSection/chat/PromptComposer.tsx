import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, Check, Minimize2, Minus, Plus, Square } from "lucide-react";
import type { LlmRuntimeInfo, UtilitySidecarStatus } from "@shared/types";
import type {
  MemoryScope,
  RuntimePreference,
  SearchOptimizationMode,
} from "../shared/types";
import { RuntimeStatusDot } from "../runtime/RuntimeStatusDot";

const LLM_PREFERENCES = [
  "auto",
  "sidecar",
  "ollama",
  "openai",
  "gemini",
] as const;

const SEARCH_OPTIMIZATION_MODES: Array<{
  mode: SearchOptimizationMode;
  label: string;
  descriptionKey: string;
}> = [
  {
    mode: "low-end",
    label: "Low-end",
    descriptionKey: "analysis.composer.searchModes.lowEnd",
  },
  {
    mode: "standard",
    label: "Standard",
    descriptionKey: "analysis.composer.searchModes.standard",
  },
  {
    mode: "high-end",
    label: "High-end",
    descriptionKey: "analysis.composer.searchModes.highEnd",
  },
  {
    mode: "quality",
    label: "Quality",
    descriptionKey: "analysis.composer.searchModes.quality",
  },
];

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
  searchOptimizationMode: SearchOptimizationMode;
  onApplySearchOptimizationMode: (mode: SearchOptimizationMode) => void;
  memoryScope: MemoryScope;
  onChangeMemoryScope: (scope: MemoryScope) => void;
  timelineChapter?: {
    order: number;
    title: string;
  };
  summaryActive: boolean;
  onToggleSummary: () => void;
  floating?: boolean;
  onMinimize?: () => void;
  onDock?: () => void;
};

const menuRowClass =
  "w-full px-3.5 py-2 text-xs text-left hover:bg-white/5 flex items-center justify-between text-neutral-300 transition-colors rounded-lg";
const sectionLabelClass =
  "px-3.5 pt-2 pb-1 text-[9px] font-bold text-neutral-500 tracking-widest uppercase";

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
  searchOptimizationMode,
  onApplySearchOptimizationMode,
  memoryScope,
  onChangeMemoryScope,
  timelineChapter,
  summaryActive,
  onToggleSummary,
  floating = false,
  onMinimize,
  onDock,
}: PromptComposerProps) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const sendDisabled = disabled || (!isStreaming && !input.trim());
  const timelineChapterLabel = timelineChapter
    ? `${timelineChapter.order}화 · ${timelineChapter.title}`
    : null;
  const timelineScopeLabel =
    memoryScope === "with-prior"
      ? t("analysis.composer.timelineWithPrior")
      : t("analysis.composer.timelineCurrentOnly");

  return (
    <div className="flex items-center gap-1.5 rounded-[26px] bg-[#2a2a2a]/80 backdrop-blur-xl px-2 py-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.35)] transition-all duration-300">
      {/* + 메뉴 — 서사 요약 / LLM Route / Memory Scope 통합 */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowMenu((prev) => !prev)}
          className={`flex w-8 h-8 items-center justify-center rounded-full transition-all duration-150 active:scale-90 ${
            showMenu
              ? "bg-white/15 text-fg"
              : "text-neutral-400 hover:bg-white/10 hover:text-fg"
          }`}
          title={t("analysis.composer.options")}
        >
          <Plus className="w-5 h-5 shrink-0" />
        </button>

        {showMenu && (
          <div className="absolute bottom-11 left-0 w-52 rounded-2xl bg-[#1a1a1a]/95 backdrop-blur-2xl shadow-2xl p-1.5 z-dropdown animate-[fadeIn_0.15s_ease-out]">
            <button
              type="button"
              onClick={() => {
                onToggleSummary();
                setShowMenu(false);
              }}
              className={menuRowClass}
            >
              <span className="font-medium">{t("analysis.composer.narrativeSummary")}</span>
              {summaryActive && <Check className="w-3.5 h-3.5 text-fg/80" />}
            </button>

            <div className="h-[1px] bg-white/5 my-1" />
            <div className={sectionLabelClass}>LLM Route</div>
            {LLM_PREFERENCES.map((pref) => (
              <button
                key={pref}
                type="button"
                onClick={() => {
                  onApplyRuntimePreference(pref);
                  setShowMenu(false);
                }}
                className={menuRowClass}
              >
                <span className="font-medium">
                  {getLlmPreferenceLabel(pref)}
                </span>
                {runtimePreference === pref && (
                  <Check className="w-3.5 h-3.5 text-fg/80" />
                )}
              </button>
            ))}

            <div className="h-[1px] bg-white/5 my-1" />
            <div className={sectionLabelClass}>Search Mode</div>
            {SEARCH_OPTIMIZATION_MODES.map((item) => (
              <button
                key={item.mode}
                type="button"
                onClick={() => {
                  onApplySearchOptimizationMode(item.mode);
                  setShowMenu(false);
                }}
                className={menuRowClass}
              >
                <span className="min-w-0">
                  <span className="block font-medium">{item.label}</span>
                  <span className="block text-[10px] text-neutral-500">
                    {t(item.descriptionKey)}
                  </span>
                </span>
                {searchOptimizationMode === item.mode && (
                  <Check className="w-3.5 h-3.5 text-fg/80" />
                )}
              </button>
            ))}

            <div className="h-[1px] bg-white/5 my-1" />
            <div className={sectionLabelClass}>Memory Scope</div>
            <button
              type="button"
              onClick={() => {
                onChangeMemoryScope("current-only");
                setShowMenu(false);
              }}
              className={menuRowClass}
            >
              <span className="font-medium">{t("analysis.composer.currentChapterOnly")}</span>
              {memoryScope === "current-only" && (
                <Check className="w-3.5 h-3.5 text-fg/80" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeMemoryScope("with-prior");
                setShowMenu(false);
              }}
              className={menuRowClass}
            >
              <span className="font-medium">{t("analysis.composer.currentAndPrior")}</span>
              {memoryScope === "with-prior" && (
                <Check className="w-3.5 h-3.5 text-fg/80" />
              )}
            </button>
          </div>
        )}
      </div>

      {timelineChapterLabel && (
        <div className="hidden min-w-0 max-w-[180px] shrink md:block">
          <div className="truncate text-[10px] font-medium leading-tight text-neutral-300">
            {t("analysis.composer.timelineBasis", {
              chapter: timelineChapterLabel,
            })}
          </div>
          <div className="truncate text-[9px] leading-tight text-neutral-500">
            {timelineScopeLabel}
          </div>
        </div>
      )}

      {/* 입력 */}
      <textarea
        className="flex-1 text-[13px] bg-transparent border-none resize-none text-fg/90 placeholder:text-neutral-500/80 focus:outline-none min-h-[24px] max-h-[120px] py-1.5 px-1 align-middle"
        placeholder={t("analysis.composer.placeholder")}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        disabled={disabled}
      />

      {/* 런타임 상태 점 */}
      <RuntimeStatusDot runtimeInfo={runtimeInfo} sidecarStatus={sidecarStatus} />

      {/* 플로팅 창 컨트롤 */}
      {floating && (
        <>
          <button
            type="button"
            data-testid="minimize-to-fab"
            onClick={onMinimize}
            className="p-1.5 rounded-full text-neutral-500 hover:text-fg hover:bg-white/10 transition-all duration-150 active:scale-90 shrink-0"
            title={t("analysis.composer.minimize")}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            data-testid="view-mode-toggle"
            onClick={onDock}
            className="p-1.5 rounded-full text-neutral-500 hover:text-fg hover:bg-white/10 transition-all duration-150 active:scale-90 shrink-0"
            title={t("analysis.viewMode.switchToDock")}
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}

      {/* 전송 / 중단 */}
      <button
        type="button"
        onClick={isStreaming ? onStop : onSend}
        disabled={sendDisabled}
        className="w-8 h-8 rounded-full bg-white text-black hover:bg-neutral-200 disabled:bg-neutral-700/60 disabled:text-neutral-500 flex items-center justify-center shadow-md disabled:shadow-none transition-all duration-150 hover:scale-105 active:scale-95 shrink-0"
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
