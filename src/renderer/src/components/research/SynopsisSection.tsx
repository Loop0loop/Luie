import { useTranslation } from "react-i18next";
import { useProjectStore } from "../../stores/projectStore";

export default function SynopsisSection() {
  const { t } = useTranslation();
  const { currentProject } = useProjectStore();

  return (
    <div style={{ padding: "var(--context-panel-section-padding, 16px)" }}>
      <div
        style={{
          fontSize: "var(--context-panel-header-font-size, 14px)",
          fontWeight: "var(--font-weight-semibold, 600)",
          color: "var(--text-secondary, #444746)",
          marginBottom: "var(--context-panel-section-margin-bottom, 12px)",
        }}
      >
        {t("context.synopsisHeader")}
      </div>
      <textarea
        className="w-full border border-border rounded-lg p-3 text-sm text-fg bg-element resize-none font-sans leading-relaxed min-h-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder={t("context.placeholder.synopsis")}
        value={currentProject?.description || ""}
        readOnly
      />
    </div>
  );
}
