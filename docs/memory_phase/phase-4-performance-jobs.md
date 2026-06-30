## Phase 4. 장편 성능과 저사양 최적화

비유: 지금은 단편 원고에서 조수가 잘 찾는지 확인했다. Phase 4는 300화짜리 장편 원고 더미를 저사양 노트북 위에 올려도 조수가 버티는지 보는 단계다.

목표:

- "작은 프로젝트에서는 됨"에서 "장편 작업에서도 쓸 수 있음"으로 올린다.

### Phase 4-1. 대형 프로젝트 benchmark 생성

작업:

- 1천/1만 chunk 규모 테스트 데이터를 만든다.
- 실제 웹소설 구조처럼 회차, 장면, 인물 반복, 설정 변화가 들어가야 한다.

현재 완료 범위:

- `memory:benchmark-seed` 스크립트를 추가했다.
- `ci-1000`, `manual-300ch`, `manual-500ch`, `manual-10000` profile을 고정했다.
- `ci-1000`은 100화, 1천 chunk, 100만 자, low-end profile이다.
- `manual-10000`은 500화, 1만 chunk, 300만 자 profile이다.
- seed 값을 넣으면 같은 benchmark manifest가 재현된다.
- manifest에는 alias 반복, 회차 재정렬, 중간 회차 리라이트, stale embedding, summary refresh, review backlog, renderer list 부하 scenario가 포함된다.
- 실제 확인한 `ci-1000` manifest는 100 chapters, 1000 chunks, 1,000,000 chars, package row estimate 1112였다.
- `materializeMemoryLongformBenchmark`를 추가해 manifest를 실제 `Project`, `Chapter`, `MemoryChunk` row로 적재할 수 있다.
- `memory:benchmark-seed --materialize --project-id <id>` 옵션을 추가했다.
- materializer는 같은 project id를 다시 적용하면 중복 삽입하지 않고 기존 row 수를 반환한다.

아직 남은 범위:

- 1만 chunk profile은 정의됐고, Phase 4-3에서 `manual-10000` latency report 1차 실행까지 완료했다.
- 다만 "장시간" 기준의 반복 실행, p95/p99, cold/warm 비교, 실제 앱 시작 직후 검색 측정은 아직 남아 있다.
- latency/memory usage의 기본 측정과 regression threshold 계약은 Phase 4-2에서 1차 완료했지만, CI artifact 저장과 앱 cold start 연결은 남아 있다.

완료 기준:

- 1천 chunk benchmark: `ci-1000` manifest + DB materialize 테스트 완료
- 1만 chunk benchmark: `manual-10000` profile 정의 + Phase 4-3 latency 1차 실행 완료
- 100화/300화/500화 시뮬레이션: profile 정의 완료
- 100만~300만 자 원고 시뮬레이션: profile 정의 완료
- benchmark seed 재현 가능: 동일 seed manifest equality 테스트 완료
- 남은 계측: 장시간 반복, p95/p99, cold/warm, 실제 앱 시작 직후 검색

#### Phase 4-1a. 기준 장비 정의

작업:

- 저사양 기준을 수치로 정의한다.

기준 장비 후보:

```text
저사양: 4GB RAM, 내장 GPU 없음, 배터리 모드
일반: 8GB RAM, 내장 GPU, 배터리/전원 혼합
상위: 16GB RAM 이상, 전원 연결
```

완료 기준:

- mode별 benchmark profile 정의: low-end/standard/high-end 완료
- CI에서 돌릴 수 있는 경량 profile과 수동 benchmark profile 분리: `ci-1000`과 `manual-*` 분리 완료

#### Phase 4-1b. 실제 장편 작업 데이터셋

작업:

- chunk 수만 늘리지 않고 웹소설 병목을 재현한다.

포함할 병목:

- 인물 이름/별칭 반복
- 회차 재정렬
- 중간 회차 리라이트
- embedding stale 상태
- summary refresh 증가
- review backlog 증가
- renderer list 렌더링 부하

완료 기준:

- 300화/500화 seed: `manual-300ch`, `manual-500ch` profile 정의 완료
- edit-after-index scenario: manifest에 chapterOrders/staleChunkIds 포함
- import/export scenario: manifest에 package row estimate/expected tables 포함

### Phase 4-2. latency budget 설정

작업:

- 작가가 기다릴 수 있는 시간을 기준으로 budget을 정한다.

목표 budget:

```text
일반 근거 검색: 300ms ~ 1s
복합 memory query: 1s ~ 3s
첫 query after app start: 3s 이하 목표
반복 query: 1s 이하 목표
edit-after-index repair: background
대형 repair job: background
package export/import: progress 표시 필수
```

완료 기준:

- query latency 측정: `memory:benchmark-latency`의 `firstChunkSearch`/`repeatedChunkSearch`로 1차 완료
- cold start latency 측정: 실제 앱 cold start와 연결 필요
- first query latency 측정: `firstQueryAfterStartMs <= 3000` budget 계약 및 report 완료
- repeated query latency 측정: `repeatedQueryMs <= 1000` budget 계약 및 report 완료
- edit-after-index latency 측정
- memory usage 측정: RSS/heap/sqlite page cache snapshot 1차 완료
- regression threshold 설정: latency/RSS/heap threshold report 1차 완료

현재 완료:

- `MEMORY_BENCHMARK_LATENCY_BUDGETS`에 작가 체감 기준 latency budget을 코드 계약으로 고정했다.
- `runMemoryBenchmarkLatencyReport`가 materialized benchmark project의 chunk 검색을 측정한다.
- report는 첫 검색, 반복 검색, RSS/heap/sqlite page cache, edit-after-index background 정책, package progress 필수 정책을 함께 반환한다.
- report는 `regressionThresholds`로 first/repeated query, RSS, heap 기준선을 함께 반환한다.
- `memory:benchmark-latency` 스크립트로 `--project-id`, `--profile`, `--materialize`, `--query`, `--out` 기반 측정 리포트를 생성할 수 있다.
- `memory:benchmark-latency --assert-thresholds`는 assessment의 fail 항목을 발견하면 non-zero exit로 실패한다.

남은 작업:

- 실제 앱 cold start 직후 첫 query 측정
- 1만 chunk materialized profile 장시간 측정
- edit-after-index repair job의 background latency 측정
- CI artifact 저장

### Phase 4-3. 검색 최적화

작업:

- FTS, short-token, quote-token, vector search의 비용을 측정한다.
- RRF merge 전에 과한 후보를 줄인다.
- RRF 후보 상한, context budget, top-k, rerank cache TTL을 명시한다.

현재 완료:

- `SearchOptimizationPolicy`를 추가해 low-end/standard/high-end/quality mode를 코드 계약으로 고정했다.
- mode별 result limit, candidate cap, RRF top-k, context budget, rerank cache TTL, vector search mode를 명시했다.
- `searchChunks`는 FTS/short-token/vector 후보 수를 policy candidate cap으로 제한한다.
- RAG context search는 FTS/exact phrase/quote-token/short-token/vector 후보 수를 policy candidate cap으로 제한한다.
- `assembleRagContext`는 policy context budget cap을 사용한다.
- benchmark latency report는 현재 적용된 optimization policy를 함께 반환한다.
- benchmark latency report는 candidate cap 20/40/current baseline의 latency, result count, baseline overlap ratio를 함께 반환한다.
- benchmark latency report는 cache TTL 60초/180초/300초별 예상 entry 수와 예상 memory 사용량을 함께 반환한다.
- vector search는 `MemoryEmbedding.contentHash`와 현재 `MemoryChunk.indexTextHash/contentHash`가 다른 stale embedding을 건너뛴다.
- `manual-10000` profile 기준 500화/10000 chunk/300만 자 materialize와 latency report를 생성했다.
- `memory:run-eval-suite --assert-optimized-recall`로 최적화 후 eval recall/P0 guard를 실행할 수 있다.
- 현재 365개 eval 기준 optimized RAG recall은 0.9972602739726028, P0 failure는 0이다.

완료된 범위:

- candidate cap별 latency/baseline overlap 비교: `ci-1000` 기준 1차 완료
- cache TTL별 memory 사용량 비교: estimated memory comparison 1차 완료
- stale embedding skip 정책 실제 적용 완료
- 1만 chunk 기준 manual latency report 완료
- eval 기반 recall guard: headless Layer 3 evidence retrieval 기준 365 eval 1차 완료

아직 검증 안 된 범위:

- candidate cap별 정답 recall/latency 비교: manual 1만 chunk 기준은 남음
- cache TTL별 memory 사용량 비교: 실제 cache 저장소 hit/miss, entry count, heap delta 계측은 남음
- stale embedding skip count와 skip latency impact report는 남음
- 1만 chunk 데이터셋 자체의 별도 정답 recall 평가는 남음
- 실제 LLM 장문 답변 품질, judge 비용, UI 근거 표시 품질은 남음

검토 기술:

- sqlite FTS5 최적화
- sqlite-vec 사용 범위 제한
- query token cache
- chunk window cache
- top-k rerank cache
- background embedding build
- candidate cap
- context budget cap
- stale embedding skip

완료 기준:

- 1만 chunk 기준 latency report: `manual-10000` CLI report 완료
- top-k recall 유지
- top-k recall 유지: 365 eval 기준 averageContextRecallAtK 0.9972602739726028, P0 0으로 guard 통과
- memory usage report
- candidate cap별 recall/latency 비교: policy 계약, 실제 검색 경로 cap, benchmark comparison report 1차 완료
- cache TTL별 memory 사용량 비교: TTL 계약 및 estimated memory comparison report 1차 완료, 실제 cache 저장소 계측은 남음

### Phase 4-4. 저사양 모드

작업:

- 저사양 기기에서는 비싼 작업을 background로 보낸다.
- 속도를 우선하고, 품질 저하는 명확히 표시한다.

정책:

```text
속도 우선: FTS + lexical + cached rerank
품질 우선: vector + judge + expanded context
저사양 모드: background indexing, lazy summary, bounded top-k
```

현재 완료:

- `memory:benchmark-latency`에서 `--optimization-mode low-end|standard|high-end|quality`를 받을 수 있게 했다.
- latency report는 실제 적용된 `optimizationPolicy`를 반환한다.
- latency report는 `optimizationModeComparison`으로 low-end/standard/high-end/quality의 후보 상한, context budget, rerank cache TTL, vector search mode, lexical 후보 검색 latency, quality baseline overlap을 함께 반환한다.
- latency report는 실제 RAG 검색 경로인 `searchMemoryChunksForRag`와 Layer 3 evidence 조립 경로인 `buildLayer3Evidence`의 p50/p95/max를 함께 반환한다.
- latency report는 `searchMemoryChunksForRag` 내부 stage인 FTS, exact phrase, quote-token, short-token, vector, RRF, hydrate, parent window의 p50/p95/p99/max와 후보 수를 함께 반환한다.
- latency report는 실제 RAG 검색 경로와 Layer 3 evidence 조립 경로의 cold start, warm p50/p95/p99/max를 함께 반환한다.
- latency report는 quality mode synthetic embedding으로 vector branch를 실제 실행하는 `vectorSearchProbe`를 함께 반환한다.
- latency report는 benchmark-local TTL Map으로 동일 query 반복 시 hit/miss, entry count, cached chunk count, heap delta를 측정하는 `rerankCacheProbe`를 함께 반환한다.
- latency report는 alias lookup, temporal marker, rewrite marker, state change 4개 writer-flow query category의 RAG/Layer3 p50/p95/p99/cold-warm을 함께 반환한다.
- `memory:run-eval-suite`에서 `--optimization-mode low-end|standard|high-end|quality`를 받을 수 있게 했다.
- eval suite output은 실제 적용된 `optimizationPolicy`를 함께 저장한다.
- 앱 설정에는 `llm.searchOptimizationMode`가 저장된다.
- analysis panel composer 메뉴에서 Search Mode를 low-end/standard/high-end/quality로 바꿀 수 있다.
- 설정 변경은 main settings IPC를 통해 저장되고, search policy가 읽는 `LUIE_SEARCH_OPTIMIZATION_MODE` runtime env에도 반영된다.
- low-end 메뉴에는 "빠른 검색 · 근거 폭 좁음" 설명을 표시한다.
- `ci-1000` profile 기준 low-end mode 리포트와 threshold assertion을 생성했다.
- 365 eval 기준 low-end/standard/high-end/quality recall guard를 실행했다.
- low-end candidate cap 40에서는 averageContextRecallAtK 0.9698630136986301로 0.98 기준을 통과하지 못했다.
- low-end는 vector search를 lexical hit 때 건너뛰는 대신 candidate cap을 50으로 보정했고, 보정 후 365 eval 기준 guard를 통과했다.
- 확인된 `ci-1000` low-end 수치:

```text
firstChunkSearch: 0.295ms
repeatedChunkSearch: 1.102ms
RSS: 104.828 MiB
heapUsed: 13.95 MiB
optimization mode: low-end
candidateCap: 50
contextBudgetChars: 6144
rerankCacheTtlMs: 300000
vectorSearchMode: skip-when-lexical-hits
threshold: pass
```

RAG path 계측 추가 후 확인된 `ci-1000` low-end 수치:

```text
firstChunkSearch: 0.192ms
repeatedChunkSearch: 0.968ms
searchMemoryChunksForRag: cold 4.195ms, warm p50 2.713ms, warm p95 3.063ms, warm p99 3.063ms, p50 2.942ms, p95 4.195ms, p99 4.195ms, max 4.195ms, resultCount 20
buildLayer3Evidence: cold 2.347ms, warm p50 2.062ms, warm p95 2.141ms, warm p99 2.141ms, p50 2.087ms, p95 2.347ms, p99 2.347ms, max 2.347ms, evidenceCount 10
rerankCacheProbe: ttl 300000ms, queries 5, hits 4, misses 1, entries 1, cachedChunkIds 50, heapDelta 0.081MiB
threshold: pass
```

확인된 `ci-1000` low-end RAG stage breakdown:

```text
fts          | p50 0.001ms | p95 0.010ms | p99 0.010ms | max 0.010ms | candidates 0  | skipped 5
exactPhrase  | p50 0.000ms | p95 0.003ms | p99 0.003ms | max 0.003ms | candidates 0  | skipped 5
quoteToken   | p50 0.000ms | p95 0.001ms | p99 0.001ms | max 0.001ms | candidates 0  | skipped 5
shortToken   | p50 1.618ms | p95 1.668ms | p99 1.668ms | max 1.668ms | candidates 50 | skipped 0
vector       | p50 0.000ms | p95 0.001ms | p99 0.001ms | max 0.001ms | candidates 0  | skipped 5
rrf          | p50 0.016ms | p95 0.100ms | p99 0.100ms | max 0.100ms | candidates 20 | skipped 0
hydrate      | p50 0.190ms | p95 0.241ms | p99 0.241ms | max 0.241ms | candidates 20 | skipped 0
parentWindow | p50 0.575ms | p95 1.012ms | p99 1.012ms | max 1.012ms | candidates 47 | skipped 0
```

확인된 `365 eval` mode별 수치:

```text
low-end  | recall 0.9972602739726028 | P0 0 | candidateCap 50 | context 6144  | vector skip-when-lexical-hits
standard | recall 0.9972602739726028 | P0 0 | candidateCap 50 | context 8192  | vector enabled
high-end | recall 0.9972602739726028 | P0 0 | candidateCap 50 | context 12288 | vector enabled
quality  | recall 0.9972602739726028 | P0 0 | candidateCap 50 | context 16384 | vector enabled
```

구분:

- 이 수치는 `ci-1000` materialized benchmark에서 lexical 후보 검색을 측정한 것이다.
- RAG path 계측은 `LIKE` 단독이 아니라 실제 `searchMemoryChunksForRag`와 `buildLayer3Evidence` 호출 기준이다.
- RAG stage breakdown은 benchmark용 diagnostics이며, 기존 검색 결과 계약은 유지한다.
- 현재 low-end query `"검은 기사"`는 short-token path가 주요 비용이고 FTS/exact phrase/quote-token/vector는 skip됐다.
- `optimizationModeComparison`의 `baselineOverlapRatio`는 quality mode 후보 목록과의 overlap이다.
- 365 eval low-end guard는 headless Layer 3 evidence retrieval 기준이다.
- topK 5 eval에서는 네 mode 모두 candidate cap이 50으로 맞춰지므로, 주된 차이는 context budget과 vector search mode다.
- 실제 LLM 장문 답변 품질, judge 비용, UI 표시 품질은 아직 별도 검증이 필요하다.

남은 작업:

- 별도 Settings 화면에도 동일 toggle을 노출할지 결정한다.
- UI에서 "속도 우선이라 일부 근거가 줄어들 수 있음" 같은 품질 저하 설명을 표시한다.
- background indexing/lazy summary의 실제 job 제어는 Phase 4-5와 연결한다.
- 실제 `searchMemoryChunksForRag`/`buildLayer3Evidence` 전체 경로 p50/p95/p99/max는 1차 완료했다.
- 실제 `searchMemoryChunksForRag`/`buildLayer3Evidence` 전체 경로 cold/warm 분리는 1차 완료했다.
- FTS/exact phrase/quote-token/short-token/vector/RRF stage별 비용 p50/p95/p99/max는 1차 완료했다.
- vector enabled synthetic probe의 stage별 비용 분리는 1차 완료했다.
- 다음은 실제 운영 embedding row와 실제 embedding provider를 쓴 vector enabled 비용을 분리한다.
- cache TTL estimated memory comparison은 추정치다.
- benchmark-local rerank cache hit/miss, entry count, cached chunk count, heap delta 계측은 1차 완료했다.
- 다음은 production cache 저장소가 생겼을 때 실제 cache hit/miss와 eviction을 연결한다.

완료 기준:

- 저사양 모드 토글: analysis panel composer 메뉴 1차 완료
- mode별 latency 비교: CLI benchmark 계약 + actual RAG path/stage p50/p95/p99와 cold/warm 1차 완료
- mode별 recall 비교: 365 eval 기준 low-end/standard/high-end/quality 비교 1차 완료
- mode별 UI 설명: low-end trade-off copy 1차 완료
- cache probe: benchmark-local TTL Map 기준 hit/miss/entry/heap delta 1차 완료

#### Phase 4-4a. 저사양 검색 정책/벤치마크 계약

비유: 작가 노트북이 느릴 때 조수가 큰 서랍을 전부 뒤지는 대신, 먼저 작은 색인 카드함에서 빠르게 찾는 단계다.

완료 범위:

- CLI에서 `--optimization-mode`로 low-end/standard/high-end/quality를 선택한다.
- 리포트에 mode별 후보 상한, context budget, cache TTL, vector search mode를 남긴다.
- `ci-1000` 기준 threshold assertion을 통과한다.
- eval suite에 `--optimization-mode`를 연결해 low-end evidence recall guard를 실행한다.
- low-end candidate cap 40 실패를 확인한 뒤 50으로 보정해 0.98 recall threshold를 통과한다.
- standard/quality도 같은 365 eval set에서 recall threshold를 통과한다.

완료된 범위:

- 실제 RAG 검색/evidence path 전체 비용 계측은 p50/p95/p99/max 기준 1차 완료했다.
- 실제 RAG 검색/evidence path cold/warm 분리 계측은 1차 완료했다.
- FTS/exact phrase/quote-token/short-token/vector/RRF/hydrate/parent window stage별 비용 분리 측정은 p50/p95/p99/max 기준 1차 완료했다.
- low-end/standard/high-end/quality eval 비교는 headless Layer 3 evidence retrieval 기준 1차 완료했다.

아직 검증 안 된 범위:

- mode별 eval 비교를 p50/p95/p99 latency와 함께 저장하는 작업은 남아 있다. 단일 low-end benchmark query의 RAG path p99/cold-warm은 1차 완료했다.
- synthetic embedding 기반 vector enabled probe는 1차 완료했다.
- 실제 운영 embedding row와 실제 embedding provider 기준 vector stage 비용은 아직 대표값으로 검증하지 않았다.
- query category별 cold/warm/p95/p99는 alias lookup, temporal marker, rewrite marker, state change 4종 기준 1차 완료했다.

#### Phase 4-4b. 저사양 앱 토글/UI 설명

비유: 작가가 "오늘은 배터리 모드니까 빠르게 찾아줘"라고 스위치를 켜고, 조수가 "대신 근거 폭은 좁아질 수 있음"이라고 표시하는 단계다.

완료 기준:

- 앱 설정 또는 분석 패널에서 mode를 바꿀 수 있다: analysis panel composer 메뉴 1차 완료
- renderer는 현재 mode와 품질/속도 trade-off를 표시한다: low-end 설명 1차 완료
- main/preload/shared/renderer contract가 같은 mode enum을 사용한다: 완료
- 남은 범위: 별도 Settings 화면 노출 여부 결정, mode 변경 후 이미 실행 중인 RAG run에 대한 적용 시점 안내

#### Phase 4-4c. mode별 writer-flow 검증

비유: 단순히 이름 검색이 빠른지가 아니라, 작가가 "12화 기준으로 이 설정 써도 돼?"라고 물었을 때 저사양 모드도 근거를 놓치지 않는지 보는 단계다.

완료 기준:

- 365 eval 기준 low-end/standard/high-end/quality recall 비교: 1차 완료
- 미래 정보 누수, 초안/폐기 오염, 충돌 후보 질문을 mode별로 비교한다.
- 단일 평균이 아니라 p50/p95/p99/max latency를 함께 저장한다: RAG path 1차 완료
- cold/warm 분리 측정: RAG path 1차 완료
- writer-flow query category별 측정: alias lookup, temporal marker, rewrite marker, state change 4종 1차 완료

### Phase 4-5. background job 제어

작업:

- indexing, embedding, summary refresh, repair job을 background로 보내되 작가가 통제할 수 있게 한다.

용어 구분:

- 현재 `MemoryBuildJob` 구현의 확정 job type은 원고 기억화, summary rebuild, embedding rebuild 계열이다.
- 이 문서의 "repair job"은 넓은 의미의 stale memory 복구 작업을 뜻한다.
- stale evidence repair 전용 queue는 아직 별도 구현이 아니므로, Phase 4-5에서는 "rebuild job 제어"와 "repair 전용 queue"를 구분한다.

필수 기능:

- pause
- resume
- cancel
- progress 저장: 현재는 별도 snapshot 저장이 아니라 DB job status 집계다.
- app restart 후 재개
- 실패 job 재시도 제한

sub agent 객관 리뷰 결과:

- 사실: 현재 구현 위치는 프로젝트 구조와 일관성 있다. `shared/ipc -> main handler -> preload -> shared api contract` 흐름을 따른다.
- 사실: 현재 완료 범위는 "작가가 백그라운드 작업을 완전히 통제한다"가 아니라 "job 상태 전환, IPC/API, Settings progress/control, summary/embedding cooperative cancellation 1차 완료"다.
- 사실: 실행 중 job cancel은 즉시 중단이 아니라 `cancel_requested` 요청 상태로 기록된다. summary/embedding processor 일부 경로는 checkpoint에서 이를 보고 `canceled`로 마무리한다.
- 사실: progress는 아직 DB job status를 매번 집계하는 count 기준이다. 별도 snapshot 저장은 없다. "300화 중 몇 화까지 처리됐는지", "embedding/summary/rebuild 중 무엇이 병목인지"는 아직 알 수 없다.
- 사실: Settings > Model 탭에는 progress 표시와 pause/resume/cancel 버튼이 1차 연결됐다. 실제 작가 flow e2e 테스트는 아직 부족하다.
- 의견: 외부 queue 기술을 새로 넣기보다 기존 SQLite/Drizzle `MemoryBuildJob` queue를 더 단단히 쓰는 쪽이 현재 프로젝트 구조와 맞다.

현재 완료 범위:

- `MemoryBuildJob` 기반 job control service를 추가했다.
- claim 전 작업은 `pauseMemoryBuildJobs`로 `pending/failed -> paused` 전환할 수 있다.
- `resumeMemoryBuildJobs`는 `paused -> pending`으로 되돌린다.
- `cancelMemoryBuildJobs`는 `pending/failed/paused -> canceled`, `running -> cancel_requested`로 전환한다.
- summary/embedding processor는 일부 checkpoint에서 `cancel_requested`를 감지하고 partial write를 피한 뒤 `canceled`로 마무리한다.
- `recoverStaleRunningMemoryBuildJobs`는 app restart 이후 stale running job을 `pending`으로 복구한다.
- `getMemoryBuildJobProgress`는 status별 count, jobType별 count, attention, activeCount, doneCount를 반환한다.
- retry/backoff 정책은 `jobPolicy.ts`에 `MAX_JOB_ATTEMPTS = 5`, 2초 기반 backoff로 일부 존재한다.
- 기존 summary/embedding projector는 `pending/failed`만 claim하므로 `paused/canceled` job은 실행 대상에서 빠진다.
- main IPC는 `memory:pause-build-jobs`, `memory:resume-build-jobs`, `memory:cancel-build-jobs`, `memory:get-build-job-progress`를 검증된 `{ projectId }` payload로 받는다.
- preload `memoryAdmin` API는 `pauseBuildJobs`, `resumeBuildJobs`, `cancelBuildJobs`, `getBuildJobProgress`를 제공한다.
- Settings > Model 탭의 memory rebuild card는 progress와 pause/resume/cancel control을 표시한다.
- active job이 있으면 Settings model tab에서 progress를 다시 조회한다. running/cancel_requested 상태는 2초, 즉시 처리 중이 아닌 active 상태는 5초로 backoff한다.

아직 검증 안 된 범위:

- targetType별 원고 단위 progress는 1차 연결됐다. 개별 chapterId/chunkId 단위 세부 progress는 아직 없다.
- progress snapshot cache는 1초 process memory TTL cache로 1차 연결됐다. app restart 후 유지되는 영구 snapshot은 아니다.
- retry/backoff 상태는 progress UI의 "재시도 가능/재시도 대기/재시도 한도 도달" count와 가장 이른 다음 재시도 예상 시각으로 1차 연결됐다.
- 실행 중인 job에 대한 cooperative cancellation checkpoint는 summary/embedding 일부 경로만 1차 연결됐다.
- production processor 전체에 공통 control service를 연결한 것은 아니다.
- progress는 status/jobType count 기준이다. chunk 단위 세부 진행률은 아직 없다.

완료 기준:

- job 상태 machine 테스트: `MemoryBuildJob` pause/resume/cancel/recover/progress 1차 완료
- IPC/API contract 테스트: pause/resume/cancel/progress 1차 완료
- cancel 후 partial write 없음: pre-claim cancel, summary/embedding checkpoint 1차 완료
- restart 후 progress 복구: stale running -> pending 복구 1차 완료
- Settings progress/control UI: total/done/active/status count, pause/resume/cancel, active polling 1차 완료

#### Phase 4-5-1. Job state machine 계약

비유: 작가가 "지금 원고 분석 잠깐 멈춰", "다시 이어서 해", "아직 시작 안 한 작업은 취소해"라고 말했을 때, 작업 카드의 상태가 정확히 바뀌는 단계다.

상태:

- 완료: `pending/failed -> paused`
- 완료: `paused -> pending`
- 완료: `pending/failed/paused -> canceled`
- 완료: `running -> cancel_requested`
- 완료: stale `running -> pending` 복구

남은 보완:

- 실패 job retry/backoff 정책을 processor 공통 상태 machine과 UI label에 연결한다.
- 상태 전환 reason/error code를 UI에서 설명 가능한 copy로 매핑한다.

#### Phase 4-5-2. IPC/preload/shared API 계약

비유: 작업실 안쪽 엔진의 정지/재개 버튼을 작가 책상 위 버튼까지 배선하는 단계다.

상태:

- 완료: `memory:pause-build-jobs`
- 완료: `memory:resume-build-jobs`
- 완료: `memory:cancel-build-jobs`
- 완료: `memory:get-build-job-progress`
- 완료: preload `memoryAdmin.pauseBuildJobs/resumeBuildJobs/cancelBuildJobs/getBuildJobProgress`
- 완료: IPC input validation test

남은 보완:

- 실패 응답의 사용자 표시 문구를 정리한다.
- Settings 외 영역에서도 같은 control을 보여줄지 결정한다.

#### Phase 4-5-3. processor claim/retry/recover 통합

비유: 작가가 "멈춰"를 누르면 새 심부름꾼은 출발하지 않고, 앱을 껐다 켜도 중간에 길 잃은 심부름 목록을 다시 정리하는 단계다.

상태:

- 1차 완료: 기존 summary/embedding projector가 `pending/failed`만 claim하는 전제와 맞는다.
- 1차 완료: 챕터 수정/전체 memory rebuild enqueue가 기존 `paused/failed` job을 우회해 새 `pending` job을 만들지 않게 했다.
- 1차 완료: `derivedJobWorker.start()`는 시작 시 `dbMaintenanceService.recoverStaleRunningJobs()`를 호출한다.
- 1차 완료: stale running memory job 복구 marker를 `RECOVERED_STALE_RUNNING_JOB`으로 통일했다.
- 1차 완료: chunk/summary/embedding processor의 `pending/failed -> running` claim 조건을 `claimMemoryBuildJob` helper로 중앙화했다.

남은 보완:

- retry limit/backoff는 `jobPolicy.ts`에 일부 존재한다. 남은 작업은 이를 `MemoryBuildJob` 상태 machine, progress 집계, UI label과 일관되게 연결하는 것이다.
- startup recovery 결과를 progress UI에서 작가가 이해할 수 있는 문구로 표시한다.

#### Phase 4-5-4. cooperative cancellation

비유: 이미 자료를 읽고 있는 조수에게 "지금 손에 든 문단까지만 보고 즉시 멈춰"라고 전달하는 단계다.

상태:

- 1차 완료: `running` job cancel 요청은 `cancel_requested`로 기록한다.
- 1차 완료: summary LLM 생성 중 cancel 요청이 들어오면 summary를 쓰지 않고 `canceled`로 마무리한다.
- 1차 완료: embedding provider 호출 전후 checkpoint를 추가했다.
- 제한: 모든 processor loop의 모든 내부 write 지점에 checkpoint가 들어간 것은 아니다.

남은 보완:

- chunk rebuild transaction 내부의 세부 checkpoint는 아직 없다.
- partial write가 생기지 않도록 checkpoint 단위 transaction 경계를 정한다.
- provider 호출이 긴 경우 중간 interrupt가 불가능하므로, 호출 전후 checkpoint와 사용자 안내 문구를 함께 유지한다.

#### Phase 4-5-5. 작가용 progress UI

비유: "기억 엔진이 일하는 중"만 보여주는 게 아니라, "300화 중 184화 요약 중", "임베딩 72%", "충돌 복구 대기 12개"처럼 작가가 기다릴지 멈출지 판단하게 해주는 단계다.

상태:

- 1차 완료: Settings > Model 탭의 memory rebuild 카드에서 전체 job progress를 표시한다.
- 1차 완료: `pending/running/paused/failed/cancel_requested/canceled` count를 작가용 label로 보여준다.
- 1차 완료: Settings에서 pause/resume/cancel 버튼을 호출할 수 있다.
- 제한: 현재 progress는 status count 기준이다.

남은 보완:

- jobType별 진행률을 추가한다.
- chapter/chunk별 진행률을 추가한다.
- progress snapshot cache를 둔다.

#### Phase 4-5-6. writer workflow e2e

비유: 작가가 12화를 고치고, 기억 엔진이 "이 설정 때문에 뒤 회차를 다시 봐야 함"을 감지하고, 작가가 일시정지/재개/취소를 눌러도 원고와 기억이 깨지지 않는지 보는 실전 리허설이다.

상태:

- 미완료: 현재 테스트는 상태 machine/API routing 중심이다.

필수 flow:

- 과거 회차 수정 -> stale memory/summary/embedding 감지
- rebuild/repair job 생성 -> pause -> progress 유지 확인
- resume -> 남은 job 처리
- cancel -> 아직 시작 안 한 job만 canceled
- running cancel 요청 -> 안전한 안내 또는 cooperative cancel
- RAG 질문 -> 취소/재개 이후에도 근거 누락/미래 정보 누수 없음

##### Phase 4-5-6a. 과거 회차 수정 후 rebuild 시나리오

비유: 작가가 12화의 설정을 고쳤더니, 조수가 "이 변경 때문에 13화 이후 기억 카드가 낡았다"고 표시하는 단계다.

테스트 flow:

- 12화 본문 수정
- 관련 chunk/summary/embedding stale 처리 확인
- memory rebuild job 생성 확인
- progress total/active count 증가 확인

완료 기준:

- 회차 수정이 memory job 생성으로 이어지는 DOM 또는 service integration 테스트
- stale 상태가 RAG 답변에서 확정 근거로 오염되지 않는지 검증

##### Phase 4-5-6b. pause/resume 작가 플로우

비유: 작가가 노트북 배터리가 부족해서 "잠깐 멈춰"를 누르고, 나중에 "이어서 해"를 누르는 단계다.

테스트 flow:

- rebuild job 생성
- Settings progress card에서 pause 호출
- pending/failed job이 paused로 남는지 확인
- resume 호출 후 pending으로 돌아오는지 확인
- 이후 processor가 남은 job만 처리하는지 확인

완료 기준:

- renderer hook/component 테스트에서 pause/resume 버튼과 preload API 호출 검증: pause 버튼 pausable-state guard DOM 1차 완료, pause/resume API 호출 flow는 남음
- service 테스트에서 paused job이 processor claim 대상에서 제외됨을 검증

##### Phase 4-5-6c. cancel/cooperative cancel 작가 플로우

비유: 작가가 "이 분석은 필요 없어졌으니 멈춰"를 눌렀을 때, 조수가 이미 공책에 쓰던 문장을 어중간하게 남기지 않는 단계다.

테스트 flow:

- pending/paused job cancel
- running summary job cancel_requested
- running embedding job cancel_requested
- provider 호출 전후 checkpoint에서 canceled 마무리
- cancel 이후 RAG 질문에서 partial summary/embedding이 근거로 섞이지 않음

완료 기준:

- pending/paused cancel은 즉시 `canceled`
- running cancel은 `cancel_requested -> canceled`
- Settings cancel button은 pending/failed/paused/running처럼 실제 취소 가능한 상태가 있을 때만 활성화한다: DOM 1차 완료
- summary/embedding partial write 방지 테스트
- chunk rebuild transaction 내부 checkpoint는 별도 보완 항목으로 유지

##### Phase 4-5-6d. restart recovery 작가 플로우

비유: 앱이 꺼졌다 켜져도 조수가 "어제 하다 만 기억 정리"를 잃어버리지 않고 다시 줄 세우는 단계다.

테스트 flow:

- running job을 stale 상태로 준비
- app startup recovery 호출
- stale running job이 pending으로 복구되는지 확인
- progress UI가 복구된 작업을 작가가 이해할 수 있는 label로 보여주는지 확인

완료 기준:

- `RECOVERED_STALE_RUNNING_JOB` marker 검증
- Settings progress label 검증: RebuildMemoryCard DOM 및 ko/en/ja locale key 1차 완료
- 복구 후 processor claim이 정상 동작하는 integration 테스트

#### Phase 4-5-7. job progress 세분화와 최적화

비유: 지금은 "조수가 일하는 중"만 보인다. 다음은 "요약 담당 30개, 임베딩 담당 120개, 원고 기억화 15개"처럼 어디서 시간이 걸리는지 보는 단계다.

하위 phase:

- Phase 4-5-7a. jobType progress API: 원고 기억화/회차 요약/의미 검색 준비 단위로 병목을 센다.
- Phase 4-5-7b. jobType progress UI: Settings에서 병목을 작가용 label로 표시한다.
- Phase 4-5-7c. retry/cancel attention: 재시도 가능, 재시도 대기, 재시도 한도 도달, 취소 지연, 복구 marker를 따로 센다.
- Phase 4-5-7d. active polling backoff: active 상태와 취소 지연 상태에 따라 polling 간격을 조정한다.
- Phase 4-5-7e. progress snapshot cache: 짧은 TTL cache로 Settings 반복 조회 비용을 줄인다.
- Phase 4-5-7f. targetType progress: 회차/장면/노트/시놉시스/플롯/인물/세력/사건/자료 메모 단위 진행률을 센다.
- Phase 4-5-7g. targetId progress: 개별 회차/장면/노트별로 막힌 대상을 보여준다.
- Phase 4-5-7h. target label 보강: `targetId`를 작가가 읽을 수 있는 제목/순서 label로 바꾼다.
- Phase 4-5-7i. 대형 프로젝트 progress 최적화: top-N SQL 제한, label join 범위 제한, benchmark를 추가한다.

작업:

- progress를 status count에서 jobType count로 확장한다.
- 이후 chapter/chunk 단위 진행률을 추가한다.
- progress snapshot cache를 두어 Settings를 열 때마다 무거운 group query를 반복하지 않게 한다.
- 실패 job retry/backoff와 progress label을 연결한다.

현재 완료 범위:

- `getMemoryBuildJobProgress`가 status별 count에 더해 jobType별 total/active/done/status count를 반환한다.
- Settings memory rebuild card가 jobType별 병목을 작가용 label로 표시한다.
- jobType label은 원고 기억화, 회차 요약, 의미 검색 준비로 구분한다.
- active job이 많은 jobType이 먼저 보이도록 renderer helper에서 정렬한다.
- progress attention이 재시도 가능, 재시도 대기, 재시도 한도 도달, 취소 지연, stale running 복구 count를 반환한다.
- Settings memory rebuild card가 attention 항목과 최근 오류 marker를 작가용 label로 표시한다.
- backoff 중인 failed job이 있으면 `getMemoryBuildJobProgress`가 가장 이른 `nextRetryAt`을 반환하고 Settings memory rebuild card가 다음 재시도 시각을 표시한다.
- Settings polling은 running/cancel_requested/취소 지연 상태에서는 2초, pending/failed/paused만 남은 상태에서는 5초로 backoff한다.
- `getMemoryBuildJobProgress`는 같은 project의 반복 조회를 1초 TTL snapshot cache로 응답한다.
- pause/resume/cancel/claim/recover/finalize처럼 job 상태를 바꾸는 제어 함수는 progress snapshot cache를 무효화한다.
- `getMemoryBuildJobProgress`가 targetType별 total/active/done/status count를 반환한다.
- Settings memory rebuild card가 회차/장면/노트/시놉시스/플롯/인물/세력/사건/자료 메모 단위 진행률을 표시한다.
- `getMemoryBuildJobProgress`가 targetType+targetId별 total/active/done/status count를 반환한다.
- Settings memory rebuild card가 activeCount가 큰 개별 target 상위 5개를 표시한다.
- chapter target은 DB의 chapter order/title을 이용해 `12화 · 제목` 형태 label을 반환한다.
- scene target은 DB의 chapter order와 scene order/title을 이용해 `12화 · 장면 3 · 제목` 형태 label을 반환한다.
- note target은 DB의 note title을 이용해 `노트 · 제목` 형태 label을 반환한다.
- synopsis/plot/scrapMemo target은 DB의 title을 이용해 `시놉시스 · 제목`, `플롯 · 제목`, `자료 메모 · 제목` 형태 label을 반환한다.
- character/faction/event target은 DB의 name을 이용해 `인물 · 이름`, `세력 · 이름`, `사건 · 이름` 형태 label을 반환한다.
- targetId별 개별 progress는 SQL에서 activeCount/total 기준 상위 20개 target을 먼저 고른 뒤, 해당 target만 status breakdown과 label lookup을 수행한다.
- retry/backoff 계산은 processor와 같은 memory projection policy helper를 사용한다.

완료 기준:

- `getMemoryBuildJobProgress`가 jobType별 total/active/done/status count를 반환한다: 1차 완료
- Settings UI가 jobType별 병목을 작가용 label로 표시한다: 1차 완료
- retry/backoff label은 progress UI에 연결한다: 1차 완료
- retry/backoff의 다음 재시도 예상 시각은 progress UI에 연결한다: 1차 완료
- stale running recovery marker는 status가 아니라 attention count로 표시한다: 1차 완료
- 오래 지속되는 `cancel_requested` 상태를 감지한다: 1차 완료
- active polling은 active job이 있을 때만 유지한다.
- progress query 비용이 큰 프로젝트에서도 UI를 막지 않는지 benchmark 또는 unit-level budget을 둔다: 1초 TTL snapshot cache 단위 테스트 1차 완료
- 2초 고정 polling은 active job 상태와 오래 지속되는 `cancel_requested` 상태를 기준으로 backoff한다: 1차 완료
- active job 수가 많을 때 polling interval을 5초/10초로 추가 backoff한다: 1차 완료
- 최근 progress snapshot이 변하지 않으면 running 상태도 5초로 backoff한다: 1차 완료
- chapter/chunk 단위 진행률: targetType별 원고 단위와 targetId별 개별 대상 진행률 1차 완료

남은 범위:

- chapter/scene/note/synopsis/plot/character/faction/event/scrapMemo/chunk target label은 1차 연결됐다.
- snapshot cache는 process memory TTL cache다. app restart 후 유지되는 영구 snapshot은 아니다.
- 실제 대형 project에서 group query 비용 benchmark는 아직 없다.
