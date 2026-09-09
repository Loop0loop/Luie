# Luie DB·저장·검색·동기화 심층 감사

판정: **Risky**. 저장 완료 신호, 트랜잭션 격리, 파생 작업의 최신 세대 보장에 실제 소스로 재현한 결함이 있다. 성능상 가장 큰 공통 비용은 SQLite 엔진 자체보다 **한 번의 본문 변경이 전체 검색 재구축·전체 패키지 생성·전체 chunk 교체를 유발하는 작업 증폭**이다.

읽기 전용 감사. 애플리케이션/사용자 데이터/의존성/네이티브 모듈을 수정하지 않았다. 실험은 `/private/tmp` 및 SQLite `:memory:`만 사용했고 임시 DB와 임시 번들은 정리했다. 기준 런타임: macOS arm64, Node v22.23.0, 설치된 better-sqlite3가 보고한 SQLite 3.53.4. 이 수치는 Electron 배포판이나 Windows/Linux 실측값이 아니다.

## 실행 경로

1. `AUTO_SAVE` IPC → `AutoSaveManager.triggerSave` → pending map + mirror queue → debounce timer/interval/manual flush → `performAutoSave`.
2. `ChapterService.updateChapter` → 기존 canonical body 읽기/검증/키워드 추적 시작 → singleton better-sqlite3 connection에서 Chapter + ChapterBody + ChapterRevision + SearchDirtyQueue + MemoryBuildJob 쓰기 → direct search cache upsert → package export debounce 500 ms.
3. DerivedJobWorker는 OS thread가 아니라 **main의 500 ms setInterval**이다. 검색 dirty는 프로젝트 전체 cache rebuild. Memory source는 batch 선조회 후 job 사이 setImmediate; 각 job의 실제 chunk 변환/SQL 트랜잭션은 main에서 동기 실행한다.
4. Package export는 모든 챕터·엔터티·스냅샷·canonical memory를 읽고 JSON entry들을 만들고, 신규 SQLite `.tmp` 파일에 전체 내용을 동기 삽입한 후 rename한다.
5. Sync는 전체 로컬 bundle과 전체 원격 bundle을 모아서 merge → 전체 로컬 upsert 트랜잭션 → .luie persistence → 전체 원격 table POST를 수행한다.
6. 벡터 검색의 기본 경로는 utility process의 RAG이다. main은 기본값 `LUIE_VECTOR_SEARCH_UTILITY_ONLY=true`로 vector 검색을 생략한다. utility는 자체 better-sqlite3 연결을 열고 scalar `vec_distance_cosine`으로 검색한다.

## 우선 수정해야 할 확정 이슈

### DB-01 · P1 · 저장 완료가 새 pending 본문을 지운다 — 실제 함수 재현

- 위치: `src/main/manager/autoSave/autoSavePerformSave.ts:45`, `:60`, `:65`, `:69`; 호출부 `autoSaveManager.ts:192`, `:228`, `:239`.
- Trigger: A 본문 저장이 진행되는 동안 동일 chapter의 새 본문 B가 `triggerSave`로 도착한다.
- 원인: 저장 시작에 캡처한 pending=A를 await 후 무조건 `pendingSaves.delete(chapterId)`한다. B가 같은 키를 대체했는지 검사하지 않는다. 새 timer의 map entry도 지운다. debounce 경로는 project task queue를 통하지 않으므로 동시에 저장 호출되는 경우도 배제되지 않는다.
- 결과: A만 DB에 저장됐는데 B pending이 없어지고 saved event가 발송된다. B의 기존 timer가 나중에 실행돼도 pending을 못 찾는다. trigger 시 B mirror가 있었다 하더라도 A 완료 직후 old pending의 mirror를 다시 써서 복구 신호를 약화할 수 있다. mirror의 최종 상태는 interleave에 따라 달라지므로 이 부분은 별도 OS crash 재현이 필요하다.
- 최소 수정: 완료한 pending 객체 또는 generation이 현재 map과 같은 경우에만 삭제/타이머 정리/saved 처리. 새 세대가 있으면 유지해 반드시 후속 저장. chapter별 in-flight 처리는 기존 queue와 통합한다.
- 검증: `/private/tmp/luie-autosave-pending-repro.cjs`는 실제 `performAutoSave` 소스를 TS 변환해 실행했다. old save Promise 대기 중 map을 new payload로 바꾼 결과 `savedContents=['old payload']`, `newContentStillQueued=false`, `savedEvents=['c']`.

### DB-02 · P1 · DB 저장 실패가 수동 저장 성공으로 바뀔 수 있다 — 호출 경로 확정

- 위치: `autoSavePerformSave.ts:80`의 catch; `autoSaveFlushOps.ts:82`의 flush; `src/main/handler/writing/ipcAutoSaveHandlers.ts:55`.
- Trigger: 본문 DB update는 실패하지만 기존 DB 내용으로 패키지 export는 성공한다. 제약 오류/일시 SQLite 오류/DB와 package가 서로 다른 저장 장치인 상황 등이 가능하다.
- 원인: performAutoSave는 error event만 emit하고 `Promise<void>`를 정상 resolve한다. flush는 pending이 남았는지 또는 각 저장 결과가 실패인지 확인하지 않는다. MANUAL_SAVE는 flush가 끝나고 export가 true면 `{success:true,exported:true}`를 반환한다.
- 결과: Ctrl/Cmd+S의 성공 응답이 최신 본문의 저장 성공을 증명하지 않는다. pending은 남아도 사용자에게 성공 응답이 전달된다.
- 최소 수정: 내부 save는 실패를 호출자에게 전달하고 timer 경계가 이를 처리하거나, 명시적 결과를 반환해 flush가 실패/미저장 세대를 검사한다. 수동 저장은 해당 프로젝트의 요구 revision까지 DB에 반영됐음을 확인한 뒤 checkpoint한다.
- 기존 테스트: `tests/main/handler/manualSaveHandler.test.ts`는 flush를 항상 정상 resolve mock하고 checkpoint 실패만 검사한다. 실제 performAutoSave→flush→handler 실패 전파 검증이 필요하다. 이것은 호출 경로 확인이며 full handler 실패 주입 실험은 수행하지 않았다.

### DB-03 · P1 · async 수동 트랜잭션이 다른 도메인의 성공한 쓰기까지 rollback한다 — 실제 함수 재현

- 위치: `src/main/services/core/chapter/chapterWriteOperations.ts:235`–`:278`(BEGIN/await/COMMIT); 생성 경로도 `:88` 전후 동일 구조. `src/main/services/features/manuscript/chapterService.ts:34`의 queue는 chapter service만 보호한다.
- Trigger: chapter 트랜잭션의 await 사이에 다른 handler/파생 작업의 동일 singleton connection 쓰기가 실행되고 chapter 저장이 실패한다.
- 원인: better-sqlite3는 동기 연결인데 `BEGIN IMMEDIATE` 이후 여러 await로 JS 실행권을 양보한다. SQLite 트랜잭션은 async task가 아닌 connection 소속이다. 다른 도메인의 SQL이 열린 chapter 트랜잭션에 합류한다. chapter 전용 queue는 다른 도메인 접근을 직렬화하지 못한다.
- 결과: 다른 도메인이 성공으로 인식한 변경이 chapter ROLLBACK에 같이 취소된다. 다른 수동 BEGIN은 nested transaction 오류가 날 수 있다. 잠금 보유 시간도 비동기 작업 지연에 노출된다.
- 최소 수정: 준비/검증/해시/외부 IO를 트랜잭션 앞에서 마치고 `store.transaction(tx => { ...run(); ... })`의 동기 callback 안에 DB 변경만 모은다. helper도 명시적 tx를 전달받고 동기 SQL로 실행한다. async callback을 그대로 drizzle transaction에 옮기면 해결되지 않는다.
- 검증: `/private/tmp/luie-chapter-tx-repro.cjs`. 실제 updateChapterRecord/contentStore/derivedJobs와 native SQLite 사용. BEGIN 이후 microtask에서 unrelated domain INSERT 성공 후 revision INSERT에 실패 trigger 주입. 최종 `otherDomainWriteCompleted=true`, `otherDomainRowsAfterChapterRollback=0`, chapter는 old로 rollback. 환경 초기화/로그/검증 부수효과/package만 격리했다.

### DB-04 · P1 · 작업 도중 새 본문이 와도 이전 내용을 completed로 확정한다 — 실제 함수 재현

- 위치: `memoryProjectionService.ts:99` source batch 조회 → `:108` setImmediate → `:110` claim → `:114` old sourceMap → `:212` completed update. `chapterDerivedJobs.ts:69` 전후 upsert; `memoryJobConstants.ts:36`의 dedupe status에 pending/running/failed/paused 포함. `jobControl.ts:112` claim은 id/status만 검사.
- Trigger: worker가 source A를 읽은 뒤 양보한 시점 또는 다른 job을 처리하는 동안 같은 source가 B로 저장된다.
- 원인: 새 enqueue는 기존 job의 priority/updatedAt만 바꾼다. worker가 처리한 source generation/hash와 현재 canonical generation을 완료 단계에서 비교하지 않는다.
- 결과: DB body는 B인데 chunks는 A이고 해당 source의 pending chunk job은 0이다. summary/embedding도 running job을 같은 방식으로 덮으므로 일반적인 세대 관리 결함이다. 검색 dirty도 `dbMaintenanceService.ts:334` rebuild 후 `:345` id만 조건으로 completed를 덮는 구조다.
- 최소 수정: enqueue generation/source hash와 worker가 claim한 generation을 구분한다. 완료는 같은 generation에서만 확정하고 새 generation이면 pending 유지/재enqueue. source를 claim 뒤 읽는 것은 창을 줄이지만 전체 해결은 아니며, 완료 시 CAS가 필요하다.
- 검증: `/private/tmp/luie-db-source-repro.cjs`는 실제 memoryProjectionService/chapterDerivedJobs/jobControl/sourceRows를 실행한다. source 선조회 이후 setImmediate 지점에 새 body+enqueue를 삽입했더니 body=`new unsaved-to-index text`, chunk=`old original text`, remainingPendingChunkJobs=0.

### DB-05 · P1 · 한 chapter dirty가 전체 프로젝트 FTS 재구축을 유발한다 — 경로 확정 + 합성 성능 재현

- 위치: `dbMaintenanceService.ts:303` queue 조회 → `:316` project grouping → `:334` `rebuildProjectIndex(projectId)`; `chapterSearchCacheService.ts:373` rebuild; `chapterWriteOperations.ts:301` 직접 단건 cache upsert도 존재.
- Trigger: 자동 저장으로 chapter 하나의 내용이 바뀌고 worker가 검색 dirty를 처리한다.
- 원인: sourceId는 큐에 보관하지만 실제 처리에서는 사용하지 않고 모든 chapter 본문을 조회해 cache를 지운 뒤 다시 넣는다. 직전 저장에서 수행한 단건 upsert도 중복된다.
- 복잡도: 저장 1회가 프로젝트 전체 본문 B에 비례하는 text copy/tokenization과 C개 chapter 쓰기를 유발한다. package export도 같은 시점 근처에 동작하여 IO와 GC가 겹친다.
- 최소 수정: chapter dirty는 해당 sourceId들만 upsert/clear하고 명시적 `search:rebuild-all`만 전체 rebuild한다. 직접 fast-path와 dirty worker 중 검색 cache의 실제 write owner를 하나로 정리한다.
- 검증: 기존 `dbMaintenanceService.test.ts`는 한 chapter가 완료되는지만 검사한다. 300/1,200 chapter 프로젝트에서 1개 수정 후 FTS INSERT 수가 1인지, 관련 없는 row가 보존되는지 확인해야 한다.

### DB-06 · P1/P2 · FTS rebuild는 O(C²) id scan + 개별 commit을 main에서 실행한다 — 합성 측정

- 위치: `chapterSearchCacheService.ts:82`–`:96`, `:397`–`:426`; `src/main/database/cache/fts5Schema.sql:3`–`:4`; `cacheDb.ts:83`–`:87`.
- 원인: FTS chapterId/projectId는 UNINDEXED다. 각 syncFtsDocument가 `DELETE ... WHERE chapterId=?` 후 INSERT하며 둘을 묶는 transaction도 없다. 프로젝트 clear 직후 신규 rebuild인데 각 chapter의 DELETE까지 반복한다. `Promise.all`은 이 동기 SQL 루프를 병렬화하거나 event loop에 양보하지 않는다.
- 복잡도/증상: 누적 C개 FTS rows를 chapter마다 scan하므로 rebuild의 id lookup 부분은 O(C²). FULL/WAL autocommit과 FTS update가 main을 점유한다. 다른 프로젝트 row가 많을수록 scan 범위도 늘 수 있다. FTS row count도 모든 프로젝트 cache를 scan한다.
- 측정: 실제 설치 native SQLite, 동일 FTS schema, WAL/FULL, chapter당 5,625 UTF-8 bytes의 합성 데이터. 300장 현행 패턴 52.05 ms → transaction+clear 뒤 불필요 DELETE 제거 12.00 ms; 1,200장 493.30 ms → 54.32 ms. 이것은 FTS 단계만의 단일 합성 실행이며 Electron UI latency나 안정적 speedup 비율로 일반화할 수 없다.
- EXPLAIN: chapterId 조회는 `SCAN ChapterSearchDocumentFts VIRTUAL TABLE INDEX 0:`.
- 최소 수정: 전체 rebuild는 transaction 안에서 project clear + prepared INSERT 반복. 단건은 일반 projection의 rowid와 FTS rowid를 연결해 O(1) delete/update 경로를 사용. 먼저 DB-05의 전체 작업 범위를 줄이는 것이 더 큰 수정이다.
- 검증: `/private/tmp/luie-db-audit-check.cjs`. 실제 앱에서는 SQL statement/commit 수와 main event-loop p95/p99를 별도 측정.

### DB-07 · P1 · 1,000행 초과 원격 table이 조용히 누락될 수 있다 — 설정 조건부 확정

- 위치: `src/main/services/features/sync/repository/http.ts:64`–`:80`; `repository/index.ts:31`–`:41`; `supabase/config.toml:18`의 `max_rows=1000`.
- Trigger: 한 사용자의 chapters/memory_canonical_rows/tombstones 등 table 하나가 서버 응답 상한을 넘는다.
- 원인: select=* GET 한 번만 요청하고 Range/limit-offset/cursor/안정적 order/Content-Range 종료 확인이 없다.
- 결과: 서버가 정상 200/206으로 일부 행만 보내도 complete bundle로 취급한다. 새 기기 복원이나 충돌/삭제 판정이 누락될 수 있다. 1,000은 로컬 repo Supabase 설정이며 현재 클라우드 설정은 확인하지 않았다.
- 최소 수정: 안정적 keyset 또는 Range pagination으로 전체 수집을 보장한다. 가능하면 후속 delta sync의 updatedAt+id cursor와 연결한다. 원격에서 실제로 삭제됐다고 임의 추론해서는 안 된다.
- 검증: fetch mock에서 1,001/2,001행 및 tombstone을 페이지별 반환하고 전부 복원되는지. `syncRepository.test.ts`의 확인한 테스트는 빈 table/snapshot 제외/payload 필드 중심이고 pagination 경계를 검증하지 않는다.

## 구조적 성능·보관 문제

### DB-08 · P2 · 동일 chunk까지 재임베딩: hash 재사용이 상위 DELETE로 무효화된다 — 실제 함수 재현

- 위치: `memoryProjectionService.ts:139`–`:158` source chunk 전체 DELETE + 새 UUID; `src/main/database/schema/memory.ts:128`–`:132` embedding FK cascade; `embeddingProjector.ts:209`–`:237` chunkId keyed hash/model 비교.
- Trigger: chapter 하나가 변경되거나 동일 내용에 대한 명시적 rebuild가 실행된다.
- 결과: 불변 chunk까지 삭제되면서 해당 embedding이 cascade 삭제되고, UUID가 바뀌어 contentHash가 같아도 재사용되지 않는다. 장이 길수록 CPU/모델/API 비용과 vector 공백 시간이 커진다.
- 최소 수정: source/순서와 content/index hash로 불변 chunk를 보존하고 바뀐 chunk만 교체한다. ID만 deterministic하게 바꾸는 것으로는 DELETE cascade를 막지 못한다. 동일 source hash는 전체 rebuild를 skip하되 title/indexText hash 변화도 포함해야 한다.
- 검증: 실제 함수 재현에서 동일 본문 유지인데 chunkIdChanged=true, unchangedContent=true, embeddingRowsAfter=0. 기존 memoryProjectionService 테스트는 검색/offset/window/episode enqueue를 검사하지만 동일 본문 ID/embedding 보존과 동시 enqueue를 검사하지 않는다.

### DB-09 · P2 · ChapterRevision이 모든 자동 저장의 전체 본문을 무제한 누적한다 — 경로 확정 + 저장량 측정

- 위치: `chapterWriteOperations.ts:262`–`:269`; `autoSavePerformSave.ts:60`; `src/main/database/schema/manuscript.ts:76`.
- 결과: 자동 저장도 reason=`manual_save`로 full revision INSERT한다. Chapter와 ChapterBody에도 같은 본문을 쓰고 hash를 2번 계산한다. 감사 범위의 runtime 소스에서 ChapterRevision reader/retention/prune를 찾지 못했다; chapter hard delete FK cascade만 있다. Snapshot retention은 별도 table이므로 이 이력을 정리하지 않는다.
- 측정: 64 KiB 본문 600회 revision 저장만으로 DB 약 39,665,664 bytes(37.8 MiB). 본문 크기×저장 횟수에 선형 증가한다. 실제 저장 간격에 대한 시간당 수치는 계산하지 않았다.
- 최소 수정: recovery 요구에 맞춰 revision을 시간/내용 변화 단위로 묶고 chapter별 보관 상한을 둔다. 먼저 autosave/manual reason을 구분하고 사용 중인 snapshot/복구 정책과 중복 여부를 결정한다. 사용자 이력을 감사 단계에서 삭제하는 것은 금지.
- 단기: contentHash를 한 번만 계산하고 전달; Chapter legacy content 이중 보관 제거는 기존 읽기 caller 전환을 모두 확인한 뒤 수행해야 한다(`chapterKeywords.rebuildProjectKeywordAppearances` 등 legacy reader 존재).

### DB-10 · P2 · 작은 변경마다 전체 `.luie`를 동기 재작성하며 불필요한 snapshot 본문도 먼저 읽는다

- 위치: `projectService.ts:48`, `:461`; `src/shared/constants/runtime/interactionTiming.ts:4`(500 ms); `projectExportEngine.ts:71`, `:85`, `:90`, `:91`; `exportEngine/projectRecord.ts:43`, `:82`; `projectExportPayload.ts:137`; `luieSqliteContainer.ts:228`–`:273`.
- Trigger: attached .luie 프로젝트에서 연속 저장/엔터티 변경. debounce는 호출 수만 줄이고 각 export 비용은 줄이지 않는다.
- 원인: 모든 chapter/body와 snapshots를 읽고 JS DTO/JSON entries로 확장한 다음 신규 SQLite 파일 전체를 쓴다. snapshot export limit은 SELECT가 아니라 모든 snapshot을 map한 뒤 slice한다. 읽기엔 legacy Chapter.content와 bodyContent도 함께 선택한다.
- 결과: 단일 변경 Δ가 전체 package bytes B의 읽기/직렬화/쓰기/원자 교체로 증폭된다. 동기 transaction은 main을 점유하며 peak JS heap/native SQLite page cache가 커진다. 변경이 export보다 빠르면 queue runLoop는 dirty revision이 없어질 때까지 연속 전체 export한다.
- 최소 수정 순서: snapshot limit을 SQL에 적용, 중복 legacy body projection 제거 → 기존 package entry writer 기반으로 변경 entry+meta를 한 transaction에 갱신하는 안전성 검토 → 전체 export가 필요한 checkpoint/Save As는 IO worker로 이동. 파일 포맷/복구 보장을 버리고 synchronous=OFF로 숨기지 않는다.
- OS: Windows에서 파일 교체/백신/동기화 드라이브, macOS 외장 볼륨, Linux 느린 filesystem에 각각 확대 가능하지만 실측하지 않았다. atomic replace 실패 경로는 해당 OS에서 별도 crash test 필요.

### DB-11 · P2 · 모든 sync가 전체 로컬·원격 자료를 다시 upsert한다

- 위치: `syncRunExecutor.ts:66`, `:127`–`:128`; `syncBundleHelpers.ts:79`, `:100`, `:120`; `syncBundleApplier.ts:96`–`:123`; `syncLocalApply.ts:95`–`:143`; `repository/http.ts:118`.
- 원인: local/remote/merged bundle이 동시에 보관되고, 변하지 않은 chapter까지 select→update + ChapterBody upsert + SHA256. direct revision trigger는 값이 같은 Chapter/Body UPDATE에도 project revision을 올린다(`projectRevisionTriggerSql.ts:61` 전후, `:116` 전후). 이후 패키지 persistence와 remote JSON.stringify/POST도 전체 범위다.
- 결과: 쓰지 않은 프로젝트까지 IO/CPU/네트워크/GC 비용을 낸다. 대용량 content 배열과 serialized body가 함께 존재한다. table별 전체 POST가 커지면 서버 payload/timeout 한계도 받는다.
- 최소 수정: 현행 baseline/hash/updatedAt으로 변하지 않은 row를 로컬 write와 원격 payload에서 제외한다. 그 다음 table별 제한 크기 batch와 cursor 기반 delta fetch. 우선 whole bundle 방식에서 no-op sync가 실제로 no-op인지 검증한다.
- 별도 미검증 경쟁: remote fetch 대기 중 local snapshot 이후의 편집을 merged bundle이 덮는지 CAS/revision 검증을 추가 점검해야 한다. 현재 package persistence의 capturedRevision은 apply 후에 캡처되어 apply 이전 stale local overwrite를 막는 증거가 아니다. 이 경쟁은 이번 실제 함수 재현에는 포함하지 않았으므로 확정 결함 수에 넣지 않는다.

### DB-12 · P2 · 500 ms idle polling이 완료 이력까지 scan하고 재시도 불가 작업이 뒤 작업을 막는다

- 위치: `derivedJobWorker.ts:36`, `:127`; `dbMaintenanceService.ts:303`–`:311`, `:423`–`:429`, `:442`; `memoryProjectionService.ts:85`–`:93`; `embeddingProjector.ts:88`–`:100`; `schema/search.ts:20`, `schema/memory.ts:71`.
- Index 문제: global status 조회에 맞는 leading status/ready index가 없고 SearchDirtyQueue의 기존 index는 projectId/status와 sourceType/sourceId다. terminal history는 orphan purge 외 retention이 없다. 완료 건이 커져도 매 500 ms 조회/long-pending count가 반복된다.
- EXPLAIN/측정: SearchDirtyQueue 100,000행 중 pending10을 요청하면 `SCAN SearchDirtyQueue`, `USE TEMP B-TREE FOR ORDER BY`. 30회 평균 2.469 ms; runnable partial index(updatedAt WHERE status IN pending/failed) 추가 후 0.013 ms. 합성 in-memory 측정이며 disk cold cache 미측정.
- Starvation 문제: SQL LIMIT를 먼저 적용한 뒤 JS에서 attempts>=5 실패를 제거한다. 오래된 terminal failed가 `max(limit*3,30)`개 앞에 있으면 뒤 pending이 계속 선택되지 않는다. memory/embedding의 동일 후보 패턴에도 적용된다. 기본 search limit50이면 150개 exhausted failed가 앞을 점유할 수 있다. enqueue가 failed dedupe 시 attempts/status를 reset하지 않는 점도 새 내용의 재시도를 막는다.
- 최소 수정: 실행 가능 조건(terminal attempts/backoff 포함)을 SQL WHERE에서 적용하고 그 쿼리에 맞는 partial/composite index를 EXPLAIN으로 정한다. completed/terminal history는 별도 보관 정책. 작업 enqueue 신호로 깨우고 완전 idle 시 backoff하면 OS 공통 배터리 비용 감소. 새 내용을 위한 retry generation은 실패 세대와 분리한다.
- 검증: exhausted failed를 후보 수 이상 만든 뒤 pending1을 넣어 처리되는지. 조건 구조는 확정, 해당 starvation은 이번 actual-source script에서 실행하지 않았다.

### DB-13 · P2 · 키워드 추적이 출현 횟수만큼 SQL/commit과 중복 최초 등장 조회를 실행한다

- 위치: `chapterContentValidation.ts:106` 전후 fireAndForget; `src/main/services/features/manuscript/chapterKeywords.ts`의 trackKeywordAppearancesInternal/updateCharacterFirstAppearance/updateTermFirstAppearance; `appearanceCacheService.ts:49`, `:71`, `:145`.
- Trigger: 같은 인물/용어가 수백~수천 번 나오는 장을 저장한다. 같은 본문 no-op 판단(`chapterWriteOperations.ts:223`)보다 검증/keyword dispatch가 먼저 실행된다.
- 원인: chapter appearance를 모두 삭제한 뒤 occurrence별 INSERT 반환을 await하고 매번 main entity firstAppearance를 SELECT한다. `characters.find`/`terms.find`도 각 occurrence마다 선형 탐색한다. 최초 등장 때는 entity마다 immediate full package export까지 await한다.
- 결과: occurrence M개에 cache INSERT M개+main SELECT M개, FULL autocommit과 O(M·E) entity 탐색. fireAndForget은 실행 프로세스/스레드를 바꾸지 않으며 저장 실패보다 먼저 cache/firstAppearance를 갱신할 수 있다.
- 최소 수정: no-op 여부를 먼저 확인하고 committed content만 derived worker에 전달; 이름→entity Map, appearance bulk transaction, firstAppearance는 unique entity마다 1회 conditional UPDATE, package export 1회 coalesce.
- 검증: 같은 인물이 1,000번 등장한 본문 저장 시 statement/commit 수와 저장 실패 후 cache 일관성. 이 항목은 구조 확인이며 성능 실측은 미수행.

### DB-14 · P2 · 저사양 검색 policy의 vector skip이 runtime에 연결되지 않았다

- 위치: `searchOptimizationPolicy.ts:42`, `:132`; `chunkSearch.ts:156`; caller `chunkOperations.ts:40`, `contextAssembler.search.ts:268`.
- 사실: low-end는 vectorSearchMode=`skip-when-lexical-hits`를 선언하지만 값의 runtime consumer가 없다. searchHybrid input에는 mode 자체가 없고 extension/process/embedQuery만 검사한다. utility의 lexical hit가 있어도 query embedding+vector SQL을 실행한다. rerankCacheTtlMs는 benchmark에서 읽지만 runtime에 실제 cache 적용은 확인되지 않는다.
- 최소 수정: 이미 정의한 policy를 shared search executor까지 전달하여 lexical hit가 기준을 충족하면 vector/embedding을 건너뛴다. ranking 품질 변화는 low-end 요구 기준으로 검증.
- 조건: 기본 main 경로는 process guard로 이미 vector skip한다. 이 문제는 vector enabled utility/RAG 및 override 경로에 해당한다.
- 검증: low-end+lexical hit+vector-enabled utility 환경에서 embed call=0인지. profile 숫자만 검사하는 `tests/main/services/search/searchOptimizationPolicy.test.ts`와 실제 검색 경로 검증을 연결한다.

## 추가 관찰: 측정 후 결정

- **동기 adapter**: main과 cache는 better-sqlite3이고 `.all/.get/.run`이 호출 thread에서 동기 실행된다. async 함수/Promise.all 표기는 비차단 IO의 근거가 아니다. `busy_timeout=5000`은 lock 경쟁 시 main이 그만큼 응답하지 못할 여지를 주며 `runWalCheckpoint(FULL)`/integrity_check도 동기다. 그렇다고 모든 단건 SQL을 즉시 IPC worker로 옮겨 메시지 비용을 늘릴 이유는 없다. 위 작업 증폭/transaction 오류를 먼저 고치고 큰 batch/export/index를 작업 소유 process로 옮기는 게 우선이다.
- **벡터 실제 구조**: `chunkSearch.ts:283`은 project/dimension/current hash로 필터 후 native scalar cosine 거리 전체 계산+top-K다. persisted vector 전체를 JS로 읽어 cosine 계산하는 runtime fallback은 찾지 못했다. extension 미가용이면 FTS로 fallback한다. 따라서 “JS 전체 벡터 materialization”을 현행 결함으로 보고하면 안 된다. O(N·D) exact scan 확대 시 utility latency와 memory bandwidth를 측정하고, 후보 한정 또는 기존 sqlite-vec의 다른 검색 방식을 검토하되 새 ANN dependency를 우선 도입하지 않는다.
- **단건 package entry transaction**: `luieSqliteContainer.ts:347`–`:359`는 entry/meta/container timestamp를 세 개의 autocommit으로 갱신한다. `handler/system/fs/fsPackageOperations.ts:208` 실제 caller가 있다. 한 transaction으로 묶으면 commit 감소와 atomic consistency를 같이 얻는다. canonical 전체 export와 달리 이 경로의 crash 일관성은 미검증.
- **과대 bulk IN/VALUES**: chapterSearch rebuild는 모든 chapter를 하나의 INSERT VALUES에 넣고 sync/memory는 모든 id를 IN에 넣는 부분이 있다. 매우 큰 프로젝트에서 SQLite bound variable limit을 넘을 수 있다. 정확한 threshold는 런타임 compile option과 실 SQL bind 수에 따라 다르므로 이번 보고서에서 특정 chapter 수를 보장하지 않는다. bounded batch 검증이 필요하다.
- **snapshot 보관**: Snapshot에는 별도 retention/prune가 구현되어 있고 AUTO는 id/createdAt만 읽는 경로도 있다. 문제는 그 정책이 ChapterRevision에 적용되지 않고 export 전에는 모든 snapshot body를 읽는다는 점이다.

## 이미 적용된 유효한 구조

- Chapter list/trash list는 metadata DTO로 본문을 보내지 않는다(`chapterService.ts` getAllChapters/getDeletedChapters). 이 경계를 유지해야 한다.
- main/cache WAL, foreign_keys=ON, explicit busy timeout; authoritative DB FULL은 저장 안정성 목적이므로 단순 OFF/NORMAL 전환으로 속도만 올리면 안 된다. cache는 regeneration 가능한 전용 table이어서 transaction 정리 후 durability tuning을 따로 검토할 수 있다.
- package export queue의 debounce/dirty revision/captured revision 재확인, path별 write lock, 임시 파일+교체, startup stale export recovery가 있다. 이 장치를 지우는 최적화는 부적절하다.
- memory chunk rebuild는 job별 동기 transaction이고 job 사이 setImmediate가 있다. 문제는 chunk 단위 재사용과 세대 비교이지 “worker에 yield가 하나도 없다”가 아니다.
- utility에 실제 모델/embedding/RAG가 분리되어 있으며 벡터 guard도 존재한다. SQL 전체를 main에서 돌린다는 포괄 주장은 정확하지 않다.
- 정상 bulk 읽기 JOIN/Map grouping과 bounded search result도 여러 곳에 이미 있다. 현재 helper들을 재사용하면 됨.

## 검증 산출물과 재실행

모든 스크립트는 사용자 데이터 대신 synthetic fixture를 사용한다. 실제 소스 관련 스크립트는 현재 checkout의 파일을 매번 읽고 설치된 TypeScript/esbuild를 사용한다. 의존성 설치나 rebuild는 하지 않는다.

```sh
node /private/tmp/luie-autosave-pending-repro.cjs
NODE_PATH=/Users/user/Luie/node_modules node /private/tmp/luie-chapter-tx-repro.cjs
NODE_PATH=/Users/user/Luie/node_modules node /private/tmp/luie-db-source-repro.cjs
node /private/tmp/luie-db-audit-check.cjs
```

결과 파일:

- `/private/tmp/luie-autosave-pending-repro-results.json`
- `/private/tmp/luie-chapter-tx-repro-results.json`
- `/private/tmp/luie-db-source-repro-results.json`
- `/private/tmp/luie-db-audit-results.json`

기존 테스트는 caller/보장 범위 확인 목적으로 읽었으며 이 하위 감사에서 전체 vitest/qa:core를 실행하지 않았다. root가 수행한 테스트 결과와 합쳐야 한다. 확인한 테스트: dbMaintenanceService, memoryProjectionService, chapterService, manualSaveHandler, autoSaveManager.runtimeStats, syncRepository, syncBundleApplier.commitOrder, syncPackagePersistence.retry 관련 내용.

## 권장 순서와 범위 제한

1. 저장 세대/실패 전달/동기 transaction/derived generation을 먼저 수정한다. 병목을 다른 process로 옮기기 전에 최신성 및 성공 신호를 보장한다.
2. chapter dirty 단건 처리, FTS transaction/rowid, 불변 chunk 보존, revision retention을 적용하고 같은 부하에서 SQL count·commit count·main event-loop p95/p99·heap/external/RSS·DB/WAL/package bytes를 비교한다.
3. package/export/sync의 변경 범위를 줄이고 적절한 worker에 무거운 batch를 이전한다. 단일 canonical DB writer, read-only utility connection 등 ownership은 migration/새 writes/cancellation/shutdown과 함께 설계한다.
4. Windows/macOS/Linux에서 동일 corpus/행 수/저장 주기/동기화 backlog로 실기기 cold+warm, battery+AC, slow disk/crash, lock contention을 검증한다.

이번 감사는 주요 저장·DB/FTS/chunk/embedding·package·sync 경로를 종단 추적했다. 모든 memory entity/eval/summary SQL의 각 statement, 클라우드 PostgreSQL EXPLAIN/RLS/index/실서버 설정, OS별 실사용 IO latency, 배포판 Electron profiler/heap snapshot은 전수 측정하지 않았다. 검토한 코드와 재현 결과를 “전체 코드에 버그가 더 없다”는 보장으로 해석하면 안 된다.
