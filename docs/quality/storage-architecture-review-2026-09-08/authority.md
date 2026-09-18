# 저장 권위 및 `.luie` 직접 갱신 재검토

검토일: 2026-09-08. 읽기 전용 소스 조사와 SQLite 공식 문서 검증. 제품 코드, 사용자 DB, 실행 중 앱은 변경·실행하지 않았다. 기존 감사의 세대 결함을 다시 재현하지 않았다. 아래 stale reopen 관측값은 root가 별도 임시 DB/FS에서 실제 소스로 실행한 결과를 읽어 인용한다. 성능 수치는 새로 측정하지 않았다.

## 1. 판정과 추천

**Risky. 현재 main SQLite를 삭제 가능한 cache로 취급하면 안 된다.** 문서상의 `.luie canonical` 의도와 런타임의 최신 데이터 권위가 다르다. 일반 편집은 main DB에 먼저 commit되고 `.luie` checkpoint가 나중에 수행된다. 그 사이 최신 원고는 main DB와 WAL에만 있을 수 있다. `cacheDb`의 검색·출현 파생 데이터와 main DB를 구분해야 한다.

추천은 **main DB + `.luie`를 유지하고 기존 `.luie` SQLite entry writer를 단일 batch transaction으로 확장하는 것**이다. 첫 대상은 범위를 확실히 아는 기존 chapter 본문 수정으로 제한한다. 구조 변경, 누락된 mutation 범위, 재시작 후 revision gap 등은 기존 full checkpoint를 사용한다. 별도의 영속 incremental application journal은 처음부터 필요하지 않다. 다만 full fallback도 외부 파일 변경과 충돌하면 자동 덮어쓰기해서는 안 된다. 외부 divergence는 기존 파일을 보존하고 충돌/복구 경로로 분기해야 한다.

이 최적화의 선행 조건은 기존 세대/트랜잭션 소유권 결함과 explicit `.luie` reopen의 데이터 역행 수정이다. 단순히 `INSERT`를 `UPSERT`로 바꾸거나 마지막 저장 reason만 보고 chapter patch를 실행하면 checkpoint ACK의 의미가 깨질 수 있다.

## 2. 실제 저장소별 역할

| 저장소 | 실제 내용과 권위 | 수명·갱신 | 복구 한계 |
|---|---|---|---|
| Renderer editor/save buffer | 아직 main에 전달되지 않은 가장 최신 사용자 입력 | renderer 메모리 | renderer crash 전에 main에 전달하지 못한 입력은 main mirror로 복구할 수 없음 |
| Main autosave pending map | main이 접수했으나 아직 Chapter commit 전인 본문 | 메모리 + 비동기 mirror enqueue | IPC accepted는 DB commit도 mirror 완료도 아님 |
| Main SQLite + `-wal` | Chapter/ChapterBody, 세계관, canonical memory, snapshots, revision, attachment, 설정 및 작업 상태. 정상 편집에서 현재 durable state의 권위 | `databaseService.ts:88` 장기 연결, `WAL`, `FULL`, busy 5초, auto checkpoint 1000페이지 | `.luie`보다 최신일 수 있음. detached project는 대응 `.luie` 자체가 없음. DB를 cache처럼 지우면 최신 commit 및 비export 로컬 상태가 손실될 수 있음 |
| Cache SQLite + `-wal` | `CharacterAppearance`, `TermAppearance`, `ChapterSearchDocument`, FTS 등 파생 데이터 | `cacheDb.ts:82`, main DB와 별도 파일·연결 | 원고 정본 아님. 검색은 `ensureProjectHydrated`/`rebuildProject` 경로가 있지만 모든 cache 삭제 후 모든 파생 데이터의 즉시 자동 복구를 보장한다고 확대 해석하지 않음 |
| `.luie` SQLite v2 | `LuieContainerEntry(path, content)`에 문서·JSON을 저장하는 portable checkpoint. main DB 정규화 테이블과 다른 스키마 | Full checkpoint는 temp DB transaction → close → target 교체. Renderer world 저장은 FS IPC로 entry를 직접 갱신하는 경로도 있음. `journal_mode=DELETE`, `synchronous=FULL` | 마지막 성공 checkpoint 및 이후 개별 entry 갱신 상태. 최신 DB 수정/전체 로컬 설정/모든 revision history를 담는 DB 백업은 아님 |
| `latest.snap` mirror 및 timestamped mirror | main이 접수한 chapter 본문과 project/chapter ID, 시각을 담은 gzip 파일 | userData mirror 디렉터리, 비동기·latest coalescing | 시작 복구는 적격 mirror를 Snapshot으로 추가할 뿐 live Chapter를 자동 교체하지 않음. DB에 chapter가 없으면 orphan으로 정리 |
| Snapshot DB row + 독립 snapshot artifact | 사용자가 선택할 수 있는 복원 지점, 일부 긴급 보존 | artifact 먼저 기록 후 DB Snapshot insert, package export는 별도 | snapshot 생성 성공 ≠ live Chapter commit. export retention에 따라 일부만 `.luie`에 포함 |

근거: `src/main/database/main/databaseService.ts:85`, `src/main/database/cache/cacheDb.ts:79`, `src/main/database/cache/cacheSchema.ts:11`, `src/main/services/features/search/chapterSearchCacheService.ts:341`, `src/main/manager/autoSave/autoSaveManager.ts:192`, `src/main/manager/autoSave/autoSaveMirrorStore.ts:47`, `src/main/services/features/snapshot/snapshotService.ts:107`, `src/main/services/io/luieSqliteContainer.ts:29`.

문서 구별:

- `docs/architecture/current-main.md:177`의 “`.luie` package는 canonical storage이며 SQLite DB는 rebuild 가능한 cache”는 **portable 문서의 의도**로 한정해야 한다. 실제 저장 보장을 설명하는 사실 문장으로는 부정확하다.
- `docs/architecture/narrative-memory-rag-ssot.md:93`의 “DB transaction, revision, derived jobs”는 **런타임 canonical mutation**과 맞는다.
- 추천 문구: “편집의 현재 commit은 main SQLite/WAL이 보존한다. `.luie`는 마지막 성공 checkpoint의 이동 가능한 프로젝트 문서이며, 해당 checkpoint의 export 범위를 main DB로 다시 가져올 수 있다. cache SQLite는 파생 데이터다.”

## 3. 저장 완료의 세 단계

1. **접수됨:** `AUTO_SAVE` handler는 `triggerSave`를 기다린 후 `{success:true}`를 반환한다(`ipcAutoSaveHandlers.ts:33`). `triggerSave`는 pending map과 mirror queue, debounce timer를 등록한다(`autoSaveManager.ts:192`, `:195`, `:228`). 본문 commit까지 기다리지 않는다.
2. **DB에 commit됨:** `performAutoSave`는 `chapterService.updateChapter` 반환 후 `saved`를 emit한다(`autoSavePerformSave.ts:60`, `:69`). `chapterWriteOperations.ts:241` 이후 Chapter/ChapterBody/revision/job 쓰기가 COMMIT되며, package export reason은 debounce일 수 있다(`projectService.ts:461`). 이 단계의 내구성은 main SQLite와 WAL에 관한 것이다.
3. **프로젝트 파일에 반영됨:** manual save는 renderer buffer와 world mutation flush 후 main `flushAll`과 요청 project의 `exportProjectPackageNow`를 기다린다(`saveCoordinator.ts:25`, `ipcAutoSaveHandlers.ts:56`). export queue는 package writer 성공 후 `exportedRevision`을 갱신한다(`projectExportQueue.ts:175`). 해당 portable checkpoint 성공을 표현하려는 경로다. 기존 세대·누락/실패 처리 결함 때문에 그 호출의 현재 성공값을 “키 입력 시점의 모든 최신 문자가 파일에 있다”는 증명으로 확대하면 안 된다.

main DB는 WAL+FULL이다. 성공한 SQLite commit의 내구성을 설명할 때 DB 파일 하나가 아니라 WAL을 포함한 상태를 의미해야 한다. `.luie`는 DELETE+FULL이며, SQLite 공식 문서상 rollback DELETE 모드에서 FULL만으로 모든 파일시스템의 직후 전원손실까지 마지막 transaction의 내구성이 보장되는 것은 아니다. EXTRA는 journal 삭제 후 parent directory sync를 추가한다. 정상 commit/close 후 이동 가능한 파일과 전원차단 보장을 구분한다. [SQLite synchronous](https://www.sqlite.org/pragma.html#pragma_synchronous), [SQLite WAL](https://www.sqlite.org/wal.html).

## 4. 시작·열기·저장·복구 우선순위

| 상황 | 현재 실제 선택·방향 | authoritative 데이터 및 주의점 |
|---|---|---|
| 일반 앱 재시작, 최근 project 선택 | main DB bootstrap → project 목록 DB SELECT → 최근 project 객체를 current로 설정 | main DB. 최근 목록 선택은 `.luie` 재import가 아님 (`App.tsx:220`, `projectService.ts:288`) |
| 시작 후 deferred maintenance | `latest.snap`→복구 Snapshot 검토 → pruning/orphan 정리 → revision gap project의 export schedule | live Chapter는 DB. mirror는 선택 가능한 복구본. export는 DB→`.luie` (`deferredStartupMaintenance.ts:24`, `:42`) |
| 명시적 “`.luie` 열기”, 파일 정상/DB project 없음 | meta.projectId로 identity 확정 후 import transaction | 파일의 export 범위를 DB로 hydrate (`App.tsx:333`, `projectImportOpen.ts:233`, `projectImportTransaction.ts:258`) |
| 명시적 열기, local `Project.updatedAt` > package `meta.updatedAt` | import skip, `conflict:'db-newer'` | DB 유지. 비교는 mtime/revision이 아니라 timestamp 둘뿐 (`projectImportOpen.ts:243`) |
| 명시적 열기, package timestamp가 같거나 더 큼; 비교값 invalid | import transaction에서 기존 project 삭제 후 파일을 hydrate | 파일이 DB를 교체. 반환 이름은 `luie-newer`이나 동시각도 이 분기에 포함. 최신 DB revision gap 보호 없음 |
| 명시적 열기, 파일 missing/corrupt, 해당 path에 DB project 있음 | DB를 별도 `.recovered-...luie`로 export → attachment 이동 → export ACK | DB가 복구 원천. world package fallback은 null로 비활성화 (`projectImportOpen.ts:196`, `projectService.ts:192`) |
| 명시적 열기, 파일 missing/corrupt, path와 연결된 DB project 없음 | 읽기 오류 | 독립 mirror 파일만으로 project 전체를 재생성하지 않음 |
| 수동 저장 | renderer flush → main autosave flush → project package checkpoint | 먼저 DB에 남기고 그 DB의 export 범위를 portable 파일로 반영 |
| `attachProjectPackageFile` | 파일 projectId 일치와 path 충돌 검사 → **DB를 선택 파일에 export** → attachment 변경 | attach는 import가 아님. 선택 파일이 같은 ID이지만 더 최신인지는 비교하지 않음 (`projectPackageAttachment.ts:151`, `:185`) |
| materialize/다른 위치에 파일 생성 | DB→target full checkpoint; world fallback은 기존 attachment | 성공 후 attachment target 변경 (`projectPackageAttachment.ts:213`) |
| 정상 종료 | renderer flush·긴급 mirror/snapshot·main save 선택 → mirrors→snapshots → export flush → worker 종료 → DB checkpoint/close | 각각 단계의 성공/취소 판단. package와 mirror는 같은 자료도 같은 보장도 아님 (`shutdown/shutdown.ts:273`, `:294`, 이후 export/finalize) |
| main 종료/강제 kill 후 재시작 | SQLite가 main WAL을 복구, gap export schedule. renderer-only/pending-memory 입력은 이미 기록된 mirror에 달림 | main DB commit 우선. mirror는 newer/different 조건에서 Snapshot 생성; 자동 live body 복원 아님 |
| renderer만 crash | main pending을 `flushCritical`로 mirrors/snapshots에 보존 시도 후 reload/quit 선택 | main이 받은 본문만 대상. `flushCritical`는 Chapter update를 하지 않음 (`rendererCrashRecovery.ts:22`, `autoSaveFlushOps.ts:102`) |
| 사용자가 snapshot restore | Snapshot row content→Chapter와 ChapterBody transaction→package checkpoint | 선택된 snapshot이 명시적 새 live state가 됨 (`snapshotService.ts:308`, `:342`, `:374`) |
| main DB를 잃은 후 `.luie` 명시적 열기 | 마지막 정상 package export 범위를 새 DB에 import | 마지막 checkpoint 이후 수정/비export 설정은 복구 안 됨. mirror는 missing chapter로 정리될 수 있어 DB를 지우는 절차의 보조백업이라고 할 수 없음 |
| 외부에서 같은 projectId `.luie`를 복사해 열기 | 같은 local project identity로 취급. db-newer면 기존 attachment 유지; 그 외면 DB 교체+copy path로 attachment 이동 | 파일 복사 자체는 별도 project 복제가 아님 (`projectImportOpen.ts:103`, `projectImportTransaction.ts:363`) |
| 외부에서 `.luie`를 수정·교체하고 기존 recent project를 선택 | DB를 선택하며 자동 `.luie` import 없음 | 이후 DB checkpoint가 외부 변경을 덮을 수 있음. explicit open에서만 위 timestamp 우선순위 적용 |

`cacheDb`를 삭제하고 main DB를 유지한 경우 검색 projection은 `ensureProjectHydrated`의 count 비교와 rebuild를 통해 재구성할 수 있다. 반대로 main DB 삭제는 package로 재import 가능한 범위 외에도 `ProjectSettings`, `ProjectLocalState`, queue/revision history 등의 손실을 초래한다. Import는 `ProjectSettings`를 defaults로 만들고(`projectImportTransaction.ts:279`), package snapshots도 export limit에 의해 잘린다(`projectExportPayload.ts:133`).

`latest.snap`의 생성 시각은 실제 해당 본문이 사용자에게 입력된 세대가 아니라 mirror write 시각이다(`autoSaveMirrorStore.ts:66`). 최신성 판별을 timestamp만으로 강화하는 방식은 기존 세대 역전 결함을 해결하지 못한다. 또한 writer는 에러를 로깅 후 삼키므로(`:71`) `flushCritical`의 `mirrored` 숫자를 실제 디스크 보존 성공 횟수로 단정할 수 없다.

## 5. 중요 문제와 근거

### P1 — explicit stale `.luie` reopen이 최신 DB commit을 과거 본문으로 교체

근본 원인은 `Project.revision`과 open 시 최신성 판단 기준이 분리된 것이다. Chapter update는 `Project.updatedAt`을 올리지 않는다(`chapterWriteOperations.ts:241`). trigger는 `Project.revision`만 올린다(`projectRevisionTriggerSql.ts:54`, `:93`). 그런데 import guard는 `Project.updatedAt > meta.updatedAt`만 보고(`projectImportOpen.ts:243`), 실패하면 기존 project를 삭제·재생성한다(`projectImportTransaction.ts:263`). Import 후 새 local revision을 바로 exportedRevision으로 기록한다(`:363`).

root의 실제 source/native SQLite/임시 FS 분리 실험 관측: `/private/tmp/luie-storage-review/stale-open-observation.json`.

| 시점 | main revision | exportedRevision | live 본문 |
|---|---:|---:|---|
| checkpoint A 생성 | 5 | 5 | `checkpoint A` |
| B 실제 update commit, debounce export만 보류 | 7 | 5 | `new committed B` |
| 동일 `.luie` explicit reopen 후 | 9 | 9 | `checkpoint A` |

local Project.updatedAt은 `2026-09-08T08:16:00.228Z`, package meta.updatedAt은 `2026-09-08T08:16:00.231Z`; 반환 conflict는 `luie-newer`였다. 정상 debounce 창을 결정적으로 유지하기 위해 export scheduling만 spy로 보류했으며, 나머지는 실제 서비스/DB/파일이다. 실행 중 사용자 앱 측정이나 OS별 재현은 아니다. 최근 project 선택과 명시적 `.luie` 열기를 구별해야 한다.

최소 방향: 명시적 import도 동일 project의 writer/export 소유권 아래 처리하고, **pending local mutation/DB revision gap이 있는 상태에서 timestamp만으로 hydrate하지 않는다.** 동일 base 파일이면 local pending commit을 보존한다. 외부 파일이 다른 branch로 변경됐다면 양쪽을 보존하며 충돌 경로로 보낸다. 단순히 Project.updatedAt 갱신을 추가하는 것만으로 동시각·clock skew·외부 copy·부분 checkpoint 문제를 해결했다고 볼 수 없다.

### P2 — exportedRevision은 파일의 intrinsic revision이 아닌 로컬 ACK

`ProjectAttachment.exportedRevision`은 main DB의 단조 증가 ACK다. `markProjectExported`는 ACK가 현재 revision 이하이고 기존 ACK 이상인지만 확인한다(`projectRevisionStore.ts:75`). `.luie` meta에는 projectId·format version·timestamps·chapters만 있고 generation/revision/hash가 없다(`projectExportPayload.ts:394`). 따라서 다른 머신/복사본과 exportedRevision 숫자를 직접 비교할 수 없다. Import도 기존 project를 재생성하며 새 local revision에 ACK를 맞춘다.

현재 queue는 `capturedRevision`을 runExport에 넘기지만 실제 ProjectService callback은 이를 버린다(`projectService.ts:103`). Export는 chapter/entity/snapshot과 canonical memory/world를 서로 다른 async read 구간에서 수집한다(`projectRecord.ts:23`, `:41`, `projectExportEngine.ts:91`). Target 파일 transaction은 원자적이지만 **원본 main DB의 동일 snapshot을 읽었다는 뜻은 아니다.** Generation ACK를 넣을 때 payload가 실제 나타내는 snapshot과 연결해야 한다.

### 설계 선행 조건 — 기존 direct entry writer는 batch checkpoint로 그대로 쓰기 부족

`writeLuieSqliteEntry`는 entry UPSERT, meta UPSERT, container info UPDATE를 각각 수행하고 enclosing transaction이 없다(`luieSqliteContainer.ts:347`, `:349`, `:357`). 지금 재사용하면 중간 실패가 일부만 반영될 수 있다. 또한 meta.updatedAt를 현재 시각으로 바꿔 부분 수정이 파일 전체 최신성을 대표하는 것처럼 보이게 한다(`:336`).

직접 writer는 **현재 정상 renderer world 저장에서도 호출된다.** 예를 들어 `memoStore.ts:63` → `worldPackageStorage.saveScrapMemos`가 먼저 DB replica 저장을 기다린 뒤(`worldPackageStorage.ts:452`), `.luie` attachment가 있으면 `ensureLuieWorldDocumentSaved`를 호출한다(`:456`). 이후 `worldPackageStorageHelpers/luieStorage.ts:110` → `writeLuieJson`의 `api.fs.writeProjectFile`(`:79`) → preload `projectApi.ts:306`의 `FS_WRITE_PROJECT_FILE` → `ipcFsHandlers.registry.ts:301`/`:309` → `fsPackageOperations.ts:208` → `writeLuieSqliteEntry`로 연결된다. Synopsis/plot/drawing/mindmap 저장도 같은 helper를 사용한다(`worldPackageStorage.ts:159`, `:223`, `:286`, `:351`). 따라서 batch transaction 부재와 hot-journal 복구 경계는 신규 chapter patch에만 해당하는 가상 조건이 아니라, 기존 FS IPC writer를 함께 정리해야 하는 현재 실행 경로다. 중간 실패나 데이터 손상은 이 재검토에서 실제 재현하지 않았다.

별도 consumer인 `verifyMemoryCanonicalPackageSync`의 `repairSourceIdMismatches:true` 분기도 같은 직접 writer로 이어진다(`memoryCanonicalPackageSyncVerifier.ts:231`). **이 memory repair 옵션은 production status report와 CLI caller가 전달하지 않으며, true를 넘기는 호출은 unit test에서 확인했다.** 이 제한을 정상 world FS writer까지 확대하지 않는다. World 저장의 직접 entry 갱신도 ProjectExportQueue가 전체 revision을 ACK하는 full checkpoint와 같지 않으므로, 모든 writer가 payload capture·base 검증·commit 순서를 공유하도록 포함해야 한다.

### P2 조건부 — DB WAL 복구용 백업은 writer quiesce 전에 순차 복사

`dbRecoveryService.ts:138`이 backup을 만든 뒤 `:149`에서 main db.disconnect한다. Backup은 `.db`→`-wal`→`-shm`을 순차 `copyFile`한다(`:228`). 그 사이 writer가 활동하면 동일 시점 백업이라는 보장이 없다. utility의 독립 연결도 이 서비스의 main singleton disconnect로 함께 닫히지 않는다. 이 보고서에서는 corruption을 실제 관측한 것으로 주장하지 않는다. 복구/백업 개선 시 SQLite Backup API를 사용하거나 모든 writer와 handle을 멈춘 상태를 먼저 확보해야 한다. [SQLite live backup](https://www.sqlite.org/backup.html).

## 6. `.luie` 직접 transaction update의 실제 위험

### 파일은 이미 SQLite이지만 main DB를 곧바로 그 파일로 바꿀 수는 없음

현재 `.luie` 스키마는 `LuieContainerInfo`와 `LuieContainerEntry` 둘이다(`luieSqliteContainer.ts:33`). Main의 정규화된 Chapter/ChapterBody/world/memory schema와 다르다. `.luie`를 유일한 live DB로 바꾸려면 main services, migration, 다중 project 조회, detached project, utility DB 경로, import/export 계약이 모두 변한다. 현재 성능 병목을 줄이기 위한 최소 수정은 아니다.

### 기존 연결과 writer 소유권

- Main DB/cache DB는 각 process singleton의 연결이 오래 유지된다. `.luie` read는 entry마다 readonly 연결을 열고 즉시 닫는다(`:183`, `:212`). `.luie`의 장기 pooled handle을 현재 전제로 삼으면 틀린 분석이다.
- Full writer는 temp DB를 commit하고 **닫은 다음** target을 rename한다(`:273`, `:278`). 직접 writer도 동기 SQL 완료 후 close한다. 같은 main JS event loop 안에서 이 동기 구간들이 await 없이 서로 겹치는 것은 아니지만, import의 여러 entry read 사이에는 다른 작업이 끼어들 수 있다.
- 기존 `withPackageWriteLock`은 process-local Map과 `path.resolve` key뿐이다(`luiePackageWriter.ts:33`). 프로젝트 export queue와 full/direct package writer, attachment/recovery/exportWithOptions 경로를 하나의 소유권 하에 합쳐야 한다. 다른 process에 writer를 옮기면 Map도 옮기고 main fallback writer가 동시에 남지 않게 해야 한다.
- 문자열 path.resolve는 Windows/macOS의 대소문자 alias 및 link의 파일 identity까지 같게 만들지 않는다. 기존 승인 경계 내의 실제 파일 identity를 사용하고 같은 파일의 다른 alias가 두 writer를 만들지 않게 해야 한다.

### Native rollback journal과 readonly recovery

직접 update는 SQLite의 rollback journal로 중간 실패를 복구한다. 별도 application incremental journal을 만들지 않는 설계와 **SQLite journal을 끄는 것**은 다르다. DELETE/FULL을 유지하며, 강한 전원손실 내구성이 필요하면 EXTRA의 비용을 측정한다. journal_mode=OFF로 성능을 얻는 것은 이 제안이 아니다.

Crash로 target `.luie-journal`이 hot 상태가 된 뒤 현재 readonly reader가 먼저 접근하면 SQLite는 `SQLITE_READONLY_ROLLBACK`을 낼 수 있다. SQLite는 hot journal rollback 전에 읽기를 완료할 수 없고 recovery는 쓰기 권한이 필요하다. 현재 `readMetaOrMarkCorrupt`는 이 오류도 corrupt로 묶는다(`projectImportOpen.ts:95`). 그러면 복구 가능한 파일을 곧바로 corrupt fallback으로 보낼 수 있다. [SQLite hot-journal recovery](https://www.sqlite.org/lockingv3.html#dealing_with_hot_journals), [SQLITE_READONLY_ROLLBACK](https://www.sqlite.org/rescode.html#readonly_rollback).

기존 world 직접 writer를 정리하고 chapter patch까지 확장할 때 최소 추가는 approved path에서 동일 writer가 writable open하여 SQLite recovery를 수행하고 닫은 다음, readonly snapshot import로 넘어가는 경로다. 원본이 읽기 전용이면 journal과 DB가 같은 crash 시점의 한 쌍이라는 조건을 보존해 쓰기 가능한 recovery copy로 처리하거나 명시적으로 복구 불가를 표시한다. Hot journal을 지우거나 unrecovered target 위에 새 full file을 교체해서 이전 journal이 새 DB에 적용되게 하면 안 된다. 원본 pair를 보존한 별도 recovery path가 더 단순한 fallback이다.

### 전체 파일 교체와 in-place write를 혼용할 때

SQLite가 연결한 target을 외부에서 rename/overwrite할 때의 위험은 단순 SQLITE_BUSY로 끝나지 않는다. POSIX 계열에서는 오래 열린 handle이 이전 inode를 계속 가리키고 같은 경로에 새 DB가 생길 수 있다. 서로 다른 DB가 이름 기반 journal을 공유하는 상황은 SQLite가 경고하는 손상 조건이다. Windows에서는 열린 DB 교체가 실패할 수 있다. 기존 atomicReplace의 backup→rename 복구는 OS 잠금 문제를 없애지 않으며, fallback의 두 rename 사이에는 target 경로가 일시적으로 없다. [SQLite file rename/corruption](https://www.sqlite.org/howtocorrupt.html#_unlinking_or_renaming_a_database_file_while_in_use).

직접 writer는 짧은 transaction/open/close를 유지한다. 앱 내부 read/export/attach/materialize/복구가 그 파일에 작업 중인지 통제하고, 파일 identity 검증은 실제 commit 직전 동일 writer 범위에서 다시 한다. “사전에 stat 한 번 확인”만으로 check 이후 외부 replace를 막지는 못한다. 협조하지 않는 외부 editor/cloud sync의 동시 교체까지 애플리케이션 Map으로 안전하게 만들 수 있다고 약속하지 않는다.

### 읽기 snapshot은 별도 문제

기존 import는 meta, collections, chapters를 독립 readonly open으로 읽는다(`projectImportOpen.ts:190`, `:264`, `:270`). 하나의 package write가 atomic이어도 여러 entry read가 그 transaction 앞뒤로 걸치면 서로 다른 세대를 혼합할 수 있다. 최소 reader 변경은 한번 open한 연결의 단일 read transaction에서 필요한 모든 entry를 가져온 후 close하고 그 payload를 검증·hydrate하는 것이다. 원본 main DB의 export read도 동일 snapshot에서 revision과 해당 payload를 같이 취해야 한다. async fs/network 작업을 그 DB transaction 안에 넣지 않는다.

### Main DB와 package transaction은 하나의 분산 commit이 아님

Main WAL transaction과 `.luie` DELETE transaction은 별개다. SQLite `ATTACH`만으로 현재 WAL main과 여러 파일의 crash-atomic commit이 보장되는 것은 아니다. 공식 조건은 main이 memory가 아니고 journal_mode가 WAL이 아니어야 한다. 그래서 기존 main commit→package commit→main ACK 순서를 유지하고 실패 시 idempotent retry한다. [SQLite ATTACH atomicity](https://www.sqlite.org/lang_attach.html).

## 7. 별도 durable changelog 없이 가능한 최소안

### 기존 구조 재사용

1. Main DB transaction/세대 소유권을 먼저 확립하고 autosave completion을 실제 generation에 연결한다. Explicit import는 로컬 미반영 수정과 경합하지 않게 한다.
2. 기존 ProjectExportQueue에 chapter ID dirty set과 `forceFull` 상태를 둔다. 세대별 완료 후 현재 queue의 더 새 dirty set을 지우지 않는다. 범위를 모르는 이벤트는 `forceFull`을 true로 유지한다. 새 범용 event log/DB를 만들지 않는다.
3. `writeLuieSqliteEntry`를 entries UPSERT/DELETE + meta + info 단일 transaction으로 확장한다. 초기 chapter 본문 patch는 기존 entry만 수정하도록 좁힌다. meta에는 그 snapshot을 대표하는 checkpoint token을 함께 쓰고, 임의 현재시각을 전체 project 저장 완료 증거로 사용하지 않는다.
4. Main의 같은 read snapshot에서 captured revision과 patch content를 읽는다. Scope가 baseline 이후의 **전체** 변경을 포괄함을 확인한 경우만 그 captured revision 전체를 ACK한다. 다른 canonical writer의 변경을 포괄하지 못하면 full checkpoint로 전환한다.
5. Target project identity와 마지막 인정한 file checkpoint/base를 검증하고 transaction을 commit·close한 뒤 main exportedRevision을 갱신한다. ACK 직후 새 변경이 있으면 기존 queue loop로 다음 generation을 수행한다.
6. 재시작하면 메모리 scope를 신뢰하지 않는다. `revision > exportedRevision`이면 full checkpoint를 예약한다. File commit 성공→main ACK 전에 crash해도 DB에 gap이 남아 같은 상태를 안전하게 다시 쓸 수 있다. Scope 영속 log가 필요한 이유는 아니다.

첫 patch 대상은 “같은 chapter ID의 본문만 바뀌었고 baseline 이후 모든 변화가 이 dirty set으로 설명되는 구간”이다. 현재 chapter:update는 title/synopsis도 허용하므로 reason 문자열만으로 본문 전용을 판별하지 않는다. create/delete/reorder, title/metadata/world/memory/snapshot 변경, import/attach, 파일 누락/legacy/불확실 generation은 보수적으로 full 경로다. Snapshot 생성과 canonical memory derived write가 자주 동반되면 초기 patch hit rate가 낮을 수 있다. 이 경우 성능 효과를 실제로 측정하고 범위를 조금씩 확장한다.

File metadata에 generation을 넣을 경우 **project identity와 lineage 안의 비교**로 한정한다. 현재 local revision은 다른 머신이나 reimport 후 숫자와 직접 비교할 수 없다. 임의 외부 SQLite editor가 generation을 유지하고 내용을 바꾸는 것까지 감지해야 한다면 token만으로 부족하고 persisted base content digest 등 실제 내용 검증이 필요하다. 파일 전체 digest는 O(file size)이므로 전체 export보다 저렴하더라도 비용이 0인 검사가 아니다. mtime/size만으로 안전한 외부 수정 탐지를 약속하지 않는다.

### 최소안의 반례와 대응

| 반례 | 단순 chapter patch가 실패하는 이유 | 최소 대응 |
|---|---|---|
| chapter가 dirty인 동안 utility canonical memory가 revision을 증가 | chapter만 쓰고 최신 project revision을 ACK하면 memory 누락이 clean으로 남음 | baseline→captured 사이 미관측 revision/unknown writer가 있으면 full. 모든 exportable mutation이 scope를 남기거나 unknown으로 관측되는 ownership 경계 필요 |
| A write 완료 시 B가 queue에 들어옴 | 전체 dirty set clear 시 B가 사라짐 | captured 세대의 scope만 완료 처리. 최신 dirty를 보존 |
| package commit 뒤 ACK 전에 crash | file은 새 상태, main은 old ACK | 재시작 gap으로 full reconcile. 중복 commit은 안전해야 함 |
| request timeout 후 worker가 계속 씀 | fallback writer가 새 파일을 만든 뒤 old worker가 덮을 수 있음 | 늦은 작업 종료/상태 확인 전 동일 파일 fallback 시작 금지. timeout 자체를 취소로 취급하지 않음 |
| 동일 path가 외부 파일로 교체 | basename/mtime 또는 local revision만 보고 엉뚱한 파일을 patch | identity/base 불일치는 원본 보존+충돌/다른 recovery path. 자동 full overwrite는 해결책 아님 |
| patch 성공 후 오래된 full payload가 순서대로 실행 | SQL writer lock만 있으면 stale payload도 유효하게 마지막 write가 됨 | payload capture부터 generation 검증과 commit까지 같은 ownership 또는 base CAS 검증 |
| 구조 변경을 body patch로 처리 | meta.chapters와 실제 entry가 불일치, 삭제된 entry가 잔존 | 초기에는 full. 추후 patch 확장 시 tombstone/entry DELETE와 meta 갱신을 같은 transaction에 포함 |
| `-journal` hot 상태에서 readonly import | 복구 가능한 DB가 corrupt로 오인 | writable recovery 경계 선행, journal 보존 |
| main DB 자체가 손실 | revision gap도 dirty set도 함께 사라짐 | 마지막 portable checkpoint만 복구 가능. application changelog를 추가해도 동일 저장소를 잃으면 자동 해결되지 않음 |

**중요:** `Project.revision` 증가량은 scope 개수와 같지 않다. Chapter+ChapterBody, 여러 trigger가 한 mutation에서 다수 증가시킬 수 있으며 canonical memory 테이블도 같은 revision을 올린다(`projectRevisionTriggerSql.ts:15`). 따라서 “revision 차이가 2이니 chapter 하나” 같은 휴리스틱으로 completeness를 증명하지 않는다. Complete scope tracking이 어렵다면 첫 구현은 full snapshot을 유지하는 편이 안전하고 더 작다.

## 8. 대안 비교

| 대안 | 변경량·장점 | 남는 비용/제약 | 선택 |
|---|---|---|---|
| 기존 full checkpoint의 주기·coalescing/worker 실행만 개선 | format/권위 계약 변화가 적고 구현이 가장 작음 | 매 checkpoint 전체 read/JSON/SQLite entry build, 디스크 전체 write 비용 지속 | 세대/ownership 먼저 고칠 때 안전한 1단계 |
| 기존 `.luie`에 검증된 scope를 단일 transaction patch | native SQLite가 변경 페이지와 crash rollback 처리, 기존 entry schema 재사용 | hot journal recovery, base검증, scope completeness, 내부 reader 일관성 필요 | 조건을 갖춘 후 추천 |
| 기존 파일의 일관된 복사본→temp에서 entry patch→원자 교체 | target에 in-place hot journal을 만들지 않고 기존 교체형 publishing 유지 | 복사 O(file size), Windows replacement/외부 handle 문제 유지. 실행 중 DB의 무잠금 raw copy는 안 됨 | 외부 sync/기존복구 계약 때문에 in-place가 부담스러울 때 중간안 |
| `.luie` 하나를 곧바로 유일한 live normalized DB로 변경 | 장기적으로 중복 project state/export 비용 제거 가능 | 서비스와 migration, 다중 project, detached state, utility 연결, portability/backup 계약 대규모 변경 | 현재 최적화의 최소안으로 비추천 |
| 별도 영속 application incremental journal | 정교한 replay/history를 구현할 수 있음 | DB WAL/Project revision/기존 queues와 별도 운영체계 추가; 지금 필요한 crash gap recovery는 기존 revision으로 가능 | 실제 replay 요구가 생기기 전 도입하지 않음 |

Temp patch 대안의 복사 원본은 닫힌 안정된 파일이거나 SQLite Backup API가 제공하는 일관된 snapshot이어야 한다. SQLite가 지원하는 backup API는 live DB에서도 일관된 복사본을 만든다. 단순 파일 copy는 active transaction의 일부만 가져올 수 있다. [SQLite Backup API](https://www.sqlite.org/backup.html).

## 9. OS·파일시스템 경계

| 환경 | 현재/제안의 관련 차이 | 필요한 검증 |
|---|---|---|
| macOS 로컬 APFS | POSIX open inode와 path rename 분리, 대소문자 비구분 설정의 path alias. Main/cache WAL, `.luie` DELETE는 공통 | in-place commit 직후 crash/hot journal, copy/replace 중 handle 소유권, alias 동일파일 직렬화 |
| Windows 로컬 NTFS | 열린 DB/동기화도구/보안프로그램의 handle이 rename/삭제를 막을 수 있음. atomicReplace fallback도 성공 보장 없음 | Busy/EPERM/rename 실패 때 old file 보존, bounded retry, writer 종료 후 재시도, recovery path |
| Linux 로컬 filesystem | POSIX rename/open inode 분리; 파일시스템별 directory durability와 lock 동작 | commit/rename의 전원손실 단계, inode replacement 감지, tmp/backup recovery |
| SMB/NFS 등 network filesystem | SQLite WAL은 서로 다른 host가 같은 파일을 공유하는 모델을 지원하지 않음. DELETE라고 network locking의 신뢰성이 자동 보장되지도 않음 | 외부 파일을 live WAL DB로 전환하지 않기. 지원 범위를 정하고 export/backup 중심의 파일 이동 경로 검증 |
| cloud sync 폴더·외부 copy | SQLite transaction lock과 cloud agent의 경로 교체/파일 복사가 협조한다는 보장 없음 | 열린 live 파일의 무조건 안전한 동시 복사 보장 금지. manual save 후 정상 commit/close된 portable 파일 생성, 외부 divergence 시 원본 보존 |

OS 경계는 공식 SQLite 파일 잠금·WAL 제약과 소스 구조를 바탕으로 한 설계 위험이며 세 OS에서 실앱 crash/power-loss 테스트를 실행한 결과가 아니다. [SQLite WAL filesystem 제한](https://www.sqlite.org/wal.html), [SQLite file locking pitfalls](https://www.sqlite.org/howtocorrupt.html).

## 10. 구현을 진행할 때 필요한 검증

이 재검토에서는 새 테스트를 실행하지 않았다. 필요한 검증은 소스 복제 microbenchmark보다 실제 임시 native SQLite/FS와 실제 save/open 서비스의 종단 결과를 중심으로 잡는다.

- root stale reopen 재현을 회귀 테스트로 고정: export gap에서 explicit open 시 B 보존, recent project 선택과 독립 검증.
- DB commit→package commit→ACK 세 경계의 crash injection: restart 후 DB 최신 body, file generation, exportedRevision 관계 확인.
- Batch entry+meta+info 중간 오류 시 전부 rollback; 기존 hot journal을 현재 readonly reader가 만나도 corrupt fallback 전에 정상 복구.
- Body patch 중 world/memory/snapshot/구조 변경을 끼워 completeness가 불명확하면 full로 내려가고 누락 상태를 ACK하지 않는지 확인.
- 같은 project의 copy/import/attach/materialize와 실행 중 export 경합; 외부 generation/digest 변경 시 원본 보존.
- 내부 import는 한 read snapshot의 모든 entry를 가져오며 full/patch publish 전후 내용 혼합이 없는지 검증.
- macOS/Windows/Linux 실제 packaged runtime에서 단일 native writer, locked file 실패/재시도, rename fallback, crash journal 복구 검증.
- 소규모와 큰 project에서 package read bytes, generated JSON bytes, SQL write bytes, wall time, main event-loop delay 측정. Chapter patch의 hit rate와 `forceFull` 사유도 함께 보아 평균 개선을 판단.

기존 `luieDbLossRecovery.test.ts`는 먼저 `flushPendingExports()`를 완료한 뒤 DB를 지우고 package를 reimport하는 시나리오다. 이 테스트의 존재가 “아무 때나 main DB를 삭제해도 손실 없음”을 증명하지 않는다. 기존 `projectExportQueue.test.ts`, `manualSaveHandler.test.ts` 등은 queue/호출 계약의 근거로 읽었으나 이번 작업에서 재실행하거나 통과했다고 주장하지 않는다.
