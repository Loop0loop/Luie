# Luie 작업 정리 - 2026-06-29

## 한 줄 요약

이번 작업은 Luie를 "편집자"가 아니라 "작품을 같이 기억하는 동반자"로 검증하기 위해, 상태관리 방침을 정리하고 Phase 문서를 재판정한 뒤, 합성 웹소설 기반 Phase 5 작가 플로우 테스트를 실제로 통과시키는 데 집중했다.

## 완료한 작업

### 1. 상태관리 점검과 정책 문서화

- `docs/quality/state-management-policy.md` 추가
  - Zustand를 기본 상태관리 기준으로 명시
  - store 소유권, persist 허용 범위, 파생 상태, IPC/API 경계 규칙 정리
  - 위험 지점과 변경 체크리스트 추가
- `docs/quality/release-readiness.md`에 상태관리 정책 링크 추가

### 2. phase 문서 재검증

- `docs/phase/00-overview.md`에 2026-06-28 기준 subagent 검증 결과 반영
- `docs/phase/phase-3-memory-policy.md`의 오래된 conflict ledger 문구 정리
- `docs/phase/phase-7-beta-validation.md`에 "실제 beta 데이터 대기" 상태 반영
- `src/main/services/features/memory/status/memoryPhaseStatusReport.ts`
  - Phase 7 상태에 `blocked-on-real-beta-data` 추가
- `tests/main/services/memory/status/memoryPhaseStatusReport.test.ts`
  - Phase 7 기대 상태 갱신

판정:

- Phase 1-6은 부분 완료 또는 근접 완료
- Phase 7은 인프라만 있고 실제 beta 작가 데이터가 부족함
- 전체 앱은 "작가 동반자 beta"에 가깝고, 아직 실사용 작가에게 완성품으로 말하기는 이르다

### 3. 합성 웹소설 fixture 추가

- `tests/fixtures/writerFlowSyntheticNovel.ts` 추가
- 제목: `회귀한 탑 관리자는 엔딩을 숨긴다`
- 실제 웹소설 플랫폼의 장르 관습만 참고하고, 특정 작품/문장/설정은 복제하지 않음
- 포함한 작가 플로우:
  - 설정 질문
  - 집필 중 충돌 자동 감지
  - 과거 회차 수정
  - 초안 폐기
  - 인물명/별칭 변경
  - 회차 순서 변경

### 4. Phase 5 작가 플로우 테스트 강화

- `docs/phase/phase-5-writer-workflow-coverage.md`
  - 합성 웹소설 fixture를 공식 테스트 근거로 추가
- `tests/scripts/phase5WriterWorkflowCoverage.test.ts`
  - 6개 writer workflow가 fixture와 coverage 문서에 모두 고정되도록 보강
- DOM 테스트 3개를 같은 합성 작품 데이터로 맞춤
  - `tests/dom/analysisMessageSafety.test.tsx`
  - `tests/dom/conflictQueuePanelWriterFlow.test.tsx`
  - `tests/dom/promptComposerTimelineScope.test.tsx`

### 5. Vitest 설정 복구

- `vitest.config.ts` 추가
  - `@renderer`, `@shared` alias 설정
  - `tests/setup.ts` 연결
  - `tests/dom/**/*.test.tsx`를 jsdom 환경으로 매핑
- 이 설정 누락 때문에 DOM 테스트 alias 해석과 DB service 테스트 setup이 깨지고 있었음

### 6. Phase 5 E2E 실패 수정

Phase 5 Electron E2E에서 실제 실패 2개를 잡았다.

1. Electron named export 문제
   - 실패: `electron` does not provide an export named `BrowserWindow`
   - 수정:
     - `src/main/services/features/utility/utilityProcessBridge/internal/core.ts`
     - `src/main/services/features/utility/utilityProcessBridge/internal/eventHandlers.ts`
   - Electron dynamic chunk에서 default import를 쓰도록 변경

2. 테스트 환경에서 외부 OpenAI 호출 문제
   - 실패: `GPT-5.4-nano` 모델 접근 불가
   - 원인: `LUIE_LLM_PROVIDER_HINT=none`을 runtime factory가 무시하고 OpenAI env를 사용함
   - 수정:
     - `src/main/services/llm/modelRuntimeFactory.ts`
     - `src/main/utility/rag/ragQaWorker.ts`
     - `tests/main/services/modelRuntimeFactory.utilityBoundary.test.ts`
   - `none` 또는 `deterministic` provider hint면 deterministic runtime을 강제
   - RAG worker가 deterministic provider를 에러로 막지 않고 기존 generation path를 타게 변경

## 검증 결과

### 통과

```bash
pnpm vitest run \
  tests/scripts/phase5WriterWorkflowCoverage.test.ts \
  tests/dom/analysisMessageSafety.test.tsx \
  tests/dom/promptComposerTimelineScope.test.tsx \
  tests/dom/conflictQueuePanelWriterFlow.test.tsx \
  tests/main/services/ragGrounding.test.ts \
  tests/main/services/memory/memoryEvidenceChunkLinkRepair.test.ts \
  tests/main/services/memory/review/memoryReviewBacklogReport.test.ts \
  tests/main/services/memory/temporal/memoryTemporalFactReviewService.test.ts \
  tests/main/services/memory/entity/memoryEntityReviewService.test.ts \
  tests/main/services/memory/eval/memoryEvalRunner.test.ts \
  tests/main/services/memory/eval/memoryEvalScoring.test.ts \
  tests/main/services/modelRuntimeFactory.utilityBoundary.test.ts \
  --reporter=verbose --no-file-parallelism
```

결과:

- 12 files passed
- 63 tests passed

```bash
pnpm run typecheck
```

결과:

- passed

```bash
pnpm run build
```

결과:

- passed
- 기존 chunk size warning은 남아 있음

```bash
node node_modules/@playwright/test/cli.js test --project=stress tests/e2e/phase5WriterWorkflow.spec.ts
```

결과:

- 1 passed

### 실행 중 필요했던 조치

- DB/Vitest 실행 전 Node ABI용:

```bash
pnpm rebuild better-sqlite3
```

- Electron E2E 실행 전 Electron ABI용:

```bash
pnpm test:prepare
```

## 현재 리스크

- `qa:core` 전체는 아직 이번 작업 후 실행하지 않았다.
- `test:prepare`와 `pnpm rebuild better-sqlite3`가 ABI를 서로 바꾸므로, Vitest와 Electron E2E를 오갈 때 순서를 조심해야 한다.
- Phase 5 E2E는 여전히 preload API 기반 긴 흐름이다. 실제 에디터 타이핑/버튼 클릭만으로 재현하는 순수 UI E2E는 아직 없다.
- Phase 7은 실제 beta 작가 데이터가 없어서 완료로 볼 수 없다.
- `bencium-claude-code-design-skill` submodule/외부 경로가 modified로 표시되지만 이번 작업 내용은 아니다.

## 다음 추천 작업

1. 현재 diff를 커밋 단위로 나누기
   - 상태관리/phase 문서
   - Phase 5 fixture/test
   - Vitest 설정 복구
   - RAG/E2E runtime fix

2. `qa:core` 또는 최소 guard subset 실행

3. Phase 5 순수 UI E2E 추가 여부 결정
   - 실제 에디터 입력
   - composer 질문
   - evidence 표시
   - conflict/defer UI

4. Phase 7 beta 검증 준비
   - 실제 웹소설 작가 작업 샘플
   - 장편 원고 기준 latency/accuracy 측정
   - 작가 질문 로그 기반 eval case 확대

---

# Luie Memory Engine MVP 작업 정리 - 2026-07-01

## 한 줄 요약

Memory Engine을 "AI가 기억하는 기능"이 아니라 "Luie 앱 안에 쌓이는 local-first 원고 context layer"로 재정의했고, AI 답변은 이 context를 읽는 보조 기능으로 제한하는 방향으로 MVP 기준을 다시 잡았다.

## 완료한 작업

### 1. Memory Engine 제품 정의 재정립

- `docs/phase/novel/memory_engine_product_definition.md` 작성/갱신
- 핵심 정의:
  - Memory Engine은 AI가 아니라 Luie의 원고 context layer
  - 원고, 챕터, 메모, 인물, 관계, 타임라인, 떡밥, 수정 이력, 폐기 설정을 근거로 묶는 시스템
  - AI는 optional/subordinate
  - 근거 없는 정사 답변은 하지 않음
  - 일반 작법 조언은 가능하지만 정사처럼 말하지 않음
- MVP 상태:
  - Memory Engine infrastructure: 약 65%
  - MVP product clarity: 약 70%
  - MVP implementation confidence: 약 60~65%
  - real writer validation: 아직 낮음, 실제 beta 필요

### 2. Phase 7 Shadow Beta Novel Pack 정리

- `novel/*/eval/answer_mode_v1.jsonl` 추가/정리
  - `modern_fantasy`
  - `romance_fantasy`
  - `murim`
  - `occult_mystery`
- 총 32개 answer-mode case 구성
  - `EVIDENCE`: 12
  - `INSUFFICIENT`: 12
  - `ADVISORY`: 8
- shadow beta는 rehearsal 데이터일 뿐이며 real beta threshold 대체 불가로 명시

### 3. Answer Mode 평가 하네스 추가

- `scripts/run-answer-mode-eval.ts` 추가
- Gemini 기반으로 세 가지 답변 모드 검증:
  - `EVIDENCE`: 근거 있는 원고/정사 답변
  - `INSUFFICIENT`: 근거 부족이면 미확정
  - `ADVISORY`: 일반 조언/작법 답변
- `docs/phase/novel/mvp_answer_mode_eval.md`에 실행 결과 기록

실행 결과:

```text
run-001: 31/32
failure: murim.answer_mode_v1.evidence.002
원인: 모델 문제가 아니라 gold evidence quote가 질문을 직접 지지하지 못함

evidence quote 보강 후:
run-002: 32/32
```

중요한 판정:

```text
이 결과는 answer-mode leash가 작은 하네스에서 작동함을 보여준다.
실제 작가 적합성이나 production threshold readiness를 증명하지 않는다.
```

### 4. Answer Mode product contract 연결

- `src/shared/types/search/rag.ts`
  - `RagQaAnswerMode = "EVIDENCE" | "INSUFFICIENT" | "ADVISORY"` 추가
  - `RagQaResult.answerMode` 추가
- `src/shared/types/index.ts`
  - `RagQaAnswerMode` export 추가
- `src/main/services/features/rag/grounding.ts`
  - `deriveRagAnswerMode` 추가
  - 답변 결과에 `answerMode` 산출
- `src/renderer/src/features/research/stores/analysis/actions/ragChatActions.ts`
  - RAG stream result의 `answerMode`를 chat message에 전달
- `src/renderer/src/features/research/components/analysisSection/shared/types.ts`
  - renderer `Message.answerMode` 추가

현재 `ADVISORY` 판별은 작은 한국어 휴리스틱이다. 예외를 무한히 늘리는 방향은 금지하고, 실제 오분류가 많아질 때 명시적 작업 모드 버튼 또는 classifier로 교체한다.

### 5. research/analysisSection UI 목줄 노출 완화

사용자가 앱에서 `ㅎㅇ` 같은 일반 입력을 했을 때 다음 내부 정보가 그대로 보이는 문제가 확인됨:

```text
analysis.chat.evidenceCount
offset 0
chunk uuid
근거 답변
추정
근거는 있지만 문장별 검증 전...
```

판정:

```text
research/analysisSection은 실제 RAG/Memory Engine 경로와 연결되어 있다.
문제는 연결 부재가 아니라 내부 진단 UI를 사용자에게 너무 많이 노출한 것.
```

수정:

- `src/renderer/src/features/research/components/analysisSection/chat/MessageList.tsx`
  - `추정`, chunk UUID, offset 기본 숨김
  - 근거 quote는 답변 위 노출이 아니라 `근거 보기 N` 접힘 영역으로 이동
  - 이전 사용자 질문이 원고/정사/회차/인물/설정/떡밥/관계/충돌 같은 intent일 때만 Memory Engine chrome 표시
  - `ADVISORY` 답변은 근거/추정/safety chrome 숨김
  - 차단성 safety만 표시
- `src/renderer/src/features/research/components/analysisSection/runtime/runtimeHelpers.ts`
  - 사용하지 않는 `answerModeLabel` 제거
- `tests/dom/analysisMessageSafety.test.tsx`
  - evidence가 접힘으로 표시되는지
  - offset/uuid가 기본 노출되지 않는지
  - advisory/general 답변에 근거/추정 chrome이 붙지 않는지 테스트 갱신

비유:

```text
이전 UI는 자동차 계기판에 정비사용 센서값을 전부 띄운 상태였다.
수정 후에는 위험 경고등만 보이고, 근거는 필요할 때 열어보는 구조로 바꿨다.
```

### 6. MVP UI Audit 문서화

- `docs/phase/novel/mvp_ui_memory_engine_audit.md` 추가/갱신
- 현재 판정:

```text
Memory Engine UI path: partial but usable for MVP
MVP blocker reduced: diagnostic chrome is hidden unless the user asks a manuscript/canon-style question
Recommended next step: run the app and verify that casual input does not show offset/chunk/safety noise
```

## 검증 결과

### 통과

```bash
node answer_mode_v1 quote validation
```

결과:

```text
answer_mode_v1 quote validation ok: 32 cases
```

```bash
pnpm run typecheck
```

결과:

```text
passed
```

### 부분 실행/중단

```bash
SKIP_DB_TEST_SETUP=1 pnpm vitest run tests/main/services/ragGrounding.test.ts tests/dom/analysisMessageSafety.test.tsx
```

상태:

```text
이 로컬 환경에서 vitest가 출력 없이 대기하는 현상이 반복되어 중단.
타입체크는 통과.
```

## 현재 MVP 상태

```text
Memory Engine MVP: 약 60~65%
```

통과권:

- 로컬 원고/프로젝트 저장 기반 있음
- 챕터 단위 chunk/indexing 있음
- 근거 검색/RAG Layer 있음
- shadow beta 원고 기반 테스트 데이터 있음
- answer mode 32-case Gemini smoke 통과
- RAG result contract에 answerMode 연결됨
- chat UI에서 내부 진단 정보 기본 노출 완화

아직 부족:

- 앱에서 실제 수동 확인 필요
  - casual input이 `추정`, UUID, offset을 보여주지 않는지
  - 원고/정사 질문에서만 `근거 보기`가 필요한 만큼 보이는지
  - 근거 부족/회차 불가/정사 아님 같은 위험 경고가 과하지 않게 보이는지
- real writer beta 없음
- shadow/synthetic 데이터만으로 threshold finalization 금지
- `ADVISORY` 판별은 휴리스틱이라 장기적으로 명시적 작업 모드 버튼이 더 안전함

## 다음 추천 작업

1. 앱에서 `research/analysisSection` 수동 확인
   - `ㅎㅇ`
   - `이 장면 더 긴장감 있게 쓰려면?`
   - `3화 기준으로 이 인물이 이 사실을 알아?`
   - `이 설정 정사야 폐기야?`

2. UI가 여전히 시끄러우면 예외 추가 금지
   - `근거 확인`
   - `설정 확인`
   - `회차 기준 확인`
   - `작법 조언`
   같은 명시적 작업 모드 버튼으로 분리

3. no-evidence / abstention case 추가

4. local-first / AI optional 철학이 제품 화면에 보이는지 audit

5. 실제 웹소설 작가 beta 준비
   - synthetic 점수는 rehearsal로만 사용
   - threshold finalization은 real beta label에서만 허용

---

# 추가 작업 기록 - 2026-07-01 14:45:20 KST

## 요청

```text
memory / rag 중심으로 중복과 급조된 얇은 레이어를 계속 줄인다.
기능/API를 깨지 않는 범위에서 barrel, dead facade, review queue 잔재를 제거한다.
```

## 이번 정리 기준

- 동작 없이 `export *`만 하는 barrel 제거
- 실제 소비처가 1~몇 개뿐인 재수출 파일은 직접 import로 변경
- 이미 UI/API에서 제거된 memory review queue 계열 dead path 삭제
- RAG/search/memory 경계에서 같은 기능을 감싼 얇은 wrapper 제거
- canonical package처럼 internal 구현을 숨기는 실제 facade는 유지

## 주요 변경

### RAG / Search

- chunk 검색 토큰 정규화 공통화
  - `src/main/services/features/search/tokenNormalization.ts`
  - 한국어 조사/어미 계열 suffix 기반 short-token 보정
- hybrid chunk rank 로직 공통화
  - `src/main/services/features/search/chunkSearch.ts`
  - `chunkOperations`, `contextAssembler.layer3`, `contextAssembler.search` 중복 제거
- `SearchService` class를 singleton object로 축소
  - 미사용 `searchCharacters`, `searchTerms`, `searchChapters`, `getQuickAccess` service method 제거
- `src/main/services/features/search/index.ts` 삭제
  - 소비처는 `searchService.js`, `chapterSearchCacheService.js` 직접 import로 변경

### Memory Review Queue 제거

- renderer review queue UI/hook/action 삭제
  - conflict / fact / episode / entity / alias / stale evidence queue 계열
- shared IPC/API/schema/type에서 review queue 관련 채널과 contract 제거
- main memory IPC handler에서 confirm/reject/merge/split/repair queue mutation 제거
- `narrativeMemoryQueryService`와 application facade에서 dead review/repair method 제거

### Memory Barrel / Thin Layer 제거

삭제한 얇은 barrel:

- `src/main/services/features/memory/persistence/index.ts`
- `src/main/services/features/memory/summary/index.ts`
- `src/main/services/features/memory/query/index.ts`
- `src/main/services/features/memory/index.ts`
- `src/main/services/features/search/index.ts`
- `src/main/services/features/index.ts`
- `src/main/services/index.ts`

기존 import는 실제 소유 모듈로 변경:

- `narrativeMemoryQueryService`
  - `src/main/services/features/memory/query/narrativeMemoryQueryService.ts`
- `getNarrativeSummaryStatus`
  - `src/main/services/features/memory/summary/memoryNarrativeSummaryStatus.ts`
- `chapterSearchCacheService`
  - `src/main/services/features/search/chapterSearchCacheService.ts`
- `searchService`
  - `src/main/services/features/search/searchService.ts`
- canonical package / sync / audit / policy
  - 각 실제 persistence 파일 직접 import

### Projection / Status / Benchmark 정리

- projection helper와 index 제거
  - `projection/index.ts`
  - `projection/chunking.ts` 일부 helper
  - `projection/jobPolicy.ts` 일부 helper
- `sourceRows.ts`의 반복 `filter().map()` 패스를 `Map` grouping으로 축소
- static roadmap/changelog성 status blob 제거
  - `memoryPhaseStatusReport.ts`는 런타임 상태 리포트만 유지
- `memoryBenchmarkLatencyRunner.ts`의 `export * from "./latency/types.js"` 제거
  - 테스트는 `latency/types.js`에서 직접 type import

## 현재 확인 결과

```bash
pnpm run typecheck
```

결과:

```text
passed
```

```bash
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/services/ragContextAssemblerSource.test.ts tests/scripts/memoryBenchmarkLatencyRunner.test.ts --reporter=verbose --no-file-parallelism
```

상태:

```text
90초 이상 출력 없이 대기하여 중단.
중단 exit code: 130
이 로컬 환경에서 vitest hang/ABI 문제가 반복됨.
```

## 현재 RAG / Memory 상태 평가

```text
Memory/RAG MVP: 약 60~65%
```

좋아진 점:

- 근거 검색/RAG path의 중복 rank/search 코드가 줄어듦
- memory review queue 같은 제품 표면에서 죽은 API가 제거됨
- memory/rag/search feature 내부의 `index.ts` barrel이 사라짐
- import 경로가 실제 소유 모듈을 가리켜 레이어가 더 명확해짐
- 타입체크 기준 API 표면은 깨지지 않음

아직 부족한 점:

- 실제 앱에서 RAG 응답 UX 수동 확인 필요
- vitest 일부가 로컬 환경에서 안정적으로 끝나지 않음
- `KOREAN_SUFFIXES`는 지금 한국어 검색 보정용으로만 존재
  - 다국어 형태소 레이어로 확장할지, 단순 휴리스틱으로 유지할지 제품 방향 필요
- NotebookLM급 자료 인용/근거 탐색과 비교하면 아직 evidence UX, abstention, contradiction workflow가 약함
- 웹소설 워드프로세서 기준으로는 “설정 확인/모순/캐릭터 지식 상태” 질문을 위해 temporal/fact/entity evidence 정확도 검증이 더 필요

## 다음 추천 작업

1. 남은 non-memory barrel은 건드리기 전에 실제 importers 0 여부만 확인하고 삭제
2. RAG 질문 66~85번 계열을 shadow beta 원고로 회귀 테스트화
3. `주인공이 지금 이 정보를 알고 있어도 되는지` 같은 temporal knowledge query를 우선 강화
4. 앱 UI에서 evidence/no-evidence/abstention 노출이 작가 workflow에 맞는지 수동 점검
5. vitest hang 원인을 별도 환경 문제로 분리해서 해결
