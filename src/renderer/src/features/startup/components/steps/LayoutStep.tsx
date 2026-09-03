import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { GlobalDragContext } from "@shared/ui/GlobalDragContext";
import { layoutFallback } from "@renderer/features/workspace/components/layout/rootShell";
import type { LayoutChoice } from "../../types/wizard";
import { PreviewBoundary } from "../PreviewBoundary";
import { LayoutLivePreview } from "../preview/LayoutLivePreview";
import { LayoutThumb } from "../preview/LayoutThumb";

interface LayoutStepProps {
  uiMode: LayoutChoice;
  onUiModeChange: (uiMode: LayoutChoice) => void;
  onPrevious: () => void;
  onFinish: () => void;
}

const LAYOUT_OPTIONS = [
  ["default", "layoutDefault"],
  ["docs", "layoutDocs"],
  ["editor", "layoutEditor"],
  ["scrivener", "layoutScrivener"],
] as const;

export function LayoutStep({
  uiMode,
  onUiModeChange,
  onPrevious,
  onFinish,
}: LayoutStepProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50">
      <div
        key={uiMode}
        className="absolute inset-0 animate-in fade-in duration-300"
      >
        <PreviewBoundary
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-app p-6">
              <LayoutThumb id={uiMode} className="h-full max-w-3xl" />
            </div>
          }
        >
          <GlobalDragContext>
            <Suspense fallback={layoutFallback}>
              <LayoutLivePreview uiMode={uiMode} />
            </Suspense>
          </GlobalDragContext>
        </PreviewBoundary>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6">
        {/* Apple HIG Liquid Glass: 반투명 패널과 깊이 있는 블러, 넉넉한 여백의 플로팅 독 */}
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-3.5 rounded-editor-shell border border-border/70 bg-panel/75 px-5 py-3 shadow-panel backdrop-blur-2xl">
          <span className="shrink-0 pr-1 text-sm font-semibold text-fg">
            {t("startupWizard.onboarding.layoutTitle")}
          </span>
          <div className="flex gap-2" role="radiogroup">
            {LAYOUT_OPTIONS.map(([id, labelKey]) => (
              <button
                key={id}
                type="button"
                aria-pressed={uiMode === id}
                onClick={() => onUiModeChange(id)}
                className={`flex w-[112px] flex-col gap-1.5 rounded-control border p-2 text-left transition-all duration-150 ${
                  uiMode === id
                    ? "border-accent ring-2 ring-accent/30 bg-surface/60 shadow-xs scale-[1.02]"
                    : "border-border/70 bg-element/20 hover:border-border-active hover:bg-surface/40"
                }`}
              >
                <LayoutThumb id={id} className="h-8.5 w-full" />
                <span className="truncate text-xs font-medium">
                  {t(`startupWizard.onboarding.${labelKey}`)}
                </span>
              </button>
            ))}
          </div>
          <span aria-hidden className="mx-0.5 h-8 w-px self-center bg-border/80" />
          <div className="flex items-center gap-2 self-center">
            <button
              type="button"
              onClick={onPrevious}
              className="rounded-control border border-border/70 bg-surface/70 px-4 py-1.5 text-sm font-medium text-fg shadow-xs transition-all hover:bg-surface hover:border-border active:scale-[0.98]"
            >
              {t("startupWizard.onboarding.previous")}
            </button>
            <button
              type="button"
              onClick={onFinish}
              className="rounded-control bg-accent px-5 py-1.5 text-sm font-medium text-on-accent shadow-control transition-all hover:bg-accent-bg-hover active:scale-[0.98]"
            >
              {t("startupWizard.onboarding.finish")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
