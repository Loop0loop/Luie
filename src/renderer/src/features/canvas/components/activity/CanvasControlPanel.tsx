/**
 * CanvasControlPanel — Views / Range / Layers control panel.
 *
 * Views: mode list. flow-map / scene-board are active; others show lock icon.
 * Range: 4 radio options mapped to CanvasRange.
 * Layers: checkboxes for each CanvasLayer.
 */
import { useTranslation } from "react-i18next";
import { Lock, Check } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@shared/types/utils";
import { useCanvasViewStore } from "@renderer/features/canvas/stores";
import {
  CANVAS_AVAILABLE_MODES,
  type CanvasMode,
  type CanvasRange,
  type CanvasLayer,
} from "@renderer/features/canvas/types";
import {
  PanelRoot,
  PanelHeader,
  PanelBody,
  PanelSection,
} from "./shared";

/* ─── mode meta ─────────────────────────────────────────────────────────── */

const ALL_MODES: CanvasMode[] = [
  "flow-map",
  "scene-board",
  "timeline",
  "character-map",
  "memory-map",
];

const MODE_I18N: Record<CanvasMode, string> = {
  "flow-map": "canvas.mode.flowMap.label",
  "scene-board": "canvas.mode.sceneBoard.label",
  "timeline": "canvas.mode.timeline.label",
  "character-map": "canvas.mode.characterMap.label",
  "memory-map": "canvas.mode.memoryMap.label",
};

/* ─── range meta ─────────────────────────────────────────────────────────── */

const ALL_RANGES: CanvasRange[] = [
  "current-chapter",
  "three-chapters",
  "current-part",
  "whole-project",
];

const RANGE_I18N: Record<CanvasRange, string> = {
  "current-chapter": "canvas.range.currentChapter",
  "three-chapters": "canvas.range.threeChapters",
  "current-part": "canvas.range.currentPart",
  "whole-project": "canvas.range.wholeProject",
};

/* ─── layer meta ─────────────────────────────────────────────────────────── */

const ALL_LAYERS: CanvasLayer[] = [
  "scene",
  "character",
  "event",
  "memo",
  "ai-hint",
];

const LAYER_I18N: Record<CanvasLayer, string> = {
  "scene": "canvas.layer.scene",
  "character": "canvas.layer.character",
  "event": "canvas.layer.event",
  "memo": "canvas.layer.memo",
  "ai-hint": "canvas.layer.aiHint",
};

/* ─── component ─────────────────────────────────────────────────────────── */

export default function CanvasControlPanel() {
  const { t } = useTranslation();

  const { mode, scope, layers, setMode, setScope, toggleLayer } =
    useCanvasViewStore(
      useShallow((state) => ({
        mode: state.mode,
        scope: state.scope,
        layers: state.layers,
        setMode: state.setMode,
        setScope: state.setScope,
        toggleLayer: state.toggleLayer,
      })),
    );

  // Derive current range from scope kind (best-effort).
  const currentRange: CanvasRange = (() => {
    if (!scope) return "current-chapter";
    if (scope.kind === "single-chapter") return "current-chapter";
    if (scope.kind === "three-chapters") return "three-chapters";
    if (scope.kind === "current-part") return "current-part";
    return "whole-project";
  })();

  const handleRangeChange = (range: CanvasRange) => {
    // Scope update: preserve existing ids where possible, fall back to null
    // so the viewport can prompt the user to pick a chapter.
    if (range === "current-chapter") {
      const existingChapterId =
        scope?.kind === "single-chapter"
          ? scope.chapterId
          : scope?.kind === "three-chapters"
            ? scope.centerChapterId
            : null;
      if (existingChapterId) {
        setScope({ kind: "single-chapter", chapterId: existingChapterId });
      } else {
        setScope(null);
      }
      return;
    }
    if (range === "three-chapters") {
      const existingChapterId =
        scope?.kind === "single-chapter"
          ? scope.chapterId
          : scope?.kind === "three-chapters"
            ? scope.centerChapterId
            : null;
      if (existingChapterId) {
        setScope({ kind: "three-chapters", centerChapterId: existingChapterId });
      } else {
        setScope(null);
      }
      return;
    }
    if (range === "current-part") {
      const existingPartId =
        scope?.kind === "current-part" ? scope.partId : null;
      if (existingPartId) {
        setScope({ kind: "current-part", partId: existingPartId });
      } else {
        setScope(null);
      }
      return;
    }
    // whole-project — needs projectId; set null so P5 can resolve it.
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
                  "flex w-full items-center gap-2 px-4 py-1.5 pl-9 text-[13px] transition-all",
                  isActive
                    ? "bg-active text-fg font-medium border-l-[3px] border-accent"
                    : isAvailable
                      ? "text-muted border-l-2 border-transparent hover:bg-surface-hover hover:text-fg cursor-pointer"
                      : "text-muted/40 border-l-2 border-transparent cursor-not-allowed",
                )}
              >
                <span className="flex-1 truncate text-left">{t(MODE_I18N[m])}</span>
                {!isAvailable && (
                  <Lock className="icon-xs shrink-0 opacity-40" />
                )}
                {isActive && isAvailable && (
                  <Check className="icon-xs shrink-0 text-accent" />
                )}
              </button>
            );
          })}
        </PanelSection>

        {/* ── Range ── */}
        <PanelSection title={t("canvas.panel.range")}>
          {ALL_RANGES.map((range) => {
            const isActive = currentRange === range;
            return (
              <label
                key={range}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-1.5 pl-9 text-[13px] cursor-pointer transition-all",
                  isActive
                    ? "text-fg font-medium"
                    : "text-muted hover:text-fg hover:bg-surface-hover",
                )}
              >
                <input
                  type="radio"
                  name="canvas-range"
                  checked={isActive}
                  onChange={() => handleRangeChange(range)}
                  className="accent-accent"
                />
                <span className="truncate">{t(RANGE_I18N[range])}</span>
              </label>
            );
          })}
        </PanelSection>

        {/* ── Layers ── */}
        <PanelSection title={t("canvas.panel.layers")}>
          {ALL_LAYERS.map((layer) => {
            const isChecked = layers.includes(layer);
            return (
              <label
                key={layer}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-1.5 pl-9 text-[13px] cursor-pointer transition-all",
                  isChecked
                    ? "text-fg"
                    : "text-muted hover:text-fg hover:bg-surface-hover",
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleLayer(layer)}
                  className="accent-accent"
                />
                <span className="truncate">{t(LAYER_I18N[layer])}</span>
              </label>
            );
          })}
        </PanelSection>
      </PanelBody>
    </PanelRoot>
  );
}
