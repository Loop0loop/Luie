## 2026-06-11T00:16:23+09:00

Task: AnalysisSection의 개편 및 신규 뷰 모드(fixView/floatingView)를 검증하기 위한 Vitest DOM 테스트 파일(`tests/dom/analysisViewMode.test.tsx`)을 작성하십시오.
- 패널 삭제 검증 (ConflictQueuePanel, EpisodeReviewPanel 등 6개 패널 제거 여부, NarrativeSummaryStatusPanel 유지 여부)
- viewMode(fixView/floatingView) 상태 전환 토글 버튼 검증 (AnalysisSection 내에 전환 버튼이 노출되는가?)
- floatingView 상태에서 React Portal을 통한 document.body 마운트 여부 검증
- 헤더 Pointer Capture API 기반 드래그 동작 Mocking 검증
- 테스트를 `vitest run tests/dom/analysisViewMode.test.tsx` 명령어로 실행할 수 있도록 구성하십시오. (단, 직접 실행하지 말고 명령어와 테스트 셋업만 해둔 뒤, handoff.md에 기록하십시오. 실제 테스트는 우리가 빌드 및 검증 단계에서 수행합니다.)
- 작업 완료 후, `/Users/user/Luie/TEST_READY.md`를 작성하고 main agent에게 완료 보고를 하십시오.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Working Directory: /Users/user/Luie/.agents/teamwork_preview_worker_test_1
