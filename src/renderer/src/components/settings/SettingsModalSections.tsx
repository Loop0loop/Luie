import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Download,
  Minus,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TFunction } from "i18next";
import type { FontPreset, EditorSettings } from "../../stores/editorStore";
import { EDITOR_FONT_FAMILIES } from "../../../../shared/constants/configs";
import type { WindowMenuBarMode } from "../../../../shared/types";
import { setLanguage } from "../../i18n";

export type SettingsTabId = "editor" | "appearance" | "shortcuts" | "recovery" | "language";

export type ShortcutActionMeta = {
  id: string;
  labelKey: string;
};

export type ShortcutGroupMap = Record<string, ShortcutActionMeta[]>;

export type OptionalFontOption = {
  id: FontPreset;
  label: string;
  family: string;
  stack: string;
  pkg: string;
};

interface ShortcutRowProps {
  actionId: string;
  label: string;
  value: string;
  placeholder: string;
  onChangeAction: (actionId: string, value: string) => void;
  onBlur: () => void;
}

const ShortcutRow = memo(function ShortcutRow({
  actionId,
  label,
  value,
  placeholder,
  onChangeAction,
  onBlur,
}: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-2 group">
      <div className="text-sm text-muted group-hover:text-fg transition-colors">{label}</div>
      <div className="relative w-40">
        <input
          className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-sm font-mono text-fg focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors text-center"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChangeAction(actionId, e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
    </div>
  );
});

interface AppearanceTabProps {
  t: TFunction;
  theme: EditorSettings["theme"];
  themeTemp: EditorSettings["themeTemp"];
  themeContrast: EditorSettings["themeContrast"];
  themeAccent: EditorSettings["themeAccent"];
  themeTexture: boolean;
  uiMode: EditorSettings["uiMode"];
  isMacOS: boolean;
  menuBarMode: WindowMenuBarMode;
  isMenuBarUpdating: boolean;
  onApplySettings: (next: Partial<EditorSettings>) => void;
  onMenuBarModeChange: (mode: WindowMenuBarMode) => void;
}

export const AppearanceTab = memo(function AppearanceTab({
  t,
  theme,
  themeTemp,
  themeContrast,
  themeAccent,
  themeTexture,
  uiMode,
  isMacOS,
  menuBarMode,
  isMenuBarUpdating,
  onApplySettings,
  onMenuBarModeChange,
}: AppearanceTabProps) {
  return (
    <div className="space-y-10 max-w-2xl content-visibility-auto contain-intrinsic-size-[1px_1000px]">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-fg">테마 모드 (Base Theme)</h3>
          <p className="text-sm text-muted mt-1">기본적인 밝기를 선택합니다.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(["light", "sepia", "dark"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onApplySettings({ theme: mode })}
              className={`flex items-center justify-center px-4 py-3 rounded-xl border text-sm font-medium transition-colors duration-150 ${
                theme === mode
                  ? "border-accent text-accent bg-accent/5 ring-1 ring-accent shadow-sm"
                  : "border-border text-muted hover:border-text-tertiary hover:bg-surface-hover"
              }`}
            >
              {mode === "light" && "Light"}
              {mode === "sepia" && "Sepia"}
              {mode === "dark" && "Dark"}
              {theme === mode && <Check className="w-4 h-4 ml-2" />}
            </button>
          ))}
        </div>
      </section>

      <div className="h-px bg-border my-6" />

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-fg">강조 색상 (Accent Color)</h3>
          <p className="text-sm text-muted mt-1">버튼과 강조 요소의 색상을 선택하세요.</p>
        </div>
        <div className="flex gap-4">
          {(["blue", "violet", "green", "amber", "rose", "slate"] as const).map((accent) => (
            <button
              key={accent}
              onClick={() => onApplySettings({ themeAccent: accent })}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                themeAccent === accent ? "ring-2 ring-offset-2 ring-text-primary scale-110" : "hover:scale-110"
              }`}
              style={{
                backgroundColor: `var(--color-bg-${accent}, ${
                  accent === "blue"
                    ? "#3b82f6"
                    : accent === "violet"
                      ? "#8b5cf6"
                      : accent === "green"
                        ? "#10b981"
                        : accent === "amber"
                          ? "#f59e0b"
                          : accent === "rose"
                            ? "#f43f5e"
                            : "#64748b"
                })`,
              }}
              title={accent}
            >
              {themeAccent === accent && <Check className="w-5 h-5 text-white" />}
            </button>
          ))}
        </div>
      </section>

      <div className="h-px bg-border my-6" />

      <div className="grid grid-cols-2 gap-8">
        <section className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-fg">종이 질감 (Texture)</h3>
            <p className="text-sm text-muted mt-1">화면에 미세한 노이즈를 추가하여 종이 질감을 냅니다.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onApplySettings({ themeTexture: !themeTexture })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                themeTexture ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`${
                  themeTexture ? "translate-x-6" : "translate-x-1"
                } inline-block h-4 w-4 transform rounded-full bg-surface shadow-sm transition-transform`}
              />
            </button>
            <span className="text-sm font-medium text-fg">{themeTexture ? "켜짐 (On)" : "꺼짐 (Off)"}</span>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-fg">대비 (Contrast)</h3>
            <p className="text-sm text-muted mt-1">화면의 선명도를 조절합니다.</p>
          </div>
          <div className="flex gap-2">
            {(["soft", "high"] as const).map((c) => (
              <button
                key={c}
                onClick={() => onApplySettings({ themeContrast: c })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  themeContrast === c
                    ? "bg-text-primary text-bg-app border-transparent"
                    : "border-border text-muted hover:text-fg"
                }`}
              >
                {c === "soft" ? "Soft" : "High"}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="h-px bg-border my-6" />

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-fg">{t("settings.section.uiMode")}</h3>
          <p className="text-sm text-muted mt-1">{t("settings.uiMode.description")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["default", "docs", "word", "scrivener"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onApplySettings({ uiMode: mode })}
              className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors duration-150 text-left ${
                (uiMode || "default") === mode
                  ? "border-accent text-accent bg-accent/5 ring-1 ring-accent shadow-sm"
                  : "border-border text-muted hover:border-text-tertiary hover:bg-surface-hover"
              }`}
            >
              <div className="font-semibold mb-0.5">
                {mode === "default" && t("settings.uiMode.default")}
                {mode === "docs" && t("settings.uiMode.docs")}
                {mode === "word" && t("settings.uiMode.word")}
                {mode === "scrivener" && t("settings.uiMode.scrivener")}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="h-px bg-border my-6" />

      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-fg">분위기 (Atmosphere)</h3>
          <p className="text-sm text-muted mt-1">작업 목적에 맞는 색온도를 선택하세요.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => onApplySettings({ themeTemp: "cool" })}
            className={`relative group flex flex-col items-start p-4 rounded-xl border text-left transition-colors duration-150 ${
              themeTemp === "cool" ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500" : "border-border hover:bg-surface-hover"
            }`}
          >
            <span className="text-sm font-semibold text-fg mb-1">차가움 (Cool)</span>
            <span className="text-xs text-muted">집중 / 분석 / 이성적</span>
          </button>

          <button
            onClick={() => onApplySettings({ themeTemp: "neutral" })}
            className={`relative group flex flex-col items-start p-4 rounded-xl border text-left transition-colors duration-150 ${
              themeTemp === "neutral"
                ? "border-text-secondary bg-text-secondary/5 ring-1 ring-text-secondary"
                : "border-border hover:bg-surface-hover"
            }`}
          >
            <span className="text-sm font-semibold text-fg mb-1">중립 (Neutral)</span>
            <span className="text-xs text-muted">기본 / 깔끔함</span>
          </button>

          <button
            onClick={() => onApplySettings({ themeTemp: "warm" })}
            className={`relative group flex flex-col items-start p-4 rounded-xl border text-left transition-colors duration-150 ${
              themeTemp === "warm"
                ? "border-orange-500 bg-orange-500/5 ring-1 ring-orange-500"
                : "border-border hover:bg-surface-hover"
            }`}
          >
            <span className="text-sm font-semibold text-fg mb-1">따뜻함 (Warm)</span>
            <span className="text-xs text-muted">서사 / 감정 / 편안함</span>
          </button>
        </div>
      </section>

      {isMacOS && (
        <>
          <div className="h-px bg-border my-6" />
          <section className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-fg">{t("settings.section.menuBar")}</h3>
              <p className="text-sm text-muted mt-1">{t("settings.menuBar.description")}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onMenuBarModeChange("hidden")}
                disabled={isMenuBarUpdating}
                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors duration-150 ${
                  menuBarMode === "hidden"
                    ? "border-accent text-accent bg-accent/5 ring-1 ring-accent"
                    : "border-border text-muted hover:border-text-tertiary hover:bg-surface-hover"
                } ${isMenuBarUpdating ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {t("settings.menuBar.hide")}
              </button>
              <button
                onClick={() => onMenuBarModeChange("visible")}
                disabled={isMenuBarUpdating}
                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors duration-150 ${
                  menuBarMode === "visible"
                    ? "border-accent text-accent bg-accent/5 ring-1 ring-accent"
                    : "border-border text-muted hover:border-text-tertiary hover:bg-surface-hover"
                } ${isMenuBarUpdating ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {t("settings.menuBar.show")}
              </button>
            </div>
            <p className="text-xs text-muted">{t("settings.menuBar.applyHint")}</p>
          </section>
        </>
      )}
    </div>
  );
});

interface EditorTabProps {
  t: TFunction;
  fontFamily: EditorSettings["fontFamily"];
  fontPreset?: FontPreset;
  localFontSize: number;
  localLineHeight: number;
  optionalFonts: OptionalFontOption[];
  installed: Record<string, boolean>;
  installing: Record<string, boolean>;
  onApplySettings: (next: Partial<EditorSettings>) => void;
  onSetLocalFontSize: (value: number) => void;
  onSetLocalLineHeight: (value: number) => void;
  onInstallFont: (preset: FontPreset, pkg: string) => void;
}

export const EditorTab = memo(function EditorTab({
  t,
  fontFamily,
  fontPreset,
  localFontSize,
  localLineHeight,
  optionalFonts,
  installed,
  installing,
  onApplySettings,
  onSetLocalFontSize,
  onSetLocalLineHeight,
  onInstallFont,
}: EditorTabProps) {
  return (
    <div className="space-y-8 max-w-2xl content-visibility-auto contain-intrinsic-size-[1px_1200px]">
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-fg">{t("settings.section.font")}</h3>
        <div className="grid grid-cols-3 gap-3">
          {EDITOR_FONT_FAMILIES.map((f) => (
            <button
              key={f}
              onClick={() => onApplySettings({ fontFamily: f })}
              className={`p-4 rounded-xl border text-left transition-colors duration-150 ${
                fontFamily === f ? "border-accent ring-1 ring-accent bg-accent/5" : "border-border hover:bg-surface-hover"
              }`}
            >
              <span
                className="text-2xl block mb-2"
                style={{ fontFamily: f === "serif" ? "serif" : f === "mono" ? "monospace" : "sans-serif" }}
              >
                Aa
              </span>
              <span className="text-sm font-medium text-fg capitalize">{f}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="h-px bg-border my-6" />

      <div className="flex flex-col gap-3">
        <div className="text-[13px] font-semibold text-muted uppercase tracking-[0.5px] mb-1">
          {t("settings.section.optionalFonts")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {optionalFonts.map((font) => {
            const isInstalled = installed[font.id];
            const isInstalling = installing[font.id];
            const isActive = fontPreset === font.id;

            return (
              <div
                key={font.id}
                className="flex items-center justify-between px-3 py-2.5 border border-border rounded-[10px] bg-surface hover:border-text-tertiary transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10.5 h-10.5 rounded-lg border border-border flex items-center justify-center text-lg text-fg bg-surface-hover"
                    style={{ fontFamily: font.stack }}
                  >
                    {t("settings.sampleText")}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="text-[13px] font-semibold text-fg">{font.label}</div>
                    <div className="text-[11px] text-subtle">{font.family}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isInstalled ? (
                    <button
                      className="rounded-lg px-2.5 py-1.5 text-xs border border-border bg-surface text-fg cursor-pointer inline-flex items-center gap-1.5 hover:border-active hover:bg-surface-hover disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => onInstallFont(font.id, font.pkg)}
                      disabled={isInstalling}
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isInstalling ? t("settings.optionalFonts.action.installing") : t("settings.optionalFonts.action.install")}
                    </button>
                  ) : isActive ? (
                    <div className="text-xs px-2 py-1 rounded-full text-accent-fg bg-accent font-medium shadow-sm">
                      {t("settings.optionalFonts.action.active")}
                    </div>
                  ) : (
                    <button
                      className="rounded-lg px-2.5 py-1.5 text-xs border border-border bg-surface text-fg cursor-pointer inline-flex items-center gap-1.5 hover:border-active hover:bg-surface-hover"
                      onClick={() => onApplySettings({ fontPreset: font.id })}
                    >
                      {t("settings.optionalFonts.action.apply")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-border my-6" />

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold text-fg">{t("settings.section.fontSize")}</h3>
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
            <span className="text-sm font-medium text-fg w-12 text-center">{localFontSize}px</span>
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
          <h3 className="text-base font-semibold text-fg">{t("settings.section.lineHeight")}</h3>
          <div className="flex items-center gap-3 bg-surface border border-border rounded-lg p-1">
            <button
              onClick={() => {
                const next = Math.max(1.2, Number((localLineHeight - 0.1).toFixed(1)));
                onSetLocalLineHeight(next);
                onApplySettings({ lineHeight: next });
              }}
              className="p-1 hover:bg-element-hover rounded-md text-muted hover:text-fg transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-fg w-12 text-center">{localLineHeight}</span>
            <button
              onClick={() => {
                const next = Math.min(2.4, Number((localLineHeight + 0.1).toFixed(1)));
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

interface ShortcutsTabProps {
  t: TFunction;
  shortcutGroups: ShortcutGroupMap;
  shortcutValues: Record<string, string>;
  shortcutDefaults: Record<string, string>;
  onCommitShortcuts: (nextDrafts: Record<string, string>) => void;
  onResetShortcuts: () => void;
  getShortcutGroupLabel: (key: string) => string;
  getShortcutGroupIcon: (key: string) => LucideIcon;
}

export const ShortcutsTab = memo(function ShortcutsTab({
  t,
  shortcutGroups,
  shortcutValues,
  shortcutDefaults,
  onCommitShortcuts,
  onResetShortcuts,
  getShortcutGroupLabel,
  getShortcutGroupIcon,
}: ShortcutsTabProps) {
  const [shortcutDrafts, setShortcutDrafts] = useState<Record<string, string>>(shortcutValues);
  const shortcutDraftsRef = useRef<Record<string, string>>(shortcutValues);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep drafts aligned with persisted shortcuts without remounting tab
    setShortcutDrafts(shortcutValues);
    shortcutDraftsRef.current = shortcutValues;
  }, [shortcutValues]);

  const handleShortcutDraftChange = useCallback((actionId: string, value: string) => {
    setShortcutDrafts((prev) => {
      if (prev[actionId] === value) {
        return prev;
      }
      const next = { ...prev, [actionId]: value };
      shortcutDraftsRef.current = next;
      return next;
    });
  }, []);

  const handleCommitShortcuts = useCallback(() => {
    onCommitShortcuts(shortcutDraftsRef.current);
  }, [onCommitShortcuts]);

  return (
    <div className="max-w-2xl space-y-8 pb-20 content-visibility-auto contain-intrinsic-size-[1px_1400px]">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-fg">{t("settings.shortcuts.title")}</h3>
        <button onClick={onResetShortcuts} className="text-xs text-subtle hover:text-fg underline">
          {t("settings.shortcuts.reset")}
        </button>
      </div>

      {Object.entries(shortcutGroups).map(([groupKey, actions]) => {
        const Icon = getShortcutGroupIcon(groupKey);
        return (
          actions.length > 0 && (
            <div key={groupKey} className="space-y-3">
              <div className="flex items-center gap-2 text-muted pb-1 border-b border-border/50">
                <Icon className="w-4 h-4" />
                <h4 className="text-sm font-semibold uppercase tracking-wider">{getShortcutGroupLabel(groupKey)}</h4>
              </div>
              <div className="space-y-1">
                {actions.map((action) => (
                  <ShortcutRow
                    key={action.id}
                    actionId={action.id}
                    label={t(action.labelKey)}
                    value={shortcutDrafts[action.id] ?? shortcutDefaults[action.id] ?? ""}
                    placeholder={shortcutDefaults[action.id] ?? ""}
                    onChangeAction={handleShortcutDraftChange}
                    onBlur={handleCommitShortcuts}
                  />
                ))}
              </div>
            </div>
          )
        );
      })}
    </div>
  );
});

interface RecoveryTabProps {
  t: TFunction;
  isRecovering: boolean;
  recoveryMessage: string | null;
  onRunRecovery: (dryRun: boolean) => void;
}

export const RecoveryTab = memo(function RecoveryTab({
  t,
  isRecovering,
  recoveryMessage,
  onRunRecovery,
}: RecoveryTabProps) {
  return (
    <div className="space-y-6 max-w-2xl content-visibility-auto contain-intrinsic-size-[1px_400px]">
      <section className="p-4 bg-surface rounded-xl border border-border">
        <h3 className="text-base font-semibold text-fg mb-2">{t("settings.recovery.title")}</h3>
        <p className="text-sm text-muted mb-4">{t("settings.recovery.description")}</p>
        <div className="flex gap-3">
          <button
            onClick={() => onRunRecovery(true)}
            disabled={isRecovering}
            className="px-4 py-2 bg-element hover:bg-element-hover border border-border rounded-lg text-sm font-medium text-fg transition-colors disabled:opacity-50"
          >
            {t("settings.recovery.dryRun")}
          </button>
          <button
            onClick={() => onRunRecovery(false)}
            disabled={isRecovering}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {isRecovering ? "Running..." : t("settings.recovery.run")}
          </button>
        </div>
        {recoveryMessage && (
          <div className="mt-4 p-3 bg-app rounded-md border border-border text-sm text-fg">{recoveryMessage}</div>
        )}
      </section>
    </div>
  );
});

interface LanguageTabProps {
  t: TFunction;
  language: string;
}

export const LanguageTab = memo(function LanguageTab({ t, language }: LanguageTabProps) {
  return (
    <div className="space-y-6 max-w-2xl content-visibility-auto contain-intrinsic-size-[1px_400px]">
      <section>
        <h3 className="text-base font-semibold text-fg mb-2">{t("settings.section.language")}</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setLanguage("ko")}
            className={`px-4 py-2 rounded-lg border text-sm transition-colors duration-150 ${
              language === "ko" ? "border-accent text-accent bg-accent/5 ring-1 ring-accent" : "border-border text-muted hover:text-fg"
            }`}
          >
            한국어
          </button>
          <button
            onClick={() => setLanguage("en")}
            className={`px-4 py-2 rounded-lg border text-sm transition-colors duration-150 ${
              language === "en" ? "border-accent text-accent bg-accent/5 ring-1 ring-accent" : "border-border text-muted hover:text-fg"
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage("ja")}
            className={`px-4 py-2 rounded-lg border text-sm transition-colors duration-150 ${
              language === "ja" ? "border-accent text-accent bg-accent/5 ring-1 ring-accent" : "border-border text-muted hover:text-fg"
            }`}
          >
            日本語
          </button>
        </div>
      </section>
    </div>
  );
});
