# DB-08 memory chunk·embedding 보존 테스트 보고서

## 문서 정보

| 항목             | 값                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------- |
| 테스트 기준      | `database.md` DB-08                                                                |
| 테스트 대상      | `MemoryProjectionService.processPendingChunkJobs`                                  |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 상태 전이, 동등 분할, 데이터 무결성                        |
| 테스트 레벨      | Real DB Integration, Embedding Unit Regression                                     |
| 실행일           | 2026-09-13 KST                                                                     |
| 기준 HEAD        | `0faf4fad`                                                                         |
| 환경             | Darwin arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, worker별 실제 SQLite DB |

## 변경 계약

- 새 chunk의 `contentHash + indexTextHash`와 같은 기존 chunk를 순서대로 재사용한다.
- `indexTextHash`에는 title 기반 context label이 포함되므로 본문이 같아도 검색 문맥이 바뀌면 새 chunk로 교체한다.
- 재사용 chunk는 ID와 `createdAt`을 유지하고 source hash, offset, paragraph range, index를 최신 값으로 갱신한다.
- 새 chunkIndex 적용 전 기존 index를 임시 음수 영역으로 옮겨 unique constraint 충돌을 피한다.
- 재사용되지 않은 chunk만 삭제한다. 연결된 embedding은 기존 FK cascade로 해당 chunk에 대해서만 제거된다.
- source FTS row는 현재 source 단위로 다시 만들며 raw chunk ID 보존과 embedding 유지 의미를 바꾸지 않는다.

## 상태 모델

| 상태 | 설명                                                           |
| ---- | -------------------------------------------------------------- |
| C0   | source chunk와 각 chunk embedding이 존재                       |
| C1   | 동일 source content로 rebuild job 실행                         |
| C2   | 모든 chunk ID와 embedding이 C0와 동일                          |
| P1   | source 일부 문단만 변경해 rebuild job 실행                     |
| P2   | 동일 hash chunk ID/embedding 유지, 변경 chunk/embedding만 교체 |

검증 전이는 `C0 → C1 → C2 → P1 → P2`이다.

## 테스트 케이스

### TC-DB-08-A: 동일 본문 rebuild

| 항목      | 내용                                                                      |
| --------- | ------------------------------------------------------------------------- |
| 목적      | 명시적 rebuild가 불변 chunk와 embedding을 삭제하지 않는지 확인            |
| 사전 상태 | 2개 이상 chunk가 생성된 chapter, 각 chunk에 실제 MemoryEmbedding row 존재 |
| 입력      | DB content 변경 없이 `enqueueChapterChunkRebuild`                         |
| 절차      | rebuild 처리 → chunk ID 집합과 embedding row 수 비교                      |
| 기대 결과 | chunk ID 집합 동일, embedding 수 동일                                     |
| 실제 결과 | 기대 결과와 일치                                                          |
| 결과      | PASS                                                                      |

### TC-DB-08-B: 일부 문단 변경

| 항목      | 내용                                                                                     |
| --------- | ---------------------------------------------------------------------------------------- |
| 목적      | 불변 chunk만 재사용하고 변경 chunk만 교체하는지 확인                                     |
| 사전 상태 | TC-DB-08-A 완료, 첫 문단 A와 두 번째 문단 B가 별도 chunk 경계를 형성                     |
| 입력      | 첫 문단 A 유지, 두 번째 문단 B를 같은 길이의 C로 변경                                    |
| 절차      | chapter update → chunk job 처리 → hash/ID/embedding FK 상태 비교                         |
| 기대 결과 | A chunk ID와 embedding 유지, 적어도 한 B chunk ID 제거, 남은 embedding은 현 chunk만 참조 |
| 실제 결과 | 기대 결과와 일치                                                                         |
| 결과      | PASS                                                                                     |

## 실행 기록

### 실제 DB 통합 테스트

```sh
pnpm exec vitest run tests/main/services/memoryProjectionService.test.ts
```

상태: worker별 실제 SQLite DB를 사용하고 700자 문단 2개로 다중 chunk 경계를 만들었다. 1차 projection 뒤 실제 embedding row를 넣고 동일/부분 변경 rebuild를 순서대로 실행했다. 사용자 DB와 외부 embedding API는 사용하지 않았다.

결과: **1 file passed, 11 tests passed**.

초기 실행에서는 기존 공용 `tests/setup.ts` Electron mock에 default export가 없어 memory/search import가 중단됐다. named/default export가 같은 `app`, `nativeTheme`, `BrowserWindow` stub을 공유하도록 수정한 뒤 전체 memory projection file이 통과했다.

### embedding projector 단위 회귀

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run tests/main/services/embeddingProjector.test.ts
```

상태: 이 file은 DB module을 자체 mock하는 비DB 단위 테스트이므로 지침에 따라 공용 실제 DB setup을 생략했다.

결과: **1 file passed, 2 tests passed**.

### 정적 검사

```sh
pnpm exec eslint \
  src/main/services/features/memory/memoryProjectionService.ts \
  tests/main/services/memoryProjectionService.test.ts \
  tests/setup.ts
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

이번 DB-08 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

## 판정과 잔여 범위

- 동일/부분 변경에서 chunk와 embedding 보존 계약이 확인되어 DB-08을 PASS로 판정한다.
- chunk 경계 앞부분의 길이가 달라져 뒤 chunk 내용까지 바뀌면 hash가 달라진 chunk는 교체된다. 의미 기반 유사 chunk 매칭은 수행하지 않는다.
- source FTS row의 증분 보존과 실제 embedding API 비용 감소량은 이번 범위에서 측정하지 않았다.
