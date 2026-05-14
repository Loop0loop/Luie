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
 * 토글 자체는 즉시 store에 반영되며, Stage가 이를 구독해 표시 방식을 바꾼다.
 */
export function LayerToggles() {
  const { t } = useTranslation();
  const layers = useCanvasUiStore((s) => s.layers);
  const toggleLayer = useCanvasUiStore((s) => s.toggleLayer);

  return (
    <SidebarSection title={t(CANVAS_SECTION_KEYS.layers)}>
      <ul className="flex flex-col gap-0.5">
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
