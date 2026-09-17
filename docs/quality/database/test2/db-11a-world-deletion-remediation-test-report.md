# DB-11A world document 삭제 보존 보정 보고서

## 현재 판정

- [X] **PASS — 원인 수정·영구 회귀·SSoT 동기화 완료 (2026-09-14 KST)**
- 기준일: 2026-09-14 KST
- 기준 HEAD: `b76d6f0e` 위 기존 미커밋 작업 트리

## Why 분석

### 관찰된 실패

원격 plot 삭제를 local DB에 적용하면 `WorldDocument` row는 없어지지만 기존 `.luie`의 `world/plot-board.json`은 삭제 전 payload로 다시 기록된다. export queue는 이 결과를 성공으로 받아 `exportedRevision`을 올리므로 다음 시작 시 자동 복구 대상에도 포함되지 않는다.

### 직접 원인

1. `applyReplicaWorldDelta`는 원격 `deletedAt`을 local `WorldDocument` row 삭제로 바꾼다.
2. 삭제 직후 `syncBundleApplier`는 일반 `ProjectExportQueue`를 호출한다.
3. 일반 exporter는 replica row가 없으면 legacy/package-only 데이터를 보존하기 위해 기존 `.luie` entry를 fallback으로 읽는다.
4. 따라서 같은 “row 없음”이 `아직 DB로 이관되지 않은 데이터`와 `의도적으로 삭제된 데이터`라는 반대 의미를 가진다.
5. 삭제 의미가 transaction 뒤 사라졌기 때문에 즉시 export에 임시 옵션을 전달하는 방식만으로는 export 실패 후 retry와 프로세스 재시작을 보호할 수 없다.

### 근본 원인

local `WorldDocument` 모델은 remote sync record가 이미 가진 `deletedAt` 상태를 저장하지 않는다. sync change를 적용하는 시점에 tombstone을 물리 삭제로 축약하면서, package fallback과 revision checkpoint가 삭제 전 데이터를 정상 데이터로 오인한다. 즉 transaction 원자성 문제가 아니라 **상태 표현 손실**이다.

### 선택한 수정 방향

- local `WorldDocument`에 nullable `deletedAt`을 추가하고 remote deletion을 soft tombstone으로 보존한다.
- tombstone row의 payload는 원격 record를 보존하되 active read에서 노출하지 않는다. `.luie` format은 world entry를 항상 가지므로 exporter가 tombstone을 doc type별 빈 canonical document로 기록한다.
- exporter와 renderer replica read는 tombstone을 삭제 전 package payload로 fallback하지 않게 한다.
- local sync collector는 tombstone을 다시 `deletedAt` record로 내보내 replay·retry·재시작에서도 삭제 의미를 유지한다.
- 사용자가 같은 document를 다시 저장하면 기존 row를 갱신하면서 `deletedAt=null`로 되살린다.

즉시 sync export에만 `worldSourcePath=null`을 전달하는 안은 선택하지 않는다. DB에 아직 이관되지 않은 다른 world entry까지 비울 수 있고 retry·startup recovery에는 삭제 문맥이 남지 않기 때문이다.

## 외부 근거와 적용 범위

- [Scrivener 3 User Manual for macOS](https://www.literatureandlatte.com/docs/Scrivener_Manual-Mac.pdf) §14.2는 같은 문서가 두 위치에서 변경되면 한쪽을 조용히 덮지 않고 conflict copy를 만들어 사용자가 비교하게 한다. §B.9는 mobile sync 직전 backup을 기본 제공한다. Luie에는 “불확실한 상태에서 이전 내용을 자동 부활시키지 않고 복구 가능한 상태를 남긴다”는 원칙만 적용한다.
- [Microsoft Graph delta query](https://learn.microsoft.com/en-us/graph/delta-query-overview)는 삭제된 entity를 ID와 `@removed` 상태로 반환한다. [Google Drive change log](https://developers.google.com/workspace/drive/api/guides/about-changes#tombstones)도 삭제 항목을 tombstone으로 유지한다. 둘 다 absence와 deletion을 구분하는 동기화 모델의 근거다.
- Scrivener의 파일 형식이나 동기화 구현을 복제하지 않는다. Luie는 단일 SQLite `.luie` container와 local DB replica 계약에 맞춰 tombstone을 적용한다.

## ISTQB 테스트 설계

설계 기법은 상태 전이, 결정표, 오류 추정, 회귀 테스트다.

| 상태 | 설명 |
| --- | --- |
| S0 | DB와 package에 old plot, `revision=exportedRevision` |
| S1 | remote bundle에 더 최신 `deletedAt` plot |
| S2 | local transaction에 tombstone 보존, active payload 없음 |
| S3 | authoritative export가 빈 plot을 package에 기록 |
| S4 | DB 재연결 뒤 tombstone을 읽어 다시 export |
| OK | package 빈 plot, tombstone 유지, revision current |
| BAD | DB row 없음 또는 package old plot, revision만 current |

주요 전이는 `S0 → S1 → S2 → S3 → S4 → OK`다.

| 조건 | 기대 결과 |
| --- | --- |
| remote active plot | active replica와 package가 같은 payload |
| remote deleted plot | tombstone 보존, package `{columns:[]}` |
| export 실패 후 retry | tombstone에서 다시 빈 package 생성 |
| DB 재연결 후 export | package fallback으로 old plot 부활 금지 |
| tombstone 뒤 local save | `deletedAt=null`, 새 payload가 active |

### 진입 기준

- `SKIP_DB_TEST_SETUP` 없이 worker별 실제 main/cache SQLite를 초기화한다.
- OS 임시 경로에 실제 SQLite v2 `.luie`를 만든다.
- old plot, attachment, baseline revision을 구성하고 remote deletion 순서를 결정적으로 적용한다.

### 통과 조건

- local `WorldDocument`에 삭제 시각이 남고 active read는 삭제 전 payload를 반환하지 않는다.
- `.luie`의 `world/plot-board.json`은 `{columns:[]}`다.
- `revision=exportedRevision`은 위 package 상태가 확인된 뒤에만 성립한다.
- DB disconnect/initialize 뒤 재export해도 빈 plot과 tombstone이 유지된다.
- local sync bundle에는 같은 project/docType의 `deletedAt` record가 남는다.
- tombstone 뒤 새 plot 저장은 row를 active 상태로 전환한다.

### 성능 판정

이 결함은 정확성·내구성 P1이며 query latency 개선이 목적이 아니다. p95/p99 수치를 통과 기준으로 만들지 않는다. 테스트 실행 시간은 회귀 비용 관찰값으로 기록하되 제품 성능 근거로 사용하지 않는다.

## 실행 환경과 결과

### 수정 범위

| 경계 | 변경 |
| --- | --- |
| local schema | `WorldDocument.deletedAt` nullable column, Drizzle migration `0003`, bootstrap SQL·legacy column patch·required-column parity 반영 |
| sync apply/collect | remote delete를 physical delete 대신 tombstone upsert로 저장하고 local bundle에 `deletedAt`을 재수집 |
| export/read | tombstone을 active replica로 반환하지 않고 기존 package fallback 대상에서도 제외 |
| revive | `setDocument`·`setScrapMemos`가 저장 시 `deletedAt=null`로 전환 |
| 회귀 | 실제 DB·filesystem 통합 2개 시나리오, mock read/write 계약 2건, legacy schema upgrade 1건 추가 |

별도 delete option이나 신규 abstraction은 추가하지 않았다. 기존 replica row, exporter fallback, sync collector, schema bootstrap 경로에 삭제 상태 한 필드만 전달했다.

### 테스트 환경

| 항목 | 값 |
| --- | --- |
| OS/architecture | macOS Darwin 25.6.0 arm64 |
| runtime | Node.js v22.23.0, pnpm 12.3.4, Vitest 5.0.0 |
| DB | better-sqlite3 13.0.3, SQLite 3.53.4 |
| main integration | `SKIP_DB_TEST_SETUP` 미사용, worker별 main/cache SQLite migration, 실제 OS 임시 SQLite v2 `.luie` |
| mock contract | `SKIP_DB_TEST_SETUP=1`, Electron/DB chain mock |
| remote | 실제 HTTP 대신 명시적으로 만든 `SyncBundle` deletion delta |
| fixture | 시나리오당 project 1, attachment 1, plot replica 1, package plot entry 1; old plot column 1 |
| 반복 | 결정적 상태 전이 2개를 각 1회; 성능 표본 반복 없음 |

### RED — 수정 전 반례

명령:

```sh
pnpm exec vitest run tests/main/services/syncWorldDeletionPersistence.test.ts --reporter=verbose
```

결과: **1 file/1 test FAIL**, test 50 ms, 전체 667 ms. remote plot deletion 뒤 다음 네 조건이 동시에 깨졌다.

- replica row 1건 기대, 실제 0건
- local bundle tombstone 기대, 삭제 전 active plot 반환
- package `{columns:[]}` 기대, `old-column` 부활
- DB 재연결·재export 뒤에도 `old-column` 잔존

같은 실행에서 `revision=exportedRevision`은 성립했다. 즉 삭제 전 package를 최신 상태로 잘못 확정하는 원래 P1 상태를 고정했다.

### GREEN — 상태 전이와 회귀

실제 DB·filesystem 명령:

```sh
pnpm exec vitest run \
  tests/main/services/syncWorldDeletionPersistence.test.ts \
  tests/main/services/syncStalePackageRevision.test.ts \
  tests/main/services/syncLocalApply.test.ts \
  tests/main/services/projectExportEngine.test.ts \
  tests/main/database/schemaParity.test.ts \
  tests/main/database/projectRevisionTrigger.test.ts \
  --reporter=verbose
```

결과: **6 files/38 tests PASS**, 전체 1.06 s. 이 묶음에서 DB-11A 직접 시나리오는 즉시 export **44 ms**, 첫 export 실패 후 retry **29 ms**였다. formatting 뒤 direct test와 legacy migration을 함께 재실행한 최종 확인은 **2 files/7 tests PASS**, 전체 637 ms였고 직접 시나리오는 각각 **48 ms/25 ms**였다.

| 시나리오 | 강제 상태와 절차 | 관찰 결과 | 판정 |
| --- | --- | --- | --- |
| TC-DB-11A-01 즉시 성공 | S0 old DB/package → remote tombstone → 실제 authoritative export → DB reconnect → 재export → local save | tombstone 1행, local bundle `deletedAt`, package 빈 plot, revision current, reconnect 뒤 빈 plot, 저장 뒤 active restored plot | PASS |
| TC-DB-11A-02 실패/retry | 첫 `exportProjectPackageNow`만 `false`, retry 예약 관찰 → spy 해제 → 실제 export → reconnect → 재export | 최초 apply는 `SYNC_LUIE_PERSIST_FAILED`, `sync:retry` 예약, revision stale 유지, retry 뒤 빈 plot과 revision current | PASS |

replica mock 계약:

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run \
  tests/main/services/worldReplicaService.test.ts --reporter=verbose
```

결과: **1 file/10 tests PASS**, 전체 778 ms. tombstone read가 stale payload를 숨기고 이후 save가 `deletedAt=null`로 만드는 조건을 포함한다. 의도적으로 실패시킨 package export 두 건의 WARN은 기대 경로다.

legacy schema upgrade:

```sh
pnpm exec vitest run tests/main/database/drizzleBootstrap.test.ts --reporter=verbose
```

결과: **1 file/5 tests PASS**, 전체 465 ms. `deletedAt` 없는 기존 `WorldDocument`에 column을 추가하면서 기존 `{"columns":[]}` payload가 그대로이고 새 값은 `NULL`임을 실제 파일 DB에서 확인했다.

### 정적·빌드 검사

| 검사 | 결과 |
| --- | --- |
| `pnpm run check:drizzle` | main/cache PASS |
| 변경 source/test ESLint | PASS |
| `pnpm run build` | PASS |
| `pnpm run check:core-complexity` | PASS; 기존 `GoogleDocsLayout.tsx` advisory 2건 |
| `git diff --check` | PASS |
| `pnpm run typecheck` | FAIL; 기존 `Sidebar.tsx:157` TS6133 1건, DB-11A 변경 파일 오류 없음 |
| `pnpm run check:source-loc` | FAIL; 저장소 누적 24건. 이번 새 통합 테스트는 500 LOC 미만이고 제품 변경 파일 중 `worldState.ts`는 453 LOC |
| `pnpm run check:persist-contracts` | FAIL; 기존 `graphStore.ts:24` persist option 누락 |
| `pnpm run check:main-service-boundaries` | FAIL; 기존 `autoSaveMirrorStore.ts:196` legacy import |

### p95/p99와 검증 한계

p95/p99는 **N/A**다. 두 시나리오를 한 번씩 실행한 44/29 ms는 테스트 회귀 비용이며 percentile이나 제품 sync latency가 아니다. 이 P1의 통과 기준은 삭제 상태의 내구성과 revision 진실성이다. 실제 성능 표본은 DB-12B에서 warm-up 뒤 독립 순차 표본으로 측정한다.

이번 검증은 Node Vitest와 Electron mock 안에서 실제 SQLite·실제 임시 `.luie`를 사용했다. packaged Electron 재시작, 실제 Supabase/HTTP, export 파일 commit 도중 process kill, Windows/Linux, 저속·외장 볼륨은 검증하지 않았다. 이 한계는 DB-11A의 재현된 정확성 반례를 닫는 판정과 구분한다.
