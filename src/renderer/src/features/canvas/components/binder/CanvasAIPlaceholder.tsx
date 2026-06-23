/**
 * CanvasAIPlaceholder — AI 탭 플레이스홀더.
 * IPC 없음. UI scaffold 전용.
 */

import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

export default function CanvasAIPlaceholder() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-panel-gap px-6 text-center text-muted">
      <Sparkles className="h-7 w-7 opacity-30" aria-hidden />
      <div className="space-y-1">
        <p className="text-xs font-medium text-fg/60">
          {t("canvas.binder.ai.title")}
        </p>
        <p className="text-[11px] text-subtle">
          {t("canvas.binder.ai.description")}
        </p>
      </div>
    </div>
  );
}
