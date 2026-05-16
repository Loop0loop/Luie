/**
 * CanvasEmptyState — shown when no scope is selected (or projection has no nodes).
 *
 * P3 shell: simple centered diamond glyph + i18n title/description. P5 will
 * wire in scope-aware variants (no chapter / chapter empty / mode unavailable).
 */
import { useTranslation } from "react-i18next";
import { Diamond } from "lucide-react";

export default function CanvasEmptyState() {
  const { t } = useTranslation();
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted"
      data-testid="canvas-empty-state"
    >
      <Diamond className="h-10 w-10 opacity-40" aria-hidden />
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-medium text-fg">
          {t("canvas.empty.title")}
        </p>
        <p className="max-w-xs text-xs">{t("canvas.empty.description")}</p>
      </div>
    </div>
  );
}
