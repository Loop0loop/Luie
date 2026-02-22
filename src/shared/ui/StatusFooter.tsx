import { useTranslation } from "react-i18next";
import { Loader2, Check, Share } from "lucide-react";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";

interface StatusFooterProps {
  onOpenExport?: () => void;
  hideExport?: boolean;
}

export default function StatusFooter({ onOpenExport, hideExport }: StatusFooterProps) {
  const { t } = useTranslation();
  const { wordCount, charCount, saveStatus } = useEditorStore();

  return (
    <div className="h-8 border-t border-border flex items-center justify-end gap-4 px-4 text-xs text-muted-foreground bg-background shrink-0 select-none z-20">
      {/* Save Status Indicator */}
      <span className="flex items-center gap-1.5 min-w-15">
        {saveStatus === "saving" && (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{t("editor.status.saving")}</span>
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <Check className="w-3 h-3 text-success-fg" />
            <span>{t("editor.status.saved")}</span>
          </>
        )}
        {saveStatus === "error" && (
          <span className="text-danger-fg">{t("editor.status.error")}</span>
        )}
      </span>

      <span className="mr-auto font-medium">
        {t("editor.status.charLabel")} {charCount}
        {t("editor.status.separator")}
        {t("editor.status.wordLabel")} {wordCount}
      </span>

      {!hideExport && onOpenExport && (
        <button
          className="flex items-center gap-1.5 px-2 py-1 -mr-2 rounded hover:bg-hover hover:text-fg transition-colors"
          onClick={onOpenExport}
          title={t("editor.actions.quickExportTitle")}
        >
          <Share className="w-3.5 h-3.5" />
          <span className="font-medium">{t("editor.actions.quickExport")}</span>
        </button>
      )}
    </div>
  );
}
