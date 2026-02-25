import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

import { cn } from "@shared/types/utils";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { EDITOR_FONT_FAMILIES } from "@shared/constants";
import type { FontFamily } from "@shared/types";

export function FontSelector() {
    const { t } = useTranslation();
    const fontFamily = useEditorStore((state) => state.fontFamily);
    const setFontFamily = useEditorStore((state) => state.setFontFamily);
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getLabel = (f: string) => {
        if (f === "serif") return t("common.settings.font.serif");
        if (f === "sans") return t("common.settings.font.sans");
        if (f === "mono") return t("common.settings.font.mono");
        return f;
    };

    return (
        <div className="relative" ref={ref}>
            <button
                className="flex items-center gap-1 px-2 h-7 rounded bg-transparent text-muted text-xs cursor-pointer hover:bg-hover hover:text-fg w-24 justify-between"
                onClick={() => setIsOpen(!isOpen)}
                title={t("common.settings.section.font")}
            >
                <span className="truncate">{getLabel(fontFamily)}</span>
                <ChevronDown className="icon-xs opacity-50 w-3 h-3" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-32 bg-background border border-border shadow-md rounded-md z-50 py-1 max-h-48 overflow-y-auto">
                    {EDITOR_FONT_FAMILIES.map((font) => (
                        <button
                            key={font}
                            className={cn(
                                "w-full text-left px-3 py-1.5 text-xs hover:bg-hover transition-colors flex items-center gap-2",
                                fontFamily === font ? "text-accent bg-accent/5" : "text-fg"
                            )}
                            onClick={() => {
                                setFontFamily(font as FontFamily);
                                setIsOpen(false);
                            }}
                        >
                            <span
                                style={{
                                    fontFamily:
                                        font === "mono"
                                            ? "monospace"
                                            : font === "serif"
                                                ? "serif"
                                                : "sans-serif",
                                }}
                            >
                                Aa
                            </span>
                            <span>{getLabel(font)}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
