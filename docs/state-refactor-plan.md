# State Management Refactoring Plan
**Branch:** `feature/state`  
**Scope:** UIStore dual-state elimination + Entity Manager abstraction  
**Risk Level:** High — touches core state that every layout reads  

---

## 현황 분석

### 문제 1: UIStore 이중 상태 (Dual State)

`regions`가 진짜 single source of truth임에도, 레거시 flat 필드가 병렬로 존재한다.

```
regions.leftSidebar.open     ↔  isSidebarOpen          (항상 동기화)
regions.rightPanel.open      ↔  isContextOpen           (항상 동기화)
regions.rightPanel.open      ↔  scrivenerInspectorOpen  (항상 동기화)
regions.leftSidebar.open     ↔  scrivenerSidebarOpen    (항상 동기화)
regions.rightRail.open       ↔  isBinderBarOpen         (항상 동기화)
regions.rightPanel.activeTab ↔  docsRightTab            (항상 동기화)
```

**증거:** `uiStore.persist.ts` merge 함수가 rehydrate 시 `regions`에서 레거시 필드를 역산해서 채운다.  
**결과:** 모든 setter가 4~6개 필드를 동시에 업데이트해야 함 → setter 복잡도 증가, divergence 위험.

**영향 범위 (레거시 필드 소비자):**
| 파일 | 읽는 필드 | 쓰는 setter |
|------|----------|------------|
| `EditorRoot.tsx` | `isSidebarOpen`, `isContextOpen`, `docsRightTab` | `setSidebarOpen`, `setContextOpen`, `setDocsRightTab` |
| `layoutModeActions.ts` | `isSidebarOpen`, `isContextOpen`, `docsRightTab` (options) | `setSidebarOpen`, `setContextOpen`, `setDocsRightTab` (options) |
| `useEditorRootShortcuts.ts` | `isSidebarOpen` | `setSidebarOpen` |
| `useProjectLayoutPersistence.ts` | `isSidebarOpen`, `isContextOpen` | `setSidebarOpen`, `setContextOpen`, `setDocsRightTab`, `setBinderBarOpen` |
| `useSidebarLogic.ts` | — | `setSidebarOpen` |
| `useBinderSidebarState.ts` | `docsRightTab` | — |
| `App.tsx` | `isSidebarOpen`, `isContextOpen`, `docsRightTab`, `isBinderBarOpen` | — |

**주의:** `WorldGraphPanel` / `GraphIconSidebar`의 `isSidebarOpen`은 `worldGraphUiStore` (별도 store) → 무관, 건드리지 않음.

---

### 문제 2: Entity Manager 복붙 패턴

`useCharacterManager`, `useEventManager`, `useFactionManager` 세 훅이 구조 100% 동일:

```
[공통 패턴]
1. useXxxStore(useShallow(...)) → items, currentItem, loadAll, create, update, setCurrent
2. useState<string | null>(null) → selectedId
3. useRef + useEffect → selectedId ref 추적 (stale closure 방지)
4. useEffect(currentItemFromStore → setSelectedId) → store→local 단방향 sync
5. useEffect(currentProject → loadAll) → 프로젝트 변경 시 데이터 로드
6. useEffect(items → clear selection) → 아이템 삭제 시 선택 해제
7. useMemo(items → groupedByDescription) → 그루핑
8. useMemo(items.find → selectedItem) → 선택된 아이템
```

차이점은 `handleAdd` 로직과 템플릿 처리 정도뿐.

---

## 리팩토링 플랜

### Phase 1: UIStore — `regions`를 완전한 Single Source of Truth로

**목표:** 레거시 flat 필드 완전 제거, setter 단순화

#### Step 1-A: 새 편의 selector 추가 (backward-compat bridge 역할)

`regions`를 직접 읽도록 consumer 이전하기 전에, 기존 코드가 깨지지 않는 브릿지 헬퍼를 store 외부에 둔다. Store 내부에서 제거하는 과정에서 consumer가 한 번에 마이그레이션 가능하도록.

```ts
// 새 파일: src/renderer/src/features/workspace/stores/uiStore.selectors.ts
export const selectIsSidebarOpen = (s: UIStore) => s.regions.leftSidebar.open;
export const selectIsRightPanelOpen = (s: UIStore) => s.regions.rightPanel.open;
export const selectActiveRightTab = (s: UIStore) => s.regions.rightPanel.activeTab;
export const selectIsRailOpen = (s: UIStore) => s.regions.rightRail.open;
```

#### Step 1-B: Consumer 파일 마이그레이션

각 소비자 파일에서 레거시 필드 제거하고 `regions.*` 또는 selector 사용:

**`EditorRoot.tsx`**
```ts
// Before
isSidebarOpen: state.isSidebarOpen,
isContextOpen: state.isContextOpen,
docsRightTab: state.docsRightTab,

// After
isSidebarOpen: state.regions.leftSidebar.open,
isContextOpen: state.regions.rightPanel.open,
docsRightTab: state.regions.rightPanel.activeTab,
```

**`layoutModeActions.ts`** — 옵션 타입에서 레거시 setter 제거:
```ts
// Before (options에 있던 것들)
setSidebarOpen: (isOpen: boolean) => void;
setContextOpen: (isOpen: boolean) => void;
setDocsRightTab: (tab: DocsRightTab) => void;
isSidebarOpen: boolean;
isContextOpen: boolean;

// After (직접 store action 사용)
setRegionOpen: (region: RegionId, open: boolean) => void;
openRightPanelTab: (tab: RightPanelTab) => void;
closeRightPanel: () => void;
isSidebarOpen: boolean;   // → regions.leftSidebar.open 읽어서 전달
isRightPanelOpen: boolean; // → regions.rightPanel.open
activeRightTab: RightPanelTab | null; // → regions.rightPanel.activeTab
```

**`useProjectLayoutPersistence.ts`** — `setRegionOpen` + `openRightPanelTab` 사용:
```ts
// Before
setSidebarOpen(saved.main.sidebarOpen);
setContextOpen(saved.main.contextOpen);
setDocsRightTab(sanitizePersistedDocsRightTab(saved.docs.rightTab));
setBinderBarOpen(saved.docs.binderBarOpen);

// After
setRegionOpen("leftSidebar", saved.main.sidebarOpen);
setRegionOpen("rightPanel", saved.main.contextOpen);
const rightTab = sanitizePersistedDocsRightTab(saved.docs.rightTab);
if (rightTab) openRightPanelTab(rightTab); else closeRightPanel();
setRegionOpen("rightRail", saved.docs.binderBarOpen);
```

**`useSidebarLogic.ts`** — `setRegionOpen("leftSidebar", true)` 사용

**`useEditorRootShortcuts.ts`** — `setRegionOpen("leftSidebar", !)` 사용

**`useBinderSidebarState.ts`** — `docsRightTab: state.docsRightTab` → `state.regions.rightPanel.activeTab`

**`App.tsx`** — 레이아웃 저장 시 `regions.*` 읽기:
```ts
// Before
isSidebarOpen: uiState.isSidebarOpen,
isContextOpen: uiState.isContextOpen,
docsRightTab: uiState.docsRightTab,
isBinderBarOpen: uiState.isBinderBarOpen,

// After
isSidebarOpen: uiState.regions.leftSidebar.open,
isContextOpen: uiState.regions.rightPanel.open,
docsRightTab: uiState.regions.rightPanel.activeTab,
isBinderBarOpen: uiState.regions.rightRail.open,
```

#### Step 1-C: uiStore 레거시 필드 + setter 제거

Consumer 전부 마이그레이션 완료 후:

**`uiStore.types.ts`** — 제거:
```ts
// 제거 대상
isSidebarOpen: boolean;
isContextOpen: boolean;
isBinderBarOpen: boolean;
docsRightTab: DocsRightTab;
scrivenerSidebarOpen: boolean;
scrivenerInspectorOpen: boolean;

// 제거할 setters
setSidebarOpen: (isOpen: boolean) => void;
setContextOpen: (isOpen: boolean) => void;
setDocsRightTab: (tab: DocsRightTab) => void;
setBinderBarOpen: (isOpen: boolean) => void;
setScrivenerSidebarOpen: (isOpen: boolean) => void;
setScrivenerInspectorOpen: (isOpen: boolean) => void;
```

**`uiStore.state.ts`** — 초기값 및 setter 구현체 제거.  
`setRegionOpen` 내부도 단순화: 더 이상 `patch.isSidebarOpen`, `patch.isContextOpen` 등 동기화 불필요.

**`uiStore.persist.ts`** — merge 함수에서 레거시 필드 assign 제거:
```ts
// 제거
isSidebarOpen: migratedRegions.leftSidebar.open,
isContextOpen: migratedRegions.rightPanel.open,
isBinderBarOpen: migratedRegions.rightRail.open,
scrivenerSidebarOpen: migratedRegions.leftSidebar.open,
scrivenerInspectorOpen: migratedRegions.rightPanel.open,
docsRightTab,  // ← regions.rightPanel.activeTab에서 derive됨
```

**`closeFocusedSurface`** 단순화:
```ts
// Before: docsRightTab, isContextOpen, scrivenerInspectorOpen, regions 4개 필드
// After: regions만 업데이트
nextRegions.rightPanel.open = false;
nextRegions.rightPanel.activeTab = null;
return { regions: nextRegions };
```

**`openRightPanelTab`** 단순화:
```ts
// Before: docsRightTab, isContextOpen, scrivenerInspectorOpen, regions 동시 업데이트
// After: regions만
nextRegions.rightPanel.open = true;
nextRegions.rightPanel.activeTab = nextTab;
return { regions: nextRegions };
```

#### Step 1-D: Schema 버전 올리기

`UI_STORE_SCHEMA_VERSION` bump. persist migrate 함수에서 구버전 필드 무시하도록 처리.

---

### Phase 2: Entity Manager 추상화

**목표:** `useCharacterManager` / `useEventManager` / `useFactionManager` 공통 로직 추출

#### Step 2-A: `useEntityManager<T>` 훅 생성

```ts
// 새 파일: src/renderer/src/features/research/hooks/useEntityManager.ts

import { useState, useEffect, useRef, useMemo } from "react";
import type { TFunction } from "i18next";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useShallow } from "zustand/react/shallow";

interface EntityManagerStore<T> {
  items: T[];
  currentItem: T | null;
  loadAll: (projectId: string) => Promise<void>;
  create: (input: unknown) => Promise<T | null>;
  update: (input: unknown) => Promise<void>;
  setCurrent: (item: T | null) => void;
}

interface UseEntityManagerOptions<T extends { id: string; description?: string | null }> {
  useStore: () => EntityManagerStore<T>;
  uncategorizedKey: string;
  t: TFunction;
}

export function useEntityManager<T extends { id: string; description?: string | null }>({
  useStore,
  uncategorizedKey,
  t,
}: UseEntityManagerOptions<T>) {
  const currentProject = useProjectStore((state) => state.currentItem);

  const { items, currentItem: currentItemFromStore, loadAll, setCurrent } =
    useStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ref로 로컬 선택값 추적 — sync effect가 로컬 클릭에 반응하지 않도록
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  // store → local 단방향 sync (SmartLinkService 등에서 currentItem 변경 시)
  useEffect(() => {
    if (currentItemFromStore?.id && currentItemFromStore.id !== selectedIdRef.current) {
      setSelectedId(currentItemFromStore.id);
    }
  }, [currentItemFromStore]);

  // 프로젝트 변경 시 데이터 로드
  useEffect(() => {
    if (currentProject) {
      void loadAll(currentProject.id);
    }
  }, [currentProject, loadAll]);

  // 선택된 아이템 삭제 시 선택 해제 (debounce 0ms: 스토어 업데이트 완료 후 실행)
  useEffect(() => {
    if (!selectedId) return;
    if (items.some((item) => item.id === selectedId)) return;
    const timer = window.setTimeout(() => setSelectedId(null), 0);
    return () => window.clearTimeout(timer);
  }, [items, selectedId]);

  const handleViewAll = () => {
    setCurrent(null);
    setSelectedId(null);
  };

  // description 필드 기준 그루핑 (카테고리 역할)
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
    selectedId,
    setSelectedId,
    selectedItem,
    grouped,
    handleViewAll,
    currentProject,
    items,
  };
}
```

#### Step 2-B: 기존 Manager Hook 슬림화

각 `useXxxManager`는 공통 로직을 `useEntityManager`에 위임하고, 도메인 고유 로직만 유지:

```ts
// useCharacterManager.ts (after)
export function useCharacterManager(t: TFunction) {
  const { items: characters, create, update } = useCharacterStore(useShallow(...));

  const base = useEntityManager({
    useStore: () => useCharacterStore(useShallow(...)),
    uncategorizedKey: "character.uncategorized",
    t,
  });

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  const handleAddCharacter = async (templateId = "basic") => { /* 도메인 고유 */ };

  return {
    ...base,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    handleAddCharacter,
    groupedCharacters: base.grouped,
    selectedChar: base.selectedItem,
    selectedCharacterId: base.selectedId,
    setSelectedCharacterId: base.setSelectedId,
    updateCharacter: update,
  };
}
```

---

### Phase 3: 기타 cleanup

#### Step 3-A: `layoutModeActions.ts` 단순화

Phase 1 완료 후, `setSidebarOpen`/`setContextOpen`/`setDocsRightTab` 옵션 제거.  
`setRegionOpen`, `openRightPanelTab`, `closeRightPanel`로 통일.

#### Step 3-B: `useSplitView.ts` — `setPanels` 노출 검토

`setPanels`는 `useProjectLayoutPersistence`가 직접 store에서 가져감. `useSplitView`가 re-export할 필요 없음. 제거 여부는 다른 consumer 확인 후 결정.

#### Step 3-C: `WorkspacePanels.tsx` — `minSize={15}` 상수화

```ts
// src/shared/constants/layoutSizing.ts 에 추가
export const SPLIT_PANEL_MIN_SIZE_PERCENT = 15;
```

---

## 실행 순서 (의존성 기준)

```
Phase 2 (Entity Manager)     → 독립적, 언제든 실행 가능
Phase 1-A (selectors 파일)   → Phase 1-B 전에 선행
Phase 1-B (consumers 이전)   → Phase 1-A 완료 후, Phase 1-C 전에 반드시 완료
Phase 1-C (레거시 필드 제거) → Phase 1-B 완전 완료 후
Phase 1-D (schema 버전 bump) → Phase 1-C 완료 후
Phase 3                      → 언제든
```

**Phase 2를 먼저** 실행하는 이유: UIStore와 완전히 독립적이고, 실패해도 롤백 범위가 작다.  
**Phase 1-C를 마지막에** 실행하는 이유: consumer 이전 중 컴파일 에러 없이 양쪽 path 동시에 유효한 상태를 유지해야 함.

---

## 위험 구간 & 체크포인트

| 체크포인트 | 검증 방법 |
|-----------|---------|
| Phase 1-B 완료 후 | TypeScript 컴파일 에러 0개 |
| Phase 1-C 완료 후 | 앱 실행 + 사이드바/패널 토글 정상 동작 |
| Phase 1-D 완료 후 | localStorage 클리어 후 재시작 → 기본값 정상 복원 |
| Phase 2 완료 후 | 등장인물/사건/세력 CRUD 정상, 선택 동기화 정상 |

---

## 제거되는 것 요약

**Store 필드 (uiStore):**
- `isSidebarOpen`, `isContextOpen`, `isBinderBarOpen`, `docsRightTab`
- `scrivenerSidebarOpen`, `scrivenerInspectorOpen`

**Store Setter (uiStore):**
- `setSidebarOpen`, `setContextOpen`, `setBinderBarOpen`, `setDocsRightTab`
- `setScrivenerSidebarOpen`, `setScrivenerInspectorOpen`

**코드 라인 추정:**
- `uiStore.state.ts`: ~120줄 제거 (setter 6개 + 초기화)
- `uiStore.types.ts`: ~15줄 제거
- `uiStore.persist.ts`: ~12줄 제거 (merge 내 동기화 코드)
- `useEntityManager.ts`: 신규 ~80줄 (세 훅 합치면 총 ~240줄 → ~80줄 공통 + ~30줄씩 3개)

**순 감소:** 약 300~350줄
