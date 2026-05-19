/**
 * CanvasControlPanel — Views / Range / Layers 컨트롤 패널.
 *
 * SRP:
 *   - 상수(MODE_I18N, RANGE_I18N 등)는 constants/index.ts에 위치합니다.
 *   - 이 컴포넌트는 렌더링과 인터랙션만 담당합니다.
 */
import { useTranslation } from "react-i18next";
import { Lock, Check } from "lucide-react";
import { cn } from "@shared/types/utils";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import { useCanvasView } from "@renderer/features/canvas/hooks/useCanvasView";
import {
  CANVAS_AVAILABLE_MODES,
  type CanvasMode,
  type CanvasRange,
} from "@renderer/features/canvas/types";
import {
  CANVAS_MODE_I18N,
  CANVAS_ALL_RANGES,
  CANVAS_RANGE_I18N,
  CANVAS_ALL_LAYERS,
  CANVAS_LAYER_I18N,
} from "@renderer/features/canvas/constants";
import {
  PanelRoot,
  PanelHeader,
  PanelBody,
  PanelSection,
  ToggleChip,
} from "./shared";

// ALL_MODES는 CANVAS_MODE_I18N의 키 순서를 따릅니다.
const ALL_MODES = Object.keys(CANVAS_MODE_I18N) as CanvasMode[];

export default function CanvasControlPanel() {
  const { t } = useTranslation();

  // 안정적인 상태만 구독
  const { mode, scope, layers } = useCanvasView();

  // actions는 store에서 직접 가져옴 (shallow 비교 불필요)
  const setMode      = useCanvasViewStore((s) => s.setMode);
  const setScope     = useCanvasViewStore((s) => s.setScope);
  const toggleLayer  = useCanvasViewStore((s) => s.toggleLayer);

  const currentRange: CanvasRange = (() => {
    if (!scope) return "current-chapter";
    if (scope.kind === "single-chapter") return "current-chapter";
    if (scope.kind === "three-chapters") return "three-chapters";
    if (scope.kind === "current-part") return "current-part";
    return "whole-project";
  })();

  const handleRangeChange = (range: CanvasRange) => {
    if (range === "current-chapter") {
      const existingChapterId =
        scope?.kind === "single-chapter"
          ? scope.chapterId
          : scope?.kind === "three-chapters"
            ? scope.centerChapterId
            : null;
      setScope(existingChapterId ? { kind: "single-chapter", chapterId: existingChapterId } : null);
      return;
    }
    if (range === "three-chapters") {
      const existingChapterId =
        scope?.kind === "single-chapter"
          ? scope.chapterId
          : scope?.kind === "three-chapters"
            ? scope.centerChapterId
            : null;
      setScope(existingChapterId ? { kind: "three-chapters", centerChapterId: existingChapterId } : null);
      return;
    }
    if (range === "current-part") {
      const existingPartId = scope?.kind === "current-part" ? scope.partId : null;
      setScope(existingPartId ? { kind: "current-part", partId: existingPartId } : null);
      return;
    }
    setScope(null);
  };

  return (
    <PanelRoot>
      <PanelHeader title={t("canvas.activity.canvas")} />
      <PanelBody>
        {/* ── Views ── */}
        <PanelSection title={t("canvas.panel.views")}>
          {ALL_MODES.map((m) => {
            const isAvailable = (CANVAS_AVAILABLE_MODES as readonly string[]).includes(m);
            const isActive = mode === m;
            return (
              <button
                key={m}
                type="button"
                disabled={!isAvailable}
                onClick={() => isAvailable && setMode(m)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-active font-medium text-fg"
                    : isAvailable
                      ? "cursor-pointer text-muted hover:bg-surface hover:text-fg"
                      : "cursor-not-allowed text-subtle opacity-50",
                )}
              >
                <span className="flex-1 truncate text-left">{t(CANVAS_MODE_I18N[m])}</span>
                {!isAvailable && <Lock className="icon-xs shrink-0 opacity-40" />}
                {isActive && isAvailable && <Check className="icon-xs shrink-0 text-fg" />}
              </button>
            );
          })}
        </PanelSection>

        {/* ── Range ── */}
        <PanelSection title={t("canvas.panel.range")}>
          {CANVAS_ALL_RANGES.map((range) => (
            <ToggleChip
              key={range}
              label={t(CANVAS_RANGE_I18N[range])}
              checked={currentRange === range}
              onChange={() => handleRangeChange(range)}
            />
          ))}
        </PanelSection>

        {/* ── Layers ── */}
        <PanelSection title={t("canvas.panel.layers")}>
          {CANVAS_ALL_LAYERS.map((layer) => (
            <ToggleChip
              key={layer}
              label={t(CANVAS_LAYER_I18N[layer])}
              checked={layers.includes(layer)}
              onChange={() => toggleLayer(layer)}
            />
          ))}
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}
