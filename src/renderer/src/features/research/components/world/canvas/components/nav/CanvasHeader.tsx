import { useTranslation } from "react-i18next";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";

export function CanvasHeader() {
  const { t } = useTranslation();
  const setWorldTab = useUIStore((s) => s.setWorldTab);

  return (
    <div className="flex w-full select-none items-center justify-end border-b border-border bg-panel px-2 py-1.5">
      <div className="flex h-7 items-center rounded-md border border-border bg-muted/20 p-0.5 text-xs font-medium">
        <button
          type="button"
          onClick={() => setWorldTab("terms")}
          className="flex h-full items-center rounded px-2.5 text-muted transition-colors hover:text-fg"
        >
          {t("toolbar.editor", "에디터")}
        </button>
        <button
          type="button"
          className="flex h-full items-center rounded bg-panel px-2.5 text-fg shadow-sm"
        >
          {t("toolbar.canvas", "캔버스")}
        </button>
      </div>
    </div>
  );
}
