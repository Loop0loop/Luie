import { useTranslation } from "react-i18next";
import {
  CANVAS_FILTER_OPTIONS,
  CANVAS_SECTION_KEYS,
} from "../shared/constants";
import { useCanvasUiStore } from "../store/canvasUiStore";
import { SidebarSection } from "./SidebarSection";
import { ToggleListRow } from "./ToggleListRow";

/**
 * Filters: 캔버스에 표시할 노드 종류를 토글한다.
 * 전체 작품 Scope에서 캔버스가 난잡해지는 걸 막는 1차 안전장치.
 */
export function Filters() {
  const { t } = useTranslation();
  const filters = useCanvasUiStore((s) => s.filters);
  const toggleFilter = useCanvasUiStore((s) => s.toggleFilter);

  return (
    <SidebarSection title={t(CANVAS_SECTION_KEYS.filters)}>
      <ul className="flex flex-col gap-0.5">
        {CANVAS_FILTER_OPTIONS.map((option) => (
          <li key={option.id}>
            <ToggleListRow
              label={t(option.labelKey)}
              checked={filters[option.id]}
              onToggle={() => toggleFilter(option.id)}
            />
          </li>
        ))}
      </ul>
    </SidebarSection>
  );
}
