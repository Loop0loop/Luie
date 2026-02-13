
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Plus } from "lucide-react";
import { useProjectStore } from "../../../stores/projectStore";
import { useTermStore } from "../../../stores/termStore";
import { BufferedInput, BufferedTextArea } from "../../common/BufferedInput";
import { useShortcutCommand } from "../../../hooks/useShortcutCommand";
import {
  DndContext, 
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import type { Term } from "../../../../../shared/types";
import { TermCard, SortableTermItem } from "./TermCard";

export function TermManager() {
  const { t } = useTranslation();
  const { currentItem: currentProject } = useProjectStore();
  const { terms, currentTerm, setCurrentTerm, loadTerms, createTerm, updateTerm, deleteTerm } = useTermStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Local state for DnD to prevent optimistic UI glitch
  // We initialize this with null, and while dragging we set it.
  const [temporaryOrder, setTemporaryOrder] = useState<Term[] | null>(null);

  // Memoize the sorted list from props
  const sortedTermsFromStore = useMemo(() => {
    return [...terms].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [terms]);

  // Use temporary order during drag/operations, otherwise store order
  const orderedTerms = temporaryOrder ?? sortedTermsFromStore;

  useEffect(() => {
    if (currentProject) {
      loadTerms(currentProject.id);
    }
  }, [currentProject, loadTerms]);

  const handleAddTerm = useCallback(async () => {
    if (currentProject) {
      const maxOrder = Math.max(...terms.map(t => t.order || 0), -1);
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setTemporaryOrder(sortedTermsFromStore);
  }, [sortedTermsFromStore]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
        // We need to calculate the new order based on the current state
        // We capture the state at the moment of drag end
        
        let newItems: Term[] = [];
        let hasChanged = false;

        setTemporaryOrder((currentItems) => {
            const items = currentItems || sortedTermsFromStore;
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);
            
            if (oldIndex === -1 || newIndex === -1) {
                return null; 
            }

            newItems = arrayMove(items, oldIndex, newIndex);
            hasChanged = true;
            return newItems; // Keep the temporary order visible while saving
        });

        if (hasChanged) {
            // Optimistic update to backend
            // We update specific items that changed order
            // To be robust, we should probably update all items involved or just the ones that need it.
            // For simplicity and correctness, we update the 'order' field for all terms in newItems 
            // where it differs from their index.
            
            const updates = newItems.map((item, index) => {
                if (item.order !== index) {
                    return updateTerm({ id: item.id, order: index });
                }
                return Promise.resolve();
            });

            await Promise.all(updates);
            
            // After updates are done, we can clear temporary order because 
            // the store should have received the updates via SSE or re-fetch if implemented,
            // or at least our local store optimistically updated via updateTerm.
            // However, `updateTerm` in `termStore` updates one by one. 
            // If `termStore` listens to socket events, it might flicker.
            // For now, let's clear it.
            setTemporaryOrder(null);
        } else {
            setTemporaryOrder(null);
        }
    } else {
        setTemporaryOrder(null);
    }
  }, [sortedTermsFromStore, updateTerm]);

  const activeItem = useMemo(() => 
    orderedTerms.find(item => item.id === activeId), 
  [orderedTerms, activeId]);

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
          <span style={{ fontWeight: "var(--font-weight-semibold)" }}>{currentTerm.term}</span>
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
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl cursor-pointer text-muted hover:text-accent hover:border-accent hover:bg-accent/5 transition-all text-sm font-medium group"
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
                            const term = terms.find(t => t.id === id);
                            setCurrentTerm(term || null);
                        }}
                        onDelete={deleteTerm}
                        t={t}
                    />
                ))}
            </div>
        </SortableContext>
        {/* Drag Overlay for better UX */}
        <DragOverlay>
            {activeItem ? (
                <TermCard item={activeItem} isOverlay t={t} />
            ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
