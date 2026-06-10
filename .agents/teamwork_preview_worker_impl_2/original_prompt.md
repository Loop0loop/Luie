## 2026-06-11T00:28:02+09:00
Task: Challenger들과 Reviewer들이 제기한 결함 사항을 보완하고 수정하는 리팩토링 구현을 완료하십시오.

1. 수정 요구사항:
- **Jitter 현상 제거**: `AnalysisSection.tsx` 내 `FloatingWrapper` 컴포넌트의 드래그 상태가 active(dragging 중)일 때는 transition 관련 클래스(`transition-all duration-300` 등)가 꺼지도록(예: `transition-none` 등으로 클래스 분기 처리) 수정하십시오.
- **화면 이탈(Escape) 방지 Clamping**: 드래그 이동 좌표 계산 시, 브라우저 뷰포트 크기(`window.innerWidth`, `window.innerHeight`)와 미니 창 크기(가로 약 380px, 세로 약 520px)를 고려해 위치 좌표(`x`, `y`)가 화면 밖으로 완전히 사라지지 않도록 `Math.max(0, Math.min(newPosition, maxLimit))` 등 클램핑 처리를 반영하십시오.
- **Sticky Drag 현상 차단**: 포인터 캡처가 시스템 사유로 강제 해제되는 경우를 감지하도록 `onLostPointerCapture` 이벤트 핸들러를 등록하고, 이 이벤트가 호출되면 dragging 상태 플래그 및 ref를 false(초기화)로 리셋하십시오.
- **토글 버튼 이벤트 격리**: 미니 대화창 내의 뷰 모드 토글 버튼(`<button data-testid="view-mode-toggle">`)에 `onPointerDown={(e) => e.stopPropagation()}` 속성을 명시적으로 적용해 드래그 핸들러 버블링 간섭을 차단하십시오.
- **테스트 격리성 확보**: `tests/dom/analysisViewMode.test.tsx`의 `beforeEach` 블록 맨 처음에 `resetStore(useAnalysisStore as unknown as ResettableStore);` 코드를 추가하여 각 테스트 간 상태 격리성을 확보하십시오.

2. 검증 요구사항:
- 수정 완료 후 `pnpm run typecheck` 명령어로 타입 에러가 없는지 검토하십시오.
- `pnpm vitest tests/dom/analysisViewMode.test.tsx --run` 명령어를 직접 실행하여 테스트 스위트의 6개 케이스가 모두 완벽히 100% 통과(PASS)하는지 직접 검증하십시오.
- 검증 결과를 Handoff 및 완료 보고서에 기록하십시오.
