import { memo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { TFunction } from "i18next";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useShallow } from "zustand/react/shallow";

const FONT_FAMILIES = [
  { id: "system-ui", label: "System UI" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Mono" },
] as const;

interface EditorTabProps {
  t: TFunction;
  localFontSize: number;
  localLineHeight: number;
  onSetLocalFontSize: (value: number) => void;
  onSetLocalLineHeight: (value: number) => void;
}

export const EditorTab = memo(function EditorTab({
  t,
  localFontSize,
  localLineHeight,
  onSetLocalFontSize,
  onSetLocalLineHeight,
}: EditorTabProps) {
  const {
    fontFamily,
    fontPreset,
    customFontFamily,
    spellcheckEnabled,
    updateSettings: onApplySettings,
  } = useEditorStore(
    useShallow((state) => ({
      fontFamily: state.fontFamily,
      fontPreset: state.fontPreset,
      customFontFamily: state.customFontFamily,
      spellcheckEnabled: state.spellcheckEnabled,
      updateSettings: state.updateSettings,
    })),
  );

  const [customInput, setCustomInput] = useState(customFontFamily ?? "");

  return (
    <div className="space-y-8 max-w-2xl">
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-fg">
          {t("settings.section.font")}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {FONT_FAMILIES.map((f) => (
            <button
              key={f.id}
              onClick={() =>
                onApplySettings({
                  fontFamily: f.id,
                  fontPreset: undefined,
                  customFontFamily: undefined,
                })
              }
              className={`p-4 rounded-xl border text-left transition-colors duration-150 ${
                fontFamily === f.id && !fontPreset && !customFontFamily
                  ? "border-accent ring-1 ring-accent bg-accent/5"
                  : "border-border hover:bg-surface-hover"
              }`}
            >
              <span
                className="text-2xl block mb-2"
                style={{
                  fontFamily:
                    f.id === "serif"
                      ? "serif"
                      : f.id === "mono"
                        ? "monospace"
                        : "system-ui",
                }}
              >
                Aa
              </span>
              <span className="text-sm font-medium text-fg">{f.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="h-px bg-border my-6" />

      <section className="space-y-4">
        <h3 className="text-base font-semibold text-fg">
          {t("settings.section.optionalFont")}
        </h3>
        <button
          onClick={() =>
            onApplySettings({
              fontPreset: fontPreset === "inter" ? undefined : "inter",
              customFontFamily: undefined,
            })
          }
          className={`w-full p-4 rounded-xl border text-left transition-colors duration-150 ${
            fontPreset === "inter"
              ? "border-accent ring-1 ring-accent bg-accent/5"
              : "border-border hover:bg-surface-hover"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-2xl"
              style={{ fontFamily: '"Inter Variable", "Inter", sans-serif' }}
            >
              Aa
            </span>
            <div>
              <div className="text-sm font-medium text-fg">Inter</div>
              <div className="text-xs text-subtle">Bundled UI font</div>
            </div>
          </div>
        </button>
      </section>

      <div className="h-px bg-border my-6" />

      <section className="space-y-4">
        <h3 className="text-base font-semibold text-fg">
          {t("settings.section.customFont")}
        </h3>
        <p className="text-sm text-muted">
          {t("settings.customFont.description")}
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder={t("settings.customFont.placeholder")}
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-surface text-fg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={() => {
              const trimmed = customInput.trim();
              onApplySettings({
                customFontFamily: trimmed || undefined,
                fontPreset: undefined,
              });
            }}
            className="px-4 py-2 bg-accent text-accent-fg rounded-lg text-sm font-medium hover:bg-accent-bg-hover transition-colors"
          >
            {t("settings.customFont.apply")}
          </button>
        </div>
        {customFontFamily && (
          <div className="text-xs text-muted">
            {t("settings.customFont.active")}:{" "}
            <span className="font-mono">{customFontFamily}</span>
          </div>
        )}
      </section>

      <div className="h-px bg-border my-6" />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-fg">
              {t("settings.section.spellcheck")}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {t("settings.spellcheck.description")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                onApplySettings({ spellcheckEnabled: !spellcheckEnabled })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${spellcheckEnabled ? "bg-accent" : "bg-border"}`}
            >
              <span
                className={`${spellcheckEnabled ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-surface shadow-sm transition-transform`}
              />
            </button>
            <span className="w-12 text-right text-sm font-medium text-fg">
              {spellcheckEnabled
                ? t("settings.spellcheck.on")
                : t("settings.spellcheck.off")}
            </span>
          </div>
        </div>
      </section>

      <div className="h-px bg-border my-6" />

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold text-fg">
            {t("settings.section.fontSize")}
          </h3>
          <div className="flex items-center gap-3 bg-surface border border-border rounded-lg p-1">
            <button
              onClick={() => {
                const next = Math.max(12, localFontSize - 1);
                onSetLocalFontSize(next);
                onApplySettings({ fontSize: next });
              }}
              className="p-1 hover:bg-element-hover rounded-md text-muted hover:text-fg transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-fg w-12 text-center">
              {localFontSize}px
            </span>
            <button
              onClick={() => {
                const next = Math.min(32, localFontSize + 1);
                onSetLocalFontSize(next);
                onApplySettings({ fontSize: next });
              }}
              className="p-1 hover:bg-element-hover rounded-md text-muted hover:text-fg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold text-fg">
            {t("settings.section.lineHeight")}
          </h3>
          <div className="flex items-center gap-3 bg-surface border border-border rounded-lg p-1">
            <button
              onClick={() => {
                const next = Math.max(
                  1.2,
                  Number((localLineHeight - 0.1).toFixed(1)),
                );
                onSetLocalLineHeight(next);
                onApplySettings({ lineHeight: next });
              }}
              className="p-1 hover:bg-element-hover rounded-md text-muted hover:text-fg transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-fg w-12 text-center">
              {localLineHeight}
            </span>
            <button
              onClick={() => {
                const next = Math.min(
                  2.4,
                  Number((localLineHeight + 0.1).toFixed(1)),
                );
                onSetLocalLineHeight(next);
                onApplySettings({ lineHeight: next });
              }}
              className="p-1 hover:bg-element-hover rounded-md text-muted hover:text-fg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
});
