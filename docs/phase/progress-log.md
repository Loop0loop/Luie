## 진행 기록

### 2026-06-11. Phase 1-1 완료

확인된 사실:

- 작가 pain point taxonomy를 9개 카테고리로 고정했다.
- taxonomy를 공유 상수와 문서, 테스트에 연결했다.
- deprecated category인 `timeline-leak`, `continuity-conflict`를 repair 명령으로 제거할 수 있게 했다.
- 실제 프로젝트 기준 eval case/evidence가 51개에서 91개로 늘었다.
- RAG 평가 결과 `caseCount: 91`, `averageContextRecallAtK: 1`, `totalP0FailureCount: 0`이었다.
- canonical package sync는 DB/package 198/198 rows로 일치했다.

### 2026-06-11. Phase 1-2 완료

확인된 사실:

- materialize CLI의 `--limit` 상한을 100에서 1000으로 확장했다.
- 작가 질문형 eval case를 300개까지 생성했다.
- taxonomy repair 결과 deprecated category 제거 대상은 0개였다.
- 실제 프로젝트 기준 eval case/evidence가 91개에서 301개로 늘었다.
- RAG 평가 결과 `caseCount: 301`, `averageContextRecallAtK: 1`, `totalP0FailureCount: 0`이었다.
- canonical package sync는 DB/package 618/618 rows로 일치했다.

제한:

- 이 결과는 gold evidence가 있는 평가셋에서 검색 근거를 회수하는 성능이다.
- 실제 LLM 장문 답변의 환각 차단, 미래 정보 누수 차단, 초안/폐기 설정 차단까지 완료됐다는 뜻은 아니다.

### 2026-06-11. Phase 1-3 완료

확인된 사실:

- 회차가 연결된 chunk에서 `temporal-chapter:{chapterOrder}:{chunkId}` eval case를 생성할 수 있게 했다.
- 생성된 temporal case는 `temporalScopeStartChapterId`와 `temporalScopeEndChapterId`를 해당 회차로 고정한다.
- 질문 문구는 "N화 기준으로, 이후 회차 정보 없이 확정해도 되는가" 형태다.
- 실제 프로젝트 기준 temporal chapter eval case 64개를 추가했다.
- 실제 프로젝트 기준 eval case/evidence가 301개에서 365개로 늘었다.
- RAG 평가 결과 `caseCount: 365`, `averageContextRecallAtK: 1`, `totalP0FailureCount: 0`이었다.
- canonical package sync는 DB/package 746/746 rows로 일치했다.

추가 완료:

- `MemoryEvalCase.queryChapterOrder`를 nullable integer로 추가했다.
- temporal chapter eval materializer는 chapter order를 `queryChapterOrder`에 저장한다.
- live eval runner는 answerer가 `queryChapterOrder`를 생략해도 eval case에 저장된 값을 scorer에 넘긴다.
- 따라서 `3화 기준` 질문에서 8화 fact를 confirmed로 쓰면 `future_fact_used_in_past_answer` P0 failure로 잡힌다.
- canonical package import mapping도 `queryChapterOrder`를 보존한다.

검증:

```text
pnpm vitest tests/main/services/memory/eval/memoryEvalCaseMaterialization.test.ts tests/main/services/memory/eval/memoryEvalRunner.test.ts tests/main/services/memory/persistence/memoryCanonicalPackageSyncVerifier.test.ts
pnpm exec eslint src/main/database/schema/memoryEval.ts src/main/database/main/packagedSchema/projectSchema.sql.ts src/main/database/packagedSchema/metadataColumnPatches.ts src/shared/types/memoryEval.ts src/main/services/features/memory/eval/memoryEvalCaseMaterialization.ts src/main/services/features/memory/eval/memoryEvalRunner.ts src/main/services/features/memory/persistence/internal/applyPayload.ts tests/main/services/memory/eval/memoryEvalCaseMaterialization.test.ts tests/main/services/memory/eval/memoryEvalRunner.test.ts
pnpm run typecheck
```

제한:

- 실제 answerer가 모든 temporal 질문에서 UI/IPC 경로로 회차 기준을 자연스럽게 전달하는지는 writer-flow E2E에서 더 검증해야 한다.
- `tests/main/database/schemaParity.test.ts`는 현재 fresh migration SQL과 bootstrap SQL 사이의 기존 누락도 함께 보고 실패한다. 이번 변경의 직접 경로는 통과했지만, fresh migration parity 정리는 별도 DB migration 정리 작업으로 남긴다.

### 2026-06-11. Phase 1-4 완료

확인된 사실:

- eval 품질 audit을 추가했다.
- audit은 `MemoryEvalCase`와 `MemoryEvalEvidence`, `MemoryChunk`를 함께 보고 다음을 검사한다.
  - gold quote가 expected chunk 안에서 token overlap으로 뒷받침되는가
  - expectedAnswer가 gold evidence로 뒷받침되는가
- quote에 HTML 태그나 줄바꿈이 섞여도 token overlap으로 검사한다.
- `--quality-audit` 명령으로 품질 리포트를 볼 수 있다.
- `--repair-quality` 명령으로 unsupported expectedAnswer를 gold evidence 기반 답변으로 수리할 수 있다.
- 실제 프로젝트 품질 audit 결과는 다음과 같았다.

```text
evalCasesScanned: 365
evalEvidenceScanned: 365
evidenceQuoteMissingInExpectedChunk: 0
expectedAnswerUnsupported: 0
repairedExpectedAnswers: 0
```

- 기존 evidence link repair를 실행해 stale evidence link 3건을 수리했다.

```text
episodeEvidenceRepaired: 2
evalEvidenceRepaired: 1
unresolved: 0
```

- RAG 평가 결과 `caseCount: 365`, `averageContextRecallAtK: 1`, `totalP0FailureCount: 0`이었다.
- canonical package sync는 DB/package 746/746 rows로 일치했다.

제한:

- 품질 audit은 deterministic token overlap 기반이다.
- 의미적으로 맞지만 표현이 크게 다른 expectedAnswer 검증은 Phase 2의 LLM judge에서 더 다뤄야 한다.

### 2026-06-11. Phase 2-1 완료

확인된 사실:

- deterministic guard failure type을 8종으로 확장했다.

```text
unsupported_confirmed_answer
answer_contains_unsupported_claim
expected_answer_not_supported_by_gold_evidence
deleted_or_draft_fact_confirmed
future_fact_used_in_past_answer
relation_direction_reversed
entity_alias_mismatch
unresolved_thread_falsely_marked_resolved
```

- `entity_alias_mismatch`를 추가했다.
  - 같은 별칭이 다른 canonical entity로 관측되면 P0로 잡는다.
  - 같은 canonical entity로 관측되면 오탐하지 않는다.
- `unresolved_thread_falsely_marked_resolved`를 추가했다.
  - 미회수 떡밥을 resolved로 관측하면 P0로 잡는다.
  - unresolved로 유지하면 오탐하지 않는다.
- eval suite 결과에 `p0FailureTypeCounts`를 추가했다.
- runner는 answerer가 반환한 observed entity/thread 정보를 scorer로 넘길 수 있다.
- false positive 회귀 테스트를 추가했다.
- 실제 프로젝트 RAG 평가 결과는 다음과 같았다.

```text
caseCount: 365
averageContextRecallAtK: 1
totalP0FailureCount: 0
p0FailureTypeCounts: {}
```

제한:

- 이 단계는 LLM 없이 판단 가능한 deterministic guard다.
- 실제 LLM 장문 답변의 의미적 누락, 애매한 모순, 작가 유용성 평가는 Phase 2-2의 LLM answer judge가 필요하다.
- renderer에서 위험 답변을 차단하는 정책은 Phase 2-3 범위다.

### 2026-06-11. Phase 2-2 judge 계약 완료

확인된 사실:

- answer judge prompt version을 고정했다.

```text
memory-eval-answer-judge-v1
```

- judge 결과 JSON schema를 코드로 고정했다.
- judge 결과는 다음 축을 가진다.

```text
groundedness: grounded | unsupported
contradiction: none | present
temporalLeakage: none | present
omission: none | present
writerUsefulness: useful | not_useful
verdict: pass | fail | invalid
evidenceQuotesUsed: string[]
rationale: string
```

- malformed JSON은 `invalid_json`으로 처리한다.
- schema가 맞지 않으면 `invalid_schema`로 처리한다.
- prompt version이 다르면 `unsupported_prompt_version`으로 처리한다.
- judge가 사용한 evidence quote가 없으면 `missing_evidence_quote`로 invalid 처리한다.
- `MemoryEvalResult.answerJudgeJson`에 judge artifact를 저장할 수 있게 했다.
- runner는 answerer 결과를 받은 뒤 optional answer judge를 호출하고, parse 결과를 eval result 계열에 저장한다.
- invalid judge artifact도 eval result에 남기고 confirmed memory를 만들지 않는다.
- 실제 프로젝트 기존 eval runner는 answer judge 없이도 정상 동작했다.

```text
caseCount: 365
averageContextRecallAtK: 1
totalP0FailureCount: 0
p0FailureTypeCounts: {}
```

제한:

- 이 단계는 LLM answer judge의 계약, schema, 저장 경계를 완성한 것이다.
- 실제 provider 호출, 비용/속도 정책, judge prompt 본문 튜닝은 아직 별도 보강이 필요하다.
- judge 결과를 renderer 답변 차단 정책에 연결하는 작업은 Phase 2-3 범위다.

### 2026-06-11. Phase 2-3 완료

확인된 사실:

- RAG 답변 contract에 `safety`를 추가했다.
- safety는 다음 필드를 가진다.

```text
label
message
blocksConfirmedAnswer
reasons
```

- safety label은 다음 값을 가진다.

```text
confirmed
inferred
insufficient_evidence
conflicting
blocked_p0
temporal_blocked
non_canonical_source
```

- `buildRagAnswerSafety` 정책을 추가했다.
- 기존 `buildRagGrounding` 결과와 safety label mapping을 테스트로 고정했다.
- 정책 mapping은 다음과 같다.

```text
P0 failure 있음 → blocked_p0
future_fact_used_in_past_answer → temporal_blocked
deleted_or_draft_fact_confirmed → non_canonical_source
근거 0개 → insufficient_evidence
conflicting grounding → conflicting
근거 있음, 문장별 검증 전 → inferred
```

- RAG QA 결과 생성 시 `safety`가 자동으로 붙는다.
- renderer message contract에 `safety`를 추가했다.
- RAG stream 완료 시 `payload.result.safety`를 message에 복사한다.
- MessageList에서 safety label과 safety message를 표시한다.
- renderer helper에 `safetyLabel`, `safetyTone`을 추가했다.
- 실제 프로젝트 기존 eval runner는 정상 동작했다.

```text
caseCount: 365
averageContextRecallAtK: 1
totalP0FailureCount: 0
p0FailureTypeCounts: {}
```

제한:

- runtime RAG 답변에는 deterministic safety policy가 붙는다.
- parse된 answer judge artifact를 runtime safety policy에 반영하는 pure mapping은 1차 연결됐다.
- 실제 provider 호출 결과를 일반 runtime RAG 경로에서 언제/얼마나 호출할지 정하는 비용/속도 정책은 아직 남아 있다.
- Phase 3의 정사/초안/폐기 출처 분리가 완료되면 `non_canonical_source` 판단 근거를 더 넓힐 수 있다.

### 2026-06-11. Phase 2-3 judge safety mapping 1차 완료

확인된 사실:

- `buildRagAnswerSafety`가 parse된 answer judge artifact를 받을 수 있게 했다.
- judge가 `temporalLeakage: present`를 반환하면 `future_fact_used_in_past_answer` reason으로 변환하고 `temporal_blocked` safety label을 반환한다.
- judge가 `groundedness: unsupported`를 반환하면 `answer_contains_unsupported_claim` reason으로 변환하고 `blocked_p0` safety label을 반환한다.
- judge가 `omission: present`, `contradiction: present`, 또는 reason 없는 `verdict: fail`을 반환해도 확정 답변 차단 reason으로 변환한다.
- invalid judge artifact는 safety를 직접 차단하지 않는다. invalid artifact 자체는 eval result에 남기는 Phase 2-2 계약을 따른다.

검증:

```text
pnpm vitest tests/main/services/ragGrounding.test.ts tests/main/services/memory/eval/memoryEvalAnswerJudge.test.ts tests/main/services/memory/eval/memoryEvalRunner.test.ts
pnpm exec eslint src/main/services/features/rag/grounding.ts tests/main/services/ragGrounding.test.ts src/main/services/features/memory/eval/memoryEvalAnswerJudge.ts tests/main/services/memory/eval/memoryEvalAnswerJudge.test.ts
pnpm run typecheck
```

제한:

- 이 단계는 provider 호출이 아니라 이미 parse된 judge artifact를 safety policy에 반영하는 순수 계약이다.
- 일반 runtime RAG 답변마다 judge를 호출하는 것은 비용/속도 정책과 UI 대기 UX를 정한 뒤 별도 phase에서 연결해야 한다.

### 2026-06-11. Phase 3-3 conflict quote queue 연결

확인된 사실:

- `MemoryFactInvalidation`은 기존 fact와 새 fact의 충돌 쌍, reason, 생성 시점을 표현할 수 있다.
- 양쪽 근거 문장은 `MemoryFactEvidence`와 `MemoryEpisodeEvidence`를 join해서 조회할 수 있다.
- `MemoryConflictFactSummary`에 `evidenceQuotes`를 추가했다.
- `fetchConflictFactPairs`는 invalidated/invalidating 양쪽 fact의 evidence quote를 반환한다.
- 분석 패널에 `ConflictQueuePanel`을 연결했다.
- 충돌 큐를 열면 현재 프로젝트/챕터/memory scope 기준으로 `getConflictQueue`를 호출한다.
- 사용자는 충돌 항목에서 이전 사실 또는 신규 사실을 채택할 수 있고, UI는 기존 `resolveFactConflict` IPC를 호출한다.

검증:

```text
pnpm vitest tests/main/services/memory/query/memoryConflictQueue.test.ts tests/main/services/memory/query/narrativeMemoryQueryService.test.ts tests/renderer/analysisConflictResolution.test.ts
pnpm run typecheck
pnpm exec eslint <Phase 3-3 touched files>
```

제한:

- `defer`, `reviewing`, `hidden`, `resolvedAt`, `reviewerNote` 같은 작가 검토 상태 영속화는 아직 없다.
- 이 상태가 필요하면 `MemoryFactInvalidation` 확장 또는 별도 `MemoryConflictLedger`가 필요하다.
- 현재 UI 검증은 정적 소스 검사 중심이다. 실제 작가 플로우 DOM/e2e 검증은 Phase 5 범위에서 보강해야 한다.

### 2026-06-11. Phase 3-4 suggested memory review UI/reject reason 저장

확인된 사실:

- 분석 패널에 `FactReviewPanel`, `EpisodeReviewPanel`, `EntityReviewPanel`, `EntityAliasReviewPanel`을 연결했다.
- 각 review panel은 사용자가 펼칠 때 suggested queue를 조회한다.
- fact/entity/entity alias/episode confirm은 기존 IPC를 호출한다.
- fact/entity/entity alias/episode reject는 `window.prompt`로 받은 reason을 IPC payload에 포함한다.
- `MemoryEntity`와 `MemoryEntityAlias`에 `rejectedAt`, `rejectionReason`을 추가했다.
- 기존 DB를 위해 `MemoryEntity`/`MemoryEntityAlias` column patch를 추가했다.
- entity/entity alias reject service는 빈 reason을 거부하고 reason을 저장한다.
- entity alias panel은 merge/split action도 기존 IPC에 연결한다.
- episode panel은 confirm 버튼을 추가해 accept/reject flow를 맞췄다.

검증:

```text
pnpm vitest tests/renderer/analysisMemoryReviewWorkflow.test.ts
pnpm vitest tests/main/services/memory/entity/memoryEntityReviewService.test.ts tests/main/services/memory/review/memoryReviewDecisionApply.test.ts tests/renderer/analysisMemoryReviewWorkflow.test.ts
pnpm vitest tests/renderer/analysisMemoryReviewWorkflow.test.ts tests/renderer/analysisConflictResolution.test.ts
pnpm run typecheck
pnpm exec eslint <Phase 3-4 touched files>
```

제한:

- reject reason 입력은 native prompt 기반 최소 구현이다.
- 실제 DOM/e2e에서 작가가 큐를 열고 승인/거절하는 end-to-end 검증은 아직 없다.

### 2026-06-11. Phase 4-1 longform benchmark seed/materialize

확인된 사실:

- `MEMORY_LONGFORM_BENCHMARK_PROFILES`에 `ci-1000`, `manual-300ch`, `manual-500ch`, `manual-10000`을 추가했다.
- `ci-1000`은 low-end 기준 100화/1000 chunk/100만 자 profile이다.
- `manual-10000`은 500화/10000 chunk/300만 자 profile이다.
- benchmark manifest는 alias 반복, 회차 재정렬, 중간 리라이트, stale embedding, summary refresh, review backlog, renderer list 부하 scenario를 포함한다.
- 같은 seed로 생성하면 같은 manifest가 나온다.
- `memory:benchmark-seed` 스크립트를 추가했다.
- `--materialize --project-id` 옵션으로 manifest를 실제 DB의 `Project`, `Chapter`, `MemoryChunk` row로 적재할 수 있다.
- materializer는 같은 project id 재실행 시 중복 삽입하지 않는다.
- 실제 `ci-1000` manifest 출력은 100 chapters, 1000 chunks, 1,000,000 chars, packageRowEstimate 1112였다.

검증:

```text
pnpm vitest tests/main/services/memory/benchmark/memoryLongformBenchmarkSeed.test.ts tests/main/services/memory/benchmark/memoryLongformBenchmarkMaterialize.test.ts tests/scripts/memoryBenchmarkSeedRunner.test.ts
pnpm exec tsx scripts/generate-memory-benchmark-seed.ts --profile ci-1000 --seed 42 --out tests/.tmp/memory-benchmark-ci-1000.json
pnpm run typecheck
pnpm exec eslint <Phase 4-1 touched files>
```

제한:

- 1만 chunk profile은 정의됐지만 실제 장시간 benchmark run은 아직 하지 않았다.
- materialized row 기반 latency/memory usage 측정은 Phase 4-2 범위다.

### 2026-06-11. Phase 4-2 latency budget/report + memory snapshot

확인된 사실:

- `MEMORY_BENCHMARK_LATENCY_BUDGETS`에 작가 체감 기준 latency와 memory budget을 고정했다.
- first query after start 목표는 3000ms, repeated query 목표는 1000ms다.
- 일반 근거 검색 목표는 1000ms, 복합 memory query 목표는 3000ms다.
- RSS budget은 512MiB, heap used budget은 256MiB로 1차 설정했다.
- `runMemoryBenchmarkLatencyReport`는 materialized benchmark project에서 chunk 검색 latency를 측정한다.
- report는 `firstChunkSearch`, `repeatedChunkSearch`, `memoryUsage`, `sqlitePageCache`, `editAfterIndexPlan`, `packageProgressPlan`을 반환한다.
- report는 `regressionThresholds`에 first/repeated query latency, RSS, heap 기준선을 함께 반환한다.
- `summarizeMemoryBenchmarkLatencyFailures`는 fail 상태인 latency/memory 항목만 CI 실패 메시지로 요약한다.
- `memory:benchmark-latency` 스크립트를 추가했다.
- `--materialize --project-id --query --out`으로 benchmark project 생성과 latency/memory report 출력을 한 번에 수행할 수 있다.
- `--assert-thresholds`를 붙이면 threshold fail이 있을 때 리포트 생성 후 non-zero exit로 실패한다.
- 실제 `ci-1000` materialized run에서 `"검은 기사"` query report가 생성됐다.

검증:

```text
pnpm vitest tests/main/services/memory/benchmark/memoryLongformBenchmarkSeed.test.ts tests/main/services/memory/benchmark/memoryLongformBenchmarkMaterialize.test.ts tests/main/services/memory/benchmark/memoryBenchmarkLatencyRunner.test.ts tests/scripts/memoryBenchmarkSeedRunner.test.ts tests/scripts/memoryBenchmarkLatencyRunner.test.ts
pnpm exec tsx scripts/run-memory-benchmark-latency.ts --profile ci-1000 --seed 42 --materialize --project-id benchmark-latency-cli-ci-1000 --query "검은 기사" --out tests/.tmp/memory-benchmark-latency-ci-1000.json --assert-thresholds
pnpm run typecheck
pnpm exec eslint <Phase 4-2 touched files>
```

제한:

- cold start 측정은 실제 Electron app start 직후 query hook과 아직 연결되지 않았다.
- edit-after-index repair job의 실제 background 소요 시간은 아직 측정하지 않았다.
- 1만 chunk profile 장시간 run은 아직 수동 benchmark로 남아 있다.
- threshold assert mode는 생겼지만 CI workflow에 artifact 업로드와 gate로 아직 연결하지 않았다.

### 2026-06-11. Phase 4-3 search optimization policy

확인된 사실:

- `SearchOptimizationPolicy`를 추가했다.
- 기본 mode는 `standard`다.
- Phase 4-3 당시 low-end mode는 result limit 40, candidate cap 40, context budget 6144 chars, rerank cache TTL 300초, vector mode `skip-when-lexical-hits`로 시작했다.
- Phase 4-4 eval guard에서 candidate cap 40은 averageContextRecallAtK 0.9698630136986301로 0.98 기준을 통과하지 못해 candidate cap 50으로 보정했다.
- standard mode에서 requested limit 20은 candidate cap 60, context budget 8192 chars, rerank cache TTL 180초로 해석된다.
- `searchChunks`의 FTS/short-token/vector 후보 LIMIT가 policy candidate cap을 사용한다.
- RAG `searchMemoryChunksForRag`의 FTS/exact phrase/quote-token/short-token/vector 후보 LIMIT가 policy candidate cap을 사용한다.
- `assembleRagContext`는 requested context budget을 policy context cap 안으로 제한한다.
- latency benchmark report는 현재 적용된 `optimizationPolicy`를 함께 출력한다.
- latency benchmark report는 `candidateCapComparison`으로 cap 20/40/current baseline의 latency, result count, baseline overlap ratio를 출력한다.
- latency benchmark report는 `cacheTtlMemoryComparison`으로 TTL 60초/180초/300초별 예상 entry 수와 예상 memory 사용량을 출력한다.
- vector search는 `MemoryEmbedding`을 현재 `MemoryChunk`와 join하고, embedding hash가 현재 `indexTextHash/contentHash`와 같을 때만 후보로 사용한다.
- `manual-10000` materialize 중 1만 chunk 단일 insert가 stack overflow를 일으켜 chunk insert를 500개 batch로 나눴다.
- benchmark `sourceId`는 `MemoryChunk_source_chunkIndex_key` 전역 unique와 충돌하지 않도록 project-qualified id로 저장한다.
- `manual-10000` CLI report는 500 chapters, 10000 chunks, 3,000,000 chars 기준으로 생성됐다.
- `manual-10000` report에서 firstChunkSearch 0.472ms, repeatedChunkSearch 0.463ms, RSS 225.5MiB, heapUsed 49.814MiB였다.
- `memoryEvalOptimizationGuard`를 추가해 averageContextRecallAtK와 totalP0FailureCount를 threshold로 검사한다.
- `memory:run-eval-suite --assert-optimized-recall --min-recall 0.98 --max-p0-failures 0` 옵션을 추가했다.
- 실제 365개 eval run에서 averageContextRecallAtK 0.9972602739726028, totalP0FailureCount 0으로 guard가 통과했다.

검증:

```text
pnpm vitest tests/main/services/search/searchOptimizationPolicy.test.ts tests/main/services/search/vectorSearchStaleEmbedding.test.ts tests/main/services/memory/benchmark/memoryBenchmarkLatencyRunner.test.ts
pnpm exec tsx scripts/run-memory-benchmark-latency.ts --profile ci-1000 --seed 42 --materialize --project-id benchmark-latency-cli-ci-1000 --query "검은 기사" --out tests/.tmp/memory-benchmark-latency-ci-1000.json --assert-thresholds
pnpm exec tsx scripts/run-memory-benchmark-latency.ts --profile manual-10000 --seed 42 --materialize --project-id benchmark-latency-cli-manual-10000-v2 --query "검은 기사" --out tests/.tmp/memory-benchmark-latency-manual-10000.json --assert-thresholds
pnpm run memory:run-eval-suite -- --project-id 454cce80-02b4-4d43-a162-4116898e4b4e --label phase-4-3-optimized-rag --top-k 5 --out tests/.tmp/memory-eval-optimization-guard.json --assert-optimized-recall --min-recall 0.98 --max-p0-failures 0
pnpm run typecheck
pnpm exec eslint <Phase 4-3 touched files>
```

제한:

- candidate cap 비교는 `ci-1000` 기준 baseline overlap 1차 리포트다. 실제 정답 recall 평가는 아직 아니다.
- cache TTL memory 비교는 estimated entry size 기반 1차 추정이다. 실제 top-k rerank cache 저장소와 heap delta 계측은 아직 없다.
- stale embedding skip은 vector search 경로에 적용됐다. 다만 skip된 stale row 수를 report하는 계측은 아직 없다.
- 1만 chunk manual benchmark는 latency/memory report까지 완료됐다. 1만 chunk 데이터셋 자체의 별도 정답 recall 평가는 아직 없다.
- eval recall guard는 headless Layer 3 evidence retrieval 기준이다. 실제 LLM 장문 답변 품질 전체를 보장하는 검증은 아니다.

### 2026-06-11. Phase 4-4 low-end mode, UI toggle, actual RAG path 계측

확인된 사실:

- `memory:benchmark-latency`와 `memory:run-eval-suite`가 `--optimization-mode low-end|standard|high-end|quality`를 받는다.
- benchmark/eval output은 실제 적용된 `optimizationPolicy`를 저장한다.
- 앱 설정에 `llm.searchOptimizationMode`를 추가했고, main/preload/shared/renderer 계약을 같은 enum으로 연결했다.
- analysis panel composer에서 Search Mode를 바꿀 수 있고, low-end 설명은 "빠른 검색 · 근거 폭 좁음"으로 표시한다.
- low-end candidate cap 40은 365 eval에서 recall 0.9698630136986301로 실패했고, candidate cap 50은 low-end/standard/high-end/quality 모두 recall 0.9972602739726028, P0 0으로 통과했다.
- `ci-1000` low-end benchmark에서 `searchMemoryChunksForRag`는 p50 2.942ms, p95/p99/max 4.195ms였다.
- 같은 run에서 `buildLayer3Evidence`는 p50 2.087ms, p95/p99/max 2.347ms였다.
- stage breakdown 기준 주요 비용은 `shortToken` p50 1.618ms, `parentWindow` p50 0.575ms, `hydrate` p50 0.190ms였다.

검증:

```text
pnpm vitest tests/main/services/memory/benchmark/memoryBenchmarkLatencyRunner.test.ts tests/scripts/memoryBenchmarkLatencyRunner.test.ts tests/main/services/search/searchOptimizationPolicy.test.ts tests/main/manager/settingsManager.localLlm.test.ts tests/main/handler/ipcSettingsHandlers.security.test.ts tests/dom/analysisViewMode.test.tsx tests/scripts/memoryRunEvalSuiteRunner.test.ts
pnpm exec tsx scripts/run-memory-benchmark-latency.ts --profile ci-1000 --seed 42 --materialize --project-id benchmark-latency-cli-ci-1000-low-end --query "검은 기사" --optimization-mode low-end --out tests/.tmp/memory-benchmark-latency-ci-1000-low-end.json --assert-thresholds
pnpm run memory:run-eval-suite -- --project-id 454cce80-02b4-4d43-a162-4116898e4b4e --label phase-4-4-low-end-rag --top-k 5 --optimization-mode low-end --out tests/.tmp/memory-eval-low-end-optimization-guard.json --assert-optimized-recall --min-recall 0.98 --max-p0-failures 0
pnpm run memory:run-eval-suite -- --project-id 454cce80-02b4-4d43-a162-4116898e4b4e --label phase-4-4-standard-rag --top-k 5 --optimization-mode standard --out tests/.tmp/memory-eval-standard-optimization-guard.json --assert-optimized-recall --min-recall 0.98 --max-p0-failures 0
pnpm run memory:run-eval-suite -- --project-id 454cce80-02b4-4d43-a162-4116898e4b4e --label phase-4-4-high-end-rag --top-k 5 --optimization-mode high-end --out tests/.tmp/memory-eval-high-end-optimization-guard.json --assert-optimized-recall --min-recall 0.98 --max-p0-failures 0
pnpm run memory:run-eval-suite -- --project-id 454cce80-02b4-4d43-a162-4116898e4b4e --label phase-4-4-quality-rag --top-k 5 --optimization-mode quality --out tests/.tmp/memory-eval-quality-optimization-guard.json --assert-optimized-recall --min-recall 0.98 --max-p0-failures 0
pnpm run typecheck
pnpm exec eslint <Phase 4-4 touched files>
```

제한:

- p99와 cold/warm 분리 측정은 이후 Phase 4-4 p99/cold-warm 기록에서 1차 완료했다.
- synthetic vector probe는 이후 Phase 4-4 p99/cold-warm 기록에서 1차 완료했다.
- cache TTL estimated memory comparison은 추정 기반이다. benchmark-local hit/miss probe는 이후 Phase 4-4 p99/cold-warm 기록에서 1차 완료했다.
- 실제 LLM 장문 답변 품질과 judge 비용은 이 수치로 보장되지 않는다.

### 2026-06-11. Phase 4-4 p99/cold-warm latency 계측

확인된 사실:

- `MemoryBenchmarkRagPathMeasurement`에 `p99Ms`, `coldStartMs`, `warmIterations`, `warmP50Ms`, `warmP95Ms`, `warmP99Ms`, `warmMaxMs`를 추가했다.
- `MemoryBenchmarkLayer3PathMeasurement`에도 같은 cold/warm 필드를 추가했다.
- `MemoryBenchmarkRagStageMeasurement`에 `p99Ms`를 추가했다.
- `vectorSearchProbe`를 추가해 quality mode synthetic embedding으로 vector branch를 실제 실행한다.
- `rerankCacheProbe`를 추가해 benchmark-local TTL Map 기준 hit/miss, entry count, cached chunk count, heap delta를 측정한다.
- `writerFlowQuerySet`을 추가해 alias lookup, temporal marker, rewrite marker, state change 4개 query category를 측정한다.
- `ci-1000` low-end benchmark에서 `searchMemoryChunksForRag`는 cold 4.195ms, warm p50 2.713ms, warm p95/p99 3.063ms, 전체 p99 4.195ms였다.
- 같은 run에서 `buildLayer3Evidence`는 cold 2.347ms, warm p50 2.062ms, warm p95/p99 2.141ms, 전체 p99 2.347ms였다.
- vector probe는 synthetic embedding row 50개를 materialize했고, vector stage는 skipped 0, p50 0.101ms, p95/p99 0.537ms였다.
- rerank cache probe는 ttl 300000ms, queries 5, hits 4, misses 1, entries 1, cachedChunkIds 50, heapDelta 0.081MiB였다.
- writer-flow query set의 RAG path p99는 alias lookup 2.664ms, temporal marker 4.221ms, rewrite marker 4.772ms, state change 11.151ms였다.
- writer-flow query set의 Layer3 evidence p99는 alias lookup 1.811ms, temporal marker 0.981ms, rewrite marker 1.264ms, state change 1.869ms였다.

검증:

```text
pnpm vitest tests/main/services/memory/benchmark/memoryBenchmarkLatencyRunner.test.ts tests/scripts/memoryBenchmarkLatencyRunner.test.ts
pnpm exec tsx scripts/run-memory-benchmark-latency.ts --profile ci-1000 --seed 42 --materialize --project-id benchmark-latency-cli-ci-1000-low-end --query "검은 기사" --optimization-mode low-end --out tests/.tmp/memory-benchmark-latency-ci-1000-low-end.json --assert-thresholds
pnpm exec eslint src/main/services/features/memory/benchmark/memoryBenchmarkLatencyRunner.ts tests/main/services/memory/benchmark/memoryBenchmarkLatencyRunner.test.ts tests/scripts/memoryBenchmarkLatencyRunner.test.ts
pnpm run typecheck
```

제한:

- query category별 p99/cold-warm 비교는 benchmark seed marker 4종 기준 1차 완료했다. 실제 웹소설 질문문 기반 category는 아직 남아 있다.
- vector probe는 synthetic embedding 기준이다. 실제 운영 embedding row와 실제 embedding provider 비용까지 대표하지는 않는다.
- cache probe는 benchmark-local TTL Map 기준이다. production cache 저장소의 eviction/hit/miss까지 대표하지는 않는다.

### 2026-06-11. Phase 4-4 전체 typecheck 회복

확인된 사실:

- 전체 `pnpm run typecheck`를 막던 오류는 `RelationEdge.tsx`의 `BaseEdge style`에 직접 만든 `EdgeStyle` interface를 넘기면서 발생했다.
- `EdgeStyle`을 React `CSSProperties` 기반 타입으로 바꿔 `BaseEdge`의 style 계약과 맞췄다.
- 이 수정은 canvas edge style 타입 경계만 바꾸며, RAG/Memory Engine runtime 동작은 변경하지 않는다.

검증:

```text
pnpm run typecheck
pnpm exec eslint src/renderer/src/features/canvas/utils/edgeStyles.ts src/renderer/src/features/canvas/components/viewport/edges/RelationEdge.tsx src/main/services/features/memory/benchmark/memoryBenchmarkLatencyRunner.ts tests/main/services/memory/benchmark/memoryBenchmarkLatencyRunner.test.ts tests/scripts/memoryBenchmarkLatencyRunner.test.ts
pnpm vitest tests/main/services/memory/benchmark/memoryBenchmarkLatencyRunner.test.ts tests/scripts/memoryBenchmarkLatencyRunner.test.ts
```

### 2026-06-11. Phase 4-5 memory build job control 계약

기록 성격:

- 아래 항목은 Phase 4-5 초기 계약 당시의 기록이다.
- 최신 기준은 Phase 4-5-4 이후 `running` cancel 거부가 아니라 `running -> cancel_requested`다.
- 현재 상태를 볼 때는 본문 Phase 4-5와 Phase 4-5-4 기록을 우선한다.

확인된 사실:

- `MemoryBuildJob` 상태 제어 service를 추가했다.
- pause는 `pending/failed -> paused` 전환만 수행한다.
- resume은 `paused -> pending` 전환만 수행한다.
- cancel은 `pending/failed/paused -> canceled`만 허용한다.
- 당시에는 running job cancel을 partial write/완료 덮어쓰기 위험 때문에 명시적으로 거부했다. 이 정책은 Phase 4-5-4에서 `cancel_requested` 기반 cooperative cancellation으로 변경됐다.
- stale running recovery는 지정 시각 이전 `running` job을 `pending`으로 되돌린다.
- progress는 `byStatus`, `activeCount`, `doneCount`, `total`을 반환한다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts tests/main/services/memory/memoryBuildJobControl.test.ts
pnpm run typecheck
```

제한:

- 이 초기 계약 시점에는 아직 UI에 연결하지 않았다. 이후 Settings progress/control UI는 1차 연결됐다.
- 이 초기 계약 시점에는 running job을 중간에 멈추는 cooperative cancellation checkpoint가 없었다. 이후 summary/embedding 일부 경로에 1차 checkpoint가 추가됐다.
- progress는 status count 기준이며 chunk/job 내부 세부 진행률은 아직 없다.

### 2026-06-11. Phase 4-5-3 paused/failed memory job dedupe

확인된 사실:

- 챕터 수정으로 `enqueueChapterDerivedJobs`가 다시 호출될 때 기존 `paused` memory job이 있으면 새 `pending` job을 만들지 않는다.
- 기존 `failed` memory job도 retry 대상이므로 새 duplicate pending job을 만들지 않고 기존 job의 priority/updatedAt만 갱신한다.
- 같은 dedupe 상태 집합을 `memoryProjectionService.enqueueChapterChunkRebuild`와 `dbMaintenanceMemory.rebuildMemoryChunks`에도 적용했다.
- dedupe 대상 상태는 `pending/running/failed/paused`다.
- `canceled/completed/skipped`는 dedupe 대상이 아니다. 이후 작가가 원고를 다시 수정하면 새 job을 만들 수 있어야 하기 때문이다.

검증:

```text
pnpm vitest tests/main/services/core/chapter/chapterDerivedJobs.test.ts
pnpm vitest tests/main/services/core/chapter/chapterDerivedJobs.test.ts tests/main/services/memoryProjectionService.test.ts tests/main/services/dbMaintenanceService.test.ts tests/main/services/memory/memoryBuildJobControl.test.ts
```

제한:

- production processor claim 조건을 공통 helper로 강제하는 작업은 아직 남아 있다.
- startup recovery는 `derivedJobWorker.start()` 경로에 연결되어 있다. 이 기록 당시 UI 표시 문구는 아직 없었다. 이후 Phase 4-5-6d restart recovery Settings label DOM 검증에서 1차 보완했다.
- summary/embedding cooperative cancellation은 Phase 4-5-4에서 1차 완료했다.

### 2026-06-11. Phase 4-5-3 stale running recovery marker 통일

확인된 사실:

- `derivedJobWorker.start()`는 시작 시 `dbMaintenanceService.recoverStaleRunningJobs()`를 호출한다.
- DB maintenance recovery는 오래된 `running` search job과 memory job을 `pending`으로 되돌린다.
- memory job recovery는 이제 `error: "RECOVERED_STALE_RUNNING_JOB"` marker를 남긴다.
- 이 marker는 `memory/jobControl.recoverStaleRunningMemoryBuildJobs`의 project 단위 복구 marker와 같다.
- 최근 `running` memory job은 복구하지 않는다.

검증:

```text
pnpm vitest tests/main/services/dbMaintenanceService.test.ts
```

제한:

- 이 기록 시점에는 recovery marker를 renderer progress UI 문구로 보여주는 작업이 없었다. 이후 Settings memory rebuild card가 `RECOVERED_STALE_RUNNING_JOB` count를 "중단된 작업 복구됨" label로 표시하고 DOM 테스트와 ko/en/ja locale key 테스트로 검증했다.
- search dirty queue recovery에는 별도 error column이 없어 같은 marker를 남기지 않는다.

### 2026-06-11. Phase 4-5-3 memory job claim helper

확인된 사실:

- `claimMemoryBuildJob` helper를 추가했다.
- helper는 `pending/failed` job만 `running`으로 전환한다.
- helper는 `paused/canceled/running` job을 claim하지 않는다.
- chunk rebuild processor, chapter summary projector, embedding projector는 직접 claim update를 하지 않고 helper를 호출한다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts tests/main/services/memoryProjectionService.test.ts tests/main/services/memory/summary tests/main/services/dbMaintenanceService.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts src/main/services/features/memory/memoryProjectionService.ts src/main/services/features/memory/chapterSummaryProjector.ts src/main/services/features/memory/embeddingProjector.ts tests/main/services/memory/memoryBuildJobControl.test.ts
```

제한:

- retry limit/backoff 정책 자체는 아직 projector별 canRetry 함수에 남아 있다.
- summary/embedding cooperative cancellation은 Phase 4-5-4에서 1차 완료했다.

### 2026-06-11. Phase 4-5-4 summary/embedding cooperative cancellation

확인된 사실:

- `cancelMemoryBuildJobs`는 더 이상 `running` job이 있다는 이유만으로 거부하지 않는다.
- `pending/failed/paused` job은 즉시 `canceled`가 된다.
- `running` job은 `cancel_requested`가 되고 `error: "CANCELLATION_REQUESTED_BY_USER"` marker를 남긴다.
- `finalizeMemoryBuildJobCancellation`은 `cancel_requested -> canceled` checkpoint finalize를 담당한다.
- `isMemoryBuildJobCancellationRequested`는 processor가 `cancel_requested/canceled` 상태를 확인하는 공통 checkpoint다.
- chapter summary projector는 LLM summary 생성 후 summary write 전에 cancellation checkpoint를 확인한다.
- embedding projector는 embedding provider 호출 전후에 cancellation checkpoint를 확인한다.
- embedding provider 호출 중 cancel이 감지되면 취소 job은 `canceled`, 같은 batch의 나머지 job은 `pending`으로 되돌려 다음 tick에서 다시 처리한다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts tests/main/services/chapterSummaryProjector.test.ts tests/main/services/memoryProjectionService.test.ts tests/main/handler/ipcInputValidation.memory.test.ts tests/main/services/dbMaintenanceService.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts src/main/services/features/memory/chapterSummaryProjector.ts src/main/services/features/memory/embeddingProjector.ts tests/main/services/memory/memoryBuildJobControl.test.ts tests/main/services/chapterSummaryProjector.test.ts src/shared/api/io.contract.ts
pnpm run typecheck
```

제한:

- chunk rebuild transaction 내부는 아직 세부 checkpoint가 없다.
- `tests/main/services/embeddingProjector.test.ts`는 기존 mock이 DB setup의 `db.initialize`를 가려 suite import 단계에서 실패한다. 이번 변경 검증은 다른 processor/contract 테스트와 typecheck로 수행했다.
- Settings memory progress UI에서 `cancel_requested` 상태를 "취소 준비 중"으로 보여준다.

### 2026-06-11. Phase 4-5-5 settings memory progress/control UI

확인된 사실:

- Settings model tab의 memory rebuild card가 `memoryAdmin.getBuildJobProgress` 결과를 표시한다.
- 표시 범위는 total/done/active/percent와 status별 count다.
- `cancel_requested`는 "취소 준비 중", stale recovery marker는 "중단된 작업 복구됨"으로 변환하는 helper를 추가했다.
- Settings에서 memory build job pause/resume/cancel API를 호출할 수 있다.
- rebuild 시작, pause, resume, cancel 이후 progress를 다시 불러온다.

검증:

```text
pnpm vitest tests/renderer/settingsMemoryBuildProgress.test.ts
pnpm exec eslint src/renderer/src/features/settings/hooks/useSettingsModel.ts src/renderer/src/features/settings/components/SettingsModal.tsx src/renderer/src/features/settings/components/tabs/ModelTab.tsx src/renderer/src/features/settings/components/tabs/modelTabSections/RebuildMemoryCard.tsx src/renderer/src/features/settings/components/tabs/modelTabSections/types.ts src/renderer/src/features/settings/components/tabs/modelTabSections/memoryBuildProgress.ts tests/renderer/settingsMemoryBuildProgress.test.ts src/renderer/src/i18n/locales/ko/base/settingsAdvanced.ts src/renderer/src/i18n/locales/en/base/settingsAdvanced.ts src/renderer/src/i18n/locales/ja/base/settingsAdvanced.ts
pnpm run typecheck
```

제한:

- 이 기록 시점에는 progress가 status count 기준이었다. 이후 jobType/targetType progress를 1차 연결했다.
- 이 기록 시점에는 chapter/chunk/jobType별 세부 진행률이 없었다. 이후 jobType/targetType progress는 1차 연결했고, 개별 chapterId/chunkId 단위는 아직 남아 있다.
- active job이 있을 때 Settings progress polling은 1차 완료했다.
- 이 기록 시점에는 snapshot cache가 아직 없었다. 이후 Phase 4-5-7 progress snapshot cache에서 1초 TTL cache를 1차 연결했다.

### 2026-06-11. Phase 4-5-5 active progress polling

확인된 사실:

- `shouldPollMemoryBuildProgress` helper를 추가했다.
- Settings model tab은 memory build progress의 `activeCount > 0`일 때 2초 간격으로 progress를 다시 불러온다.
- active job이 없으면 polling하지 않는다.

검증:

```text
pnpm vitest tests/renderer/settingsMemoryBuildProgress.test.ts
```

제한:

- 이 기록 시점에는 progress snapshot cache가 아직 없었다. 이후 Phase 4-5-7 progress snapshot cache에서 1초 TTL cache를 1차 연결했다.
- polling은 Settings model tab이 열린 동안만 동작한다.

### 2026-06-11. Phase 4-5 memory build job control IPC/API 연결

확인된 사실:

- `memory:pause-build-jobs`, `memory:resume-build-jobs`, `memory:cancel-build-jobs`, `memory:get-build-job-progress` IPC 채널을 추가했다.
- main handler는 네 채널 모두 `{ projectId }` payload를 zod schema로 검증한 뒤 `memory/jobControl` service를 호출한다.
- preload `memoryAdmin`에는 `pauseBuildJobs`, `resumeBuildJobs`, `cancelBuildJobs`, `getBuildJobProgress`를 추가했다.
- shared renderer contract에는 pause/resume/cancel count와 `MemoryBuildJobProgress` 반환 타입을 추가했다.
- 기존 entity/entity alias reject IPC 테스트 fixture도 현재 schema의 필수 `reason` 계약에 맞췄다.

검증:

```text
pnpm vitest tests/main/handler/ipcInputValidation.memory.test.ts tests/main/services/memory/memoryBuildJobControl.test.ts
pnpm exec eslint src/main/handler/search/ipcSearchHandlers.ts src/preload/api/projectApi.ts src/shared/api/io.contract.ts src/shared/ipc/channels.ts src/shared/schemas/search.ts src/shared/types/search/status.ts src/shared/types/index.ts tests/main/handler/ipcInputValidation.memory.test.ts tests/main/handler/ipcInputValidation.shared.ts src/main/services/features/memory/jobControl.ts tests/main/services/memory/memoryBuildJobControl.test.ts
pnpm run typecheck
```

제한:

- Settings model tab의 status count UI는 Phase 4-5-5에서 1차 완료했다.
- summary/embedding provider 경로의 cooperative cancellation은 1차 완료했다.
- chunk/job 내부 세부 진행률은 아직 없다.

### 2026-06-11. Phase 4-5 sub-agent 객관 리뷰 반영

리뷰 결론:

- 사실: Phase 4-5의 service -> IPC handler -> preload -> shared contract -> Settings UI 흐름은 현재 프로젝트 구조와 일관성 있다.
- 사실: 외부 queue를 새로 도입하기보다 기존 SQLite/Drizzle `MemoryBuildJob` queue를 강화하는 방향이 현재 Electron 로컬 앱 구조와 맞다.
- 사실: 최신 코드 기준 `running` cancel은 거부가 아니라 `cancel_requested` 요청 상태로 기록된다.
- 사실: 리뷰 당시 progress는 status별 count 집계였고 별도 snapshot 저장이나 jobType/chapter/chunk별 진행률은 없었다. 이후 jobType/targetType progress와 1초 TTL snapshot cache를 1차 연결했다.
- 사실: 리뷰 당시 retry/backoff 정책은 `jobPolicy.ts`에 일부 존재했지만 UI/progress/공통 상태 machine과의 연결은 부족했다. 이후 retry/cancel attention UI를 1차 연결했다.
- 사실: Settings progress helper에는 recovery marker label이 있었고, 이후 progress API가 error marker를 집계하며 Settings card DOM이 "중단된 작업 복구됨" label을 표시하도록 1차 보완했다.
- 의견: 현재 문서 상태는 계획서로 쓸 수 있지만, "완료/1차 완료/미완료" 경계가 흐려지면 구현 범위를 과대평가할 위험이 있다.

반영한 수정:

- Phase 4-5 본문에 "최신 기준은 `running -> cancel_requested`"를 고정했다.
- Phase 4-5 초기 계약 기록은 당시 기록이며, Phase 4-5-4 이후 정책이 supersede했음을 명시했다.
- "repair job"이 현재 `MemoryBuildJob`의 확정 jobType과 1:1 대응하지 않음을 명시했다.
- progress 저장은 별도 snapshot이 아니라 DB job status 집계임을 명시했다.
- Phase 4-5-6을 실제 작가 flow e2e 하위 단계로 쪼갔다.
  - Phase 4-5-6a: 과거 회차 수정 후 rebuild 시나리오
  - Phase 4-5-6b: pause/resume 작가 플로우
  - Phase 4-5-6c: cancel/cooperative cancel 작가 플로우
  - Phase 4-5-6d: restart recovery 작가 플로우
- Phase 4-5-7을 추가해 jobType progress, snapshot cache, polling backoff, 오래 지속되는 `cancel_requested` 탐지를 다음 최적화 단위로 분리했다.

남은 객관 리스크:

- Phase 4-5-6 writer workflow e2e는 아직 구현/검증 전이다.
- 리뷰 당시에는 jobType별 progress API와 Settings 표시가 없어서 작가가 "무엇이 병목인지" 정확히 알 수 없었다. 이 항목은 Phase 4-5-7에서 1차 보완했다.
- recovery marker는 현재 progress API 출력에 포함되지 않으므로 UI label 검증 범위를 과장하면 안 된다.
- chunk rebuild transaction 내부 checkpoint는 아직 없다.

### 2026-06-11. Phase 4-5-7 jobType progress API/UI

확인된 사실:

- `getMemoryBuildJobProgress`가 기존 status별 집계에 더해 `byJobType`을 반환한다.
- `byJobType`은 jobType별 `total`, `activeCount`, `doneCount`, `byStatus`를 포함한다.
- Settings progress helper는 jobType별 항목을 작가용 label로 변환한다.
- jobType label은 `rebuild_chunks` = 원고 기억화, `rebuild_summary` = 회차 요약, `rebuild_embedding` = 의미 검색 준비다.
- Settings memory rebuild card는 전체 progress 아래에 jobType별 진행 상황을 표시한다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts
pnpm vitest tests/renderer/settingsMemoryBuildProgress.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts tests/main/services/memory/memoryBuildJobControl.test.ts src/shared/types/search/status.ts src/renderer/src/features/settings/components/tabs/modelTabSections/memoryBuildProgress.ts src/renderer/src/features/settings/components/tabs/modelTabSections/RebuildMemoryCard.tsx tests/renderer/settingsMemoryBuildProgress.test.ts src/renderer/src/i18n/locales/ko/base/settingsAdvanced.ts src/renderer/src/i18n/locales/en/base/settingsAdvanced.ts src/renderer/src/i18n/locales/ja/base/settingsAdvanced.ts
pnpm run typecheck
```

제한:

- 이 기록 시점에는 chapter/chunk 단위 진행률이 아직 없었다. 이후 targetType progress는 1차 연결했고, 개별 chapterId/chunkId 단위는 아직 남아 있다.
- 이 기록 시점에는 progress snapshot cache가 아직 없었다. 이후 Phase 4-5-7 progress snapshot cache에서 1초 TTL cache를 1차 연결했다.
- 이 기록 시점에는 retry/backoff 상태가 아직 UI label에 연결되지 않았다. 이후 Phase 4-5-7 retry/cancel attention UI에서 1차 연결됐다.
- 이 기록 시점에는 Settings polling이 active job 존재 여부 기준 2초 고정 polling이었다. 이후 Phase 4-5-7 active polling backoff에서 1차 보완했다.

### 2026-06-11. Phase 4-5-7 retry/cancel attention UI

확인된 사실:

- `getMemoryBuildJobProgress`가 `attention` 요약을 반환한다.
- `attention`은 `retryableFailedCount`, `retryBackoffCount`, `exhaustedFailedCount`, `staleCancellationRequestedCount`, `nextRetryAt`, `latestError`를 포함한다.
- failed job은 attempts와 updatedAt 기준으로 재시도 가능, 재시도 대기, 재시도 한도 도달로 나뉜다.
- 재시도 대기 중인 failed job이 있으면 가장 이른 다음 재시도 시각을 `nextRetryAt`으로 반환한다.
- `cancel_requested` job은 일정 시간 이상 유지되면 취소 지연으로 표시된다.
- Settings progress helper는 attention 요약을 작가용 label로 변환한다.
- Settings memory rebuild card는 재시도 가능, 재시도 대기, 재시도 한도 도달, 취소 지연 badge, 다음 재시도 시각, 최근 오류를 표시한다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts
pnpm vitest tests/renderer/settingsMemoryBuildProgress.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts tests/main/services/memory/memoryBuildJobControl.test.ts src/shared/types/search/status.ts src/renderer/src/features/settings/components/tabs/modelTabSections/memoryBuildProgress.ts src/renderer/src/features/settings/components/tabs/modelTabSections/RebuildMemoryCard.tsx tests/renderer/settingsMemoryBuildProgress.test.ts src/renderer/src/i18n/locales/ko/base/settingsAdvanced.ts src/renderer/src/i18n/locales/en/base/settingsAdvanced.ts src/renderer/src/i18n/locales/ja/base/settingsAdvanced.ts
pnpm run typecheck
```

제한:

- attention은 전체 project 기준 집계다. jobType별 retry/backoff breakdown은 아직 없다.
- `nextRetryAt`은 project 전체에서 가장 이른 다음 재시도 시각 하나만 표시한다. jobType/target별 다음 재시도 시각은 아직 없다.
- 오래 지속되는 `cancel_requested` 감지는 count만 제공한다. 어떤 targetId가 지연 중인지는 아직 표시하지 않는다.
- 이 기록 시점에는 Settings polling이 active job 존재 여부 기준 2초 고정 polling이었다. 이후 Phase 4-5-7 active polling backoff에서 1차 보완했다.

### 2026-06-11. Phase 4-5-7 active polling backoff

확인된 사실:

- `getMemoryBuildProgressPollIntervalMs` helper를 추가했다.
- active job이 없으면 polling interval은 `null`이다.
- running 또는 `cancel_requested` job이 있으면 2초 polling을 유지한다.
- 오래 지속되는 `cancel_requested` attention이 있으면 2초 polling을 유지한다.
- pending/failed/paused처럼 즉시 처리 중인 job이 없는 active 상태에서는 5초 polling으로 backoff한다.
- active job이 50개 이상이면 5초, 200개 이상이면 10초로 추가 backoff한다.
- 오래 지속되는 `cancel_requested` attention은 active job 수보다 우선해서 2초 polling을 유지한다.
- Settings model tab은 직전 progress snapshot을 기억하고 helper에 전달한다.
- active progress가 직전 snapshot과 같으면 running 상태도 5초 polling으로 backoff한다.
- done/active/status count가 바뀌면 2초 polling을 유지한다.
- Settings model tab polling effect는 고정 `2_000ms` 대신 helper가 반환한 interval을 사용한다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts tests/renderer/settingsMemoryBuildProgress.test.ts
pnpm vitest tests/renderer/settingsMemoryBuildProgress.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts tests/main/services/memory/memoryBuildJobControl.test.ts src/shared/types/search/status.ts src/renderer/src/features/settings/hooks/useSettingsModel.ts src/renderer/src/features/settings/components/tabs/modelTabSections/memoryBuildProgress.ts src/renderer/src/features/settings/components/tabs/modelTabSections/RebuildMemoryCard.tsx tests/renderer/settingsMemoryBuildProgress.test.ts src/renderer/src/i18n/locales/ko/base/settingsAdvanced.ts src/renderer/src/i18n/locales/en/base/settingsAdvanced.ts src/renderer/src/i18n/locales/ja/base/settingsAdvanced.ts
pnpm run typecheck
```

제한:

- progress 변화 비교는 전체 active/done/status count 기준이다. 아직 개별 target별 delta까지 비교하지는 않는다.
- 이 기록 시점에는 progress snapshot cache가 아직 없었다. 이후 Phase 4-5-7 progress snapshot cache에서 1초 TTL cache를 1차 연결했다.

### 2026-06-11. Phase 4-5-7 progress snapshot cache

확인된 사실:

- `getMemoryBuildJobProgress`에 project 단위 process memory snapshot cache를 추가했다.
- snapshot TTL은 1초다.
- TTL 안의 반복 progress 조회는 기존 snapshot을 반환한다.
- TTL이 지난 조회는 DB group query를 다시 수행해 최신 progress를 반환한다.
- pause/resume/cancel/recover처럼 projectId를 아는 상태 변경은 해당 project cache를 무효화한다.
- claim/finalize처럼 jobId만 받는 상태 변경은 전체 progress snapshot cache를 무효화한다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts tests/renderer/settingsMemoryBuildProgress.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts tests/main/services/memory/memoryBuildJobControl.test.ts src/shared/types/search/status.ts src/renderer/src/features/settings/hooks/useSettingsModel.ts src/renderer/src/features/settings/components/tabs/modelTabSections/memoryBuildProgress.ts src/renderer/src/features/settings/components/tabs/modelTabSections/RebuildMemoryCard.tsx tests/renderer/settingsMemoryBuildProgress.test.ts src/renderer/src/i18n/locales/ko/base/settingsAdvanced.ts src/renderer/src/i18n/locales/en/base/settingsAdvanced.ts src/renderer/src/i18n/locales/ja/base/settingsAdvanced.ts
pnpm run typecheck
```

제한:

- cache는 process memory 기반이다. app restart 후 snapshot은 유지되지 않는다.
- 외부에서 DB를 직접 수정하면 TTL 안에서는 stale snapshot을 볼 수 있다. 공식 job control API는 cache를 무효화한다.
- 실제 대형 project에서 progress group query 비용 benchmark는 아직 없다.

### 2026-06-11. Phase 4-5-7 targetType progress API/UI

확인된 사실:

- `getMemoryBuildJobProgress`가 `byTargetType`을 반환한다.
- `byTargetType`은 targetType별 `total`, `activeCount`, `doneCount`, `byStatus`를 포함한다.
- Settings progress helper는 targetType별 항목을 작가용 label로 변환한다.
- targetType label은 회차, 장면, 노트, 시놉시스, 플롯, 인물, 세력, 사건, 자료 메모를 포함한다.
- Settings memory rebuild card는 전체 progress와 jobType progress 아래에 원고 단위별 진행 상황을 표시한다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts tests/renderer/settingsMemoryBuildProgress.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts tests/main/services/memory/memoryBuildJobControl.test.ts src/shared/types/search/status.ts src/renderer/src/features/settings/hooks/useSettingsModel.ts src/renderer/src/features/settings/components/tabs/modelTabSections/memoryBuildProgress.ts src/renderer/src/features/settings/components/tabs/modelTabSections/RebuildMemoryCard.tsx tests/renderer/settingsMemoryBuildProgress.test.ts src/renderer/src/i18n/locales/ko/base/settingsAdvanced.ts src/renderer/src/i18n/locales/en/base/settingsAdvanced.ts src/renderer/src/i18n/locales/ja/base/settingsAdvanced.ts
pnpm run typecheck
```

제한:

- 이 단계는 targetType별 진행률이다. 개별 chapterId/chunkId별 진행률은 아직 없다.
- targetId 목록이나 특정 회차 제목은 아직 표시하지 않는다.
- progress UI가 길어질 수 있어, 대형 프로젝트에서는 접기/상위 N개 표시가 필요할 수 있다.

### 2026-06-11. Phase 4-5-7 targetId progress API/UI

확인된 사실:

- `getMemoryBuildJobProgress`가 `byTarget`을 반환한다.
- `byTarget` key는 `<targetType>:<targetId>` 형식이다.
- `byTarget`은 target별 `targetType`, `targetId`, `total`, `activeCount`, `doneCount`, `byStatus`를 포함한다.
- Settings progress helper는 개별 target 항목을 activeCount 우선으로 정렬한다.
- Settings memory rebuild card는 activeCount가 큰 개별 target 상위 5개를 표시한다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts tests/renderer/settingsMemoryBuildProgress.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts tests/main/services/memory/memoryBuildJobControl.test.ts src/shared/types/search/status.ts src/renderer/src/features/settings/hooks/useSettingsModel.ts src/renderer/src/features/settings/components/tabs/modelTabSections/memoryBuildProgress.ts src/renderer/src/features/settings/components/tabs/modelTabSections/RebuildMemoryCard.tsx tests/renderer/settingsMemoryBuildProgress.test.ts src/renderer/src/i18n/locales/ko/base/settingsAdvanced.ts src/renderer/src/i18n/locales/en/base/settingsAdvanced.ts src/renderer/src/i18n/locales/ja/base/settingsAdvanced.ts
pnpm run typecheck
```

제한:

- 이 기록 시점에는 target label이 `회차 <targetId>` 같은 기본 label이었다. 이후 chapter/scene/note target label은 1차 연결했다. synopsis/plot/character/faction/event/scrapMemo/chunk label join은 아직 없다.
- 상위 5개만 표시한다. 전체 목록/필터 UI는 아직 없다.
- targetId progress는 MemoryBuildJob 단위 진행률이다. chunk 내부 처리 percent는 아직 아니다.

### 2026-06-11. Phase 4-5-7 chapter target label

확인된 사실:

- chapter target의 label을 DB의 `Chapter.order`와 `Chapter.title`로 보강했다.
- `byTarget["chapter:<id>"].label`은 chapter row가 있으면 `12화 · 검은 기사` 형식으로 반환한다.
- chapter row를 찾지 못한 target은 `label: null`로 유지한다.
- Settings progress helper는 backend label이 있으면 이를 우선 사용하고, 없으면 기존 fallback label을 사용한다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts tests/renderer/settingsMemoryBuildProgress.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts tests/main/services/memory/memoryBuildJobControl.test.ts src/shared/types/search/status.ts src/renderer/src/features/settings/hooks/useSettingsModel.ts src/renderer/src/features/settings/components/tabs/modelTabSections/memoryBuildProgress.ts src/renderer/src/features/settings/components/tabs/modelTabSections/RebuildMemoryCard.tsx tests/renderer/settingsMemoryBuildProgress.test.ts src/renderer/src/i18n/locales/ko/base/settingsAdvanced.ts src/renderer/src/i18n/locales/en/base/settingsAdvanced.ts src/renderer/src/i18n/locales/ja/base/settingsAdvanced.ts
pnpm run typecheck
```

제한:

- 이 기록 시점에는 scene/note/synopsis/plot/character/faction/event/scrapMemo target label join이 아직 없었다. 이후 scene/note label은 1차 연결했다.
- chunk label은 아직 없다.
- targetId progress는 여전히 MemoryBuildJob 단위 진행률이다. chunk 내부 처리 percent는 아직 아니다.

### 2026-06-11. Phase 4-5-7 scene/note target label

확인된 사실:

- scene target의 label을 DB의 `Chapter.order`, `Scene.order`, `Scene.title`로 보강했다.
- `byTarget["scene:<id>"].label`은 scene row와 chapter row가 있으면 `12화 · 장면 3 · 골목 추격` 형식으로 반환한다.
- chapter row가 없으면 scene label은 `장면 3 · 골목 추격` 형식으로 fallback한다.
- note target의 label을 DB의 `Note.title`로 보강했다.
- `byTarget["note:<id>"].label`은 note row가 있으면 `노트 · 폐기 후보 설정` 형식으로 반환한다.
- Settings progress helper는 기존과 동일하게 backend label을 우선 사용한다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts tests/renderer/settingsMemoryBuildProgress.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts tests/main/services/memory/memoryBuildJobControl.test.ts src/shared/types/search/status.ts src/renderer/src/features/settings/hooks/useSettingsModel.ts src/renderer/src/features/settings/components/tabs/modelTabSections/memoryBuildProgress.ts src/renderer/src/features/settings/components/tabs/modelTabSections/RebuildMemoryCard.tsx tests/renderer/settingsMemoryBuildProgress.test.ts src/renderer/src/i18n/locales/ko/base/settingsAdvanced.ts src/renderer/src/i18n/locales/en/base/settingsAdvanced.ts src/renderer/src/i18n/locales/ja/base/settingsAdvanced.ts
pnpm run typecheck
```

제한:

- synopsis/plot/character/faction/event/scrapMemo target label join은 아직 없다.
- chunk label은 아직 없다.
- targetId progress는 여전히 MemoryBuildJob 단위 진행률이다. chunk 내부 처리 percent는 아직 아니다.

### 2026-06-11. Phase 4-5-7 synopsis/plot/world target label

확인된 사실:

- synopsis target의 label을 DB의 `Synopsis.title`로 보강했다.
- plot target의 label을 DB의 `Plot.title`로 보강했다.
- scrapMemo target의 label을 DB의 `ScrapMemo.title`로 보강했다.
- character/faction/event target의 label을 각각 DB의 `Character.name`, `Faction.name`, `Event.name`으로 보강했다.
- `byTarget` label은 작가가 읽는 단위로 `시놉시스 · 제목`, `플롯 · 제목`, `자료 메모 · 제목`, `인물 · 이름`, `세력 · 이름`, `사건 · 이름` 형식을 반환한다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts tests/main/services/memory/memoryBuildJobControl.test.ts
pnpm run typecheck
```

제한:

- chunk label은 아직 없다.
- targetId progress는 여전히 MemoryBuildJob 단위 진행률이다. chunk 내부 처리 percent는 아직 아니다.

### 2026-06-11. Phase 4-5-7 target top-N SQL limit

확인된 사실:

- `getMemoryBuildJobProgress`는 targetId별 개별 progress를 만들기 전에 SQL에서 activeCount/total 기준 상위 20개 target만 고른다.
- `byTarget` status breakdown과 target label lookup은 이 상위 20개 target에 대해서만 수행한다.
- 전체 job 수와 targetType별 count는 기존 전체 집계를 유지한다.
- Settings UI가 실제로 보여주는 개별 target 후보가 큰 프로젝트에서 무한히 커지지 않도록 제한됐다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts tests/renderer/settingsMemoryBuildProgress.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts tests/main/services/memory/memoryBuildJobControl.test.ts
pnpm run typecheck
```

제한:

- 실제 대형 project에서 group query 비용을 시간/메모리로 측정하는 benchmark는 아직 없다.
- targetId progress는 여전히 MemoryBuildJob 단위 진행률이다. chunk 내부 처리 percent는 아직 아니다.

### 2026-06-11. Phase 4-5-7 chunk target label

확인된 사실:

- `MEMORY_TARGET_TYPES.CHUNK = "chunk"`를 추가했다.
- `getMemoryBuildJobProgress`는 targetType이 `chunk`인 job의 targetId를 `MemoryChunk.id`로 보고 label을 조회한다.
- chunk label은 `Chapter.order`, `Chapter.title`, `Scene.order`, `Scene.title`, `MemoryChunk.chunkIndex`, `MemoryChunk.contextLabel`을 조합한다.
- 회차 chunk는 `7화 · 비밀의 문 · chunk 4 · 회상 장면`처럼 작가가 원문 위치를 찾을 수 있는 label로 반환한다.
- Settings progress helper와 ko/en/ja target type label에 chunk를 추가했다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts tests/renderer/settingsMemoryBuildProgress.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts src/main/services/features/memory/memoryJobConstants.ts tests/main/services/memory/memoryBuildJobControl.test.ts src/renderer/src/features/settings/components/tabs/modelTabSections/memoryBuildProgress.ts tests/renderer/settingsMemoryBuildProgress.test.ts src/renderer/src/i18n/locales/ko/base/settingsAdvanced.ts src/renderer/src/i18n/locales/en/base/settingsAdvanced.ts src/renderer/src/i18n/locales/ja/base/settingsAdvanced.ts
pnpm run typecheck
```

제한:

- targetId progress는 여전히 MemoryBuildJob 단위 진행률이다. chunk 내부 처리 percent는 아직 아니다.

### 2026-06-11. Phase 4-5-7 subagent review 반영

확인된 사실:

- sub agent 리뷰 결과, 프로젝트 구조 일관성은 대체로 맞지만 retry policy 중복, recovery marker 표시 계약, 대형 project progress 비용, scene label 모호성, Phase 4-5-7 과대 범위가 보강 대상으로 확인됐다.
- retry/backoff 계산은 `jobControl.ts`의 별도 상수가 아니라 memory projection의 `jobPolicy.ts` helper를 사용하도록 맞췄다.
- stale running recovery marker는 status count가 아니라 `progress.attention.recoveredStaleRunningCount`로 집계한다.
- Settings progress view의 `recoveredCount`도 `byStatus["RECOVERED_STALE_RUNNING_JOB"]`가 아니라 attention count를 읽는다.
- Phase 4-5-7은 `4-5-7a`부터 `4-5-7i`까지 하위 phase로 나눴다.

검증:

```text
pnpm vitest tests/main/services/memory/memoryBuildJobControl.test.ts tests/renderer/settingsMemoryBuildProgress.test.ts
pnpm exec eslint src/main/services/features/memory/jobControl.ts src/main/services/features/memory/projection/jobPolicy.ts tests/main/services/memory/memoryBuildJobControl.test.ts src/shared/types/search/status.ts src/renderer/src/features/settings/hooks/useSettingsModel.ts src/renderer/src/features/settings/components/tabs/modelTabSections/memoryBuildProgress.ts src/renderer/src/features/settings/components/tabs/modelTabSections/RebuildMemoryCard.tsx tests/renderer/settingsMemoryBuildProgress.test.ts src/renderer/src/i18n/locales/ko/base/settingsAdvanced.ts src/renderer/src/i18n/locales/en/base/settingsAdvanced.ts src/renderer/src/i18n/locales/ja/base/settingsAdvanced.ts
pnpm run typecheck
```

남은 범위:

- progress group query 비용 benchmark는 아직 없다.
- 실제 작가 flow E2E, 예: 과거 회차 수정 -> stale 감지 -> rebuild -> RAG 질문에서 근거 누락/미래 정보 누수 없음, 은 아직 별도 phase로 남아 있다.

### 2026-06-11. Phase 5-1 evidence quote first MessageList DOM

확인된 사실:

- assistant 답변에 evidence가 있으면 MessageList가 답변 본문보다 먼저 evidence quote를 표시한다.
- evidence quote는 기존 `onJumpEvidence` callback을 유지하는 button으로 렌더링된다.
- evidence quote card는 현재 계약에서 사용할 수 있는 `chapterId`와 `offset`을 위치 label로 표시한다.
- evidence quote card는 현재 계약에서 사용할 수 있는 `chunkId`를 표시해 어떤 memory chunk를 답변에 썼는지 확인할 수 있다.
- safety label helper는 i18n이 아직 초기화되지 않은 테스트/초기 렌더링 상태에서도 한국어 fallback label을 반환한다.
- assistant safety가 `confirmed`여도 evidence가 없으면 MessageList는 화면 label을 `근거 부족`으로 낮춰 표시한다.

검증:

```text
pnpm vitest tests/dom/analysisMessageSafety.test.tsx tests/renderer/analysisSafetyLabel.test.ts
pnpm exec eslint src/renderer/src/features/research/components/analysisSection/chat/MessageList.tsx src/renderer/src/features/research/components/analysisSection/runtime/runtimeHelpers.ts tests/dom/analysisMessageSafety.test.tsx tests/renderer/analysisSafetyLabel.test.ts
pnpm run typecheck
```

제한:

- quote button은 기존 jump callback을 호출한다. 실제 editor scroll/jump까지 포함한 E2E 검증은 아직 없다.
- evidence source의 회차/장면 제목 label은 아직 MessageList quote card에 직접 표시하지 않는다. 현재는 `chapterId`와 `offset` 기반 1차 위치 label이다.
- 사용된 memory 목록 전체를 펼치는 UI는 아직 없다. 현재는 evidence card의 `chunkId` 표시가 1차 식별자 역할을 한다.

### 2026-06-11. Phase 5-2 conflict warning UI client defer 1차 완료

확인된 사실:

- `ConflictQueuePanel`은 기존 conflict pair의 이전/신규 evidence quote를 함께 표시한다.
- `ConflictQueuePanel`은 기존 이전 사실 채택/신규 사실 채택 버튼에 더해 `나중에 보기` 버튼을 표시한다.
- `나중에 보기`는 `resolveFactConflict`를 호출하지 않고 현재 renderer conflict queue에서 해당 conflict item을 숨긴다.
- 기존 conflict resolve 경로는 그대로 유지한다.
- ko/en/ja locale에 conflict defer label을 추가했다.

검증:

```text
SKIP_DB_TEST_SETUP=1 corepack pnpm vitest tests/dom/conflictQueuePanelWriterFlow.test.tsx tests/dom/staleEvidenceReviewPanel.test.tsx
corepack pnpm run typecheck
corepack pnpm exec eslint src/renderer/src/features/research/components/analysisSection/review/queue/ConflictQueuePanel.tsx src/renderer/src/features/research/components/analysisSection/review/queue/useMemoryReviewQueues.ts src/renderer/src/features/research/components/AnalysisSection.tsx src/renderer/src/features/research/stores/analysis/analysisStore.actions.ts src/renderer/src/i18n/locales/ko/base/Analysis.ts src/renderer/src/i18n/locales/en/base/Analysis.ts src/renderer/src/i18n/locales/ja/base/Analysis.ts tests/dom/conflictQueuePanelWriterFlow.test.tsx
```

제한:

- 이번 단계의 `defer`는 클라이언트 큐 숨김이다. DB에 `deferred/reviewing/resolved` 같은 conflict review 상태를 저장하지 않는다.
- 앱 재시작 또는 conflict queue 재조회 후에는 ledger 기준 conflict가 다시 보일 수 있다.
- conflict review 상태 영속화가 필요하면 `MemoryFactInvalidation` 확장 또는 별도 conflict review ledger가 필요하다.

### 2026-06-11. Phase 5-3 timeline-aware query UI 1차 완료

확인된 사실:

- `PromptComposer`는 현재 편집 중인 챕터의 `order/title`을 답변 기준 label로 표시한다.
- memory scope가 `current-only`이면 "현재 회차 근거만" label을 표시한다.
- memory scope가 `with-prior`이면 "이전 회차 포함" label을 표시한다.
- `AnalysisSection`은 `useChapterStore.currentItem`의 order/title을 composer에 전달한다.
- ko/en/ja locale에 timeline basis/scope label을 추가했다.

검증:

```text
SKIP_DB_TEST_SETUP=1 corepack pnpm vitest tests/dom/promptComposerTimelineScope.test.tsx
corepack pnpm run typecheck
corepack pnpm exec eslint src/renderer/src/features/research/components/AnalysisSection.tsx src/renderer/src/features/research/components/analysisSection/chat/PromptComposer.tsx src/renderer/src/i18n/locales/ko/base/Analysis.ts src/renderer/src/i18n/locales/en/base/Analysis.ts src/renderer/src/i18n/locales/ja/base/Analysis.ts tests/dom/promptComposerTimelineScope.test.tsx
```

제한:

- 이번 단계는 현재 편집 챕터를 기준으로 표시한다. 사용자가 임의의 기준 회차를 직접 선택하는 UI는 아직 없다.
- future leakage 차단 자체는 기존 RAG safety label 경로에 의존한다. 이번 테스트는 composer label DOM 검증이다.

### 2026-06-11. Phase 5-4 writer workflow scenario coverage 1차 완료

확인된 사실:

- Phase 5 writer workflow 6종을 [Phase 5 Writer Workflow Coverage](phase-5-writer-workflow-coverage.md)에 고정했다.
- coverage anchor test는 각 workflow가 참조하는 실제 test file과 test name을 확인한다.
- 설정 질문, 충돌 감지, 과거 회차 수정, 초안 폐기, 인물명/별칭 변경, 회차 순서 변경 흐름이 DOM/service 테스트와 연결됐다.

검증:

```text
SKIP_DB_TEST_SETUP=1 corepack pnpm vitest tests/scripts/phase5WriterWorkflowCoverage.test.ts
corepack pnpm vitest tests/dom/analysisMessageSafety.test.tsx tests/dom/promptComposerTimelineScope.test.tsx tests/dom/conflictQueuePanelWriterFlow.test.tsx tests/main/services/ragGrounding.test.ts tests/main/services/memory/memoryEvidenceChunkLinkRepair.test.ts tests/main/services/memory/review/memoryReviewBacklogReport.test.ts tests/main/services/memory/temporal/memoryTemporalFactReviewService.test.ts tests/main/services/memory/entity/memoryEntityReviewService.test.ts tests/main/services/memory/eval/memoryEvalRunner.test.ts tests/main/services/memory/eval/memoryEvalScoring.test.ts tests/scripts/phase5WriterWorkflowCoverage.test.ts
```

제한:

- 현재는 DOM/service 단위 coverage다. 실제 Electron E2E에서 원고 수정 -> stale 감지 -> rebuild -> RAG 질문까지 이어지는 긴 통합 시나리오는 아직 없다.

### 2026-06-11. Phase 5-2 conflict review status 영속화 완료

확인된 사실:

- `MemoryFactInvalidation`에 `reviewStatus`, `reviewerNote`, `reviewedAt`을 추가했다.
- 기존 DB는 packaged schema column patch로 새 conflict review column을 보강한다.
- conflict queue는 `pending/reviewing` 상태만 active item으로 반환한다.
- conflict `defer` action은 `reviewStatus=deferred`로 저장하고 active queue에서 제외한다.
- conflict resolve는 winner/loser fact 상태를 갱신하면서 invalidation row를 `reviewStatus=resolved`로 저장한다.
- canonical package import/export는 conflict review 상태를 보존한다.

검증:

```text
corepack pnpm vitest tests/main/services/memory/query/memoryConflictQueue.test.ts tests/main/handler/ipcInputValidation.memory.test.ts tests/dom/conflictQueuePanelWriterFlow.test.tsx
corepack pnpm vitest tests/main/services/memory/temporal/memoryTemporalFactReviewService.test.ts tests/main/services/memory/query/memoryConflictQueue.test.ts tests/main/handler/ipcInputValidation.memory.test.ts tests/dom/conflictQueuePanelWriterFlow.test.tsx
corepack pnpm vitest tests/main/services/memory/persistence/memoryCanonicalPackage.test.ts tests/main/services/memory/persistence/memoryCanonicalPackageSyncVerifier.test.ts tests/main/services/memory/persistence/memoryCanonicalExportAudit.test.ts tests/shared/memoryPersistencePolicy.test.ts
corepack pnpm run typecheck
```

제한:

- deferred conflict를 다시 여는 별도 필터 UI는 아직 없다.

### 2026-06-11. Phase 5-3 timeline basis chapter 선택 UI 완료

확인된 사실:

- `PromptComposer`는 기준 회차 select를 표시하고 사용자가 현재 편집 회차가 아닌 기준 회차를 직접 선택할 수 있다.
- `AnalysisSection`은 선택된 기준 회차를 RAG chat과 memory review queue에 전달한다.
- 선택된 회차가 현재 chapter list에 없으면 현재 편집 회차로 fallback한다.
- ko/en/ja locale에 기준 회차 선택 label을 추가했다.

검증:

```text
SKIP_DB_TEST_SETUP=1 corepack pnpm vitest tests/dom/promptComposerTimelineScope.test.tsx
corepack pnpm run typecheck
corepack pnpm exec eslint src/renderer/src/features/research/components/AnalysisSection.tsx src/renderer/src/features/research/components/analysisSection/chat/PromptComposer.tsx src/renderer/src/i18n/locales/ko/base/Analysis.ts src/renderer/src/i18n/locales/en/base/Analysis.ts src/renderer/src/i18n/locales/ja/base/Analysis.ts tests/dom/promptComposerTimelineScope.test.tsx
```

제한:

- timeline scope 변경이 실제 RAG 응답에서 future leakage를 차단하는 긴 E2E는 Phase 5-4 보강 범위다.

### 2026-06-11. Phase 5-4 Electron writer workflow E2E 보강

확인된 사실:

- `tests/e2e/phase5WriterWorkflow.spec.ts`를 추가해 Electron 앱 경계에서 원고 수정, memory rebuild, 검색, RAG evidence 확인까지 이어지는 흐름을 검증한다.
- 재작성된 원고의 `붉은 인장 상자` chunk가 검색되고, RAG 첫 evidence chunk가 현재 검색 결과에 포함되는지 확인한다.
- Phase 5 writer workflow coverage 문서는 과거 회차 수정 시나리오의 E2E anchor로 새 spec를 참조한다.

검증:

```text
corepack pnpm vitest tests/scripts/phase5WriterWorkflowCoverage.test.ts
corepack pnpm exec eslint tests/e2e/phase5WriterWorkflow.spec.ts tests/scripts/phase5WriterWorkflowCoverage.test.ts
corepack pnpm run typecheck
```

제한:

- 이 E2E는 preload API를 통한 Electron 앱 경계 검증이다. 실제 에디터 타이핑과 버튼 클릭만 사용하는 순수 UI E2E는 선택 보강 범위다.
- `corepack pnpm exec playwright test --project=stress tests/e2e/phase5WriterWorkflow.spec.ts`는 현재 로컬 Playwright runner가 기존 E2E spec 전체에서 `Playwright Test did not expect test() to be called here` 오류를 내며 중단되어 실행 완료하지 못했다.

### 2026-06-11. Phase 5-2 deferred conflict 재조회 UI 완료

확인된 사실:

- conflict queue 조회 입력에 `reviewFilter: "active" | "deferred"`를 추가했다.
- 기본 conflict queue는 기존처럼 `pending`/`reviewing`만 보여주고, deferred 필터를 선택하면 `MemoryFactInvalidation.reviewStatus = deferred` 항목을 다시 보여준다.
- `ConflictQueuePanel`은 active/deferred 필터 버튼과 pending/reviewing/deferred 상태 badge를 표시한다.
- 보류된 conflict는 다시 조회한 뒤 이전/신규 사실 채택 action으로 해결할 수 있고, 이미 deferred 상태인 row에서는 defer 버튼을 비활성화한다.

검증:

```text
corepack pnpm vitest tests/dom/conflictQueuePanelWriterFlow.test.tsx tests/main/services/memory/query/memoryConflictQueue.test.ts tests/main/handler/ipcInputValidation.memory.test.ts
corepack pnpm exec eslint src/shared/types/search/review.ts src/shared/schemas/search.ts src/main/services/features/memory/query/internal/conflicts.ts src/main/services/features/memory/query/narrativeMemoryQueryService.ts src/renderer/src/features/research/components/AnalysisSection.tsx src/renderer/src/features/research/components/analysisSection/review/queue/ConflictQueuePanel.tsx src/renderer/src/features/research/components/analysisSection/review/queue/useMemoryReviewQueues.ts src/renderer/src/features/research/stores/analysis/analysisStore.ts src/renderer/src/features/research/stores/analysis/analysisStore.actions.ts src/renderer/src/i18n/locales/ko/base/Analysis.ts src/renderer/src/i18n/locales/en/base/Analysis.ts src/renderer/src/i18n/locales/ja/base/Analysis.ts tests/dom/conflictQueuePanelWriterFlow.test.tsx tests/main/services/memory/query/memoryConflictQueue.test.ts tests/main/handler/ipcInputValidation.memory.test.ts
corepack pnpm run typecheck
```

제한:

- 실제 Electron E2E에서 conflict queue 결정을 UI 클릭만으로 검증하는 흐름은 아직 선택 보강 범위다.

### 2026-06-11. Phase 5-3 timeline scope future fact guard 보강

확인된 사실:

- `fetchTemporalFacts`는 선택 기준 회차가 12화이고 `includePriorMemory`가 true여도 18화에서 관측된 future fact를 제외한다.
- RAG context assembler는 renderer에서 넘어온 `chapterId`와 `includePriorMemory`를 narrative memory query에 전달한다.
- 현재 RAG stream 완료 경로는 eval scorer/answer judge의 future leakage failure를 직접 실행하지 않는다. 따라서 `temporal_blocked` E2E는 아직 answer judge 통합 이후에 완전히 검증할 수 있다.

검증:

```text
corepack pnpm vitest tests/main/services/memory/query/narrativeMemoryTemporalScope.test.ts tests/main/services/ragContextAssemblerSource.test.ts
corepack pnpm exec eslint tests/main/services/memory/query/narrativeMemoryTemporalScope.test.ts tests/main/services/ragContextAssemblerSource.test.ts
corepack pnpm run typecheck
```

제한:

- 실제 RAG stream 결과에서 `future_fact_used_in_past_answer -> temporal_blocked`가 발생하는 end-to-end 검증은 answer judge/eval scorer 연결 이후 범위다.

### 2026-06-12. Phase 6-1 canonical sync source id mismatch 보고 1차 완료

확인된 사실:

- `verifyMemoryCanonicalPackageSync`는 table별 `sourceIdMismatches`를 반환한다.
- DB row id가 import-scoped id(`projectId:Table:sourceId`)이고 package row id가 원본 source id여도 같은 canonical row로 비교한다.
- 같은 row id가 DB와 package 양쪽에 있어도 `MemoryFact.subjectEntityId` 같은 FK source id가 다르면 sync 불일치로 보고한다.

아키텍처 부합:

- `.luie` package payload format은 변경하지 않았다.
- IPC channel, preload API, renderer contract는 변경하지 않았다.
- 변경 범위는 main memory persistence verifier와 해당 targeted test에 한정했다.

검증:

```text
pnpm vitest tests/main/services/memory/persistence/memoryCanonicalPackageSyncVerifier.test.ts
```

제한:

- source id mismatch 자동 복구는 하지 않는다.
- 실제 `.luie` import/export 왕복 후 전체 source id mismatch가 0인지 확인하는 긴 통합 검증은 다음 보강 범위다.

### 2026-06-12. Phase 6-1 canonical payload import/rebuild source id 검증 1차 완료

확인된 사실:

- `compareMemoryCanonicalPackagePayloads`를 추가해 verifier의 DB/package 비교 규칙을 package 파일 읽기와 분리했다.
- canonical package payload를 실제 DB transaction에 import한 뒤 `buildMemoryCanonicalPackagePayload`로 다시 rebuild하는 테스트를 추가했다.
- import로 scoped 된 `MemoryFact.subjectEntityId`와 `MemoryFactEvidence.factId/evidenceId`는 package source id와 mismatch 없이 비교된다.

아키텍처 부합:

- `.luie` package payload schema는 변경하지 않았다.
- 기존 `verifyMemoryCanonicalPackageSync` public API는 유지했다.
- 비교 helper는 main memory persistence 내부에 두고, shared contract나 renderer/preload 경계는 건드리지 않았다.

검증:

```text
pnpm vitest tests/main/services/memory/persistence/memoryCanonicalPackage.test.ts
pnpm vitest tests/main/services/memory/persistence/memoryCanonicalPackageSyncVerifier.test.ts
```

제한:

- 실제 `.luie` container write/read를 포함하지 않는 DB-level 왕복 검증이다.
- 실제 파일 기반 package 왕복은 Phase 6-1 추가 보강 또는 Phase 6-3 crash-safe export와 함께 검증해야 한다.

### 2026-06-12. Phase 6-2 canonical memory schema version compatibility 1차 완료

확인된 사실:

- `LuieMemoryCanonicalSchema`는 `schemaVersion`이 없는 legacy canonical memory payload를 계속 허용한다.
- `schemaVersion: 1`이 아닌 future canonical memory payload는 unsupported schema version으로 거부한다.
- 오래된 package를 안전하게 여는 경로와 알 수 없는 미래 package를 조용히 오독하지 않는 경로를 테스트로 고정했다.

아키텍처 부합:

- `.luie` package payload format을 변경하지 않고 parser validation만 강화했다.
- 기존 import transaction, IPC, preload, renderer 경계는 변경하지 않았다.

검증:

```text
pnpm vitest tests/main/services/memory/persistence/memoryCanonicalPackage.test.ts
```

제한:

- schema version별 fixture matrix는 아직 v1/missing-version 중심이다.
- unknown row field의 보존/폐기 정책은 apply/import 단계별로 더 명확히 문서화해야 한다.

### 2026-06-12. Phase 6-2 canonical memory unknown row field discard 정책 1차 완료

확인된 사실:

- `MEMORY_CANONICAL_UNKNOWN_ROW_FIELD_POLICY = "discard"`를 main memory persistence policy에 추가했다.
- canonical memory schema는 compatibility를 위해 unknown row field를 parse 단계에서 허용하지만, apply/import 단계는 명시적으로 매핑한 DB column만 저장한다.

아키텍처 부합:

- policy 값은 main memory persistence domain 안에 둬서 shared/renderer contract를 늘리지 않았다.
- 기존 `.luie` package format과 import transaction shape는 변경하지 않았다.

검증:

```text
pnpm vitest tests/main/services/memory/persistence/memoryCanonicalPackage.test.ts
```

제한:

- unknown row field discard가 실제 `.luie` 파일 import UI에서 사용자에게 노출되는지는 아직 검증하지 않았다.

### 2026-06-12. Phase 6-3 failed full write temp cleanup 1차 완료

확인된 사실:

- unsafe package entry 때문에 SQLite-backed `.luie` full write가 실패하면 기존 package entry는 유지된다.
- 실패 후 target package 주변에 `.tmp-*`/`.bak-*` write artifact가 남지 않는지 `listPackageWriteArtifacts`로 검증한다.

아키텍처 부합:

- package write helper는 main IO 경계 안에 유지했다.
- `.luie` container format, IPC, preload, renderer contract는 변경하지 않았다.

검증:

```text
pnpm vitest tests/main/services/luieContainer.test.ts
```

제한:

- atomic replace 실패 중 backup restore branch를 강제로 태우는 테스트는 아직 없다.
- corrupted package recovery test는 아직 남아 있다.

### 2026-06-12. Phase 6-3 atomic replace backup restore 검증 확인

확인된 사실:

- `tests/main/services/luiePackageWriter.rollback.test.ts`는 injected `fs.rename` failure로 atomic replace fallback branch를 강제로 태운다.
- target을 `.bak-*`로 옮긴 뒤 새 target rename이 실패하면 기존 target 내용이 복구되는지 검증한다.
- 같은 테스트 파일은 container write가 atomic replace 전에 실패해도 `.tmp-*`/`.bak-*` debris가 남지 않는지 검증한다.

아키텍처 부합:

- 검증 범위는 main IO boundary의 package writer에 한정되어 있다.
- `.luie` container format, IPC, preload, renderer contract는 변경하지 않았다.
- 하드코딩 정책상 새 cross-process constant나 shared contract가 필요하지 않았다.

검증:

```text
pnpm vitest tests/main/services/luiePackageWriter.rollback.test.ts
```

제한:

- 이 단계는 기존 rollback 테스트를 Phase 6-3 상태 문서에 반영한 것이다.
- corrupted package recovery test는 아직 남아 있다.

### 2026-06-12. Phase 6-3 corrupted package recovery 보강

확인된 사실:

- corrupted `.luie` file을 기존 DB project path로 열면 recovery result가 반환된다.
- 복구 결과는 원본 corrupted file을 덮어쓰지 않고 `.recovered-*` `.luie` file을 만든다.
- 복구된 file은 `probeLuieContainer` 기준 `sqlite-v2`이고 `meta.json`을 다시 읽을 수 있다.
- 복구된 package 주변에 WAL sidecar가 남지 않는지 확인한다.

아키텍처 부합:

- 복구 검증은 main project service와 main IO container 경계 안에서 수행했다.
- `.luie` package format, IPC channel, preload API, renderer contract는 변경하지 않았다.
- 기존 DB state에서 package를 재생성하는 현재 project domain 책임과 부합한다.

검증:

```text
pnpm vitest tests/main/services/projectService.test.ts -t "recovers .luie from db when package is corrupted"
```

제한:

- 이 검증은 targeted main integration test다.
- 실제 앱 restart 직후 renderer UI 안내까지 포함한 E2E는 아직 별도 보강 범위다.

### 2026-06-12. Phase 6-1 실제 `.luie` memory canonical 왕복 검증 보강

확인된 사실:

- canonical memory payload를 실제 sqlite-v2 `.luie` container에 쓴다.
- `memory/canonical.json` entry를 다시 읽어 `LuieMemoryCanonicalSchema`로 parse한다.
- 읽은 payload를 DB에 import한 뒤 `buildMemoryCanonicalPackagePayload`로 rebuild한다.
- rebuild payload와 file에서 읽은 package payload를 비교해 source id mismatch가 0인지 확인한다.

아키텍처 부합:

- 검증은 main memory persistence와 main IO container 경계 안에서 수행했다.
- `.luie` package format, IPC channel, preload API, renderer contract는 변경하지 않았다.
- canonical source id 비교 helper를 그대로 사용해 기존 sync verifier 규칙과 일치시켰다.

검증:

```text
pnpm vitest tests/main/services/memory/persistence/memoryCanonicalPackage.test.ts
```

제한:

- 이 검증은 실제 file IO와 DB import/rebuild를 포함하지만 renderer/UI 조작은 포함하지 않는다.
- source id mismatch 자동 복구는 여전히 하지 않는다.

### 2026-06-12. Phase 7-1 writer task benchmark 계약 1차 완료

확인된 사실:

- writer task benchmark 작업 5종을 코드로 고정했다.
- 작업 5종은 설정 확인, 인물 관계 확인, 떡밥 회수 여부 확인, 회차 기준 지식 상태 확인, 초안/정사 충돌 확인이다.
- 기존 memory eval score result를 task별 성공률, 평균 응답 시간, 근거 만족도, false confidence rate로 요약한다.
- false confidence rate는 근거 없는 확정, unsupported claim, 초안/폐기 확정, 미래 정보 사용, 미회수 떡밥 오판 계열 P0 failure를 기준으로 계산한다.

아키텍처 부합:

- 새 계약은 main memory benchmark domain 내부에 추가했다.
- 기존 eval scoring result를 입력으로 받아 shared/IPC/preload/renderer 계약을 변경하지 않았다.
- 기존 latency benchmark와 같은 benchmark export boundary를 사용한다.

검증:

```text
pnpm vitest tests/main/services/memory/benchmark/memoryWriterTaskBenchmark.test.ts
```

제한:

- 실제 live writer benchmark runner와 DB 저장은 아직 없다.
- 실제 작가 베타 데이터 기반 threshold는 아직 확정하지 않았다.

### 2026-06-12. Phase 7-1 live eval writer task summary 연결

확인된 사실:

- `runLiveMemoryEvalSuite`가 answerer 호출 시간을 case별로 측정한다.
- live eval result에 `writerTaskBenchmark` summary를 포함한다.
- summary는 task별 성공률, 평균 응답 시간, 근거 만족도, false confidence rate를 반환한다.
- renderer/API가 사용하는 `MemoryEvalLiveRunnerResult` shared DTO에 해당 summary contract를 추가했다.

아키텍처 부합:

- live eval result는 이미 shared DTO와 renderer report 경계로 전달되는 값이므로, summary contract를 shared type에 둔 것은 shared의 DTO 역할과 부합한다.
- response time 측정과 summary 계산은 main memory eval/benchmark domain 내부에 유지했다.
- IPC channel/preload API shape는 기존 `runEvalSuite` response envelope를 유지하고, payload DTO만 확장했다.

검증:

```text
pnpm vitest tests/main/services/memory/benchmark/memoryWriterTaskBenchmark.test.ts tests/main/services/memory/eval/memoryEvalRunner.test.ts
pnpm exec eslint src/shared/types/memoryEval.ts src/shared/types/index.ts src/main/services/features/memory/benchmark/memoryWriterTaskBenchmark.ts src/main/services/features/memory/eval/memoryEvalRunner.ts tests/main/services/memory/benchmark/memoryWriterTaskBenchmark.test.ts tests/main/services/memory/eval/memoryEvalRunner.test.ts
pnpm run typecheck
```

제한:

- writer task benchmark summary를 별도 DB row로 저장하지는 않는다.
- 실제 작가 베타 데이터 기반 threshold는 아직 확정하지 않았다.

### 2026-06-13. Phase 7-2 writer feedback 저장 1차 완료

확인된 사실:

- `MemoryEvalFeedback` DB table을 추가했다.
- `recordMemoryEvalFeedback`는 project/run/case/result reference, feedback kind, question, answer, evidence JSON, note, status를 저장한다.
- 현재 feedback kind는 `answer_wrong`과 `evidence_helpful`이다.
- feedback 저장 테스트는 실제 DB insert 후 row를 다시 조회해 검증한다.

아키텍처 부합:

- DB schema 변경은 Drizzle schema, packaged bootstrap SQL, packaged metadata, Drizzle migration SQL을 함께 갱신했다.
- 저장 로직은 main memory eval domain 내부에 두고 renderer/preload를 건드리지 않았다.
- 새 table은 `.luie` canonical memory package format에 포함하지 않았다. 이 단계는 작가 feedback 저장용 운영 데이터이며 package canonical storage 규칙은 변경하지 않았다.

아키텍처 불일치 또는 제한:

- `pnpm vitest tests/main/database/schemaParity.test.ts`는 10개 중 9개가 통과했고, `bootstrap SQL matches generated Drizzle migration schema`만 실패한다.
- 실패 diff는 기존 memory provenance/review/queryChapterOrder/answerJudgeJson 누적 migration-bootstrap 불일치가 남아 있기 때문이다. 이번 변경의 직접 범위인 required table 생성, Drizzle column/index/FK parity는 통과했다.

검증:

```text
pnpm vitest tests/main/services/memory/eval/memoryEvalFeedbackService.test.ts
pnpm vitest tests/main/database/schemaParity.test.ts
pnpm exec eslint src/main/database/schema/memoryEval.ts src/main/services/features/memory/eval/memoryEvalFeedbackService.ts src/main/services/features/memory/eval/index.ts tests/main/services/memory/eval/memoryEvalFeedbackService.test.ts
pnpm run typecheck
pnpm run check:drizzle:main
```

제한:

- renderer UI feedback 버튼과 IPC endpoint는 아직 없다.
- feedback에서 eval case 자동 후보를 생성하지는 않는다.
- rejected answer 재발 방지 guard는 아직 없다.

### 2026-06-13. Phase 7-2 feedback 기반 eval case 후보 생성 1차 완료

확인된 사실:

- `answer_wrong` feedback 저장 시 `createEvalCaseCandidate` 옵션을 주면 `MemoryEvalCase` 후보를 생성한다.
- feedback note는 후보 eval case의 `expectedAnswer`로 저장한다.
- feedback evidence는 `MemoryEvalEvidence`로 저장하고 chunk id, chapter id, quote, offset range를 보존한다.
- 후보 생성이 끝난 feedback row는 `status = eval_case_created`로 갱신된다.

아키텍처 부합:

- 구현은 main memory eval domain의 feedback service 안에 유지했다.
- 기존 eval case/evidence DB table을 재사용해 eval set 반영 경로를 만들었다.
- 새 IPC/preload/renderer contract는 추가하지 않았다.

검증:

```text
pnpm vitest tests/main/services/memory/eval/memoryEvalFeedbackService.test.ts
pnpm exec eslint src/main/services/features/memory/eval/memoryEvalFeedbackService.ts tests/main/services/memory/eval/memoryEvalFeedbackService.test.ts
pnpm run typecheck
```

제한:

- `evidence_helpful` feedback을 eval set 품질 보강 후보로 전환하는 정책은 아직 없다.
- renderer UI feedback 버튼과 IPC endpoint는 아직 없다.
- rejected answer 재발 방지 guard는 아직 없다.

### 2026-06-13. Phase 7-2 rejected answer 재발 방지 guard 1차 완료

확인된 사실:

- `detectRejectedAnswerRecurrence`는 저장된 `answer_wrong` feedback 중 같은 project/question/answer 조합을 찾는다.
- 같은 질문과 같은 답변이 반복되면 `blocked: true`, `reason: repeated_rejected_answer`, feedback id 목록을 반환한다.
- `evidence_helpful` feedback은 rejected answer guard 대상에서 제외된다.
- 같은 질문이라도 수정된 답변이면 차단하지 않는다.

아키텍처 부합:

- guard는 main memory eval domain의 feedback service에 두었다.
- 기존 feedback 저장 table을 재사용하고 새 DB schema를 추가하지 않았다.
- IPC/preload/renderer contract는 아직 변경하지 않았다.

검증:

```text
pnpm vitest tests/main/services/memory/eval/memoryEvalFeedbackService.test.ts
pnpm exec eslint src/main/services/features/memory/eval/memoryEvalFeedbackService.ts tests/main/services/memory/eval/memoryEvalFeedbackService.test.ts
pnpm run typecheck
```

제한:

- guard를 실제 RAG answerer/renderer 차단 경로에 연결하지는 않았다.
- renderer UI feedback 버튼과 IPC endpoint는 아직 없다.

### 2026-06-13. Phase 7-2 writer feedback IPC/preload API 연결 1차 완료

확인된 사실:

- `MEMORY_RECORD_EVAL_FEEDBACK` IPC channel을 추가했다.
- shared `MemoryEvalFeedbackRecordRequest`/`MemoryEvalFeedbackRecordResult` DTO와 `memoryEvalFeedbackRecordSchema` 입력 검증을 추가했다.
- main memory IPC handler는 검증된 feedback payload를 `NarrativeMemoryQueryService.recordEvalFeedback`로 위임한다.
- preload `memoryAdmin.recordEvalFeedback` API와 renderer IO contract를 추가했다.
- IPC contract map에 새 channel의 preload invoke/main handle 사용을 반영했다.

아키텍처 부합:

- channel, DTO, schema는 shared 경계에 두고 main handler는 검증/위임만 수행한다.
- feedback 저장 구현은 기존 main memory eval domain service를 재사용한다.
- renderer는 Node/Electron 직접 접근 없이 preload capability를 통해서만 feedback 저장을 호출할 수 있다.

검증:

```text
pnpm vitest tests/main/handler/ipcInputValidation.memory.test.ts
pnpm vitest tests/main/services/memory/eval/memoryEvalFeedbackService.test.ts
pnpm exec eslint src/shared/ipc/channels.ts src/shared/types/memoryEval.ts src/shared/types/index.ts src/shared/schemas/search.ts src/main/handler/memory/types.ts src/main/handler/memory/ipcMemoryHandlers.ts src/main/services/features/memory/query/narrativeMemoryQueryService.ts src/main/services/features/memory/eval/memoryEvalFeedbackService.ts src/preload/api/projectApi.ts src/shared/api/io.contract.ts tests/main/handler/ipcInputValidation.memory.test.ts tests/main/handler/ipcInputValidation.shared.ts
pnpm run typecheck
pnpm run check:ipc-contract-map
pnpm run check:ipc-handler-schemas
pnpm run check:preload-contract-regression
```

제한:

- renderer UI의 실제 feedback 버튼/상태 표시는 아직 연결하지 않았다.
- rejected answer guard를 실제 RAG answerer/renderer 차단 경로에 연결하지는 않았다.
- `evidence_helpful` feedback을 eval set 품질 보강 후보로 전환하는 정책은 아직 없다.

### 2026-06-13. Phase 7-2 writer feedback UI 버튼 연결 1차 완료

확인된 사실:

- live memory eval result row에 feedback 저장에 필요한 question, answer, retrievedEvidence를 포함했다.
- `AnalysisSection`에 memory eval panel hook/component를 연결했다.
- memory eval result row에 "이 답변 틀림"과 "이 근거 좋음" icon button을 추가했다.
- "이 답변 틀림"은 `answer_wrong` feedback과 eval case 후보 생성 옵션으로 저장된다.
- "이 근거 좋음"은 `evidence_helpful` feedback으로 저장된다.

아키텍처 부합:

- renderer는 preload `memoryAdmin.recordEvalFeedback` capability만 호출하고 main/DB에 직접 접근하지 않는다.
- feedback payload는 shared DTO에 있는 question/answer/evidence shape를 따른다.
- UI 상태와 toast 처리는 analysis memory eval hook 내부에 두고 panel component는 props 기반 presentational component로 유지했다.

검증:

```text
pnpm vitest tests/main/services/memory/eval/memoryEvalRunner.test.ts
pnpm vitest tests/renderer/analysisMemoryEvalReport.test.ts
pnpm vitest tests/main/services/memory/eval/memoryEvalFeedbackService.test.ts tests/main/handler/ipcInputValidation.memory.test.ts
pnpm exec eslint src/shared/types/memoryEval.ts src/main/services/features/memory/eval/memoryEvalScoring.ts src/main/services/features/memory/eval/memoryEvalRunner.ts src/renderer/src/features/research/components/AnalysisSection.tsx src/renderer/src/features/research/components/analysisSection/review/evaluation/useMemoryEvalPanel.ts src/renderer/src/features/research/components/analysisSection/review/evaluation/MemoryEvalReportPanel.tsx src/renderer/src/i18n/locales/ko/base/Analysis.ts src/renderer/src/i18n/locales/en/base/Analysis.ts src/renderer/src/i18n/locales/ja/base/Analysis.ts tests/main/services/memory/eval/memoryEvalRunner.test.ts tests/renderer/analysisMemoryEvalReport.test.ts
pnpm run typecheck
```

제한:

- rejected answer guard를 실제 RAG answerer/renderer 차단 경로에 연결하지는 않았다.
- `evidence_helpful` feedback을 eval set 품질 보강 후보로 전환하는 정책은 아직 없다.
- Electron 화면을 띄운 수동/브라우저 UI 검증은 이번 targeted 검증에 포함하지 않았다.

### 2026-06-13. Phase 7-2 rejected answer guard RAG 결과 연결 1차 완료

확인된 사실:

- RAG final stream payload가 renderer로 전달되기 전에 main RAG guard를 통과한다.
- guard는 `MemoryEvalFeedback`의 저장된 `answer_wrong` feedback과 같은 project/question/answer 조합을 검사한다.
- 반복된 rejected answer는 `safety.label = blocked_p0`, `blocksConfirmedAnswer = true`, `reasons += repeated_rejected_answer`로 반환된다.
- guard 실패 시에는 RAG 완료 이벤트 자체를 깨지 않도록 원본 payload를 전달한다.

아키텍처 부합:

- DB 조회와 feedback guard 판단은 main process service에 유지했다.
- utility process worker에는 DB/memory feedback 의존성을 추가하지 않았다.
- renderer는 기존 RAG stream result의 typed safety envelope를 그대로 소비한다.

검증:

```text
pnpm vitest tests/main/services/ragRejectedAnswerGuard.test.ts tests/main/services/utilityProcessBridgeRejectedAnswerGuard.test.ts tests/main/services/ragGrounding.test.ts tests/main/services/utilityProcessBridgeProtocol.test.ts tests/main/services/memory/eval/memoryEvalFeedbackService.test.ts
pnpm exec eslint src/main/services/features/rag/rejectedAnswerGuard.ts src/main/services/features/rag/grounding.ts src/shared/types/search/rag.ts src/main/services/features/utility/utilityProcessBridge/internal/eventHandlers.ts src/main/services/features/utility/utilityProcessBridge/internal/core.ts tests/main/services/ragRejectedAnswerGuard.test.ts tests/main/services/utilityProcessBridgeRejectedAnswerGuard.test.ts
pnpm run typecheck
```

제한:

- 이미 streaming delta로 표시된 텍스트를 중간에 숨기지는 않는다. 최종 result safety가 차단 상태를 표시한다.
- `evidence_helpful` feedback을 eval set 품질 보강 후보로 전환하는 정책은 아직 없다.

### 2026-06-13. Phase 7-2 helpful evidence feedback eval set 반영 1차 완료

확인된 사실:

- `evidence_helpful` feedback에 기존 eval case id와 evidence가 있으면 `MemoryEvalEvidence` row를 생성한다.
- materialize가 끝난 feedback row는 `status = eval_evidence_created`로 갱신된다.
- 응답 DTO는 생성한 eval evidence 수를 `evalEvidenceCount`로 반환한다.
- feedback row 저장과 evidence materialize는 같은 DB transaction 안에서 처리된다.

아키텍처 부합:

- eval set 보강 정책은 main memory eval domain service 내부에 유지했다.
- shared type에는 cross-process 응답 DTO의 optional count만 추가했다.
- DB schema/package format은 변경하지 않고 기존 `MemoryEvalEvidence` table을 재사용했다.

검증:

```text
pnpm vitest tests/main/services/memory/eval/memoryEvalFeedbackService.test.ts tests/main/handler/ipcInputValidation.memory.test.ts
pnpm exec eslint src/main/services/features/memory/eval/memoryEvalFeedbackService.ts src/shared/types/memoryEval.ts tests/main/services/memory/eval/memoryEvalFeedbackService.test.ts
pnpm run typecheck
```

제한:

- case id가 없는 `evidence_helpful` feedback은 기존처럼 feedback row만 `pending`으로 남긴다.
- evidence 중복 제거 정책은 아직 없다.
- 실제 작가 베타 데이터 기반 threshold는 아직 확정하지 않았다.

### 2026-06-13. Phase 7-1 writer task benchmark summary DB 저장 1차 완료

확인된 사실:

- `MemoryWriterTaskBenchmarkRun` DB table을 추가했다.
- live memory eval runner는 run별 writer task benchmark summary를 aggregate metric과 `summaryJson`으로 저장한다.
- 저장 metric은 schemaVersion, taskCount, caseCount, successRate, averageResponseTimeMs, evidenceSatisfactionRate, falseConfidenceRate, p0FailureCount다.
- benchmark summary row는 `MemoryEvalRun`과 `Project`에 FK로 연결된다.

아키텍처 부합:

- benchmark summary 저장은 main memory eval runner 내부에 유지했다.
- cross-process DTO shape는 기존 `writerTaskBenchmark` response를 유지하고 DB row 저장만 추가했다.
- DB schema 변경은 Drizzle schema, packaged bootstrap SQL, metadata table/required columns, migration SQL을 함께 갱신했다.

아키텍처 불일치 또는 제한:

- `pnpm vitest tests/main/database/schemaParity.test.ts`는 10개 중 9개가 통과했고, `bootstrap SQL matches generated Drizzle migration schema` 1건은 계속 실패한다.
- 실패 diff는 기존 memory provenance/review/queryChapterOrder/answerJudgeJson 누적 migration-bootstrap 불일치가 남아 있기 때문이다. 이번 변경의 직접 범위인 benchmark summary row 저장, Drizzle check, targeted runner test는 통과했다.

검증:

```text
pnpm vitest tests/main/services/memory/benchmark/memoryWriterTaskBenchmark.test.ts tests/main/services/memory/eval/memoryEvalRunner.test.ts tests/main/database/schemaParity.test.ts
pnpm exec eslint src/main/database/schema/memoryEval.ts src/main/database/main/packagedSchema/projectSchema.sql.ts src/main/database/main/packagedSchema/worldAndIndexesSchema.sql.ts src/main/database/packagedSchema/metadataTables.ts src/main/database/packagedSchema/metadataRequiredColumns.ts src/main/services/features/memory/eval/memoryEvalRunner.ts tests/main/services/memory/eval/memoryEvalRunner.test.ts
pnpm run typecheck
pnpm run check:drizzle:main
```

제한:

- 실제 작가 베타 데이터 기반 threshold는 아직 확정하지 않았다.
- benchmark summary JSON의 장기 canonical package 포함 여부는 정하지 않았다. 이번 단계는 DB run artifact 저장으로 제한했다.

### 2026-06-13. Phase 7-1 writer task benchmark threshold calibration gate 1차 완료

확인된 사실:

- `assessMemoryWriterTaskBenchmarkThresholds`를 추가했다.
- beta run sample 수가 `minimumBetaRunCount`보다 적으면 `insufficient_beta_data`를 반환한다.
- beta sample이 충분할 때만 successRate, evidenceSatisfactionRate, falseConfidenceRate, averageResponseTimeMs threshold를 평가한다.
- 현재 repo 안에는 실제 작가 베타 데이터셋이 없어 threshold 값을 확정하지 않았다.

아키텍처 부합:

- threshold 판단은 main memory benchmark domain의 pure policy로 추가했다.
- 실제 데이터가 없을 때 임의 threshold를 확정값처럼 저장하지 않는다.
- DB schema, IPC, preload contract는 변경하지 않았다.

검증:

```text
pnpm vitest tests/main/services/memory/benchmark/memoryWriterTaskBenchmark.test.ts tests/main/services/memory/eval/memoryEvalRunner.test.ts
pnpm exec eslint src/main/services/features/memory/benchmark/memoryWriterTaskBenchmark.ts tests/main/services/memory/benchmark/memoryWriterTaskBenchmark.test.ts
pnpm run typecheck
```

제한:

- 실제 작가 베타 데이터 기반 threshold 값은 아직 확정하지 않았다. 근거가 부족하다.
- gate를 실행하는 CLI/CI 명령은 아직 없다.

### 2026-06-13. Phase 7-1 writer benchmark threshold assessment CLI 1차 완료

확인된 사실:

- `memory:assess-writer-benchmark` script를 추가했다.
- CLI는 persisted `MemoryWriterTaskBenchmarkRun.summaryJson` rows를 읽어 `assessMemoryWriterTaskBenchmarkThresholds`를 실행한다.
- `--minimum-beta-runs`, `--project-id`, `--out`, `--assert-thresholds`를 지원한다.
- 현재 dev DB 기준 beta run count는 0이라 assessment status는 `insufficient_beta_data`다.
- `--assert-thresholds`를 붙이면 `passed`가 아닌 상태에서 non-zero exit로 실패한다.

아키텍처 부합:

- threshold 판단 로직은 main memory benchmark domain pure policy를 재사용한다.
- script는 DB에서 run artifact를 읽는 orchestration만 담당한다.
- 실제 beta 데이터가 없는 상태에서 threshold 값을 확정하지 않는다.

검증:

```text
pnpm vitest tests/scripts/memoryWriterBenchmarkThresholdRunner.test.ts
pnpm exec tsx scripts/assess-memory-writer-benchmark-thresholds.ts --minimum-beta-runs 3
pnpm exec tsx scripts/assess-memory-writer-benchmark-thresholds.ts --minimum-beta-runs 3 --assert-thresholds
pnpm exec eslint scripts/assess-memory-writer-benchmark-thresholds.ts tests/scripts/memoryWriterBenchmarkThresholdRunner.test.ts
pnpm run typecheck
```

제한:

- `--assert-thresholds` 검증은 의도적으로 exit 1을 반환했다. 현재 beta sample이 없어 `insufficient_beta_data`가 맞다.
- 실제 작가 베타 데이터 기반 threshold 값은 아직 확정하지 않았다. 근거가 부족하다.

### 2026-06-13. Phase 6/7 roadmap status surface 1차 완료

확인된 사실:

- `memory:phase-status`가 반환하는 main memory status report에 `roadmapPhases`를 추가했다.
- `roadmapPhases`는 현재 문서 기준 Phase 6 package durability와 Phase 7 writer beta validation의 완료된 범위/남은 범위/아키텍처 부합 여부를 DB readiness 지표와 분리해서 노출한다.
- Phase 6은 package durability targeted coverage가 있으나 renderer/UI package durability E2E와 restart recovery UI notice 검증은 남은 범위로 표시한다.
- Phase 7은 writer benchmark, persisted threshold assessment CLI, feedback loop가 있으나 실제 작가 베타 데이터 기반 threshold calibration은 남은 범위로 표시한다.

아키텍처 부합:

- 상태 리포트는 main memory domain 안에 유지했다.
- script는 기존 `getMemoryPhaseStatusReport` 호출 경로를 유지하며 새 report field만 직렬화한다.
- IPC, preload API, renderer, DB schema, `.luie` package format은 변경하지 않았다.

아키텍처 불일치 또는 제한:

- 기존 `memory:phase-status`의 `phases` 배열은 여전히 오래된 DB readiness 축(`phase1-eval`~`phase9-package-sync`)이다. 이번 변경은 이를 제거하지 않고 `roadmapPhases`를 추가해 현재 Phase 6/7 문서 체계를 별도 surface로 노출했다.
- 실제 작가 베타 데이터 기반 threshold 값은 아직 확정하지 않았다. 근거가 부족하다.

검증:

```text
pnpm vitest tests/main/services/memory/status/memoryPhaseStatusReport.test.ts tests/scripts/memoryPhaseStatusRunner.test.ts
pnpm exec eslint src/main/services/features/memory/status/memoryPhaseStatusReport.ts src/main/services/features/memory/status/index.ts tests/main/services/memory/status/memoryPhaseStatusReport.test.ts tests/scripts/memoryPhaseStatusRunner.test.ts
pnpm run typecheck
pnpm exec tsx scripts/memory-phase-status.ts --out tests/.tmp/memory-phase-status-roadmap.json
rg -n "roadmapPhases|phase6-package-durability|phase7-beta-validation|real writer beta data threshold calibration|renderer/UI package durability E2E" tests/.tmp/memory-phase-status-roadmap.json
```

### 2026-06-13. Phase 6-3 corrupted package recovery UI notice 검증

확인된 사실:

- `App`의 `.luie` open flow가 `project.openLuie`의 `recovery/recoveryReason/recoveryPath` 응답을 `useDataRecoveryStore.setRecoveryState`로 전달하는 DOM 운영 시나리오 테스트를 추가했다.
- corrupted `.luie` open 결과가 `recoveryReason: "corrupt"`와 복구된 `.recovered-*` 계열 path를 renderer recovery notice state로 넘기는 경로를 검증한다.
- Phase 6 roadmap status에서 `restart recovery UI notice verification`을 남은 범위에서 제거하고, `corrupt .luie open recovery notice verification`을 완료 범위로 반영했다.

아키텍처 부합:

- renderer는 기존 preload `project.openLuie` capability 응답만 사용한다.
- Node/Electron 직접 접근, IPC channel 추가, DB schema 변경, `.luie` package format 변경은 없다.
- UI notice state는 기존 renderer workspace store를 사용한다.

아키텍처 불일치 또는 제한:

- 이 검증은 jsdom DOM 운영 시나리오이며, 실제 Electron 앱 restart와 사용자의 실제 클릭을 포함하는 Playwright/E2E는 아니다.
- 실제 renderer/UI 조작까지 포함한 package durability E2E는 추가 보강 대상으로 남아 있다.

검증:

```text
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/dom/appOperationalScenarios.test.tsx -t "surfaces corrupted .luie recovery notice"
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/dom/appOperationalScenarios.test.tsx
pnpm vitest tests/main/services/memory/status/memoryPhaseStatusReport.test.ts tests/scripts/memoryPhaseStatusRunner.test.ts
pnpm exec eslint src/main/services/features/memory/status/memoryPhaseStatusReport.ts src/main/services/features/memory/status/index.ts tests/main/services/memory/status/memoryPhaseStatusReport.test.ts tests/scripts/memoryPhaseStatusRunner.test.ts tests/dom/appOperationalScenarios.test.tsx
pnpm run typecheck
pnpm exec tsx scripts/memory-phase-status.ts --out tests/.tmp/memory-phase-status-roadmap.json
rg -n "corrupt \\.luie open recovery notice verification|restart recovery UI notice verification|renderer/UI package durability E2E" tests/.tmp/memory-phase-status-roadmap.json
```
