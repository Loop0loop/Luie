import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";


import type { Term } from "@shared/types";
import { DraggableItem } from "@shared/ui/DraggableItem";

export default function SidebarWorldList() {
  const { t } = useTranslation();
  const { currentItem: currentProject } = useProjectStore();
  const { terms, setCurrentTerm, loadTerms, createTerm } = useTermStore();

  const orderedTerms = terms.sort((a: Term, b: Term) => (a.order || 0) - (b.order || 0));

  useEffect(() => {
    if (currentProject) {
      loadTerms(currentProject.id);
    }
  }, [currentProject, loadTerms]);

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
       <div className="flex flex-col gap-1 border-b border-border/20 p-2">
           <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("research.title.world")}</span>
                <button 
                    className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-foreground transition-colors"
                    onClick={handleAddTerm}
                    title={t("world.term.addLabel")}
                >
                    <Plus className="w-4 h-4" />
                </button>
           </div>
           
           {/* Navigation Buttons */}
           <div className="grid grid-cols-2 gap-1 mt-1">
               <DraggableItem id="drag-synopsis" data={{ type: "synopsis", id: "synopsis", title: t("sidebar.item.synopsis") }}>
                 <button onClick={() => { useUIStore.getState().setMainView({ type: "world" }); useUIStore.getState().setWorldTab("synopsis"); }} className="text-xs text-left px-2 py-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors truncate">
                     {t("sidebar.item.synopsis")}
                 </button>
               </DraggableItem>
               <DraggableItem id="drag-mindmap" data={{ type: "mindmap", id: "mindmap", title: t("world.tab.mindmap") }}>
                 <button onClick={() => { useUIStore.getState().setMainView({ type: "world" }); useUIStore.getState().setWorldTab("mindmap"); }} className="text-xs text-left px-2 py-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors truncate">
                     {t("world.tab.mindmap")}
                 </button>
               </DraggableItem>
               <DraggableItem id="drag-drawing" data={{ type: "drawing", id: "drawing", title: t("world.tab.drawing") }}>
                 <button onClick={() => { useUIStore.getState().setMainView({ type: "world" }); useUIStore.getState().setWorldTab("drawing"); }} className="text-xs text-left px-2 py-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors truncate">
                     {t("world.tab.drawing")}
                 </button>
               </DraggableItem>
               <DraggableItem id="drag-plot" data={{ type: "plot", id: "plot", title: t("world.tab.plot") }}>
                 <button onClick={() => { useUIStore.getState().setMainView({ type: "world" }); useUIStore.getState().setWorldTab("plot"); }} className="text-xs text-left px-2 py-1 rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors truncate">
                     {t("world.tab.plot")}
                 </button>
               </DraggableItem>
           </div>
       </div>

       <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-sidebar/30 mt-1">
            {t("world.tab.terms")}
       </div>

      <div className="flex-1 overflow-y-auto p-2">
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
                              const term = terms.find(t => t.id === id);
                              setCurrentTerm(term || null);
                              useUIStore.getState().setMainView({ type: "world" });
                          }}
                      />
                  </DraggableItem>
              ))}
          </div>
      </div>
    </div>
  );
}

function SidebarTermItem({ term, onSelect }: { term: Term; onSelect: (id: string) => void }) {
    return (
        <div 
            className="px-3 py-2 bg-sidebar-surface border border-border/50 rounded cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors flex flex-col gap-0.5"
            onClick={() => onSelect(term.id)}
        >
            <div className="font-medium text-sm truncate">{term.term}</div>
            <div className="text-[10px] text-muted-foreground truncate">{term.category}</div>
        </div>
    );
}
