# DB-11 동기화 row delta 테스트 보고서

## 최신 판정 — PASS (2026-09-13 보정)

sync의 package 저장을 기존 `ProjectExportQueue`의 authoritative DB export로 전환했다. 실제 임시 DB·`.luie`에서 stale A + local B + remote character delta를 실행하고 DB/package B 및 revision 완료 상태를 확인했다. 후속 world 삭제와 동일 chapter 경쟁 보정은 [DB-11A](test2/db-11a-world-deletion-remediation-test-report.md), [DB-11B](test2/db-11b-concurrent-chapter-remediation-test-report.md)를 기준으로 한다.

## 이전 재개 근거 — 2026-09-13 QA 재검토

아래 내용은 보정 전 결함과 당시 실행 이력이다.

- 발생 순서: sync가 chapter 본문 A를 local snapshot에 수집한 뒤 fetch를 기다리는 동안 로컬 본문 B의 DB 저장과 package flush가 끝난다. 원격에서는 같은 프로젝트의 character만 바뀐다. `localDelta`에는 character만 포함되지만 전체 merged `packageBundle`에는 이전 본문 A가 남는다.
- 소스 근거: [syncRunExecutor.ts](../../../src/main/services/features/sync/syncRunExecutor.ts)는 원격 fetch와 local 수집을 병렬 실행하고 snapshot 이후 revision 검증 없이 delta를 전달한다. [syncBundleApplier.ts](../../../src/main/services/features/sync/syncBundleApplier.ts)는 delta만 DB에 반영한 후 B를 포함한 현재 revision을 캡처하고, package에는 기존 merged bundle을 전달한다. [syncPackagePersistence.ts](../../../src/main/services/features/sync/syncPackagePersistence.ts)는 그 bundle의 본문 A를 작성한 뒤 캡처한 revision을 완료 처리한다. [projectRevisionStore.ts](../../../src/main/services/core/project/projectRevisionStore.ts)의 `markProjectExported`는 revision 숫자 범위를 검사하며 package 본문과 DB의 일치를 검사하지 않는다.
- 격리 계약 재현: 실제 delta 계산·applier를 사용하고 DB/persistence 경계를 mock해 실행했다. `liveBody="B"`, `submittedPackageBody="A"`, `capturedRevision=12`, 현재 revision `12`를 확인했다. 서로 다른 본문에 동일한 최신 revision이 연결되는 계약 결함을 재현한 결과이며, 실제 `.luie` 파일의 stale write 또는 실제 DB의 완료 mark를 종단 실행한 결과는 아니다.
- 영향·보호 범위: 이후 편집이 없으면 package 작성 성공 뒤 `exportedRevision`이 현재 revision과 같아져 startup stale recovery가 필요 상태를 발견하지 못하는 경로다. 로컬 B의 package flush를 sync apply 전에 끝낸 조건에서는 기존 export queue의 후속 실행도 보호 근거가 되지 않는다.
- 테스트 공백: [syncBundleApplier.commitOrder.test.ts](../../../tests/main/services/syncBundleApplier.commitOrder.test.ts)는 delta apply와 전체 merged payload 전달을 검증하지만 snapshot 이후 로컬 본문 변경을 넣지 않는다. 이 테스트의 PASS는 payload 최신성을 증명하지 않는다.
- 최소 수정·후속 검증: local snapshot revision이 apply 시점에도 유효한지 검사하고, 달라졌으면 최신 상태로 merge를 다시 수행해야 한다. delta 적용 뒤 package를 authoritative DB에서 구성하는 방안도 검토하되 변경 row의 stale overwrite까지 별도로 막아야 한다. 원격 fetch를 제어한 실제 임시 DB·`.luie` 통합 테스트로 A 수집 → B 저장·flush → 원격 character 변경 → sync 완료 순서를 실행하고, DB/package 본문 B 유지 및 revision 일치를 확인한 뒤 재시작 recovery 결과까지 검증해야 한다.

## 문서 정보

| 항목             | 값                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| 테스트 기준      | `database.md` DB-11                                                                                    |
| 테스트 대상      | `syncDelta`, `syncRunExecutor`, `syncBundleApplier`, `syncLocalApply`, `syncService`, `syncRepository` |
| 테스트 설계 기법 | ISTQB 명세 기반 테스트, 동등 분할, 경곗값 분석, 상태 전이, 오류 추정                                   |
| 테스트 레벨      | Unit / Component Integration / Real DB Integration                                                     |
| 실행일           | 2026-09-13 KST                                                                                         |
| 기준 HEAD        | `0faf4fad`                                                                                             |
| 환경             | Darwin 25.6.0 arm64, Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0, worker별 임시 SQLite·mock HTTP       |

## 구현 계약

- merge 결과를 local bundle과 비교한 `localDelta`를 local DB apply에 전달하고, `.luie` 구성에는 영향 프로젝트의 전체 merged `packageBundle`을 별도로 전달한다. snapshot 이후 로컬 편집과의 최신성 계약은 위 REOPEN 사유에 해당한다.
- merge 결과를 remote bundle과 비교한 `remoteDelta`만 원격 upsert에 전달한다.
- row가 새로 생겼거나 `updatedAt`이 다르면 hash 계산 없이 변경 row로 판정한다.
- `updatedAt`이 같으면 key 순서를 정규화한 JSON의 SHA-256을 비교해 시각 갱신이 누락된 내용 변경도 보존한다.
- world document는 저장소별 물리 id가 달라도 `projectId:docType`을 논리 identity로 사용하고, 원격 upsert도 Supabase unique key인 `user_id,project_id,doc_type`으로 충돌 처리한다.
- delta row가 0개면 local transaction, `.luie` write, remote POST를 모두 생략하고 `pulled=0`, `pushed=0`을 반환한다.
- local DB에는 delta의 world document·memo 행만 쓰고, scrap aggregate만 전체 merged memo로 재구성한다.
- 하위 row 하나만 바뀌어도 `.luie`는 해당 프로젝트의 전체 merged payload로 재구성해 변하지 않은 chapter·entity를 잃지 않는다.
- snapshots는 기존 원격 동기화 제외 정책을 유지한다. local collector와 remote repository 모두 snapshot row를 sync bundle에 싣지 않는다.

## 상태 모델

| 상태 | 설명                                                                    |
| ---- | ----------------------------------------------------------------------- |
| S0   | local과 remote bundle 수집 완료                                         |
| S1   | merged bundle 생성 및 conflict 판정 완료                                |
| N0   | localDelta=0, remoteDelta=0인 무변경 상태                               |
| LD   | merged가 local과 달라 local apply가 필요한 상태                         |
| RD   | merged가 remote와 달라 remote upsert가 필요한 상태                      |
| P1   | LD의 영향 프로젝트에 대해 전체 merged payload로 package를 구성하는 상태 |
| OK   | 필요한 방향만 반영하고 새 baseline·last synced 상태를 저장한 상태       |
| CF   | 해결되지 않은 conflict가 있어 어느 방향도 반영하지 않은 상태            |

검증 전이는 `S0 → S1 → N0 → OK`, `S0 → S1 → LD → P1 → OK`, `S0 → S1 → RD → OK`, `S0 → S1 → CF`다.

## 진입·종료 기준

진입 기준:

- local/remote/merged의 모든 sync collection을 관찰할 수 있다.
- local DB transaction, `.luie` write, remote upsert 호출 횟수를 spy로 관찰할 수 있다.
- 동일 `updatedAt`에서 본문만 다른 row와 변경 프로젝트의 전체 package bundle을 만들 수 있다.
- 원격 1,000행 pagination과 conflict·package 실패 회귀 fixture가 준비되어 있다.

종료 기준:

- 완전히 동일한 bundle은 빈 delta를 만들고 실제 sync orchestration에서 모든 write를 생략한다.
- `updatedAt` 변경과 동일 시각 content 변경을 모두 감지한다.
- delta apply와 전체 프로젝트 package payload의 역할이 분리된다.
- 실제 SQLite에서 변경되지 않은 sibling world document·memo에 UPDATE/DELETE가 발생하지 않는다.
- local-only, remote-only, conflict, package 실패, pagination 회귀가 모두 통과한다.
- 변경 source와 새 테스트의 lint가 통과하고 TypeScript에서 새 오류가 없다.

## 테스트 케이스

### TC-DB-11-A: 완전 동일 bundle의 무작업 동기화

| 항목      | 내용                                                                                          |
| --------- | --------------------------------------------------------------------------------------------- |
| 목적      | 변경 없는 정기 sync가 DB revision·package IO·network POST를 만들지 않는지 확인                |
| 사전 상태 | local과 remote에 id·`updatedAt`·내용이 같은 project 1개                                       |
| 입력      | `runNow("manual")`                                                                            |
| 절차      | local 수집 → remote fetch → merge → 두 delta 계산 → 결과와 write spy 확인                     |
| 기대 결과 | `success=true`, `pulled=0`, `pushed=0`; DB transaction, `.luie` write, remote upsert 모두 0회 |
| 실제 결과 | 기대 결과와 일치                                                                              |
| 결과      | PASS                                                                                          |

### TC-DB-11-B: `updatedAt` fast path

| 항목      | 내용                                                             |
| --------- | ---------------------------------------------------------------- |
| 목적      | 시각이 다른 row를 즉시 변경으로 선택하는지 확인                  |
| 사전 상태 | 동일 id chapter의 baseline 시각이 `00:00`, target 시각이 `00:01` |
| 입력      | 그 외 필드는 동일                                                |
| 기대 결과 | delta chapters에 해당 row 1개만 포함                             |
| 실제 결과 | 기대 결과와 일치                                                 |
| 결과      | PASS                                                             |

### TC-DB-11-C: 동일 시각 content hash fallback

| 항목      | 내용                                                                      |
| --------- | ------------------------------------------------------------------------- |
| 목적      | clock 정밀도나 갱신 누락으로 시각이 같아도 내용 변경을 놓치지 않는지 확인 |
| 사전 상태 | baseline과 target chapter의 id·`updatedAt` 동일                           |
| 입력      | target의 content만 변경                                                   |
| 기대 결과 | canonical SHA-256이 달라 해당 chapter 1개가 delta에 포함                  |
| 실제 결과 | 기대 결과와 일치                                                          |
| 결과      | PASS                                                                      |

### TC-DB-11-D: 변경 프로젝트의 전체 package payload 보존

| 항목      | 내용                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------- |
| 목적      | chapter delta만 package에 전달해 미변경 chapter가 삭제되는 회귀를 방지                               |
| 사전 상태 | merged project에 changed chapter 1개와 unchanged chapter 1개, local delta에는 changed chapter만 존재 |
| 입력      | `applyMergedBundleToLocalFirstLuie({ bundle: delta, packageBundle: merged })`                        |
| 기대 결과 | DB apply는 delta를 받고 package persistence는 두 chapter가 있는 전체 프로젝트 bundle을 받음          |
| 실제 결과 | 기대 결과와 일치                                                                                     |
| 결과      | PASS                                                                                                 |

### TC-DB-11-E: 방향별 반영과 실패 순서 회귀

| 항목      | 내용                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------- |
| 목적      | local winner는 remote에만, remote winner는 local에만 반영하고 package 실패 뒤 remote POST를 막는지 확인 |
| 사전 상태 | local-only 변경, remote-only 변경, conflict 해결, package write 실패, DB apply 실패 fixture             |
| 입력      | 각 상태에서 manual sync 또는 conflict resolution                                                        |
| 기대 결과 | 필요한 방향만 1회 반영; package/DB 실패에서는 remote upsert 0회; 미해결 conflict에서는 양방향 write 0회 |
| 실제 결과 | 기대 결과와 일치                                                                                        |
| 결과      | PASS                                                                                                    |

### TC-DB-11-F: pagination·mapping 회귀

| 항목      | 내용                                                                                      |
| --------- | ----------------------------------------------------------------------------------------- |
| 목적      | delta 도입 뒤에도 DB-07의 1,000행 경계와 tombstone·world/memory mapping을 보존하는지 확인 |
| 사전 상태 | 2,001 chapters, 1,001 tombstones 및 기존 mapper fixture                                   |
| 입력      | stable Range 응답과 sync bundle merge                                                     |
| 기대 결과 | 모든 page 수집, mapping 계약 유지                                                         |
| 실제 결과 | 기대 결과와 일치                                                                          |
| 결과      | PASS                                                                                      |

### TC-DB-11-G: 실제 DB world·memo row delta

| 항목      | 내용                                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 목적      | world document 또는 memo 하나의 변경이 같은 프로젝트의 미변경 sibling 행을 다시 쓰거나 삭제하지 않는지 확인                                     |
| 사전 상태 | 임시 SQLite에 synopsis·plot·scrap 및 memo 2개 저장; 미변경 plot UPDATE와 미변경 memo UPDATE/DELETE를 `RAISE(ABORT)` 하는 TEMP trigger 설치      |
| 입력      | synopsis 1개와 memo 1개만 든 delta, 해당 프로젝트의 전체 project·world document·memo가 든 merged bundle                                         |
| 절차      | 실제 Drizzle transaction에서 `applyReplicaWorldDelta` 실행 → trigger 미발화 확인 → synopsis·memo·scrap aggregate와 미변경 plot·memo를 다시 조회 |
| 기대 결과 | transaction commit; 변경 2행과 scrap aggregate만 갱신; 미변경 plot·memo 보존; scrap aggregate에 변경 memo와 미변경 memo 모두 유지               |
| 실제 결과 | trigger가 발화하지 않았고 synopsis·memo 변경, plot·memo 보존, scrap memo id 2개 보존을 확인                                                     |
| 결과      | PASS                                                                                                                                            |

### TC-DB-11-H: 원격 world document 논리 identity

| 항목      | 내용                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| 목적      | local·remote 물리 id가 다른 동일 world document를 원격 upsert할 때 중복 row가 생성되지 않는지 확인                      |
| 사전 상태 | Supabase migration에 `(user_id, project_id, doc_type)` unique constraint가 있고 sync bundle에 world document 1개가 있음 |
| 입력      | `syncRepository.upsertBundle()`                                                                                         |
| 절차      | mock HTTP로 생성된 `world_documents` POST URL의 `on_conflict` query를 관찰                                              |
| 기대 결과 | `on_conflict=user_id,project_id,doc_type`; 논리 identity의 DB unique constraint 사용                                    |
| 실제 결과 | 기대 query와 일치                                                                                                       |
| 결과      | PASS                                                                                                                    |

## 실행 기록

### DB-11 전용·동기화 회귀 테스트

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run \
  tests/main/services/syncDelta.test.ts \
  tests/main/services/syncService.test.ts \
  tests/main/services/syncRepository.test.ts \
  tests/main/services/syncMapper.test.ts \
  tests/main/services/syncBundleApplier.commitOrder.test.ts
```

상태: 사용자 DB·실제 원격 서버를 사용하지 않았다. mock DB/HTTP와 synthetic bundle로 무변경, local-only, remote-only, conflict, package·DB 실패, 1,000행 pagination 경계를 실행했다. `SKIP_DB_TEST_SETUP=1`은 이 범위가 실제 DB 동작 검증이 아니므로 worker DB 준비만 생략했다.

결과: **5 files passed, 38 tests passed**.

초기 회귀 실행에서는 기존 테스트 4건이 전체 bundle을 항상 양방향에 쓰던 호출 횟수를 기대하거나 remote 변경이 없는 fixture로 local package 실패를 만들고 있어 실패했다. fixture에 실제 remote 변경을 넣고 방향별 기대값을 새 계약에 맞춘 뒤 같은 범위가 통과했다. 제품 코드 실패를 숨기기 위한 검증 완화는 적용하지 않았다.

### 실제 SQLite row write 격리 테스트

```sh
pnpm exec vitest run tests/main/services/syncLocalApply.test.ts
```

상태: `SKIP_DB_TEST_SETUP`을 사용하지 않았다. worker별 임시 main/cache SQLite를 migration으로 초기화하고, 미변경 sibling write를 강제 실패시키는 TEMP trigger 3개가 설치된 상태에서 delta apply를 실행했다. 테스트 종료 시 trigger와 worker DB를 정리했다.

결과: **1 file passed, 6 tests passed**. 이 중 TC-DB-11-G가 실제 DB를 사용하며 나머지 5건은 같은 파일의 기존 local apply unit 회귀다.

구현 재검토 중 row delta를 기존 `applyReplicaWorldState`에 그대로 전달하면 project row가 없는 world/memo-only delta를 건너뛰거나 미변경 memo 전체를 삭제할 수 있음을 확인했다. DB apply를 `applyReplicaWorldDelta`로 분리하고 실제 trigger 테스트를 추가한 뒤 통과했다.

### 정적 검사

```sh
pnpm exec eslint \
  src/main/services/features/sync/syncDelta.ts \
  src/main/services/features/sync/syncRunExecutor.ts \
  src/main/services/features/sync/syncService.ts \
  src/main/services/features/sync/syncBundleApplier.ts \
  src/main/services/features/sync/localApply/worldState.ts \
  tests/main/services/syncDelta.test.ts \
  tests/main/services/syncRepository.test.ts \
  tests/main/services/syncBundleApplier.commitOrder.test.ts \
  tests/main/services/syncLocalApply.test.ts
```

결과: **PASS, lint error 0개**.

`syncService.test.ts` 전체 lint는 이 변경 전부터 존재한 dynamic import type annotation 3건과 mock applier의 `await` in loop 7건으로 실패한다. 이 파일의 Vitest 15건은 통과했고 이번에 추가한 테스트 구간에는 새 lint 진단이 없다.

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

이번 DB-11 변경 파일에서는 TypeScript 오류가 보고되지 않았다.

## 판정과 잔여 범위

- 최초 실행에서는 무작업 sync의 write 0회, 양방향 row delta, 실제 SQLite sibling row 비변경 계약을 검증해 PASS로 판정했다. 이후 로컬 편집 경쟁으로 한 차례 REOPEN됐고, 현재는 문서 상단 authoritative package 보정으로 해결됐다.
- 현재 방식은 local·remote whole bundle fetch와 merge를 유지하고 local write·remote POST 범위를 줄인다. package write는 delta commit 뒤 authoritative DB export queue가 담당한다. cursor 기반 remote delta fetch와 table별 POST batching은 실제 payload/latency 측정에서 필요성이 확인될 때 추가한다.
- canonical hash는 `updatedAt`이 같은 row에만 계산한다. 배열 순서는 의미 있는 payload로 보존하고 object key 순서만 정규화한다.
- remote fetch 대기 중 local 편집 경쟁은 실제 DB·package·DB 재연결 종단 회귀로 옮겼다. 실제 원격 서버 동시 편집과 packaged Electron 재시작은 별도 범위다.
