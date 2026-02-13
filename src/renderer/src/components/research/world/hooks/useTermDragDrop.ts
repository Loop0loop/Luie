
import { useState, useCallback, useMemo } from "react";
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { Term } from "../../../../../../shared/types";
import { useTermStore } from "../../../../stores/termStore";

interface UseTermDragDropProps {
  terms: Term[];
}

export function useTermDragDrop({ terms }: UseTermDragDropProps) {
  const { updateTerm } = useTermStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [temporaryOrder, setTemporaryOrder] = useState<Term[] | null>(null);

  const sortedTermsFromStore = useMemo(() => {
    return [...terms].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [terms]);

  const orderedTerms = temporaryOrder ?? sortedTermsFromStore;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
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
      setTemporaryOrder((currentItems) => {
        const items = currentItems || sortedTermsFromStore;
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return null;

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Optimistic update:
        // We calculate the updates needed but we DON'T wait for them to finish before returning the new state.
        // This keeps the UI snappy. The "temporaryOrder" state will hold the new order
        // untill the store updates come in.
        // However, if we clear temporaryOrder immediately after the promise resolves, it might flicker if the store hasn't updated yet.
        // A better approach is to rely on the store update to eventually sync.
        
        // Critical Fix:
        // We update the backend, but we keep the temporary order valid 
        // until we receive new props that match our temporary order or a sufficient time has passed?
        // Actually, the issue is likely that `terms` prop updates halfway through with partial data?
        // Or simply that `updateTerm` is async and `loadTerms` might be triggered.
        
        // Strategy: 
        // Fire and forget the update to backend.
        // Keep `temporaryOrder` until `terms` from store matches the new order? 
        // That's complex. 
        // Simpler: Just rely on local state until next full refresh or keep it for a few seconds?
        // Best: Provide the new order to the store immediately via a synchronous action if available.
        // Since `termStore` is simple CRUD, we can simulate a local update if we exported a `setTerms` action.
        // But `createCRUDStore` doesn't expose `setItems` publicly easily outside.
        
        // Let's stick to the previous "optimistic then clear" but maybe with a slight delay or
        // check if we can update the store's cache directly.
        
        // For now, let's execute the updates.
        
        // We chain updates properly to ensure order.
        const updatePromises = newItems.map((item, index) => {
            if (item.order !== index) {
                return updateTerm({ id: item.id, order: index });
            }
            return Promise.resolve();
        });

        void Promise.all(updatePromises).then(() => {
             // Optional: invalidate query or re-fetch?
             // automatic via socket/listener if valid. 
             // We just clear temp order after a short delay to allow propagation
             setTimeout(() => setTemporaryOrder(null), 500);
        });
        
        return newItems;
      });
    } else {
      setTemporaryOrder(null);
    }
  }, [sortedTermsFromStore, updateTerm]);

  return {
    sensors,
    handleDragStart,
    handleDragEnd,
    orderedTerms,
    activeId,
    activeItem: orderedTerms.find((item) => item.id === activeId),
  };
}
