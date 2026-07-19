# Project-wide revision 설계

**상태:** 구현 중 — Task 1~3 완료
**상위 SSOT:** `docs/superpowers/specs/2026-07-18-save-integrity-design.md`

## 1. 목표

`Project.revision`이 복구 가능한 `.luie` payload 전체의 freshness를 대표하게 한다. package에 들어가는 canonical 데이터가 바뀌면 같은 SQLite transaction 안에서 해당 project revision이 반드시 증가한다.

```text
canonical DB mutation
  -> SQLite trigger
  -> Project.revision + 1
  -> existing export queue
  -> atomic .luie replace
  -> ProjectAttachment.exportedRevision 갱신
```

export 실패 시 `exportedRevision`은 전진하지 않는다. 따라서 `revision > exportedRevision`은 기존 계약대로 재시작 복구와 다음 checkpoint의 유일한 dirty 판정이다.

## 2. 범위

revision 대상은 현재 exporter가 읽어 `.luie`에 기록하는 복구 데이터다.

- project metadata 중 `title`, `description`, `createdAt`. `updatedAt`은 canonical mutation에서 파생되는 bookkeeping 값이며 독립 revision source로 보지 않는다.
- chapter metadata와 `ChapterBody` 본문. `ChapterBody.content`가 본문 SSOT이고 `Chapter.content`는 호환 mirror다.
- character, term, faction, event, world entity, entity relation
- world replica document와 scrap memo
- snapshot
- memory canonical package가 내보내는 entity, alias, episode, evidence, fact, invalidation, eval 데이터

다음 로컬·파생 데이터는 제외한다.

- `ProjectAttachment`, `ProjectLocalState`, `ProjectSettings`
- search dirty queue와 FTS index
- memory chunk, embedding, build job, summary, extraction job
- evaluation run/result와 benchmark 결과

exporter의 canonical 입력 목록이 바뀌면 이 문서와 revision trigger 목록을 같은 변경에서 갱신한다.

## 3. 선택한 구조

SQLite `AFTER INSERT/UPDATE/DELETE` trigger가 canonical table의 `projectId`로 `Project.revision`을 증가시킨다. 이미 사용 중인 `EntityRelation` consistency trigger처럼 schema bootstrap에서 `CREATE TRIGGER IF NOT EXISTS`로 보장한다. 새 테이블, 의존성, event log는 추가하지 않는다.

normal exporter와 sync collector는 `ChapterBody.content`를 우선하고 row가 없을 때만 `Chapter.content`를 사용한다. package import, snapshot import, sync apply는 두 table을 같은 transaction에서 hydrate해 SSOT와 호환 mirror가 갈라지지 않게 한다.

서비스별 `bumpProjectRevision` 호출은 제거한다. trigger와 함께 남기면 character/event/faction/term mutation이 이중 증가하기 때문이다. 서비스는 기존 transaction, ACK, export 예약 책임만 유지한다.

`Project` 자체는 payload-visible metadata column 변경에만 반응하는 trigger를 사용한다. revision/export bookkeeping update가 다시 revision을 올리는 재귀는 허용하지 않는다. child table의 project 이동이 가능한 경우에는 기존 project와 새 project 모두 dirty로 만든다.

sync는 merged chapter, world, memory canonical row를 같은 DB transaction에 적용하고 transaction 끝에서 project별 revision을 캡처한다. package writer는 나중의 현재 revision을 다시 읽지 않고 이 캡처 값만 성공 후 mark한다. 따라서 DB commit 뒤 발생한 사용자 편집은 더 큰 revision으로 남는다.

한 사용자 동작이 여러 canonical row를 바꾸면 revision이 여러 번 증가할 수 있다. revision은 mutation 개수가 아니라 단조 증가 dirty token이므로 정확히 한 번 증가할 필요는 없다.

## 4. 원자성과 실패 정책

- canonical mutation rollback 시 trigger의 revision 증가도 rollback한다.
- 존재하지 않는 project를 대상으로 한 trigger update는 새 상태를 만들지 않는다.
- soft delete와 restore는 `UPDATE`이므로 revision 대상이다.
- project cascade delete 중 child trigger는 삭제될 project를 되살리지 않는다.
- trigger 설치 실패는 schema bootstrap 실패로 처리한다. revision 없이 저장을 계속하지 않는다.
- trigger 집합이 처음 설치되거나 일부 누락된 기존 DB는 설치와 모든 기존 project의 revision 1회 증가를 하나의 transaction으로 수행한다. 재실행은 증가시키지 않으며, 이전 버전에서 추적하지 못한 canonical 변경을 stale checkpoint recovery 대상으로 만든다.
- 기존 package hydration은 transaction 마지막 revision을 attachment의 `exportedRevision`으로 함께 기록한다.
- queue 밖 full checkpoint writer인 sync, snapshot import, attach, materialize, 손상 package recovery는 payload source와 일치하는 revision을 capture하고 atomic write 성공 뒤 그 값만 mark한다. mark 실패 시 dirty 상태를 유지한다.
- renderer의 package entry writer는 DB 저장 뒤 동일 entry를 쓰는 호환 mirror 또는 template 보조 파일 writer이므로 full checkpoint로 mark하지 않는다.
- export scheduling과 retry 정책은 기존 `ProjectExportQueue`를 그대로 사용한다.

## 5. 검증 계약

최소 회귀 테스트는 다음을 증명한다.

1. 각 canonical table의 insert/update/delete가 올바른 project revision을 증가시키며 `EntityRelation.createdAt` 변경도 포함한다.
2. rollback된 mutation은 revision을 증가시키지 않는다.
3. project 이동 mutation은 old/new project를 모두 dirty로 만든다.
4. 파생·로컬 table mutation은 revision을 증가시키지 않는다.
5. 기존 entity service mutation은 이중 증가하지 않는다.
6. `ChapterBody`만 최신이어도 normal export와 sync가 최신 본문을 사용한다.
7. sync memory canonical row는 package write 전에 DB에 존재하고, apply 뒤 concurrent edit는 clean 처리되지 않는다.
8. `revision > exportedRevision` startup recovery가 새 canonical source 변경도 `.luie`에 반영한다.

구현은 ChapterBody export SSOT 통일, revision trigger/bootstrap, sync memory apply와 transaction revision capture, queue 밖 full writer checkpoint 수렴 순서로 진행한다. 각 단계는 해당 RED/GREEN 결과를 이 문서와 실행 계획에 함께 기록한다.

### Task 1 검증 결과 (2026-07-19)

normal exporter는 `ChapterBody` left join 결과를 우선하고 row가 없을 때만 `Chapter.content`를 사용한다. sync collector는 전체 chapter body를 단일 query와 `Map`으로 overlay하며, sync apply와 package/snapshot import는 `Chapter`와 hash를 포함한 `ChapterBody`를 같은 transaction에서 기록한다.

RED는 지정 Electron-as-Node 4 files/17 tests 중 5건이 예상 원인으로 실패했다. GREEN은 같은 4 files/17 tests PASS다. 대상 ESLint와 `git diff --check`는 PASS이고, 전체 `tsc6 --noEmit`은 Task 1 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 TS2322 한 건만 남는다. 독립 재리뷰는 Production-ready, Critical/Important 0으로 판정했다.

최종 리뷰 follow-up은 query builder의 `.values()`/`.set()`만 검증하고 실제 `.run()`을 놓치던 false-positive를 제거했다. package/snapshot import는 `Chapter`와 `ChapterBody` 각각의 direct run을, sync apply는 기존 Chapter update run·신규 Chapter insert run·두 ChapterBody conflict run을 검증한다. 네 production run을 임시 제거한 mutation RED는 2 files/9 tests 중 3건 실패했고, 원복 후 전체 focused 4 files/17 tests가 PASS했다. 최종 재리뷰 verdict는 Production-ready, Critical/Important/Minor 0이다.

### Task 2 검증 결과 (2026-07-19)

revision trigger는 Project metadata 2개, direct table 21종의 INSERT/UPDATE/DELETE 63개, `ChapterBody` owner lookup 3개로 총 68개다. direct table은 Chapter, Character, Term, Faction, Event, WorldEntity, EntityRelation, Snapshot, WorldDocument, ScrapMemo와 `MEMORY_CANONICAL_EXPORTABLE_TABLES` 11종이다. EntityRelation UPDATE trigger는 pointer column을 제외하고 `projectId`, semantic column, `createdAt`, `updatedAt`만 추적한다.

RED는 지정 Electron-as-Node 4 files에서 trigger module과 `touchProjectUpdatedAt` 부재, raw canonical mutation 미추적으로 3 files가 예상대로 실패했다. 최소 구현 뒤 같은 4 files/20 tests가 PASS했고, pointer trigger와 export queue/checkpoint/DB-loss recovery를 포함한 8 files/63 tests도 PASS했다. 실제 bootstrap DB는 direct table 21종 각각의 CRUD와 ChapterBody CRUD, old/new project 이동, Project `updatedAt`-only 불변, EntityRelation pointer-only delta 0과 semantic delta 1, excluded table 불변, canonical transaction rollback을 검증한다. trigger 하나만 삭제한 partial legacy DB는 재-bootstrap에서 두 기존 project가 각각 정확히 +1 되고, 다음 bootstrap은 불변이었다. 강제 backfill 실패에서는 생성된 trigger와 먼저 갱신된 project revision이 모두 rollback됐다.

대상 ESLint와 `git diff --check`는 PASS다. `tsc6 --noEmit`은 Task 2 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102`의 기존 TS2322 한 건만 유지한다.

추가로 `dbRecoveryService.test.ts`를 단독 실행했으나 7 tests가 실행 전에 모두 skip됐다. 이 파일이 hoist한 `better-sqlite3` mock은 suite `beforeEach` 전 전역 DB setup에서 cache database가 먼저 생성될 때 `pragma`를 제공하지 않아 `cacheDb.ts:83`에서 실패한다. Task 2 production 경로 진입 전의 기존 test-harness 충돌이므로 8 files/63 tests PASS 수에는 포함하지 않았다.

최종 리뷰 follow-up은 서로 다른 project A/B의 Chapter 사이로 `ChapterBody.chapterId`를 이동할 때 두 project revision이 각각 정확히 +1 되는 실제 DB 회귀를 추가했다. production 변경 없이 focused 4 files/20 tests와 expanded 8 files/63 tests가 PASS했고, 최종 재리뷰는 Production-ready, Critical/Important/Minor 0이다.

### Task 3 검증 결과 (2026-07-19)

sync DB transaction은 chapter/world 적용 뒤 `MEMORY_CANONICAL_EXPORTABLE_TABLES` 11종을 dependency 순으로 upsert하고 역순으로 명시 삭제한 다음, non-deleted bundle project revision을 `ReadonlyMap`으로 캡처한다. memory row는 import용 rescoping 없이 raw `row.id`/`projectId`를 유지하며 bundle에 없는 local-only/suggested row는 보존한다. `MemoryFact.invalidatedByFactId`는 모든 fact upsert 뒤 복원해 같은 table 안의 forward FK도 지원한다. canonical FK metadata는 identity, episode/evidence, fact/evidence/invalidation, eval case 자식 관계를 중앙에서 정의한다. parent 삭제 전 실제 child ID와 child projectId를 읽고 같은 bundle/project에서 명시 삭제되지 않은 child가 하나라도 있으면 `SYNC_MEMORY_DELETE_BLOCKED`로 transaction 전체를 rollback한다.

초기 RED는 지정 3 files에서 helper module 부재, revision capture 순서 누락, captured mark/mark-failure retry 누락으로 3 files가 예상 실패했다. 최종 리뷰 follow-up RED는 unmentioned Alias/Fact child를 둔 Entity 삭제가 generic FK 오류를 내고 Episode child는 cascade로 조용히 삭제되는 2건을 실제 DB에서 잡았다. current revision 재조회 변이는 강화 persistence test에서 `writer → select:project → mark:8`로 실패했고 project 소유권 불일치 delete false-positive도 RED로 고정했다. GREEN은 최종 3 files/14 tests PASS다. 실제 FK-enabled SQLite에서 reverse-shuffled 11종 row를 적용했고 TEMP trigger log로 정확한 INSERT dependency 순서와 DELETE 역순을 검증했다. raw ID/projectId, self-FK, local-only suggested 보존, memory mutation과 trigger revision의 transaction rollback도 실제 DB로 확인했다. Alias cascade와 Fact restrict, Episode/Eval dependency, cross-project child 보존, 모든 dependent 명시 삭제 시 성공도 실제 FK DB로 고정했다.

package persistence는 Project current revision을 다시 조회하지 않고 transaction에서 전달된 captured revision만 atomic write 성공 뒤 mark한다. 강화 test는 실제 Project/ProjectAttachment와 revision store를 사용한다. captured bundle title이 writer payload에 들어온 것을 writer 인자에서 확인하고, writer callback의 MemoryEntity insert가 revision 7→8을 만든 뒤 `markProjectExported(projectId, 7)`만 실행되는지 검증한다. Project select spy는 writer 전 재조회가 없고 mark validation 경계에서만 조회됨을 확인하며, 최종 `revision > exportedRevision`과 `listProjectsNeedingExport` dirty 판정이 유지된다. write/mark 실패 모두 성공 기록 없이 `sync:retry`를 예약한다.

회귀는 `syncService.test.ts`의 공식 `package.json` harness와 동일한 `SKIP_DB_TEST_SETUP=1` 환경에서 `syncService.test.ts`와 `projectExportQueue.test.ts` 2 files/27 tests PASS다. env 없이 실행하면 syncService의 기존 hoisted DB mock이 전역 setup의 `client.delete`를 제공하지 않아 14 tests가 본문 전 실패하므로, Task 3 신규 실제 DB 증거는 별도의 focused Electron DB suite 3 files/14 tests에서 확보했다. 대상 ESLint와 `git diff --check`는 PASS다. 직접 `tsc6 --noEmit`은 Task 3 신규 오류 없이 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 TS2322 한 건만 유지한다. `pnpm run typecheck` wrapper는 pnpm 11.5.3 registry signature/version-switch 검증이 불가능해 compiler 진입 전 종료했다.

## 6. 제외 항목

이 작업은 export queue 자동 backoff, Notion UI timer, 저장 latency P95 인증을 변경하지 않는다. revision 정확성만 닫는다.
