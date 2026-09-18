# DB-14 low-end vector search policy 실행 테스트 보고서

## 문서 정보

| 항목             | 값                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------- |
| 테스트 기준      | `database.md` DB-14                                                                |
| 테스트 대상      | `resolveSearchOptimizationPolicy`, `searchHybridChunkRanks`, chunk/RAG callers     |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 결정표, 상태 전이, 회귀 테스트                             |
| 테스트 레벨      | Real DB Search Integration, Policy Unit                                            |
| 실행일           | 2026-09-13 KST                                                                     |
| 기준 HEAD        | `0faf4fad`                                                                         |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, worker별 실제 SQLite DB |

## 변경 계약

- `SearchOptimizationPolicy.vectorSearchMode`를 두 shared search caller에서 `searchHybridChunkRanks`까지 전달한다.
- low-end의 `skip-when-lexical-hits`는 FTS, short-token, RAG exact phrase/quote source 중 하나라도 hit가 있으면 query embedding과 vector SQL을 생략한다.
- low-end라도 lexical source가 모두 비어 있으면 embedding/vector fallback을 실행한다.
- standard/high-end/quality의 `enabled` 동작은 기존 vector/process guard를 유지한다.
- vector stage diagnostic은 policy로 생략된 경우에도 `skipped=true`, candidateCount 0을 기록한다.

## 상태 모델

| 상태 | 설명                                                                      |
| ---- | ------------------------------------------------------------------------- |
| L0   | low-end, utility process, vector extension enabled, exact lexical hit 1개 |
| L1   | lexical 결과로 rank merge, embed call 0, vector diagnostic skipped        |
| F0   | 같은 환경에서 모든 lexical source가 비는 query                            |
| F1   | embed call 1, vector fallback 시도                                        |
| S0   | standard policy                                                           |
| S1   | 기존 result/candidate/context bound와 vector enabled 유지                 |

검증 전이는 `L0 → L1`, `F0 → F1`, `S0 → S1`이다.

## 테스트 케이스

### TC-DB-14-A: low-end lexical hit vector skip

| 항목      | 내용                                                                                         |
| --------- | -------------------------------------------------------------------------------------------- |
| 목적      | 선언된 low-end vector policy가 실제 RAG search executor에서 embedding 호출을 차단하는지 확인 |
| 사전 상태 | 실제 Project/MemoryChunk, utility process env, vector enabled guard, embed spy               |
| 입력      | chunk 전문과 일치하는 exact phrase query                                                     |
| 절차      | `searchMemoryChunksForRag` 실행 후 결과·embed 호출·vector diagnostic 조회                    |
| 기대 결과 | lexical chunk 1위, embed 0회, vector skipped=true/candidateCount=0                           |
| 실제 결과 | 기대 결과와 일치                                                                             |
| 결과      | PASS                                                                                         |

### TC-DB-14-B: low-end lexical miss vector fallback

| 항목      | 내용                                                              |
| --------- | ----------------------------------------------------------------- |
| 목적      | low-end가 lexical miss까지 vector를 무조건 차단하는 회귀 방지     |
| 사전 상태 | TC-DB-14-A와 같은 project/utility/vector 상태                     |
| 입력      | FTS, short-token, exact phrase, quote-token에 존재하지 않는 query |
| 절차      | 동일 embed spy로 두 번째 검색 후 호출 수 확인                     |
| 기대 결과 | embed 누적 1회                                                    |
| 실제 결과 | 기대 결과와 일치                                                  |
| 결과      | PASS                                                              |

### TC-DB-14-C: 기존 policy·검색 회귀

| 항목      | 내용                                                                   |
| --------- | ---------------------------------------------------------------------- |
| 목적      | low-end/standard 숫자 계약과 token normalization, fallback 검색을 유지 |
| 사전 상태 | policy unit fixture와 실제 worker DB                                   |
| 입력      | policy mode별 resolve, Korean token, RAG/search fallback               |
| 기대 결과 | 기존 cap/context/vector mode와 검색 결과 통과                          |
| 실제 결과 | 기대 결과와 일치                                                       |
| 결과      | PASS                                                                   |

## 실행 기록

### 실제 DB 검색·policy 회귀

```sh
pnpm exec vitest run \
  tests/main/services/rag/contextAssemblerSearch.test.ts \
  tests/main/services/search/searchOptimizationPolicy.test.ts \
  tests/main/services/search/chunkSearchTokens.test.ts \
  tests/main/services/searchServiceFallback.test.ts
```

상태: 실제 worker별 SQLite Project/MemoryChunk를 사용했다. low-end 케이스에서 `LUIE_SEARCH_OPTIMIZATION_MODE=low-end`, `LUIE_IS_UTILITY_PROCESS=1`을 설정하고 vector extension enabled guard를 spy로 고정했다. 각 env와 spy는 `finally`에서 원상 복구했다. embed provider는 호출 여부만 관찰하는 deterministic vector fixture였다.

결과: **4 files passed, 10 tests passed**.

### 정적 검사

```sh
pnpm exec eslint \
  src/main/services/features/search/chunkSearch.ts \
  src/main/services/features/search/chunkOperations.ts \
  src/main/services/features/rag/internal/contextAssembler.search.ts \
  tests/main/services/rag/contextAssemblerSearch.test.ts
```

결과: **PASS, lint error 0개**.

```sh
git diff --check
```

결과: **PASS**.

```sh
pnpm run typecheck
```

결과: **BLOCKED by pre-existing unrelated error**.

```text
src/renderer/src/features/manuscript/components/Sidebar.tsx(157,5):
TS6133: 'handleRenameProject' is declared but its value is never read.
```

이번 DB-14 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

## 판정과 잔여 범위

- low-end lexical hit skip과 lexical miss fallback이 실제 executor에서 확인되어 DB-14를 PASS로 판정한다.
- policy 명칭과 감사 기준에 따라 “lexical source 1개 이상”을 skip 기준으로 사용했다. ranking 품질의 대규모 corpus 평가는 이번 기능 연결 테스트 범위가 아니다.
- `rerankCacheTtlMs` runtime cache는 DB-14의 vector skip 요구와 독립이며 이번 변경에 포함하지 않았다.
