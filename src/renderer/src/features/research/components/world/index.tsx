import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUIStore, type WorldTab } from "@renderer/features/workspace/stores/uiStore";
import { useWorldBuildingStore, type WorldViewMode } from "@renderer/features/research/stores/worldBuildingStore";
import TabButton from "@shared/ui/TabButton";

import { TermManager } from "@renderer/features/research/components/world/TermManager";
import { SynopsisEditor } from "@renderer/features/research/components/world/SynopsisEditor";
import { MindMapBoard } from "@renderer/features/research/components/world/MindMapBoard";
import { DrawingCanvas } from "@renderer/features/research/components/world/DrawingCanvas";
import { PlotBoard } from "@renderer/features/research/components/world/PlotBoard";
import { WorldGraphPanel } from "@renderer/features/research/components/world/graph/WorldGraphPanel";
import WindowBar from "@renderer/features/workspace/components/WindowBar";

interface WorldSectionProps {
  worldId?: string;
  graphOnly?: boolean;
  projectTitle?: string;
  onBackToEditor?: () => void;
  onOpenSettings?: () => void;
}

const WORLD_TAB_ITEMS: Array<{ key: WorldTab; labelKey: string }> = [
  { key: "terms", labelKey: "world.tab.terms" },
  { key: "synopsis", labelKey: "world.tab.synopsis" },
  { key: "mindmap", labelKey: "world.tab.mindmap" },
  { key: "drawing", labelKey: "world.tab.drawing" },
  { key: "plot", labelKey: "world.tab.plot" },
  { key: "graph", labelKey: "world.tab.graph" },
];

const VIEW_MODE_LABEL_KEY: Record<WorldViewMode, string> = {
  standard: "world.graph.mode.standard",
  protagonist: "world.graph.mode.protagonist",
  "event-chain": "world.graph.mode.eventChain",
  freeform: "world.graph.mode.freeform",
};

type AxisPresetKey = "time" | "space" | "culture";

const AXIS_FILTER_PRESETS: Record<
  AxisPresetKey,
  { entityTypes: string[]; relationKinds: Array<"belongs_to" | "enemy_of" | "causes" | "controls" | "located_in" | "violates"> }
> = {
  time: {
    entityTypes: ["Event", "Character", "Item", "Concept", "Rule"],
    relationKinds: ["causes", "violates", "belongs_to"],
  },
  space: {
    entityTypes: ["Place", "Character", "Faction", "Item", "Event"],
    relationKinds: ["located_in", "controls", "belongs_to"],
  },
  culture: {
    entityTypes: ["Rule", "Concept", "Faction", "Character", "Event", "Item"],
    relationKinds: ["violates", "controls", "enemy_of", "belongs_to"],
  },
};

export default function WorldSection({
  worldId,
  graphOnly = false,
  projectTitle,
  onBackToEditor,
  onOpenSettings,
}: WorldSectionProps) {
  const { t } = useTranslation();
  const worldTab = useUIStore((state) => state.worldTab);
  const setWorldTab = useUIStore((state) => state.setWorldTab);
  const viewMode = useWorldBuildingStore((state) => state.viewMode);
  const setViewMode = useWorldBuildingStore((state) => state.setViewMode);
  const setFilter = useWorldBuildingStore((state) => state.setFilter);
  const resetFilter = useWorldBuildingStore((state) => state.resetFilter);
  const suggestedMode = useWorldBuildingStore((state) => state.suggestedMode);
  const dismissSuggestion = useWorldBuildingStore((state) => state.dismissSuggestion);
  const [activeAxisPreset, setActiveAxisPreset] = useState<AxisPresetKey | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    if (!graphOnly) return;
    if (worldTab !== "graph") {
      setWorldTab("graph");
    }
  }, [graphOnly, setWorldTab, worldTab]);

  const handleBack = useCallback(() => {
    if (onBackToEditor) {
      onBackToEditor();
      return;
    }
    window.location.hash = "";
  }, [onBackToEditor]);

  const handleOpenSettings = useCallback(() => {
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }
    window.dispatchEvent(new Event("luie:open-settings"));
    window.location.hash = "";
  }, [onOpenSettings]);

  const applyAxisPreset = useCallback(
    (axis: AxisPresetKey) => {
      const preset = AXIS_FILTER_PRESETS[axis];
      setFilter({
        entityTypes: preset.entityTypes,
        relationKinds: preset.relationKinds,
      });
      setActiveAxisPreset(axis);
    },
    [setFilter],
  );

  const clearAxisPreset = useCallback(() => {
    resetFilter();
    setActiveAxisPreset(null);
  }, [resetFilter]);

  useEffect(() => {
    if (!graphOnly) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const withModifier = event.metaKey || event.ctrlKey;
      if (withModifier && event.key === ",") {
        event.preventDefault();
        handleOpenSettings();
        return;
      }
      if (withModifier && event.key === "/") {
        event.preventDefault();
        setIsGuideOpen((prev) => !prev);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        handleBack();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [graphOnly, handleBack, handleOpenSettings]);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-app">
      {graphOnly && <WindowBar />}
      {/* 
        Fix: Always render the top menu bar for the Graph view.
        If it's graphOnly (standalone window/tab), render the standalone top bar.
      */}
      {graphOnly && (
        <div className="flex w-full items-center justify-between gap-2 shrink-0 border-b border-border/40 bg-element/30 px-3 py-2 text-muted backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-2 pl-16"> {/* pl-16 avoid macOS traffic lights */}
            <button
              type="button"
              onClick={handleBack}
              className="rounded-md border border-border/50 bg-element/50 px-3 py-1 text-[11px] text-fg hover:bg-element-hover transition-colors"
            >
              {t("world.graph.menu.back")}
            </button>
            <span className="truncate text-xs font-medium text-fg/80 max-w-[32ch]">
              {projectTitle ?? t("world.graph.overlay.title")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenSettings}
              className="rounded-md border border-border/50 bg-element/50 px-3 py-1 text-[11px] text-fg hover:bg-element-hover transition-colors"
              title="Cmd/Ctrl+,"
            >
              {t("world.graph.menu.settings")}
            </button>
            <button
              type="button"
              onClick={() => setIsGuideOpen((prev) => !prev)}
              className="rounded-md border border-border/50 bg-element/50 px-3 py-1 text-[11px] text-fg hover:bg-element-hover transition-colors"
              title="Cmd/Ctrl+/"
            >
              {t("world.graph.menu.help")}
            </button>
          </div>
        </div>
      )}

      {!graphOnly && (
        <div className="flex w-full items-center justify-between shrink-0 select-none border-b border-border/40 bg-sidebar/30 backdrop-blur-xl px-4 py-1.5 text-muted z-20">
          <div className="flex items-center gap-1 bg-element/80 rounded-lg p-1 border border-border/40">
            {WORLD_TAB_ITEMS.map((item) => (
              <TabButton
                key={item.key}
                label={t(item.labelKey)}
                active={worldTab === item.key}
                onClick={() => setWorldTab(item.key)}
                className="flex-1 cursor-pointer px-4 py-1 rounded-md text-center text-[11px] font-medium transition-all duration-200 hover:text-fg"
                activeClassName="bg-sidebar text-fg shadow-sm border border-border/40 font-semibold"
              />
            ))}
          </div>
        </div>
      )}

      {/* Floating Glassmorphic Pill for Graph Controls */}
      {worldTab === "graph" && (
        <div className="absolute top-[80px] left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-2xl border border-white/5 bg-sidebar/60 px-2 py-1.5 backdrop-blur-xl shadow-2xl">
          {suggestedMode && (
            <div className="flex items-center gap-2 rounded-xl bg-accent/20 px-3 py-1 text-[11px] text-accent font-medium">
              <span>{t("world.graph.suggestionPrefix")}: {t(VIEW_MODE_LABEL_KEY[suggestedMode])}</span>
              <button
                type="button"
                onClick={() => setViewMode(suggestedMode)}
                className="rounded-md bg-accent px-2 py-0.5 text-white shadow-sm hover:opacity-90 transition-opacity"
              >
                {t("world.graph.suggestionApply")}
              </button>
              <button
                type="button"
                onClick={dismissSuggestion}
                className="text-accent/70 hover:text-accent font-bold px-1"
              >
                ✕
              </button>
              <div className="mx-1 h-4 w-px bg-accent/20" />
            </div>
          )}

          <div className="flex items-center">
            {(["standard", "protagonist", "event-chain", "freeform"] as WorldViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`shrink-0 rounded-xl px-4 py-1.5 text-[11px] font-medium transition-all duration-300 ${viewMode === mode
                    ? "bg-element/90 text-fg shadow-sm border border-border/40"
                    : "bg-transparent text-muted hover:text-fg"
                  }`}
              >
                {t(VIEW_MODE_LABEL_KEY[mode])}
              </button>
            ))}
          </div>

          <div className="mx-1 h-5 w-px bg-border/40" />

          <div className="flex items-center">
            {(["time", "space", "culture"] as AxisPresetKey[]).map((axis) => (
              <button
                key={axis}
                type="button"
                onClick={() => applyAxisPreset(axis)}
                className={`shrink-0 rounded-xl px-4 py-1.5 text-[11px] font-medium transition-all duration-300 ${activeAxisPreset === axis
                    ? "bg-accent/10 text-accent"
                    : "bg-transparent text-muted hover:text-fg"
                  }`}
              >
                {t(`world.graph.axis.${axis}`)}
              </button>
            ))}
            {activeAxisPreset && (
              <button
                type="button"
                onClick={clearAxisPreset}
                className="shrink-0 rounded-full bg-element/50 ml-1 px-3 py-1.5 text-[10px] text-muted hover:text-fg transition-colors border border-border/30 hover:bg-element"
              >
                {t("world.graph.menu.resetFilter")}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {graphOnly ? (
          <WorldGraphPanel />
        ) : (
          <>
            {worldTab === "terms" && <TermManager termId={worldId} />}
            {worldTab === "synopsis" && <SynopsisEditor />}
            {worldTab === "mindmap" && <MindMapBoard />}
            {worldTab === "drawing" && <DrawingCanvas />}
            {worldTab === "plot" && <PlotBoard />}
            {worldTab === "graph" && <WorldGraphPanel />}
          </>
        )}
      </div>

      {graphOnly && isGuideOpen && (
        <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-xl rounded-xl border border-border bg-panel p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-semibold text-fg">{t("world.graph.menu.helpTitle")}</h2>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-fg hover:bg-element"
              >
                {t("world.graph.inspector.close")}
              </button>
            </div>
            <ul className="space-y-2 text-sm text-muted">
              <li>{t("world.graph.help.step1")}</li>
              <li>{t("world.graph.help.step2")}</li>
              <li>{t("world.graph.help.step3")}</li>
              <li>{t("world.graph.help.step4")}</li>
            </ul>
            <div className="mt-4 rounded-md border border-border/70 bg-element px-3 py-2 text-xs text-muted">
              {t("world.graph.help.shortcuts")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
