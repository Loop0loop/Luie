# Analysis: analysisStore 및 UI 전역 상태 보존 분석 보고서

본 보고서는 AI 분석 화면(`AnalysisSection`)의 불필요한 패널을 제거하고 `fixView`/`floatingView` 두 가지 뷰 모드를 지원하기 위해, 전역 상태 스토어의 위치를 찾고 탭 전환 시에도 상태가 유실되지 않는 최적의 상태 관리 및 마운트 아키텍처 방안을 제시합니다.

---

## 1. 전역 상태 스토어 현황 분석

현재 코드베이스에서 분석 도메인 및 UI 레이아웃 상태를 관리하는 스토어는 다음과 같습니다.

### A. `useAnalysisStore` (분석 도메인 스토어)
- **파일 경로**: `src/renderer/src/features/research/stores/analysisStore.ts`
- **역할**: AI 분석과 관련된 질문 및 스트리밍 응답 데이터(`items`), 분석 진행 상태(`isAnalyzing`), 에러 정보(`error`)를 Zustand 기반으로 관리합니다.
- **특징**: 싱글톤으로 메모리에 유지되므로 SPA 내의 탭 전환 시 상태가 보존되나, 로컬 스토리지 등에 지속성(persistence)을 보존하는 `persist` 미들웨어는 미적용 상태입니다. (새로고침 시 초기화)

### B. `useUIStore` (글로벌 UI 레이아웃 스토어)
- **파일 경로**: 
  - `src/renderer/src/features/workspace/stores/uiStore.ts` (스토어 정의)
  - `src/renderer/src/features/workspace/stores/uiStore.state.ts` (초기 상태 및 액션)
  - `src/renderer/src/features/workspace/stores/uiStore.persist.ts` (영구 저장 설정)
  - `src/renderer/src/features/workspace/stores/uiStore.types.ts` (타입 정의)
- **역할**: 사이드바 오픈 여부, 패널 비율 및 너비, 현재 활성화된 메인 뷰 탭 등 워크스페이스 전반의 레이아웃 상태를 담당합니다.
- **특징**: Zustand의 `persist` 미들웨어를 사용하여 로컬 스토리지에 설정을 저장합니다. 저장 시 `@shared/schemas/persistence.ts` 내에 선언된 Zod 스키마(`uiStorePersistedStateSchema`)를 통해 엄격한 데이터 유효성 검증을 거칩니다.

### C. 탭 전환과 컴포넌트 수명 주기
- **동작**: 사용자가 탭을 전환하면 `ResearchPanel.tsx` 내부에서 `activeTab === "analysis"` 분기에 의해 `AnalysisSection` 컴포넌트가 언마운트/마운트됩니다.
- **영향**: 로컬 `useState`로 뷰 모드(`fix`/`floating`)를 관리할 경우 탭 이동 시 상태가 유실됩니다. 따라서 전역 스토어에 상태를 보존해야 합니다.

---

## 2. 뷰 모드 전역 관리 상태 설계안 (3가지 방안 비교)

뷰 모드(`viewMode: 'fixView' | 'floatingView'`)를 보존하기 위해 선택할 수 있는 3가지 스토어 연동 방안입니다.

### 방안 1. `useAnalysisStore`에 상태 추가 (추천)
분석 도메인 스토어에 상태와 액션을 포함시킵니다.

- **장점**:
  - 분석 기능 전용 UI 상태이므로 글로벌 UI 스토어를 오염시키지 않고 도메인을 격리(Encapsulation)할 수 있습니다.
  - 탭 전환 시 싱글톤 스토어가 메모리에 남아 있어 상태가 완벽히 보존됩니다.
  - 영구 저장(Persistence) 스키마 변경 및 마이그레이션 처리가 필요 없어 사이드 이펙트가 최소화됩니다.
- **단점**: 앱 새로고침 시 뷰 모드가 `'fixView'`로 리셋됩니다. (단, AI 대화 이력도 함께 새로고침 시 초기화되므로 일관성 측면에서 수용 가능함)

#### [구현 제안 patch 예시]
```typescript
// src/renderer/src/features/research/stores/analysisStore.ts
export type AnalysisViewMode = 'fixView' | 'floatingView';

interface AnalysisStore {
  items: AnalysisItem[];
  isAnalyzing: boolean;
  error: string | null;
  viewMode: AnalysisViewMode; // 추가

  // Actions
  startAnalysis: (chapterId: string, projectId: string) => Promise<void>;
  stopAnalysis: () => Promise<void>;
  clearAnalysis: () => Promise<void>;
  addStreamItem: (chunk: AnalysisStreamChunk) => void;
  setError: (error: string | null) => void;
  setViewMode: (mode: AnalysisViewMode) => void; // 추가
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  items: [],
  isAnalyzing: false,
  error: null,
  viewMode: 'fixView', // 초기값

  setViewMode: (viewMode) => set({ viewMode }),
  reset: () => set({ items: [], isAnalyzing: false, error: null, viewMode: 'fixView' }),
  // ... 기존 코드
}));
```

---

### 방안 2. `useUIStore`에 메모리 전용 상태 추가
글로벌 UI 스토어에 뷰 모드를 추가하되, 로컬 스토리지 저장에서 제외합니다.

- **장점**:
  - 사이드바 최소화 등 전체 워크스페이스 레이아웃 구성 요소를 유기적으로 제어하기에 용이합니다.
  - Zod 스키마 수정이나 스토리지 마이그레이션 없이 탭 전환 시 보존을 만족합니다.
- **단점**: `uiStore.persist.ts`의 `partialize` 옵션에서 명시적으로 제외해야 하는 등의 분산된 설정 관리가 필요합니다.

#### [구현 제안 patch 예시]
```typescript
// src/renderer/src/features/workspace/stores/uiStore.types.ts
export type AnalysisViewMode = 'fixView' | 'floatingView';
export interface UIStore {
  // ... 기존 필드
  analysisViewMode: AnalysisViewMode;
  setAnalysisViewMode: (mode: AnalysisViewMode) => void;
}

// src/renderer/src/features/workspace/stores/uiStore.state.ts
export const createUIStoreState: StateCreator<UIStore, [], [], UIStore> = (set) => ({
  // ... 기존 필드
  analysisViewMode: 'fixView',
  setAnalysisViewMode: (analysisViewMode) => set({ analysisViewMode }),
});

// src/renderer/src/features/workspace/stores/uiStore.persist.ts
export const buildUiStorePersistOptions = (): PersistOptions<UIStore, UiStorePersistedState> => ({
  // ...
  partialize: (state) => ({
    schemaVersion: UI_STORE_SCHEMA_VERSION,
    view: state.view,
    // ... 기존 저장 필드 (analysisViewMode를 누락하여 로컬 스토리지 저장을 차단)
  }),
});
```

---

### 방안 3. `useUIStore`에 영구 저장(Persist)을 포함하여 추가
앱 재부팅 시에도 사용자가 설정한 뷰 모드 상태를 유지하는 최상의 UX 방식입니다.

- **장점**: 탭 전환뿐 아니라 앱 재시작, 강제 리로드 시에도 `floatingView` 상태가 완전히 보존됩니다.
- **단점**: `@shared/schemas/persistence.ts` 내 Zod 스키마 수정이 강제되며, 스토어 스키마 관리가 복잡해집니다.

#### [구현 제안 patch 예시]
```typescript
// src/shared/schemas/persistence.ts
export const uiStorePersistedStateSchema = z.strictObject({
  // ... 기존 스키마
  analysisViewMode: z.enum(["fixView", "floatingView"]).optional(), // 추가
});

// src/renderer/src/features/workspace/stores/uiStore.persist.ts의 partialize 및 merge에도 추가
partialize: (state) => ({
  // ...
  analysisViewMode: state.analysisViewMode,
}),
merge: (persistedState, currentState) => ({
  // ...
  analysisViewMode: typedPersisted.analysisViewMode ?? currentState.analysisViewMode,
})
```

---

## 3. 탭 전환 시 윈도우 보존을 위한 마운트 아키텍처 설계

단순히 상태만 전역으로 올린다고 해서 탭 전환 시 UI가 정상 유지되는 것은 아닙니다. `AnalysisSection` 컴포넌트의 수명 주기가 탭 활성화 여부에 묶여 있기 때문입니다. 이에 따라 두 가지 마운트 방식을 제안합니다.

### A안. 탭 복귀 시 재마운트 (느슨한 보존)
- **구현 방식**: 
  - `AnalysisSection.tsx` 내에서 `viewMode === "floatingView"` 일 때 React Portal을 사용해 `document.body`에 팝업창을 띄웁니다.
- **동작**:
  - 다른 탭으로 이동하면 `AnalysisSection`이 언마운트되며 floating 창이 일시적으로 사라집니다.
  - 다시 Analysis 탭으로 돌아오면 컴포넌트가 재마운트되며 전역 스토어의 `viewMode`를 기반으로 floating 창이 다시 활성화됩니다.
- **의견**: 구현이 간결하지만, 다른 탭을 보면서 미니 대화창을 참조할 수 없는 한계가 있습니다.

### B안. 최상위 레이아웃 마운트 (강력한 보존 - 추천)
- **구현 방식**: 
  - 미니 대화창 컴포넌트(`MiniChatWindow.tsx`)를 `AnalysisSection`에서 별도 컴포넌트로 분리합니다.
  - 이 `MiniChatWindow`를 `EditorRoot.tsx` 또는 `MainLayout.tsx` 등 최상위 레이아웃 레벨에 배치하고, 전역 `viewMode === "floatingView"` 인 경우 마운트합니다.
  - 사이드바 내의 `AnalysisSection` 컴포넌트는 `viewMode === "floatingView"` 일 때, 사이드바 영역을 차지하지 않도록 최소화된 아이콘이나 "Floating 뷰 활성화됨" 안내 버튼만 렌더링하도록 조건부 스위칭합니다.
- **동작**:
  - 탭을 전환하여 `AnalysisSection`이 언마운트되더라도, 최상위 레이아웃은 언마운트되지 않으므로 미니 대화창은 계속 화면 중앙/우하단에 떠있게 됩니다.
  - 사용자는 원고 에디터 등을 작성하는 도중에도 자유롭게 floating 창과 상호작용할 수 있습니다.

---

## 4. 최종 추천 설계 요약

| 구분 | 추천 방안 | 비고 |
| :--- | :--- | :--- |
| **스토어 위치** | **방안 1. `useAnalysisStore`** | 도메인 격리를 유지하면서 탭 전환 시 메모리 기반 보존에 성공함. 스키마 마이그레이션이 필요 없어 가장 안전함. |
| **마운트 구조** | **B안. 최상위 레이아웃 마운트** | 사용자가 다른 탭으로 이동해도 미니 대화창이 꺼지지 않고 계속 참조할 수 있는 최적의 SPA UX 제공. |

상기 설계를 바탕으로 구현을 진행할 경우, 가장 낮은 오류 리스크와 가장 높은 사용자 편의성을 만족하는 SPA 인터페이스를 구현할 수 있습니다.
