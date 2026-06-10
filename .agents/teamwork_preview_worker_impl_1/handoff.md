# Handoff Report

## 1. Observation
- `src/renderer/src/features/research/components/AnalysisSection.tsx` 에 원고 분석 화면과 충돌 큐, 에피소드 검토 등 6개 패널에 대응하는 다수의 패널 컴포넌트(`ConflictQueuePanel`, `EpisodeReviewPanel` 등)와 훅(`useMemoryEvalPanel`, `useMemoryReviewPanels`, `useMemoryReviewMutations`)이 결합되어 마운트되어 있는 것을 관찰함.
- `src/renderer/src/features/research/stores/analysisStore.ts` 에서 `AnalysisStore` 상태 정의에 `viewMode` 및 `setViewMode` 타입이 선언되어 있으나, 스토어 생성 함수 내부에 구현부가 누락되어 `tsc` 타입체크 실패 현상이 나타남:
  ```
  src/renderer/src/features/research/stores/analysisStore.ts(24,70): error TS2741: Property 'setViewMode' is missing in type...
  ```
- `useMemoryReviewQueues` 및 `useMemoryReviewMutations` 훅들이 기존 6개 패널의 API 연동을 위해 불필요한 타입(`AnalysisConflictItem`, `AnalysisEntityAliasReviewItem` 등)과 API 호출 논리를 담고 있음을 발견함.

## 2. Logic Chain
- 6개 패널을 제거하고 서사 요약 패널만 남기기 위해 `AnalysisSection.tsx`에서 미사용 패널 컴포넌트들을 import하지 않고 삭제함.
- 그에 따라 `useMemoryReviewQueues.ts`에서 서사 요약 상태(`NarrativeSummaryStatus`)를 제외한 나머지 5개 큐 관련 API 연동 및 상태 로직을 덜어냄.
- `useMemoryReviewMutations.ts` 및 `useMemoryReviewPanels.ts` 훅들 또한 사용하지 않는 훅(빈 훅)으로 단순화하거나 구조를 대폭 간소화하여 타입 의존성과 타입 컴파일 오류를 원천 차단함.
- `analysisStore.ts`에 `setViewMode: (mode) => set({ viewMode: mode })` 액션 구현을 명시적으로 추가하여 TS2741 에러를 제거함.
- `AnalysisSection.tsx` 내부에서 `useAnalysisStore`의 `viewMode`를 구독하도록 설정하고, `floatingView`일 때 `document.body` 최상위에 React Portal을 사용해 마운트하도록 `FloatingWrapper` 컴포넌트를 설계함.
- Pointer Capture API(`setPointerCapture` / `releasePointerCapture`)를 연동하여 헤더 드래그 시 transform translate 속성을 통해 미니 대화창의 실제 포인터 위치를 동적 업데이트하도록 만듦.

## 3. Caveats
- DOM 테스트 파일 `tests/dom/analysisViewMode.test.tsx`가 로컬 terminal user permission prompt timeout 현상으로 인해 직접 vitest CLI로 실행 완료되지는 못함.
- 그러나 타입체크(`pnpm run typecheck`) 및 전체 프로젝트 빌드(`pnpm run build`) 명령이 성공을 반환하여 에러가 없음을 확인하였음.

## 4. Conclusion
- AnalysisSection의 6개 패널 및 훅 의존성이 완전히 제거되었으며 서사 요약 패널만 잔존함.
- `viewMode` 전역 상태와 `setViewMode` 액션이 정상적으로 상태 스토어에 안착하고 타입 에러가 소멸됨.
- `floatingView` 모드 적용 시 React Portal 및 Pointer Capture API 드래그 기능이 리퀴드 스타일 미니 대화창 디자인과 함께 구현 완료됨.

## 5. Verification Method
- `pnpm run typecheck` 명령을 통해 타입스크립트 컴파일 오류가 없는지 검토.
- `pnpm vitest tests/dom/analysisViewMode.test.tsx --run`을 실행하여 DOM 테스트의 정상 통과 여부 검증.
