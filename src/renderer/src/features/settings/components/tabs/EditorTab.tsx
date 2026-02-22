import { memo } from "react";
import { Minus, Plus, Download } from "lucide-react";
import type { TFunction } from "i18next";
import type { EditorSettings } from "@renderer/features/editor/stores/editorStore";
import { EDITOR_FONT_FAMILIES } from '@shared/constants/configs';
import type { FontPreset } from "@renderer/features/editor/stores/editorStore";
import type { OptionalFontOption } from "@renderer/features/settings/components/tabs/types";

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
                            className={`p-4 rounded-xl border text-left transition-colors duration-150 ${fontFamily === f ? "border-accent ring-1 ring-accent bg-accent/5" : "border-border hover:bg-surface-hover"
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
