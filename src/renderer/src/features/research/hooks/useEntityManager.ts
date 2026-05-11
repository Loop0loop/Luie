import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { TFunction } from "i18next";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";

/**
 * CRUD 스토어에서 공통으로 사용하는 엔티티 선택·로드·그루핑 로직.
 *
 * useCharacterManager / useEventManager / useFactionManager 세 훅의 공통 패턴을 추상화.
 * 각 Manager 훅은 이 훅을 사용하여 도메인 고유 로직(handleAdd 등)만 담당.
 *
 * @template T - id 와 선택적 description 을 가진 엔티티 타입
 */

export interface EntityManagerStore<T> {
  items: T[];
  currentItem: T | null;
  loadAll: (projectId: string) => Promise<void>;
  setCurrent: (item: T | null) => void;
}

export interface UseEntityManagerOptions<
  T extends { id: string; description?: string | null },
> {
  /** zustand store에서 필요한 필드만 뽑아주는 함수. useShallow로 감싸서 전달해야 함. */
  store: EntityManagerStore<T>;
  /** i18n 키: 그루핑 기준이 없는 항목의 그룹명 */
  uncategorizedKey: string;
  t: TFunction;
}

export function useEntityManager<
  T extends { id: string; description?: string | null },
>({ store, uncategorizedKey, t }: UseEntityManagerOptions<T>) {
  const { items, currentItem: currentItemFromStore, loadAll, setCurrent } = store;

  const currentProject = useProjectStore((state) => state.currentItem);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ref로 로컬 선택값 추적 — sync effect가 로컬 클릭에 반응하지 않도록
  // (stale closure 없이 currentItemFromStore effect가 읽을 수 있게)
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // store → local 단방향 sync
  // SmartLinkService 등 외부에서 currentItem 변경 시 로컬 선택에 반영
  useEffect(() => {
    if (
      currentItemFromStore?.id &&
      currentItemFromStore.id !== selectedIdRef.current
    ) {
      setSelectedId(currentItemFromStore.id);
    }
  }, [currentItemFromStore]);

  // 프로젝트 변경 시 데이터 로드
  useEffect(() => {
    if (currentProject) {
      void loadAll(currentProject.id);
    }
  }, [currentProject, loadAll]);

  // 선택된 아이템이 삭제됐을 때 선택 해제
  // setTimeout(0): 스토어 업데이트 완료 후 배치로 실행하여 깜빡임 방지
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

  // description 필드 기준 그루핑 (description이 카테고리 역할)
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
