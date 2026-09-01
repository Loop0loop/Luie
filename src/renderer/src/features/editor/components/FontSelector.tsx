import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

import { cn } from "@shared/types/utils";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import type { FontFamily } from "@shared/types";
import { useClickOutside } from "./toolbar/useClickOutside";

const FONT_FAMILIES: FontFamily[] = ["system-ui", "serif", "mono"];

export function FontSelector() {
  const { t } = useTranslation();
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const setFontFamily = useEditorStore((state) => state.setFontFamily);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // NOTE: 바깥 클릭만 자체 구현하고 있어 Escape로 닫히지 않았다. 툴바 메뉴 4개와 같은
  // 훅으로 통합해 동작을 하나로 맞춘다.
  useClickOutside(ref, () => setIsOpen(false), isOpen);

  const getLabel = (f: string) => {
    if (f === "serif") return t("settings.font.serif");
    if (f === "system-ui") return t("settings.font.systemUi");
    if (f === "mono") return t("settings.font.mono");
    return f;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-1 px-2 h-8 rounded-control bg-app border border-border-control text-fg text-xs cursor-pointer hover:bg-hover w-24 justify-between shadow-control focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setIsOpen(!isOpen)}
        title={t("settings.section.font")}
      >
        <span className="truncate">{getLabel(fontFamily)}</span>
        <ChevronDown className="icon-xs opacity-50 w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-32 bg-panel border border-border shadow-panel rounded-control z-50 py-1 max-h-48 overflow-y-auto">
          {FONT_FAMILIES.map((font: FontFamily) => (
            <button
              key={font}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs hover:bg-hover transition-colors flex items-center gap-2",
                fontFamily === font ? "text-accent bg-accent/5" : "text-fg",
              )}
              onClick={() => {
                setFontFamily(font);
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
