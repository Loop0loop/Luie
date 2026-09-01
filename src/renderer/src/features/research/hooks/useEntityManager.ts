import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { TFunction } from "i18next";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";

import { PREVIEW_PROJECT_ID } from "@renderer/features/startup/constants/previewData";

export interface EntityManagerStore<T> {
  items: T[];
  currentItem: T | null;
  loadAll: (projectId: string) => Promise<void>;
  setCurrent: (item: T | null) => void;
}

export interface UseEntityManagerOptions<
  T extends { id: string; description?: string | null },
> {
  store: EntityManagerStore<T>;
  uncategorizedKey: string;
  t: TFunction;
}

export function useEntityManager<
  T extends { id: string; description?: string | null },
>({ store, uncategorizedKey, t }: UseEntityManagerOptions<T>) {
  const { items, currentItem: currentItemFromStore, loadAll, setCurrent } = store;

  const currentProject = useProjectStore((state) => state.currentItem);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // NOTE: 외부 store 변경만 local selection에 반영하도록 현재 선택값을 ref로 추적한다.
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (
      currentItemFromStore?.id &&
      currentItemFromStore.id !== selectedIdRef.current
    ) {
      const nextId = currentItemFromStore.id;
      const timer = window.setTimeout(() => setSelectedId(nextId), 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [currentItemFromStore]);

  useEffect(() => {
    if (currentProject && currentProject.id !== PREVIEW_PROJECT_ID) {
      void loadAll(currentProject.id);
    }
  }, [currentProject, loadAll]);

  // NOTE: store 갱신 직후 다음 tick에서 선택을 해제해 화면 깜빡임을 막는다.
  useEffect(() => {
    if (!selectedId) return;
    if (items.some((item) => item.id === selectedId)) return;
    const timer = window.setTimeout(() => setSelectedId(null), 0);
    return () => window.clearTimeout(timer);
  }, [items, selectedId]);

  const handleViewAll = useCallback(() => {
    setCurrent(null);
    setSelectedId(null);
  }, [setCurrent]);

  const grouped = useMemo(() => {
    const groups: Record<string, T[]> = {};
    items.forEach((item) => {
      const group = item.description?.trim() || t(uncategorizedKey);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });
    return groups;
  }, [items, t, uncategorizedKey]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  return {
    currentProject,
    items,
    selectedId,
    setSelectedId,
    selectedItem,
    grouped,
    handleViewAll,
  };
}
