/**
 * CanvasBinderEmpty — shown in the BinderSidebar canvas tab when no node
 * is selected.
 */
import { useTranslation } from "react-i18next";
import { MousePointerClick } from "lucide-react";

export default function CanvasBinderEmpty() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted">
      <MousePointerClick className="h-8 w-8 opacity-40" aria-hidden />
      <p className="text-xs">{t("canvas.status.empty")}</p>
    </div>
  );
}
