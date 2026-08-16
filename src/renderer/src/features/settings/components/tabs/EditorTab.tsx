import { memo, useMemo, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import type { TFunction } from "i18next";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useShallow } from "zustand/react/shallow";
import { useSystemFonts } from "@renderer/features/editor/hooks/useSystemFonts";
import type { FontFamilyPreset } from "@shared/types";

const FONT_FAMILIES: Array<{ id: FontFamilyPreset; label: string }> = [
  { id: "system-ui", label: "System UI" },
  { id: "serif", label: "Serif" },
  { id: "mono", label: "Mono" },
];
const PRESET_IDS = new Set(FONT_FAMILIES.map((f) => f.id));

interface EditorTabProps {
  t: TFunction;
  localFontSize: number;
  localLineHeight: number;
  localLetterSpacing: number;
  localWordSpacing: number;
  localParagraphSpacing: number;
  onSetLocalFontSize: (value: number) => void;
  onSetLocalLineHeight: (value: number) => void;
  onSetLocalLetterSpacing: (value: number) => void;
  onSetLocalWordSpacing: (value: number) => void;
  onSetLocalParagraphSpacing: (value: number) => void;
}

interface TypographyControlProps {
  label: string;
  description?: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function TypographyControl({
  label,
  description,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: TypographyControlProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-fg">{label}</h3>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
        <span className="shrink-0 text-sm font-medium text-fg tabular-nums w-16 text-right">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent cursor-pointer"
      />
    </div>
  );
}

export const EditorTab = memo(function EditorTab({
  t,
  localFontSize,
  localLineHeight,
  localLetterSpacing,
  localWordSpacing,
  localParagraphSpacing,
  onSetLocalFontSize,
  onSetLocalLineHeight,
  onSetLocalLetterSpacing,
  onSetLocalWordSpacing,
  onSetLocalParagraphSpacing,
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
  const [fontSearch, setFontSearch] = useState("");

  const {
    fonts: systemFonts,
    isLoading: isLoadingSystemFonts,
    isSupported: isSystemFontsSupported,
  } = useSystemFonts();

  const filteredFonts = useMemo(() => {
    const base = systemFonts.filter((f) => !PRESET_IDS.has(f.family as FontFamilyPreset));
    const q = fontSearch.trim().toLowerCase();
    return q ? base.filter((f) => f.family.toLowerCase().includes(q)) : base;
  }, [systemFonts, fontSearch]);

  const previewFontFamily = useMemo(() => {
    if (customFontFamily) return customFontFamily;
    if (fontPreset === "inter") return '"Inter Variable", "Inter", sans-serif';
    if (fontFamily === "serif") return "serif";
    if (fontFamily === "mono") return "monospace";
    if (fontFamily === "system-ui") return undefined;
    return fontFamily;
  }, [customFontFamily, fontPreset, fontFamily]);

  const previewStyle = {
    fontFamily: previewFontFamily,
    fontSize: `${localFontSize}px`,
    lineHeight: localLineHeight,
    letterSpacing: `${localLetterSpacing}em`,
    wordSpacing: `${localWordSpacing}em`,
  } as const;

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
              className={`p-4 rounded-panel border text-left transition-colors duration-150 ${
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
          className={`w-full p-4 rounded-panel border text-left transition-colors duration-150 ${
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

      {isSystemFontsSupported && (
        <>
          <div className="h-px bg-border my-6" />

          <section className="space-y-3">
            <h3 className="text-base font-semibold text-fg">
              {t("settings.section.systemFonts", "System Fonts")}
            </h3>
            {isLoadingSystemFonts ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("loading")}</span>
              </div>
            ) : systemFonts.length > 0 ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={fontSearch}
                    onChange={(e) => setFontSearch(e.target.value)}
                    placeholder={t("settings.systemFonts.search", "폰트 검색…")}
                    className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-panel bg-surface text-fg focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto rounded-panel border border-border divide-y divide-border scrollbar-hide">
                  {filteredFonts.length > 0 ? (
                    filteredFonts.map((font) => {
                      const isSelected =
                        fontFamily === font.family &&
                        !fontPreset &&
                        !customFontFamily;
                      return (
                        <button
                          key={font.family}
                          onClick={() =>
                            onApplySettings({
                              fontFamily: font.family,
                              fontPreset: undefined,
                              customFontFamily: undefined,
                            })
                          }
                          className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors duration-100 ${
                            isSelected
                              ? "bg-accent/10 text-accent"
                              : "hover:bg-surface-hover text-fg"
                          }`}
                        >
                          <span
                            className="text-sm truncate"
                            style={{ fontFamily: font.family }}
                          >
                            {font.family}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 shrink-0 ml-2 text-accent" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-sm text-muted">
                      {t("settings.systemFonts.noResults", "검색 결과가 없습니다")}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted">
                {t("settings.systemFonts.none", "No system fonts available")}
              </div>
            )}
          </section>
        </>
      )}

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
            className="flex-1 px-3 py-2 border border-border rounded-panel bg-surface text-fg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={() => {
              const trimmed = customInput.trim();
              onApplySettings({
                customFontFamily: trimmed || undefined,
                fontPreset: undefined,
              });
            }}
            className="px-4 py-2 bg-accent text-accent-fg rounded-panel text-sm font-medium hover:bg-accent-bg-hover transition-colors"
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
              aria-pressed={spellcheckEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                spellcheckEnabled ? "bg-accent" : "bg-border"
              }`}
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

      <section className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-fg">
            {t("settings.section.fontSize")}
          </h3>
          <div className="rounded-panel border border-border bg-surface p-5">
            <p style={previewStyle} className="text-fg">
              {t("settings.preview.body1", "그는 오래된 서재 한편에 앉아, 먼지 앉은 원고 뭉치를 펼쳤다. 창밖엔 비가 내리고 있었고, 등장인물들의 목소리가 점차 또렷해졌다.")}
            </p>
            <p
              style={{ ...previewStyle, marginTop: `${localParagraphSpacing}em` }}
              className="text-fg"
            >
              {t("settings.preview.body2", "글이란 결국 사람의 목소리를 담는 그릇이다. 오늘도 한 문장, 한 문장씩 써 내려간다.")}
            </p>
          </div>
        </div>

        <TypographyControl
          label={t("settings.section.fontSize")}
          value={localFontSize}
          display={`${localFontSize}px`}
          min={12}
          max={32}
          step={1}
          onChange={(v) => {
            onSetLocalFontSize(v);
            onApplySettings({ fontSize: v });
          }}
        />
        <TypographyControl
          label={t("settings.section.lineHeight")}
          value={localLineHeight}
          display={localLineHeight.toFixed(1)}
          min={1.2}
          max={2.4}
          step={0.1}
          onChange={(v) => {
            onSetLocalLineHeight(v);
            onApplySettings({ lineHeight: Number(v.toFixed(1)) });
          }}
        />
        <TypographyControl
          label={t("settings.section.letterSpacing", "자간")}
          description={t("settings.letterSpacing.description", "글자 사이 간격을 조절합니다")}
          value={localLetterSpacing}
          display={`${localLetterSpacing.toFixed(2)}em`}
          min={0}
          max={0.3}
          step={0.01}
          onChange={(v) => {
            onSetLocalLetterSpacing(v);
            onApplySettings({ letterSpacing: Number(v.toFixed(2)) });
          }}
        />
        <TypographyControl
          label={t("settings.section.wordSpacing", "어간")}
          description={t("settings.wordSpacing.description", "단어 사이 간격을 조절합니다")}
          value={localWordSpacing}
          display={`${localWordSpacing.toFixed(2)}em`}
          min={0}
          max={0.2}
          step={0.01}
          onChange={(v) => {
            onSetLocalWordSpacing(v);
            onApplySettings({ wordSpacing: Number(v.toFixed(2)) });
          }}
        />
        <TypographyControl
          label={t("settings.section.paragraphSpacing", "문단 간격")}
          description={t("settings.paragraphSpacing.description", "엔터 후 문단 사이 간격을 조절합니다")}
          value={localParagraphSpacing}
          display={`${localParagraphSpacing.toFixed(1)}em`}
          min={0}
          max={3.0}
          step={0.1}
          onChange={(v) => {
            onSetLocalParagraphSpacing(v);
            onApplySettings({ paragraphSpacing: Number(v.toFixed(1)) });
          }}
        />
      </section>
    </div>
  );
});
