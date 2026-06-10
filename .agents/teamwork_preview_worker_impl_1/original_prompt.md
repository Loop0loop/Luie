## 2026-06-11T00:18:34+09:00

Task: AnalysisSection 개편 및 fixView/floatingView 뷰 모드 구현을 진행하십시오.

1. 요구사항:
- 불필요한 6개 패널(충돌 큐, 검토할 에피소드, 검토할 사실, 검토할 엔티티, 검토할 별칭, 메모리 평가) 및 관련 API 호출 hooks(useMemoryReviewMutations, useMemoryEvalPanel 등) 제거.
- 서사 요약 패널(NarrativeSummaryStatusPanel)은 유지.
- Zustand 기반 `useAnalysisStore`에 viewMode 전역 상태('fixView' | 'floatingView')와 setViewMode 액션 추가.
- `AnalysisSection.tsx`에서 6개 패널을 제거하고, viewMode가 'fixView'일 때는 일반 고정 레이아웃으로, 'floatingView'일 때는 React Portal을 사용하여 `document.body` 최상위 레이어에 미니 대화창으로 마운트되도록 구성.
- 미니 대화창은 헤더 드래그 기능이 제공되어야 하며, Pointer Capture API(`setPointerCapture`)를 이용해 직접 위치(top/left 또는 transform)를 제어하도록 구현하십시오.
- 기존 타이틀 우측 및 미니 대화창 헤더에 뷰 전환 버튼(`data-testid="view-mode-toggle"`)을 배치하십시오.
- 테스트 사양인 `tests/dom/analysisViewMode.test.tsx`가 정의하고 있는 `data-testid` 속성들(`view-mode-toggle`, `analysis-section-content`, `analysis-header`, `analysis-floating-container`)을 컴포넌트에 올바르게 적용해 주십시오.
- 리퀴드 스타일 UI(ChatGPT, Gemini APP 스타일의 둥근 모서리 `rounded-shell` or `rounded-2xl`, 반투명 블러 배경 `backdrop-blur-md bg-panel/80`, cubic-bezier를 적용한 부드러운 애니메이션/내장 트랜지션)을 적용해 주십시오.
- 변경 후 typecheck(`pnpm run typecheck`)와 빌드(`pnpm run build`)가 성공하도록 관련 코드 의존성을 정리하십시오.

2. 작업 대상 유의사항:
- 최소한의 diff로 수정하십시오. (직접 관련 없는 리팩토링 금지)
- 한국어 규칙(AGENTS.md), Oracle Guide(oracle-gudie.md), 작업 방식 규칙(workflow.md) 준수.
- 작업 완료 후 빌드 및 테스트 확인 결과를 Handoff에 상세히 명시하십시오.
