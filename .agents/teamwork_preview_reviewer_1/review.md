## Review Summary

**Verdict**: APPROVE

## Findings

### [Minor] Textarea 자동 높이 조절(Autoresize) 누락
- What: 입력창(`textarea`)에 여러 줄을 입력할 때 자동으로 높이가 늘어나지 않음.
- Where: `src/renderer/src/features/research/components/AnalysisSection.tsx` (192-200라인)
- Why: Shift+Enter로 줄바꿈을 하거나 긴 질문을 입력할 때 UI 크기는 고정되어 스크롤이 발생하므로 UX가 다소 답답하게 느껴질 수 있음.
- Suggestion: `useRef`를 통해 `textarea` 요소의 `scrollHeight`에 맞춰 스타일 높이를 동적으로 조절하는 간단한 `useEffect` 훅이나 유틸리티를 적용할 수 있음.

### [Minor] useMemoryReviewPanels에서 memoryScope 누락
- What: `useMemoryReviewPanels` 훅이 `memoryScope` 인자를 받지만 하위 `useMemoryReviewQueues`에 이를 전달하거나 활용하지 않음.
- Where: `src/renderer/src/features/research/components/analysisSection/useMemoryReviewPanels.ts` (10-14라인)
- Why: 사용자가 UI 상에서 "현재만" / "현재+과거" 범위를 선택하더라도, 서사 요약 상태 패널의 로딩 및 갱신에 이 스코프 정보가 반영되지 않음.
- Suggestion: 만약 서사 요약 상태가 메모리 스코프와 무관한 프로젝트 전체 상태라면 무방하나, 스코프에 종속적인 데이터라면 `useMemoryReviewQueues`로 전달하도록 수정해야 함.

## Verified Claims

- `pnpm run typecheck` 통과 → verified via `run_command (pnpm run typecheck)` → [pass]
- Electron Preload API 통과 → verified via `view_file` (렌더러 내 Node direct import 없음) → [pass]
- Zustand Store 리렌더링 최적화 → verified via `view_file` (useShallow 올바르게 사용됨) → [pass]

## Coverage Gaps

- RAG 스트리밍 동시성 레이스 컨디션 테스트: 렌더러 IPC 응답 속도에 따른 오동작 검증 필요 — risk level: low — recommendation: accept risk (현재 단계에서는 영향 미미함)

## Unverified Items

- 백엔드(Main Process) IPC 실제 동작 신뢰성 — 이유: 실제 Electron 환경을 띄워서 UI 상에서 RAG 응답을 스트리밍 해보는 실시간 연동 테스트는 `pnpm dev`를 실행해야 하나, 테스트 가상 환경의 제한으로 생략.

---

## Challenge Summary

**Overall risk assessment**: LOW

## Challenges

### [Low] RAG 스트리밍 시작 시의 임시 ID와 runId 불일치 레이스 컨디션
- Assumption challenged: `api.rag.ask` API 응답으로 `runId`가 반환되는 속도가 메인 프로세스로부터 `api.rag.onStream` 이벤트가 전송되는 속도보다 무조건 빠를 것이라는 가정.
- Attack scenario: 대용량 패킷 처리 지연이나 메인 스레드 블로킹으로 인해 RAG 시작 호출에 대한 IPC 응답이 늦게 오고, 스트리밍 결과 이벤트가 먼저 렌더러로 들어올 경우, `ragRunId`가 아직 `null`이거나 임시값인 상태이므로 `onStream` 이벤트 내에서 `payload.runId !== ragRunId` 검사에 의해 첫 스트리밍 청크가 소실됨.
- Blast radius: RAG 스트리밍 응답의 첫 단어나 앞부분이 누락된 상태로 사용자에게 표시될 수 있음.
- Mitigation: RAG 요청 시 렌더러 단에서 먼저 UUID 등 임시 `runId`를 직접 생성하여 인자로 보내고, 백엔드에서도 그 ID를 기준으로 스트리밍을 반환하게 설계하거나, 초기 응답 지연을 방지하기 위해 스트리밍 이벤트를 렌더러 큐에 버퍼링하는 방식 도입.

### [Low] addStreamItem의 중복 검사 성능 저하
- Assumption challenged: 스트리밍으로 전달되는 아이템 리스트(`items`)의 개수가 적어 O(N) 순회로 매번 문자열을 정규화해 비교하는 비용이 크지 않을 것이라는 가정.
- Attack scenario: 문서 크기가 매우 크고 분석 스트리밍 청크 개수가 많을 경우, 매번 렌더링 시 기존 모든 아이템들과 비교를 수행하여 프레임 드랍이나 렌더링 렉이 유발될 수 있음.
- Blast radius: 분석 화면에서 대량의 데이터 유입 시 버벅임 발생.
- Mitigation: `normalize` 결과를 키(key)로 삼는 `Set`이나 `Map` 구조를 병행 관리하거나, 중복 필터링을 백엔드 또는 훅 레벨에서 1차로 수행.

## Stress Test Results

- `pnpm run typecheck` → 빌드 및 타입 체크가 성공적으로 통과함 → PASS

## Unchallenged Areas

- Drizzle DB 모델 연동성 및 Supabase 동기화 플로우 (범위를 벗어남)
