# E2E Test Infra: Luie Analysis View Mode Improvement

## Test Philosophy
- Opaque-box 및 DOM integration testing 방식을 사용하여 구현 설계에 종속되지 않고 기능 요구사항의 인터페이스를 충족하는지 검증.
- 렌더러 테스트 환경(`jsdom`)을 이용하여 React Portal, Drag, View toggle의 세부 동작을 테스트하고, E2E 통합 테스트로 탭 간 상태 유지를 검증.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | 6개 불필요 패널 제거 및 서사 요약 유지 | ORIGINAL_REQUEST R1 | 5      | 5      | ✓      |
| 2 | fixView ↔ floatingView 모드 전환 | ORIGINAL_REQUEST R2 | 5      | 5      | ✓      |
| 3 | React Portal 최상위 마운트 | ORIGINAL_REQUEST R2 | 5      | 5      | ✓      |
| 4 | 헤더 Pointer Event 드래그 기능 | ORIGINAL_REQUEST R2 | 5      | 5      | ✓      |
| 5 | 리퀴드 스타일 UI (CSS/Tailwind) | ORIGINAL_REQUEST R3 | 5      | 5      | ✓      |

## Test Architecture
- **DOM Integration Runner**: Vitest (jsdom 환경) `tests/dom/analysisViewMode.test.tsx`
- **E2E Integration**: `tests/e2e/ragQa.phase5.spec.ts` 혹은 신규 spec.ts

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | 탭 전환 시 미니 대화창의 상태 보존 및 Q&A 기능 연동 확인 | F2, F3, F5 | Medium |
| 2 | 에디터 사용 중 대화창 드래그 이동 및 입력 영역 상호작용 | F3, F4, F5 | High |

## Coverage Thresholds
- Tier 1: 각 기능별 대표 equivalence class 검증 (총 25개 케이스 내외)
- Tier 2: 한계 경계값(윈도우 밖 드래그, 빈 메시지 전송, API 에러 상태 렌더링) 검증
- Tier 3: 탭 이동 ↔ floating 대화창 동시 상태 검증
- Tier 4: 에디터 대화 통합 검증
