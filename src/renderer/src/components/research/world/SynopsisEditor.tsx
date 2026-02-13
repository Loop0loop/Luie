
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "../../../stores/projectStore";
import { BufferedTextArea } from "../../common/BufferedInput";

export function SynopsisEditor() {
  const { t } = useTranslation();
  const { currentItem: currentProject, updateProject } = useProjectStore();
  const [status, setStatus] = useState<"draft" | "working" | "locked">("draft");

  if (!currentProject) return null;

  return (
    <div style={{ height: "100%", overflowY: "auto", paddingRight: 8 }}>
      <div
        className="text-lg font-bold text-fg"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{t("world.synopsis.title")}</span>
        <div style={{ display: "flex", gap: 4 }}>
          {/* Status Toggles */}
          {(["draft", "working", "locked"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{
                fontSize: "var(--world-status-font-size)",
                padding: "2px 8px",
                borderRadius: 12,
                border:
                  "1px solid " +
                  (status === s
                    ? "var(--accent-primary)"
                    : "var(--border-default)"),
                background:
                  status === s ? "var(--accent-primary)" : "transparent",
                color: status === s ? "white" : "var(--text-tertiary)",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {t(`world.synopsis.status.${s}`)}
            </button>
          ))}
        </div>
      </div>

      <BufferedTextArea
        className="w-full p-2 bg-element border border-border rounded text-sm text-fg outline-none focus:border-active focus:ring-1 focus:ring-active transition-all font-sans leading-relaxed"
        style={{
          border: "1px solid var(--border-default)",
          padding: 16,
          borderRadius: 4,
          width: "100%",
          marginBottom: 16,
          minHeight: "var(--world-overview-min-height)",
          lineHeight: "var(--world-overview-line-height)",
          fontSize: "var(--world-overview-font-size)",
          backgroundColor:
            status === "locked" ? "var(--bg-secondary)" : "transparent",
          color:
            status === "locked"
              ? "var(--text-secondary)"
              : "var(--text-primary)",
        }}
        placeholder={t("world.synopsis.placeholder")}
        value={currentProject.description || ""}
        readOnly={status === "locked"}
        onSave={(val) => updateProject(currentProject.id, undefined, val)}
      />

      <div
        style={{
          fontSize: "var(--world-hint-font-size)",
          color: "var(--text-tertiary)",
          padding: "0 4px",
        }}
      >
        {t("world.synopsis.hint")}
      </div>
    </div>
  );
}
