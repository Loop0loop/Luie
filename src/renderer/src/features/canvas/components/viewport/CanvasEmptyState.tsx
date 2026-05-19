/**
 * CanvasEmptyState — 캔버스 빈 상태 UI.
 *
 * variant:
 *   "no-scope"  — 화(챕터)가 선택되지 않은 상태 (기본값)
 *   "no-nodes"  — 화는 선택됐지만 연결된 엔티티가 없는 상태
 */

import { useTranslation } from "react-i18next";
import { Diamond, Unlink } from "lucide-react";
import type { CanvasEmptyStateVariant } from "../../types";

interface CanvasEmptyStateProps {
  variant?: CanvasEmptyStateVariant;
}

export default function CanvasEmptyState({
  variant = "no-scope",
}: CanvasEmptyStateProps) {
  const { t } = useTranslation();

  const isNoNodes = variant === "no-nodes";

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted"
      data-testid="canvas-empty-state"
      data-variant={variant}
    >
      {isNoNodes ? (
        <Unlink className="h-10 w-10 opacity-40" aria-hidden />
      ) : (
        <Diamond className="h-10 w-10 opacity-40" aria-hidden />
      )}

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-medium text-fg">
          {isNoNodes
            ? t("canvas.empty.noNodes.title")
            : t("canvas.empty.title")}
        </p>
        <p className="max-w-xs text-xs">
          {isNoNodes
            ? t("canvas.empty.noNodes.description")
            : t("canvas.empty.description")}
        </p>
      </div>
    </div>
  );
}
