import { useTranslation } from "react-i18next";
import { CANVAS_TOOLBAR_HEIGHT_PX } from "@shared/constants/layoutSizing";

export default function GraphToolbar() {
  const { t } = useTranslation();

  return (
    <div
      className="flex shrink-0 items-center border-b border-border/40 bg-sidebar px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80"
      style={{ height: CANVAS_TOOLBAR_HEIGHT_PX }}
      data-testid="graph-toolbar"
    >
      {t("canvas.activity.graph")}
    </div>
  );
}
