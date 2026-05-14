import { useTranslation } from "react-i18next";
import {
  CANVAS_LAYER_OPTIONS,
  CANVAS_SECTION_KEYS,
} from "../shared/constants";
import { useCanvasUiStore } from "../store/canvasUiStore";
import { SidebarSection } from "./SidebarSection";
import { ToggleListRow } from "./ToggleListRow";

/**
 * Layers: 캔버스에 보여줄 시각 레이어를 토글한다.
 * collapsible — 기본 열림.
 */
export function LayerToggles() {
  const { t } = useTranslation();
  const layers = useCanvasUiStore((s) => s.layers);
  const toggleLayer = useCanvasUiStore((s) => s.toggleLayer);

  return (
    <SidebarSection title={t(CANVAS_SECTION_KEYS.layers)} collapsible>
      <ul className="flex flex-col">
        {CANVAS_LAYER_OPTIONS.map((option) => (
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
    </SidebarSection>
  );
}
