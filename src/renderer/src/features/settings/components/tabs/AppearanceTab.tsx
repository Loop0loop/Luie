import { memo } from "react";
import { Check } from "lucide-react";
import type { TFunction } from "i18next";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useShallow } from "zustand/react/shallow";
import type { WindowMenuBarMode } from '@shared/types';

interface AppearanceTabProps {
    t: TFunction;
    isMacOS: boolean;
    menuBarMode: WindowMenuBarMode;
    isMenuBarUpdating: boolean;
    onMenuBarModeChange: (mode: WindowMenuBarMode) => void;
}
export const AppearanceTab = memo(function AppearanceTab({
    t,
    isMacOS,
    menuBarMode,
    isMenuBarUpdating,
    onMenuBarModeChange,
}: AppearanceTabProps) {
    const {
        theme,
        themeContrast,
        themeTemp,
        themeAccent,
        uiMode,
        enableAnimations,
        entityColors,
        updateSettings: onApplySettings,
    } = useEditorStore(
        useShallow((state) => ({
            theme: state.theme,
            themeContrast: state.themeContrast,
            themeTemp: state.themeTemp,
            themeAccent: state.themeAccent,
            uiMode: state.uiMode,
            enableAnimations: state.enableAnimations,
            entityColors: state.entityColors,
            updateSettings: state.updateSettings,
        }))
    );

    const ACCENT_PRESETS = [
        { id: "blue", labelKey: "settings.appearance.accent.blue", color: "#3b82f6", name: "블루" },
        { id: "emerald", labelKey: "settings.appearance.accent.emerald", color: "#10b981", name: "에메랄드" },
        { id: "violet", labelKey: "settings.appearance.accent.violet", color: "#8b5cf6", name: "바이올렛" },
        { id: "rose", labelKey: "settings.appearance.accent.rose", color: "#f43f5e", name: "로즈" },
        { id: "amber", labelKey: "settings.appearance.accent.amber", color: "#f59e0b", name: "앰버" },
    ] as const;

    return (
        <div className="space-y-10 max-w-2xl">
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
                            className={`flex items-center justify-center px-4 py-3 rounded-panel border text-sm font-medium transition-colors duration-150 ${theme === mode
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

                <div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
                    <div>
                        <h4 className="text-sm font-medium text-fg">{t("settings.appearance.animations.title", "애니메이션 활성화")}</h4>
                        <p className="text-xs text-muted mt-1">{t("settings.appearance.animations.description", "패널 열고 닫기에 부드러운 애니메이션 효과를 적용합니다.")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onApplySettings({ enableAnimations: !enableAnimations })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-surface ${enableAnimations ? "bg-accent" : "bg-border"
                                }`}
                        >
                            <span
                                className={`${enableAnimations ? "translate-x-6" : "translate-x-1"
                                    } inline-block h-4 w-4 transform rounded-full bg-surface shadow-sm transition-transform`}
                            />
                        </button>
                        <span className="text-sm font-medium text-fg w-8">
                            {enableAnimations ? t("settings.appearance.animations.on", "켜짐") : t("settings.appearance.animations.off", "꺼짐")}
                        </span>
                    </div>
                </div>
            </section>

            <div className="h-px bg-border my-6" />
            <section className="space-y-4">
                <div>
                    <h3 className="text-base font-semibold text-fg">{t("settings.appearance.accent.title", "강조색 (Accent Color)")}</h3>
                    <p className="text-sm text-muted mt-1">{t("settings.appearance.accent.description", "버튼, 링크, 활성 상태에 적용되는 강조 색상을 선택합니다.")}</p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                    {ACCENT_PRESETS.map((preset) => {
                        const isSelected = (themeAccent || "blue") === preset.id;
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => onApplySettings({ themeAccent: preset.id })}
                                className={`flex items-center gap-2 px-3 py-2 rounded-panel border text-xs font-medium transition-all ${
                                    isSelected
                                        ? "border-accent bg-accent/10 text-fg shadow-xs ring-1 ring-accent"
                                        : "border-border text-muted hover:text-fg hover:bg-surface-hover hover:border-border-active"
                                }`}
                            >
                                <span
                                    className="size-3.5 rounded-full shrink-0 shadow-xs flex items-center justify-center text-white"
                                    style={{ backgroundColor: preset.color }}
                                >
                                    {isSelected && <Check className="size-2 stroke-[3]" />}
                                </span>
                                <span>{t(preset.labelKey, preset.name)}</span>
                            </button>
                        );
                    })}

                    <label
                        className={`flex items-center gap-2 px-3 py-2 rounded-panel border text-xs font-medium cursor-pointer transition-all ${
                            themeAccent?.startsWith("#")
                                ? "border-accent bg-accent/10 text-fg shadow-xs ring-1 ring-accent"
                                : "border-border text-muted hover:text-fg hover:bg-surface-hover hover:border-border-active"
                        }`}
                    >
                        <div className="relative size-3.5 rounded-full shrink-0 overflow-hidden border border-black/10">
                            <input
                                type="color"
                                value={themeAccent?.startsWith("#") ? themeAccent : "#3b82f6"}
                                onChange={(e) => onApplySettings({ themeAccent: e.target.value })}
                                className="absolute -top-2 -left-2 size-8 cursor-pointer border-0 p-0 m-0 opacity-0"
                            />
                            <div
                                className="size-full"
                                style={{
                                    backgroundColor: themeAccent?.startsWith("#") ? themeAccent : "transparent",
                                    backgroundImage: themeAccent?.startsWith("#") ? undefined : "conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)",
                                }}
                            />
                        </div>
                        <span>{t("settings.appearance.accent.custom", "직접 지정")}</span>
                    </label>
                </div>
            </section>

            <div className="h-px bg-border my-6" />
            <section className="space-y-4">
                <div>
                    <h3 className="text-base font-semibold text-fg">{t("settings.appearance.tone.title")}</h3>
                    <p className="text-sm text-muted mt-1">{t("settings.appearance.tone.description")}</p>
                </div>
                <div className="flex gap-2">
                    {(["cool", "neutral", "warm"] as const).map((tone) => (
                        <button
                            key={tone}
                            onClick={() => onApplySettings({ themeTemp: tone })}
                            className={`px-3 py-1.5 rounded-panel text-xs font-medium border transition-colors ${themeTemp === tone
                                ? "bg-accent text-accent-fg border-transparent"
                                : "border-border text-muted hover:text-fg"
                                }`}
                        >
                            {t(`settings.appearance.tone.${tone}`)}
                        </button>
                    ))}
                </div>
            </section>

            <div className="h-px bg-border my-6" />

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
                            className={`px-3 py-1.5 rounded-panel text-xs font-medium border transition-colors ${themeContrast === c
                                ? "bg-accent text-accent-fg border-transparent"
                                : "border-border text-muted hover:text-fg"
                                }`}
                        >
                            {c === "soft" ? t("settings.appearance.contrast.soft") : t("settings.appearance.contrast.high")}
                        </button>
                    ))}
                </div>
            </section>

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
                            className={`px-4 py-3 rounded-panel border text-sm font-medium transition-colors duration-150 text-left ${(uiMode || "default") === mode
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
                    <h3 className="text-base font-semibold text-fg">{t("settings.appearance.entityColors.title", "세계관 요소 색상")}</h3>
                    <p className="text-sm text-muted mt-1">{t("settings.appearance.entityColors.description", "에디터 및 그래프에서 표시되는 요소들의 고유 색상을 지정합니다.")}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {(["character", "event", "faction", "term"] as const).map((type) => (
                        <div key={type} className="flex flex-col items-center gap-2 p-3 rounded-panel border border-border bg-surface hover:bg-surface-hover transition-colors">
                            <span className="text-sm font-medium text-fg capitalize">{t(`research.graph.entity.${type}`, type)}</span>
                            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border ring-2 ring-transparent focus-within:ring-accent transition-all cursor-pointer">
                                <input
                                    type="color"
                                    value={entityColors?.[type as keyof typeof entityColors] ?? "#000000"}
                                    onChange={(e) => {
                                        onApplySettings({
                                            entityColors: {
                                                character: entityColors?.character ?? "#2563eb",
                                                event: entityColors?.event ?? "#d97706",
                                                faction: entityColors?.faction ?? "#059669",
                                                term: entityColors?.term ?? "#7c3aed",
                                                [type]: e.target.value
                                            }
                                        });
                                    }}
                                    className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer border-0 p-0 m-0"
                                    title={t(`research.graph.entity.${type}`, type)}
                                />
                            </div>
                        </div>
                    ))}
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
                                className={`px-4 py-3 rounded-panel border text-sm font-medium transition-colors duration-150 ${menuBarMode === "hidden"
                                    ? "border-accent text-accent bg-accent/5 ring-1 ring-accent"
                                    : "border-border text-muted hover:border-text-tertiary hover:bg-surface-hover"
                                    } ${isMenuBarUpdating ? "opacity-70 cursor-not-allowed" : ""}`}
                            >
                                {t("settings.menuBar.hide")}
                            </button>
                            <button
                                onClick={() => onMenuBarModeChange("visible")}
                                disabled={isMenuBarUpdating}
                                className={`px-4 py-3 rounded-panel border text-sm font-medium transition-colors duration-150 ${menuBarMode === "visible"
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
