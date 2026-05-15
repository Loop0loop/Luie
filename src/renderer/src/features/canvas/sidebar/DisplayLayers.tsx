import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { cn } from "@renderer/lib/utils";
import {
  CANVAS_LAYER_PRIMARY,
  CANVAS_LAYER_ADVANCED,
  CANVAS_SECTION_KEYS,
} from "../shared/constants";
import { useCanvasUiStore } from "../store/canvasUiStore";
import { SidebarSection } from "./SidebarSection";
import { ToggleListRow } from "./ToggleListRow";

/**
 * 표시(Display) 섹션.
 *
 * 핵심 레이어 3개(Canonical / Derived / Timeline)는 항상 노출,
 * 자주 안 쓰는 레이어(관계 강도/충돌/복선)는 "고급"으로 접어둔다.
 * 사용자가 매번 선택지를 받지 않게 하는 게 목적.
 */
export function DisplayLayers() {
  const { t } = useTranslation();
  const layers = useCanvasUiStore((s) => s.layers);
  const toggleLayer = useCanvasUiStore((s) => s.toggleLayer);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <SidebarSection title={t(CANVAS_SECTION_KEYS.display)}>
      <ul className="flex flex-col">
        {CANVAS_LAYER_PRIMARY.map((option) => (
          <li key={option.id}>
            <ToggleListRow
              label={t(option.labelKey)}
              hint={option.hintKey ? t(option.hintKey) : undefined}
              checked={layers[option.id]}
              onToggle={() => toggleLayer(option.id)}
            />
          </li>
        ))}
      </ul>

      {/* 고급 — disclosure */}
      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        aria-expanded={advancedOpen}
        className={cn(
          "mt-1 flex w-full items-center gap-1 rounded-sm px-2 py-1",
          "text-left text-[11px] text-muted transition-colors",
          "hover:bg-surface-hover hover:text-fg",
        )}
      >
        <ChevronRight
          className={cn(
            "size-3 shrink-0 transition-transform duration-150",
            advancedOpen && "rotate-90",
          )}
        />
        <span>{t(CANVAS_SECTION_KEYS.advanced)}</span>
      </button>
      {advancedOpen ? (
        <ul className="flex flex-col">
          {CANVAS_LAYER_ADVANCED.map((option) => (
            <li key={option.id}>
              <ToggleListRow
                label={t(option.labelKey)}
                checked={layers[option.id]}
                onToggle={() => toggleLayer(option.id)}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </SidebarSection>
  );
}
