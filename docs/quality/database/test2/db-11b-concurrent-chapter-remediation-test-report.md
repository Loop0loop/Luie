# DB-11B sync 중 동일 chapter 저장 경쟁 보정 보고서

## 현재 판정

- [X] **PASS — optimistic concurrency 사전조건·최신 local 재merge 완료**
- 기준일: 2026-09-14 KST
- 기준 HEAD: `b76d6f0e` 위 기존 미커밋 작업 트리

## Why 분석

### 실패 전이

1. 마지막 sync baseline은 chapter A다.
2. sync가 local bundle A를 수집하고 remote fetch를 기다린다.
3. 사용자가 같은 chapter를 B로 저장하고 DB와 `.luie` export를 완료한다.
4. remote에서 A를 기준으로 수정된 C가 도착한다.
5. merge는 이미 수집한 local A만 보므로 local 변경을 감지하지 못하고 remote C를 winner로 만든다.
6. local apply transaction은 현재 DB B를 읽어 snapshot A와 비교하지 않고 C를 upsert한다.
7. authoritative exporter는 이미 C로 덮인 DB를 정확히 내보내므로 최종 DB/package는 C, conflict는 0이다.

### 근본 원인

merge 판단과 DB write 사이에 **optimistic concurrency precondition**이 없다. `updatedAt` baseline conflict 규칙은 입력 local bundle이 최신일 때만 유효하지만, executor는 그 전제를 검증하지 않는다. authoritative export는 apply 이후 상태를 보장할 뿐 apply가 B를 지워도 이를 판별할 수 없다.

### 선택한 수정 계약

- executor는 첫 local snapshot A를 merge 근거로 유지한다.
- local apply transaction은 변경하려는 chapter의 현재 canonical `ChapterBody`와 metadata를 A와 비교한다.
- 현재 값이 A와 다르면 transaction에서 어떤 sync row도 쓰거나 export하지 않고 `local-changed` 결과를 반환한다.
- executor는 local bundle을 한 번 다시 수집해 같은 remote bundle과 기존 baseline/conflict resolution으로 merge한다.
- B와 C가 모두 baseline A 이후 변경이면 기존 `SYNC_CONFLICT_DETECTED`와 conflict item을 반환하고 DB/package B를 보존한다.
- 재수집 뒤 apply 직전에도 값이 다시 바뀌면 무한 retry하지 않고 명시적 stale 오류로 종료한다. 다음 sync에서 재시도할 수 있고 사용자 본문은 덮지 않는다.

별도 lock manager나 새 revision table은 추가하지 않는다. 기존 transaction, local bundle, chapter conflict 판정으로 해결한다.

## 외부 근거와 적용 범위

- [Scrivener 3 User Manual for macOS](https://www.literatureandlatte.com/docs/Scrivener_Manual-Mac.pdf) §14.2의 sync conflict 처리는 충돌한 내용을 별도 copy로 보존해 사용자가 비교하게 한다. Luie는 기존 conflict item·manual resolution 모델을 유지하고 stale local 편집도 그 입력으로 다시 넣는다.
- [Literature and Latte의 iOS sync 안내](https://scrivener.tenderapp.com/help/kb/ios/dropbox-syncing-with-ios)도 같은 문서를 두 장치에서 수정하면 어느 쪽도 자동 삭제하지 않고 `Conflicts` 폴더의 두 version을 사용자가 비교하게 한다고 설명한다.
- [SQLite Isolation](https://www.sqlite.org/isolation.html)은 transaction이 serializable하며 같은 connection의 `SELECT`가 그보다 먼저 완료된 변경을 본다고 설명한다. Luie는 비교와 write를 같은 동기 transaction에 두어 검사 뒤 다른 main write가 끼어드는 await 경계를 만들지 않는다.
- 외부 구현을 복제하지 않고 “양쪽 변경을 조용히 폐기하지 않는다”와 “검사·write를 한 transaction snapshot에서 수행한다”는 원칙만 적용한다.

## ISTQB 테스트 설계

설계 기법은 상태 전이, 결정표, 오류 추정, 회귀 테스트다.

| 상태 | 설명 |
| --- | --- |
| S0 | baseline/local/remote가 A, revision current |
| S1 | sync local snapshot=A |
| S2 | 사용자 저장 완료: canonical DB/package=B |
| S3 | remote C 도착, 첫 merge는 A 기준으로 C 선택 |
| S4 | apply transaction이 current B≠snapshot A 감지, write 0 |
| S5 | local B 재수집, B와 C를 baseline A 기준 재merge |
| OK | conflict 1, DB/package B, remote upsert 0, revision current |
| BAD | conflict 0, DB/package C 또는 B가 conflict copy 없이 소실 |

| 조건 | 기대 결과 |
| --- | --- |
| current DB가 snapshot과 같음 | 기존 delta apply·authoritative export 진행 |
| current body만 snapshot과 다름 | stale 감지, 전체 transaction write·export 금지 |
| current metadata만 snapshot과 다름 | 동일하게 stale 감지 |
| stale 뒤 재수집한 B와 remote C가 baseline 이후 변경 | 기존 chapter conflict 반환 |
| 재수집 뒤 두 번째 stale | `SYNC_LOCAL_SNAPSHOT_STALE` 실패, 본문 보존 |
| unrelated remote character + current chapter B | chapter가 delta가 아니므로 기존 DB-11 authoritative export 동작 유지 |

### 진입 기준

- `SKIP_DB_TEST_SETUP` 없이 worker별 실제 main/cache SQLite와 실제 OS 임시 `.luie`를 사용한다.
- local snapshot A fixture와 canonical DB/package B를 만들어 snapshot 이후 저장 완료 상태를 고정한다.
- actual applier 호출 전 B의 revision을 완료 상태로 표시하고, 호출 뒤 그 값이 변하지 않는지 비교한다.
- remote bundle은 같은 chapter의 C와 A보다 최신 `updatedAt`을 가진다.

### 통과 조건

- 첫 apply 시 DB write, package export, remote upsert가 발생하지 않는다.
- 재수집 후 conflict summary는 `chapters=1`, `total=1`, ID/project/local B/remote C 근거를 가진다.
- 최종 `ChapterBody`와 `.luie` chapter entry는 B다.
- conflict 경로가 sync success baseline이나 `lastSyncedAt`을 갱신하지 않는다.
- 기존 remote character-only 경쟁 회귀와 DB-11A world deletion 회귀가 유지된다.

### 성능 판정

DB-11B는 P1 정확성 결함이다. p95/p99를 기능 통과 기준으로 사용하지 않는다. 추가 비용은 pulled chapter당 transaction 내부 point read와 stale 시 local bundle 재수집 1회다. 테스트 duration은 회귀 비용으로 기록하고 실제 사용자 규모 sync p95/p99로 해석하지 않는다.

## 실행 환경과 결과

### RED 근거

2026-09-14 QA가 보정 전 코드에서 실제 임시 DB·`.luie`로 다음 상태를 재현했다.

| 입력 상태 | 보정 전 실제 결과 |
| --- | --- |
| sync snapshot=A, 현재 local DB/package=B, remote chapter=C | DB=C, package=C |
| merge·완료 상태 | conflicts=0, `revision=exportedRevision=6` |

즉, export 자체는 최신 DB를 정확히 기록했지만 그 전에 stale merge가 B를 C로 덮었다. 영구 회귀는 이 순서를 실제 applier 및 executor 경계에 고정했다.

### 구현 결과

- `syncBundleApplier`는 incoming chapter ID에 한해 현재 `Chapter` metadata와 canonical `ChapterBody`를 local snapshot과 같은 transaction에서 비교한다.
- 차이가 있으면 다른 sync row를 쓰기 전에 `{ status: "local-changed" }`를 반환하므로 DB write, package export, revision 완료가 발생하지 않는다.
- `syncRunExecutor`는 local bundle을 한 번 다시 만들고 같은 remote bundle·baseline·resolution으로 merge한다. B와 C가 모두 A 이후 변경이면 기존 chapter conflict를 반환한다.
- 두 번째 apply도 stale이면 `SYNC_LOCAL_SNAPSHOT_STALE:<chapterIds>`로 종료한다. retry는 1회로 제한해 경쟁이 계속될 때 무한 loop와 remote upload를 막는다.

### TC-DB-11B-01 — 실제 DB·filesystem 사전조건

| 항목 | 명세 및 결과 |
| --- | --- |
| 테스트 레벨 | Real DB·Filesystem Integration |
| 사전 상태 | worker 전용 main/cache SQLite, 실제 임시 `.luie`, chapter A 생성 후 canonical `ChapterBody`와 package를 B로 저장, revision 완료 |
| 입력 | incoming chapter C, local snapshot A |
| 동작 | production `applyMergedBundleToLocalFirstLuie()` 호출 |
| 기대 | body 또는 metadata가 다르면 `local-changed`; DB/package/revision 불변 |
| 실제 | body B 조건과 metadata title 불일치 조건 모두 `local-changed`; DB body B, package B, revision 상태 불변 |
| 판정 | PASS |

명령:

```sh
pnpm exec vitest run tests/main/services/syncStalePackageRevision.test.ts --reporter=verbose
```

결과: **1 file, 1 test PASS**, test 47 ms, 전체 587 ms. 한 test 안에서 unrelated character authoritative export, DB 재연결, body stale 거부, metadata stale 거부를 순서대로 검사했다.

### TC-DB-11B-02 — executor 재merge와 conflict

| 항목 | 명세 및 결과 |
| --- | --- |
| 테스트 레벨 | Component Integration; settings·remote repository mock |
| 상태 전이 | local A 수집 → remote C → apply가 `local-changed` → local B 재수집 → B/C 재merge |
| 기대 | `SYNC_CONFLICT_DETECTED`, chapters/total=1, preview B/C, apply 1회, remote upload 0회 |
| 실제 | 기대값 전부 일치 |
| 판정 | PASS |

### TC-DB-11B-03 — 두 번째 stale 경계

| 항목 | 명세 및 결과 |
| --- | --- |
| 상태 전이 | 첫 apply stale → 재수집 → 두 번째 apply도 stale |
| 기대 | `SYNC_LOCAL_SNAPSHOT_STALE:chapter-1`, local build/apply 각 2회, remote upload 0회, 실패 기록 1회 |
| 실제 | 기대값 전부 일치 |
| 판정 | PASS |

명령:

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run tests/main/services/syncRunExecutor.concurrentChapter.test.ts --reporter=verbose
```

결과: **1 file, 2 tests PASS**, 각 7 ms·1 ms, 전체 283 ms. `SKIP_DB_TEST_SETUP=1`은 이 두 executor component test에만 사용했고 실제 DB 검증에는 사용하지 않았다.

### 관련 회귀 범위

```sh
pnpm exec vitest run \
  tests/main/services/syncStalePackageRevision.test.ts \
  tests/main/services/syncWorldDeletionPersistence.test.ts \
  tests/main/services/syncBundleApplier.commitOrder.test.ts \
  tests/main/services/syncLocalApply.test.ts \
  tests/main/services/syncBundleHelpers.chapterBody.test.ts \
  tests/main/services/projectExportEngine.test.ts --reporter=dot
```

결과: **6 files, 22 tests PASS**, 전체 929 ms. DB-11A world tombstone, DB apply/export 순서, canonical body 수집, authoritative export를 함께 검증했다.

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run \
  tests/main/services/syncRunExecutor.concurrentChapter.test.ts \
  tests/main/services/syncService.test.ts \
  tests/main/services/syncMapper.test.ts \
  tests/main/services/syncDelta.test.ts --reporter=dot
```

결과: **4 files, 30 tests PASS**, 전체 924 ms. remote HTTP는 synthetic bundle과 repository mock으로 대체했다.

### 정적 검증과 기존 실패

| 검사 | 결과 |
| --- | --- |
| `pnpm run build` | PASS |
| 변경 제품 코드·새 테스트 ESLint | PASS |
| `pnpm run check:core-complexity` | PASS; 기존 `GoogleDocsLayout` advisory 2건 |
| `pnpm run typecheck` | FAIL; 기존 `Sidebar.tsx:157` TS6133 1건 |
| `pnpm run check:source-loc` | FAIL; 전체 24건. 기존 초과 파일 `syncService.test.ts`에 mock 반환 계약 1줄이 추가되어 1326줄 |
| `pnpm run check:persist-contracts` | FAIL; 기존 `graphStore.ts` option 누락 1건 |
| `pnpm run check:main-service-boundaries` | FAIL; 기존 `autoSaveMirrorStore.ts:196` legacy import 1건 |
| `git diff --check` | PASS |

`syncService.test.ts` 전체 ESLint는 기존 `consistent-type-imports` 3건과 `no-await-in-loop` 7건으로 실패했다. 이번에 추가한 한 줄과 새 executor test에서는 새 ESLint 오류가 없다.

### 환경

| 항목 | 값 |
| --- | --- |
| OS | macOS Darwin 25.6.0 arm64 |
| Node.js | v22.23.0 |
| pnpm | 12.3.4 |
| Vitest | 5.0.0 |
| better-sqlite3 | 13.0.3 |
| SQLite | 3.53.4 |
| 파일 환경 | `tests/setup.ts` worker별 임시 main/cache DB, OS 임시 `.luie` |

### 성능 해석과 제한

- 이 결함의 통과 기준은 p95/p99가 아니라 본문 불손실과 write-before-check 금지다. 단일·2회 test duration은 성능 percentile이 아니며 p95/p99는 **N/A**다.
- 정상 incoming chapter마다 transaction 안에서 `Chapter`와 `ChapterBody` point read가 각각 1회 추가된다. stale 때만 local bundle 재수집을 최대 1회 수행한다.
- 실제 Supabase HTTP, packaged Electron, 다중 process의 장시간 편집 경쟁, 사용자 규모 sync p50/p95/p99는 실행하지 않았다.
- 이번 영구 회귀는 active remote chapter C와 local edit B의 경쟁을 다룬다. remote chapter tombstone과 동시 local edit의 product conflict 계약은 별도 검증이 필요하다.

## 최종 판정

- [X] 보정 전 `A → B/C` 무충돌 덮어쓰기 원인을 optimistic concurrency 사전조건 부재로 확정했다.
- [X] 실제 DB·`.luie`에서 body·metadata stale를 write/export 전에 거부했다.
- [X] 최신 B 재merge가 기존 conflict item을 만들고 두 번째 경쟁은 bounded failure로 끝남을 확인했다.
- [X] DB-11A 및 관련 sync/export 회귀를 통과했다.

DB-11B의 명시 범위는 완료한다. 이 보고서 작성 당시 DB-04B·DB-06B·DB-12B가 남았으며, 현행 전체 판정은 SSoT와 `implementation-todo.md`를 따른다.
