import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import type { WorldTab } from "@renderer/features/workspace/stores/uiStore";

import type { Term } from "@shared/types";
import { DraggableItem } from "@shared/ui/DraggableItem";

type SidebarWorldListMode = "scrap" | "plotboard" | "untitled";
type CatalogSubview = Exclude<WorldTab, "terms">;

const SUBVIEW_LABEL_KEYS: Record<CatalogSubview, string> = {
  synopsis: "research.catalog.synopsis",
  mindmap: "research.catalog.mindmap",
  drawing: "research.catalog.drawing",
  plot: "research.catalog.plot",
  graph: "research.catalog.graph",
};

export default function SidebarWorldList({
  mode = "scrap",
}: {
  mode?: SidebarWorldListMode;
}) {
  const { t } = useTranslation();
  const currentProject = useProjectStore((state) => state.currentItem);
  const {
    items: terms,
    setCurrent: setCurrentTerm,
    loadAll: loadTerms,
    create: createTerm,
  } = useTermStore(
    useShallow((state) => ({
      items: state.items,
      setCurrent: state.setCurrent,
      loadAll: state.loadAll,
      create: state.create,
    })),
  );
  const setMainView = useUIStore((state) => state.setMainView);
  const setWorldTab = useUIStore((state) => state.setWorldTab);
  const isScrap = mode === "scrap";
  const subviews: CatalogSubview[] =
    mode === "plotboard"
      ? ["synopsis", "plot"]
      : mode === "untitled"
        ? ["mindmap", "drawing", "graph"]
        : [];

  // NOTE: 렌더마다 새 배열을 정렬하면 하위 map이 전부 재조정된다. terms 참조가 바뀔 때만
  // 정렬한다. lib target이 ES2022라 toSorted 대신 복사본을 정렬해 원본 변형을 피한다.
  const orderedTerms = useMemo(
    () => [...terms].sort((a: Term, b: Term) => (a.order || 0) - (b.order || 0)),
    [terms],
  );

  useEffect(() => {
    if (isScrap && currentProject) {
      loadTerms(currentProject.id);
    }
  }, [currentProject, isScrap, loadTerms]);

  const handleAddTerm = useCallback(async () => {
    if (currentProject) {
      const maxOrder = Math.max(...terms.map((t: Term) => t.order || 0), -1);
      await createTerm({
        projectId: currentProject.id,
        term: t("world.term.defaultName"),
        definition: "",
        category: t("world.term.defaultCategory"),
        order: maxOrder + 1,
      });
    }
  }, [currentProject, createTerm, t, terms]);

  return (
    <div className="flex flex-col h-full bg-sidebar/50">
      <div className="flex flex-col gap-1 border-b border-border p-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            {t(
              mode === "scrap"
                ? "research.title.scrap"
                : mode === "plotboard"
                  ? "research.title.plotBoard"
                  : "research.title.untitled",
            )}
          </span>
          {isScrap && (
            <button
              className="p-1 hover:bg-surface-hover rounded text-muted hover:text-fg transition-colors"
              onClick={handleAddTerm}
              title={t("world.term.addLabel")}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {subviews.length > 0 && (
          <div className="grid grid-cols-2 gap-1 mt-1">
            {subviews.map((subview) => {
              const label = t(SUBVIEW_LABEL_KEYS[subview]);
              return (
                <DraggableItem
                  key={subview}
                  id={`drag-${subview}`}
                  data={{ type: subview, id: subview, title: label }}
                >
                  <button
                    onClick={() => {
                      setMainView({ type: "world" });
                      setWorldTab(subview);
                    }}
                    className="text-xs text-left px-2 py-1 rounded hover:bg-surface-hover text-muted hover:text-fg transition-colors truncate"
                  >
                    {label}
                  </button>
                </DraggableItem>
              );
            })}
          </div>
        )}
      </div>

      {isScrap && (
        <div className="px-2 py-1 text-[10px] font-bold text-muted uppercase tracking-wider bg-sidebar/30 mt-1">
          {t("research.catalog.terms")}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {isScrap ? (
          <div className="flex flex-col gap-2">
            {orderedTerms.length === 0 && (
              <div className="text-xs text-muted text-center italic py-4">
                {t("world.term.noTerms")}
              </div>
            )}
            {orderedTerms.map((term) => (
              <DraggableItem
                key={`drag-${term.id}`}
                id={`drag-term-${term.id}`}
                data={{ type: "world", id: term.id, title: term.term }}
              >
                <SidebarTermItem
                  key={term.id}
                  term={term}
                  onSelect={(id) => {
                    const term = terms.find((item) => item.id === id);
                    setCurrentTerm(term || null);
                    setMainView({ type: "world" });
                  }}
                />
              </DraggableItem>
            ))}
          </div>
        ) : (
          <p className="px-2 py-4 text-xs italic text-muted">
            {t("research.catalog.empty", "하위 화면을 선택하세요.")}
          </p>
        )}
      </div>
    </div>
  );
}

function SidebarTermItem({
  term,
  onSelect,
}: {
  term: Term;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="px-3 py-2 bg-sidebar-surface border border-border rounded cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors flex flex-col gap-0.5"
      onClick={() => onSelect(term.id)}
    >
      <div className="font-medium text-sm truncate">{term.term}</div>
      <div className="text-[10px] text-muted truncate">
        {term.category}
      </div>
    </div>
  );
}
