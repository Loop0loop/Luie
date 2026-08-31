import { useTranslation } from "react-i18next";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useAnalysisStore } from "@renderer/features/research/stores/analysisStore";
import AnalysisSection from "@renderer/features/research/components/AnalysisSection";

export function FloatingAnalysisPanel() {
  const { t } = useTranslation();
  const { viewMode, isMinimized, setMinimized } = useAnalysisStore(
    useShallow((state) => ({
      viewMode: state.viewMode,
      isMinimized: state.isMinimized,
      setMinimized: state.setMinimized,
    })),
  );

  if (viewMode !== "floatingView") return null;

  if (isMinimized) {
    return (
      <button
        type="button"
        data-testid="analysis-minimized-fab"
        onClick={() => setMinimized(false)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-panel/80 dark:bg-panel/70 border border-border text-fg backdrop-blur-xl shadow-panel flex items-center justify-center z-modal hover:scale-110 active:scale-95 transition-[colors,transform,box-shadow] duration-300 ease-out"
        title={t("analysis.title")}
        aria-label={t("analysis.title")}
      >
        <Sparkles aria-hidden="true" className="w-5 h-5 text-accent" />
      </button>
    );
  }

  return (
    <Suspense fallback={null}>
      <AnalysisSection />
    </Suspense>
  );
}
