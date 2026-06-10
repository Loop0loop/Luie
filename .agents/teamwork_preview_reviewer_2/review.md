# Quality and Adversarial Review: AnalysisViewMode Test Verification

## Quality Review

### Verdict: APPROVE (With Caveat)

이 검증은 `tests/dom/analysisViewMode.test.tsx` 및 `AnalysisSection.tsx` 소스 코드의 구현 및 테스트 정합성을 수동으로 추적 분석한 결과입니다. CLI 명령어 실행 시 권한 승인 대기 시간이 초과되어 실제 런타임 테스트 실행은 수행하지 못하였으나, 정적 로직 검증 결과 상호 정합성이 일치함을 확인하였습니다.

### Findings

#### [Minor] Finding 1: 테스트 환경 내 AnalysisStore 상태 초기화 누락
- **위치**: `tests/dom/analysisViewMode.test.tsx` (line 176-177)
- **내용**: `beforeEach` 블록에서 `useChapterStore`와 `useProjectStore`는 리셋을 수행하나, `useAnalysisStore`에 대해서는 리셋을 진행하지 않습니다.
- **원인 및 문제**: 3번째 테스트 케이스에서 `viewMode`가 `floatingView`로 토글된 후, 상태가 유지되면 다음 테스트나 타 테스트 스위트의 독립성에 영향을 미칠 수 있습니다.
- **제안**: `beforeEach`에 `resetStore(useAnalysisStore as unknown as ResettableStore);` 구문을 추가하는 것을 권장합니다.

### Verified Claims
- **6개 패널 제거 및 서사 요약 패널 유지** -> `AnalysisSection.tsx` 154~161라인 검토를 통해 확인 -> **PASS**
- **모드 전환 토글 버튼 노출** -> `AnalysisSection.tsx` 72라인 및 143라인에서 `data-testid="view-mode-toggle"` 버튼 노출 확인 -> **PASS**
- **floatingView 모드 시 body 마운트 (Portal)** -> `AnalysisSection.tsx` 336~343라인에서 `createPortal(..., document.body)` 렌더링 확인 -> **PASS**
- **Pointer Capture API 기반 드래그 로직** -> `FloatingWrapper` 컴포넌트 내 `setPointerCapture` 및 `transform` 스타일 반영 확인 -> **PASS**

---

## Adversarial Review (Stress Test & Challenge)

### Overall Risk Assessment: LOW

### Challenges

#### [Low] Challenge 1: useAnalysisStore 미초기화로 인한 테스트 순서 종속성
- **가정**: 테스트 러너가 항상 정의된 순서(1 -> 2 -> 3 -> 4)로 순차 실행될 것이라 가정하고 있습니다.
- **오작동 시나리오**: 만약 vitest가 멀티스레드 병렬 실행 또는 랜덤 순서 실행을 하거나, 3번째 테스트("mounts to document.body...")만 단독 실행한 후 2번째 테스트("renders viewMode toggle button...")를 실행하는 경우, `viewMode` 상태가 오염되어 이전 모드가 전이된 채 테스트가 실행됩니다.
- **파급 범위**: 독립적이어야 할 UI 테스트 케이스가 다른 테스트의 실행 결과 상태에 영향을 받아 오작동(False Positive / False Negative)을 일으킬 수 있습니다.
- **대응책**: `beforeEach`에 스토어 리셋 로직을 추가하여 각 테스트 케이스가 순수한 `'fixView'` 상태에서 시작하도록 보장해야 합니다.

---

## Oracle QA Result

- **Typecheck**: NOT RUN (Permission timeout)
- **Critical**: 0개 수정
- **High**: 0개 수정
- **Medium**: 0개 수정
- **Low**: 1개 발견, 수정 안 함
- **남은 리스크**:
  - `useAnalysisStore` 미초기화로 인한 테스트 케이스 간 상태 간섭 가능성이 존재합니다.
