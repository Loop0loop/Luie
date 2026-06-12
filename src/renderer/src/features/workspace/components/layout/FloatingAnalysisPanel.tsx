import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useAnalysisStore } from "@renderer/features/research/stores/analysisStore";
import AnalysisSection from "@renderer/features/research/components/AnalysisSection";

export function FloatingAnalysisPanel() {
  const { viewMode, isOpen, isMinimized, setMinimized } = useAnalysisStore(
    useShallow((state) => ({
      viewMode: state.viewMode,
      isOpen: state.isOpen,
      isMinimized: state.isMinimized,
      setMinimized: state.setMinimized,
    })),
  );

  if (viewMode !== "floatingView" || !isOpen) return null;

  if (isMinimized) {
    return (
      <div
        data-testid="analysis-minimized-fab"
        onClick={() => setMinimized(false)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-accent hover:bg-accent/90 text-white flex items-center justify-center shadow-lg cursor-pointer z-[9999] hover:scale-110 active:scale-95 transition-all duration-300 ease-out"
        title="원고 분석 열기"
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <AnalysisSection />
    </Suspense>
  );
}
