
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Plus } from "lucide-react";
import type { Term } from "../../../../../shared/types";
import { useProjectStore } from "../../../stores/projectStore";
import { useTermStore } from "../../../stores/termStore";
import { BufferedInput, BufferedTextArea } from "../../common/BufferedInput";
import { useShortcutCommand } from "../../../hooks/useShortcutCommand";
import {
  DndContext, 
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { TermCard, SortableTermItem } from "./TermCard";
import { useTermDragDrop } from "./hooks/useTermDragDrop";

interface TermManagerProps {
  termId?: string;
}

export function TermManager({ termId }: TermManagerProps) {
  const { t } = useTranslation();
  const { currentItem: currentProject } = useProjectStore();
  const { terms, currentTerm, setCurrentTerm, loadTerms, loadTerm, createTerm, updateTerm, deleteTerm } = useTermStore();

  useEffect(() => {
    if (termId) {
      void loadTerm(termId);
    }
  }, [termId, loadTerm]);

  const {
    sensors,
    handleDragStart,
    handleDragEnd,
    orderedTerms,
    activeItem,
  } = useTermDragDrop({ terms });

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

  useShortcutCommand((command) => {
    if (command.type === "world.addTerm") {
      void handleAddTerm();
    }
  });

  if (currentTerm) {
    return (
      <div className="p-4 h-full overflow-y-auto">
        <div className="flex items-center gap-3 pb-3 mb-4 border-b border-border sticky top-0 bg-app z-10 pt-2">
          <div
            className="flex items-center justify-center p-1 rounded hover:bg-hover text-muted hover:text-fg transition-colors cursor-pointer"
            onClick={() => setCurrentTerm(null)}
          >
            <ArrowLeft className="icon-md" />
          </div>
          <span className="font-semibold text-fg">{currentTerm.term}</span>
        </div>

        <div className="grid grid-cols-[100px_1fr] gap-4 items-start pb-8">
          <div className="text-right text-xs font-bold text-muted pt-2 uppercase tracking-wide">{t("world.term.label")}</div>
          <div className="min-w-0">
            <BufferedInput
              className="w-full p-2 bg-element border border-border rounded text-sm text-fg outline-none focus:border-active focus:ring-1 focus:ring-active transition-all"
              value={currentTerm.term}
              onSave={(val) => updateTerm({ id: currentTerm.id, term: val })}
            />
          </div>
          <div className="text-right text-xs font-bold text-muted pt-2 uppercase tracking-wide">{t("world.term.definitionLabel")}</div>
          <div className="min-w-0">
            <BufferedTextArea
              className="w-full p-2 bg-element border border-border rounded text-sm text-fg outline-none focus:border-active focus:ring-1 focus:ring-active transition-all font-sans leading-relaxed"
              value={currentTerm.definition || ""}
              onSave={(val) => updateTerm({ id: currentTerm.id, definition: val })}
              style={{ minHeight: "100px" }}
            />
          </div>
          <div className="text-right text-xs font-bold text-muted pt-2 uppercase tracking-wide">{t("world.term.categoryLabel")}</div>
          <div className="min-w-0">
            <BufferedInput
              className="w-full p-2 bg-element border border-border rounded text-sm text-fg outline-none focus:border-active focus:ring-1 focus:ring-active transition-all"
              value={currentTerm.category || ""}
              onSave={(val) => updateTerm({ id: currentTerm.id, category: val })}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto p-6">
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
            items={orderedTerms.map(t => t.id)} 
            strategy={rectSortingStrategy}
        >
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 pb-10">
                <div
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl cursor-pointer text-muted hover:text-accent hover:border-accent hover:bg-element-hover transition-all text-sm font-medium group"
                    onClick={handleAddTerm}
                    style={{ minHeight: "120px", height: "100%" }}
                >
                    <div className="p-2 rounded-full bg-secondary/50 group-hover:bg-accent/10 transition-colors">
                    <Plus className="icon-lg group-hover:scale-110 transition-transform" />
                    </div>
                    <span>{t("world.term.addLabel")}</span>
                </div>
                
                {orderedTerms.map((term) => (
                    <SortableTermItem 
                        key={term.id} 
                        item={term} 
                        onSelect={(id) => {
                            const term = terms.find((t: Term) => t.id === id);
                            setCurrentTerm(term || null);
                        }}
                        onDelete={deleteTerm}
                        t={t}
                    />
                ))}
            </div>
        </SortableContext>
        <DragOverlay>
            {activeItem ? (
                <TermCard item={activeItem} isOverlay t={t} />
            ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
