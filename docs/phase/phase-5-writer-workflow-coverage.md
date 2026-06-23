# Phase 5 Writer Workflow Coverage

이 문서는 Phase 5-4 writer workflow scenario test의 근거 파일을 고정한다.

## 1. 설정 질문

검증 근거:

- `tests/dom/analysisMessageSafety.test.tsx`
  - `shows evidence quotes before the assistant answer`
- `tests/dom/promptComposerTimelineScope.test.tsx`
  - `shows the current chapter as the answer timeline basis`

의미:

- 작가 질문 답변에서 근거 quote가 답변보다 먼저 보인다.
- 현재 편집 중인 회차가 답변 기준으로 표시된다.

## 2. 집필 중 충돌 자동 감지

검증 근거:

- `tests/dom/conflictQueuePanelWriterFlow.test.tsx`
  - `shows both conflict quotes and writer decision actions`
- `tests/main/services/ragGrounding.test.ts`
  - `marks answers with conflicting narrative memory as conflicting`

의미:

- 설정 충돌 후보의 양쪽 quote와 작가 결정 버튼이 표시된다.
- RAG safety mapping은 conflict 상태를 확정 답변과 구분한다.

## 3. 과거 회차 수정

검증 근거:

- `tests/e2e/phase5WriterWorkflow.spec.ts`
  - `phase5 writer edit -> rebuild -> rag evidence stays on current manuscript`
- `tests/main/services/memory/memoryEvidenceChunkLinkRepair.test.ts`
  - `relinks stale episode evidence and entity mentions to current chunks`
- `tests/main/services/memory/review/memoryReviewBacklogReport.test.ts`
  - `includes stale confirmed evidence as review backlog items after repair cannot resolve it`

의미:

- 실제 Electron 앱 경계에서 원고 수정, memory rebuild, 검색/RAG 근거 확인까지 이어지는 긴 흐름을 검증한다.
- 원문 수정 후 오래된 evidence link를 현재 chunk로 복구할 수 있다.
- 자동 복구가 불가능한 stale evidence는 review backlog로 이동한다.

## 4. 초안 폐기

검증 근거:

- `tests/main/services/ragGrounding.test.ts`
  - `maps draft or deleted fact failures to a non-canonical safety block`
- `tests/main/services/memory/temporal/memoryTemporalFactReviewService.test.ts`
  - `blocks draft or discarded facts from becoming confirmed canonical memory`

의미:

- draft/deleted 출처가 확정 답변에 섞이면 non-canonical safety로 낮춘다.
- draft/discarded temporal fact는 confirmed canonical memory로 승격되지 않는다.

## 5. 인물명/별칭 변경

검증 근거:

- `tests/main/services/memory/entity/memoryEntityReviewService.test.ts`
  - `confirms a suggested alias and canonical entity`
  - `splits an alias and alias-linked mentions into a new canonical entity`

의미:

- suggested alias를 canonical entity에 연결할 수 있다.
- alias 분리 시 alias-linked mention도 새 canonical entity로 이동한다.

## 6. 회차 순서 변경

검증 근거:

- `tests/main/services/memory/eval/memoryEvalRunner.test.ts`
  - `uses stored query chapter order to catch future facts when answerer omits it`
- `tests/main/services/memory/eval/memoryEvalScoring.test.ts`
  - `flags future facts used for past-time answers`

의미:

- eval runner는 저장된 query chapter order를 사용해 미래 정보 누수를 잡는다.
- scoring은 기준 회차 이후 fact 사용을 P0 failure로 표시한다.

## 후속 E2E 보강

- 실제 Electron 앱 경계에서 원고 수정, memory rebuild, 검색/RAG 근거 확인까지 이어지는 긴 시나리오는 `tests/e2e/phase5WriterWorkflow.spec.ts`로 고정했다.
- 남은 선택 보강은 실제 에디터 타이핑/버튼 클릭만으로 같은 흐름을 재현하는 순수 UI E2E다.
