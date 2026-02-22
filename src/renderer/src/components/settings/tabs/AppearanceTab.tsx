import { memo } from "react";
import { Check } from "lucide-react";
import type { TFunction } from "i18next";
import type { EditorSettings } from "../../../stores/editorStore";
import type { WindowMenuBarMode } from "../../../../../shared/types";

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
                    <h3 className="text-base font-semibold text-fg">{t("settings.appearance.baseTheme.title")}</h3>
                    <p className="text-sm text-muted mt-1">{t("settings.appearance.baseTheme.description")}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {(["light", "sepia", "dark"] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => onApplySettings({ theme: mode })}
                            className={`flex items-center justify-center px-4 py-3 rounded-xl border text-sm font-medium transition-colors duration-150 ${theme === mode
                                ? "border-accent text-accent bg-accent/5 ring-1 ring-accent shadow-sm"
                                : "border-border text-muted hover:border-text-tertiary hover:bg-surface-hover"
                                }`}
                        >
                            {mode === "light" && t("settings.theme.light")}
                            {mode === "sepia" && t("settings.theme.sepia")}
                            {mode === "dark" && t("settings.theme.dark")}
                            {theme === mode && <Check className="w-4 h-4 ml-2" />}
                        </button>
                    ))}
                </div>
            </section>

            <div className="h-px bg-border my-6" />

            <section className="space-y-4">
                <div>
                    <h3 className="text-base font-semibold text-fg">{t("settings.appearance.accent.title")}</h3>
                    <p className="text-sm text-muted mt-1">{t("settings.appearance.accent.description")}</p>
                </div>
                <div className="flex gap-4">
                    {(["blue", "violet", "green", "amber", "rose", "slate"] as const).map((accent) => (
                        <button
                            key={accent}
                            onClick={() => onApplySettings({ themeAccent: accent })}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${themeAccent === accent ? "ring-2 ring-offset-2 ring-text-primary scale-110" : "hover:scale-110"
                                }`}
                            style={{
                                backgroundColor: `var(--color-bg-${accent}, ${accent === "blue"
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
                        <h3 className="text-base font-semibold text-fg">{t("settings.appearance.texture.title")}</h3>
                        <p className="text-sm text-muted mt-1">{t("settings.appearance.texture.description")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onApplySettings({ themeTexture: !themeTexture })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${themeTexture ? "bg-accent" : "bg-border"
                                }`}
                        >
                            <span
                                className={`${themeTexture ? "translate-x-6" : "translate-x-1"
                                    } inline-block h-4 w-4 transform rounded-full bg-surface shadow-sm transition-transform`}
                            />
                        </button>
                        <span className="text-sm font-medium text-fg">
                            {themeTexture ? t("settings.appearance.texture.on") : t("settings.appearance.texture.off")}
                        </span>
                    </div>
                </section>

                <section className="space-y-4">
                    <div>
                        <h3 className="text-base font-semibold text-fg">{t("settings.appearance.contrast.title")}</h3>
                        <p className="text-sm text-muted mt-1">{t("settings.appearance.contrast.description")}</p>
                    </div>
                    <div className="flex gap-2">
                        {(["soft", "high"] as const).map((c) => (
                            <button
                                key={c}
                                onClick={() => onApplySettings({ themeContrast: c })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${themeContrast === c
                                    ? "bg-text-primary text-bg-app border-transparent"
                                    : "border-border text-muted hover:text-fg"
                                    }`}
                            >
                                {c === "soft" ? t("settings.appearance.contrast.soft") : t("settings.appearance.contrast.high")}
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
                    {(["default", "docs", "editor", "scrivener"] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => onApplySettings({ uiMode: mode })}
                            className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors duration-150 text-left ${(uiMode || "default") === mode
                                ? "border-accent text-accent bg-accent/5 ring-1 ring-accent shadow-sm"
                                : "border-border text-muted hover:border-text-tertiary hover:bg-surface-hover"
                                }`}
                        >
                            <div className="font-semibold mb-0.5">
                                {mode === "default" && t("settings.uiMode.default")}
                                {mode === "docs" && t("settings.uiMode.docs")}
                                {mode === "editor" && t("settings.uiMode.editor")}
                                {mode === "scrivener" && t("settings.uiMode.scrivener")}
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            <div className="h-px bg-border my-6" />

            <section className="space-y-4">
                <div>
                    <h3 className="text-base font-semibold text-fg">{t("settings.appearance.atmosphere.title")}</h3>
                    <p className="text-sm text-muted mt-1">{t("settings.appearance.atmosphere.description")}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => onApplySettings({ themeTemp: "cool" })}
                        className={`relative group flex flex-col items-start p-4 rounded-xl border text-left transition-colors duration-150 ${themeTemp === "cool" ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500" : "border-border hover:bg-surface-hover"
                            }`}
                    >
                        <span className="text-sm font-semibold text-fg mb-1">{t("settings.appearance.atmosphere.cool.title")}</span>
                        <span className="text-xs text-muted">{t("settings.appearance.atmosphere.cool.description")}</span>
                    </button>

                    <button
                        onClick={() => onApplySettings({ themeTemp: "neutral" })}
                        className={`relative group flex flex-col items-start p-4 rounded-xl border text-left transition-colors duration-150 ${themeTemp === "neutral"
                            ? "border-text-secondary bg-text-secondary/5 ring-1 ring-text-secondary"
                            : "border-border hover:bg-surface-hover"
                            }`}
                    >
                        <span className="text-sm font-semibold text-fg mb-1">{t("settings.appearance.atmosphere.neutral.title")}</span>
                        <span className="text-xs text-muted">{t("settings.appearance.atmosphere.neutral.description")}</span>
                    </button>

                    <button
                        onClick={() => onApplySettings({ themeTemp: "warm" })}
                        className={`relative group flex flex-col items-start p-4 rounded-xl border text-left transition-colors duration-150 ${themeTemp === "warm"
                            ? "border-orange-500 bg-orange-500/5 ring-1 ring-orange-500"
                            : "border-border hover:bg-surface-hover"
                            }`}
                    >
                        <span className="text-sm font-semibold text-fg mb-1">{t("settings.appearance.atmosphere.warm.title")}</span>
                        <span className="text-xs text-muted">{t("settings.appearance.atmosphere.warm.description")}</span>
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
                                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors duration-150 ${menuBarMode === "hidden"
                                    ? "border-accent text-accent bg-accent/5 ring-1 ring-accent"
                                    : "border-border text-muted hover:border-text-tertiary hover:bg-surface-hover"
                                    } ${isMenuBarUpdating ? "opacity-70 cursor-not-allowed" : ""}`}
                            >
                                {t("settings.menuBar.hide")}
                            </button>
                            <button
                                onClick={() => onMenuBarModeChange("visible")}
                                disabled={isMenuBarUpdating}
                                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors duration-150 ${menuBarMode === "visible"
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
