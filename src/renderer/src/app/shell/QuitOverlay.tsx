import { useTranslation } from "react-i18next";

import type { AppQuitPhasePayload } from "@shared/types/index.js";

export function QuitOverlay({
  quitPhase,
}: {
  quitPhase: AppQuitPhasePayload | null;
}) {
  const { t } = useTranslation();
  const shouldBlockUiForQuit =
    quitPhase !== null &&
    quitPhase.phase !== "idle" &&
    quitPhase.phase !== "aborted" &&
    quitPhase.phase !== "completed";

  if (!shouldBlockUiForQuit) return null;

  const quitOverlayMessage = quitPhase?.message ?? t("bootstrap.initializing");

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-panel border border-border bg-panel p-6 shadow-lg">
        <p className="text-base font-semibold text-fg">{t("bootstrap.quit")}</p>
        <p className="mt-2 text-sm text-muted">{quitOverlayMessage}</p>
      </div>
    </div>
  );
}
