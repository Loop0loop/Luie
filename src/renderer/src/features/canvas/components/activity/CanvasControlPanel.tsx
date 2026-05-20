/**
 * CanvasControlPanel — Views / Range / Layers 컨트롤 패널.
 *
 * SRP:
 *   - 상수(MODE_I18N, RANGE_I18N 등)는 constants/index.ts에 위치합니다.
 *   - 이 컴포넌트는 렌더링과 인터랙션만 담당합니다.
 */
import { useTranslation } from "react-i18next";
import { Lock, Check, GitFork, LayoutGrid, Clock, Users, Brain } from "lucide-react";
import { cn } from "@shared/types/utils";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import {
  CANVAS_AVAILABLE_MODES,
  type CanvasMode,
  type CanvasRange,
} from "@renderer/features/canvas/types";
import {
  CANVAS_ALL_MODES,
  CANVAS_MODE_I18N,
  CANVAS_ALL_RANGES,
  CANVAS_RANGE_I18N,
  CANVAS_ALL_LAYERS,
  CANVAS_LAYER_I18N,
} from "@renderer/features/canvas/constants";
import { getRangeFromScope, getScopeFromRange } from "@renderer/features/canvas/utils";
import {
  PanelRoot,
  PanelHeader,
  PanelBody,
  PanelSection,
  ToggleChip,
} from "./shared";



const VIEW_ICON_MAP: Record<CanvasMode, React.ReactNode> = {
  "flow-map": <GitFork className="h-4 w-4" />,
  "scene-board": <LayoutGrid className="h-4 w-4" />,
  "timeline": <Clock className="h-4 w-4" />,
  "character-map": <Users className="h-4 w-4" />,
  "memory-map": <Brain className="h-4 w-4" />,
};

export default function CanvasControlPanel() {
  const { t } = useTranslation();

  // 필요한 값만 개별적으로 셀렉트하여 구독 최소화
  const mode = useCanvasViewStore((s) => s.mode);
  const scope = useCanvasViewStore((s) => s.scope);
  const layers = useCanvasViewStore((s) => s.layers);

  // actions는 store에서 직접 가져옴 (shallow 비교 불필요)
  const setMode      = useCanvasViewStore((s) => s.setMode);
  const setScope     = useCanvasViewStore((s) => s.setScope);
  const toggleLayer  = useCanvasViewStore((s) => s.toggleLayer);

  const currentRange = getRangeFromScope(scope);

  const handleRangeChange = (range: CanvasRange) => {
    const nextScope = getScopeFromRange(range, scope);
    setScope(nextScope);
  };

  return (
    <PanelRoot>
      <PanelHeader title={t("canvas.activity.canvas")} />
      <PanelBody>
        {/* ── Views ── */}
        <PanelSection title={t("canvas.panel.views")}>
          <div className="flex flex-col gap-0.5">
            {CANVAS_ALL_MODES.map((m) => {
              const isAvailable = (CANVAS_AVAILABLE_MODES as readonly string[]).includes(m);
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => isAvailable && setMode(m)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-all",
                    isActive
                      ? "bg-accent/10 font-medium text-accent"
                      : isAvailable
                        ? "cursor-pointer text-muted hover:bg-surface-hover hover:text-fg"
                        : "cursor-not-allowed text-subtle opacity-50",
                  )}
                >
                  <span className={cn("shrink-0", isActive && isAvailable ? "text-accent" : "text-subtle")}>
                    {VIEW_ICON_MAP[m]}
                  </span>
                  <span className="flex-1 truncate text-left leading-none py-[2px]">{t(CANVAS_MODE_I18N[m])}</span>
                  {!isAvailable && <Lock className="icon-xs shrink-0 opacity-40 self-center" />}
                  {isActive && isAvailable && <Check className="icon-xs shrink-0 text-accent self-center" />}
                </button>
              );
            })}
          </div>
        </PanelSection>

        {/* ── Range ── */}
        <PanelSection title={t("canvas.panel.range")}>
          <div className="grid grid-cols-2 gap-1.5 px-1 py-0.5">
            {CANVAS_ALL_RANGES.map((range) => (
              <ToggleChip
                key={range}
                label={t(CANVAS_RANGE_I18N[range])}
                checked={currentRange === range}
                onChange={() => handleRangeChange(range)}
              />
            ))}
          </div>
        </PanelSection>

        {/* ── Layers ── */}
        <PanelSection title={t("canvas.panel.layers")}>
          <div className="grid grid-cols-2 gap-1.5 px-1 py-0.5">
            {CANVAS_ALL_LAYERS.map((layer) => (
              <ToggleChip
                key={layer}
                label={t(CANVAS_LAYER_I18N[layer])}
                checked={layers.includes(layer)}
                onChange={() => toggleLayer(layer)}
              />
            ))}
          </div>
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}
