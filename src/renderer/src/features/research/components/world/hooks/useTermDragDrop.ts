import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Term } from "@shared/types";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import { useToast } from "@shared/ui/ToastContext";
import { useTranslation } from "react-i18next";
import { api } from "@shared/api";
import {
  buildTermOrderUpdates,
  cancelCommitTimeout,
  type CommitTimeoutId,
  hasTermReorderFailures,
  resolveNextTermOrder,
  startCommitTimeout,
} from "./termDragDropUtils";

interface UseTermDragDropProps {
  terms: Term[];
}

const COMMIT_TIMEOUT_MS = 8000;

export function useTermDragDrop({ terms }: UseTermDragDropProps) {
  const { loadTerms } = useTermStore();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [temporaryOrder, setTemporaryOrder] = useState<Term[] | null>(null);
  const requestIdRef = useRef(0);
  const commitTimeoutRef = useRef<CommitTimeoutId | null>(null);

  const sortedTermsFromStore = useMemo(
    () => [...terms].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [terms],
  );
  const orderedTerms = temporaryOrder ?? sortedTermsFromStore;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const clearCommitTimeout = useCallback(() => {
    commitTimeoutRef.current = cancelCommitTimeout(
      commitTimeoutRef.current,
      window.clearTimeout,
    );
  }, []);

  useEffect(
    () => () => {
      clearCommitTimeout();
    },
    [clearCommitTimeout],
  );

  const commitOrder = useCallback(
    async (requestId: number, previousOrder: Term[], nextOrder: Term[]) => {
      const updates = buildTermOrderUpdates(nextOrder);
      if (updates.length === 0) {
        if (requestIdRef.current === requestId) {
          setTemporaryOrder(null);
        }
        return;
      }

      clearCommitTimeout();
      commitTimeoutRef.current = startCommitTimeout(
        window.setTimeout,
        COMMIT_TIMEOUT_MS,
        () => {
          if (requestIdRef.current !== requestId) return;
          setTemporaryOrder(previousOrder);
          showToast(t("world.term.reorderFailed"), "error");
        },
      );

      const results = await Promise.allSettled(
        updates.map((input) => api.term.update(input)),
      );
      clearCommitTimeout();

      if (requestIdRef.current !== requestId) return;
      if (hasTermReorderFailures(results)) {
        setTemporaryOrder(previousOrder);
        showToast(t("world.term.reorderFailed"), "error");
        return;
      }

      setTemporaryOrder(null);
      const projectId = nextOrder[0]?.projectId;
      if (projectId) {
        await loadTerms(projectId);
      }
    },
    [clearCommitTimeout, loadTerms, showToast, t],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      setActiveId(String(event.active.id));
      setTemporaryOrder(sortedTermsFromStore);
    },
    [sortedTermsFromStore],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      const baseOrder = temporaryOrder ?? sortedTermsFromStore;
      const nextOrder = resolveNextTermOrder(
        baseOrder,
        String(active.id),
        over ? String(over.id) : undefined,
      );
      if (!nextOrder) {
        setTemporaryOrder(null);
        return;
      }

      setTemporaryOrder(nextOrder);
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      void commitOrder(requestId, baseOrder, nextOrder);
    },
    [commitOrder, sortedTermsFromStore, temporaryOrder],
  );

  return {
    sensors,
    handleDragStart,
    handleDragEnd,
    orderedTerms,
    activeId,
    activeItem: orderedTerms.find((item) => item.id === activeId),
  };
}
