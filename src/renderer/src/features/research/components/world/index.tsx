import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUIStore, type WorldTab } from "@renderer/features/workspace/stores/uiStore";

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

      {/* Floating Glassmorphic Pill for Graph Controls removed because mode was removed */}

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
