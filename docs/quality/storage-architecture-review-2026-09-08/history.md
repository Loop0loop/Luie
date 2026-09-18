# 저장·이력·복구 구조 재검토

조사 범위: autosave → Chapter/ChapterBody/ChapterRevision → snapshot DB/외부 artifact → .luie, mirror/emergency, 검색 및 memory 파생 데이터. 제품 코드·사용자 DB 수정이나 실앱 실행 없이 현재 소스와 호출 경로를 대조했다. code-review-graph 도구가 세션에 없어 scoped rg/read를 사용했다. 모든 경로는 `/Users/user/Luie` 기준이다. 이 문서의 “확정”은 소스 수준 계약 확인이며, 실제 전원 단절·디스크 고장 내구성 측정으로 확대 해석하지 않는다.

## 1. 사용자의 “나중에 합쳐서 저장하고 스냅샷을 만든다”는 이해는 일부만 맞다

합쳐지는 것은 **대기 중인 요청**이다. 같은 챕터의 최신 미처리 문자열, 같은 프로젝트의 export 요청, 동일 대상의 파생 작업을 합친다. 이미 저장된 여러 변경분을 나중에 delta로 합치는 구조는 아니다. 현재는 저장할 때마다 **챕터 전문**을 여러 곳에 기록하며, .luie export와 외부 snapshot은 **프로젝트 데이터를 다시 모아 전체 직렬화**한다.

정상 경로의 시간 순서:

1. Renderer에서 전달된 `AUTO_SAVE`는 main `triggerSave`가 받아 pending map의 해당 챕터를 최신 본문으로 바꾼다. `latest.snap` mirror 쓰기도 즉시 비동기 요청한다. IPC 응답은 accepted이며 디스크 저장 완료가 아니다. `ipcAutoSaveHandlers.ts:41`, `autoSaveManager.ts:192`.
2. 마지막 main 요청 뒤 기본 **200 ms**에 `performSave`가 챕터 전문을 `updateChapter`로 전달한다. 같은 챕터 pending 요청은 debounce 동안 병합되지만 이미 시작된 write를 delta로 합치지는 않는다. `autoSaveManager.ts:228`, `autoSavePerformSave.ts:60`.
3. DB transaction은 **Chapter.content 업데이트 + ChapterBody 전문/hash upsert + ChapterRevision 전문 INSERT**를 수행하고 검색 dirty 및 memory 작업을 넣는다. `chapterWriteOperations.ts:235`, `:257`, `:262`, `:272`.
4. DB 저장 경로는 `chapter:update`로 **500 ms** 프로젝트 export를 예약한다. `projectService.ts:48`, `:461`; `interactionTiming.ts:4`. ProjectService 생성자가 이 상수를 queue에 직접 전달한다(`projectService.ts:101`). 이 경로에서 별도 5초 override는 없다.
5. `performSave`는 저장 완료 event를 보내고 같은 전문의 latest mirror를 다시 요청한 뒤 자동 snapshot gate를 검사한다. `autoSavePerformSave.ts:69`.
6. Gate를 통과하면 snapshot job이 **외부 프로젝트 artifact 작성 → DB Snapshot 전문 INSERT → Project.updatedAt 변경 → snapshot:create export 재예약 → retention → timestamp mirror 작성**을 수행한다. `autoSaveSnapshotJobs.ts:78`, `snapshotService.ts:121`.
7. `.luie` queue가 실행될 때 모든 현행 챕터·세계관·canonical memory·선택된 snapshot을 다시 모아 package writer에 준다. 변경된 챕터만 증분 반영하는 호출 계약은 아니다. `projectExportEngine.ts:71`, `:85`, `:154`.

따라서 “DB는 완전히 버려도 되는 cache”라고 할 수 없다. 마지막 package checkpoint 이후 최신 성공 저장은 DB에 먼저 존재하며, ChapterRevision은 package에 포함되지 않는다. `.luie canonical + DB cache`라는 문서상 목표와 **현재 동작 중 권위**를 분리해야 한다. 현실적으로는 “DB의 현재 작업본 + .luie의 배포/이동 가능한 checkpoint + 미저장 수신분의 recovery mirror”이다.

## 2. 실제 병합 범위와 전문 쓰기 범위

| 계층 | 합치는 내용 | 실행될 때 기록되는 내용 | 현재 정리/휴대 범위 |
|---|---|---|---|
| pendingSaves | 챕터별 대기 중 요청을 마지막 본문으로 교체 | 전문 문자열 1개 | RAM, 종료 전 flush 필요 |
| mirror queue | 쓰기 중 새 요청이 여러 개 오면 다음 대기 payload를 최신으로 교체 | gzip JSON 챕터 전문 | latest 1개/챕터; 본문 hash dedup 없음 |
| Chapter + ChapterBody | 동일 content-only 업데이트는 equality return 가능 | 같은 현행 전문이 두 테이블에 저장 | 로컬 DB, .luie는 챕터 파일 1개로 전송 |
| ChapterRevision | 병합 없음 | 성공 content 업데이트마다 전문 append | reader/prune/export 없음; hard-delete FK cascade |
| SearchDirtyQueue/MemoryBuildJob | 동일 대상 pending/running 작업을 갱신 | 작업 메타데이터, 전문 revision 아님 | 파생 작업; package 미포함 |
| Snapshot | gate로 빈도를 제한할 뿐 이력 본문 병합 없음 | chapter 전문; 프로젝트형은 timestamp marker | 로컬 DB 기본 project 전체 2000개 hard cap |
| 외부 FullSnapshot artifact | 압축 buffer 1개를 재사용해 파일 복제 | 모든 활성 chapter + characters/terms/settings/project + focus 전문 | 최대 3개 경로; DB snapshot 생존 여부에 따라 정리 |
| .luie export queue | 프로젝트별 dirty flag와 timer로 요청 합침 | 전체 현행 project payload + snapshot 선택집합 | 기본 최근 snapshot 50개; revision 미포함 |

동일 content-only 저장은 DB write를 건너뛸 수 있으나, content에 title/synopsis도 함께 붙는 호출은 `hasOnlyContentUpdate` 조건을 충족하지 않으므로 본문이 같아도 revision이 추가될 수 있다(`chapterWriteOperations.ts:218`). 전부 매 키마다 DB에 쓰는 것은 아니지만, debounce가 통과한 저장 횟수 S, 챕터 길이 C에 대해 revision 보관량은 대략 **O(S × C)**다.

## 3. 자동/수동 snapshot은 별도 조건이다

### 실제 AUTO_SAVE 뒤 gate

`autoSaveSnapshotGate.ts:42` 및 `shared/constants/storage/snapshot.ts` 기준:

- key는 **projectId:chapterId**이며 last gate 이후 **60초** 미만이면 skip.
- 길이 **1 이상**일 때만 일반 자동 snapshot.
- 직전 gate의 32-bit rolling hash와 같으면 skip. 서버/DB에 저장된 최근 snapshot을 읽는 gate가 아니며 프로세스 RAM의 map이다.
- 변화량 ratio와 절대길이 조건이 `ratio < 0.0 && diff < 30`이다. ratio는 음수가 될 수 없으므로 **30글자 기준은 현재 실질적으로 작동하지 않는다**. 60초 뒤 다른 hash라면 같은 길이의 한 글자 교체도 snapshot 대상이다.
- 시간/hash/길이를 **생성 성공 전**에 갱신한다(`:64`). 실패해도 60초 gate는 소비되며 성공 watermark와 enqueue watermark가 섞여 있다.
- 첫 저장은 런타임 map이 비어 있으므로 최근 DB snapshot이 있어도 새 snapshot을 만들 수 있다. 이후 60초마다 무조건 만드는 것이 아니라 다음 성공 save가 gate를 다시 통과할 때 만든다.

### 별도 주기 스케줄러는 정의되어 있지만 실제 생산 호출을 확인하지 못함

`setConfig` → `startAutoSave`(기본 30초 pending flush interval) + `startSnapshotSchedule`(즉시 1회, 이후60초 프로젝트 snapshot) 구현은 있다(`autoSaveManager.ts:137`, `:310`, `:349`). 그러나 `src/main`, `src/preload`, `src/renderer`의 호출 검색에서 `setConfig/startAutoSave`를 실제 프로젝트 열기/설정 변경에 연결한 production caller가 없고, 테스트 `snapshotResilience.test.ts`에서만 직접 활성화한다.

따라서 현재 정상 생산 동작을 “설정된 30초 저장 / 매60초 프로젝트 전체 스냅샷”이라고 단정하면 안 된다. 확실한 경로는 **AUTO_SAVE trigger의 200 ms debounce + 저장 뒤 chapter gate**다. dormant scheduler를 새로 연결하면 기존 작업량에 프로젝트 artifact 생성이 추가된다.

프로젝트형 scheduled snapshot은 Snapshot.content에 `{timestamp}`만 저장하고(`autoSaveFlushOps.ts:65`) 외부 artifact에 프로젝트 데이터를 담는다. DB `restoreSnapshot`은 chapterId가 없는 project snapshot을 거절한다(`snapshotService.ts:326`). 프로젝트 snapshot과 chapter snapshot은 복원 방식도 다르다.

### 수동 snapshot / 수동 save / 강제 종료

- 수동 snapshot 버튼은 로드된 renderer chapter content를 `type:MANUAL`로 `SNAPSHOT_CREATE`에 보낸다. 직접 gate를 거치지 않는다(`SnapshotList.tsx:185`, `ipcSnapshotHandlers.ts:34`). 수동 snapshot이 Chapter 현재본을 먼저 flush하는 계약은 없다.
- `MANUAL_SAVE`는 main pending 전체 project를 flush한 뒤 지정 project package를 즉시 export한다(`ipcAutoSaveHandlers.ts:56`). snapshot 생성 자체를 의미하지 않는다. 다만 flush로 실행되는 각 autosave가 gate를 통과하면 snapshot job을 만들 수 있다.
- `flushCritical`은 그 시점 main pending에 잡힌 각 챕터를 latest mirror로 쓴 뒤 각 챕터의 Snapshot을 만든다(`autoSaveFlushOps.ts:119`, `:128`). 이 경로는 60초/최소길이 gate나 retention을 직접 적용하지 않는다. main에 아직 도착하지 않은 editor 상태는 이 계층이 구할 수 없다(기존 renderer 결함 보고서 참조).

## 4. snapshot 생성이 .luie 쓰기를 또 유발하는가

**그렇다. 단, 항상 즉시 별도 1회라는 뜻은 아니다.** `snapshotService.ensureImmediatePackageExport`라는 이름과 달리 결국 `persistPackageAfterMutation`로 들어가며, `snapshot:create`는 debounced reason 목록에 있다(`projectService.ts:64`, `:447`). 기존 `chapter:update` export timer가 아직 실행되지 않았으면 500 ms timer 재설정으로 합쳐질 수 있다.

하지만 artifact 작성이 500 ms보다 오래 걸리거나 package export가 이미 시작된 뒤 snapshot이 DB에 삽입되면 최초 chapter export와 후속 snapshot export가 나뉠 수 있다. 실제 반복 횟수는 프로젝트 크기와 scheduler 시점 측정이 필요하다. queue는 in-flight 동안 dirty/revision이 바뀌면 다음 full export를 수행한다. 자동 retention이 실제 삭제를 수행하면 `snapshot:delete-old`, prune은 `snapshot:prune`으로 즉시 export 경로를 호출한다(`snapshotRetention.ts:69`, `:162`). 수동 snapshot restore/delete도 즉시 export 대상이다.

`.luie` payload의 snapshot은 `projectExportPayload.ts:137`에서 전체 map을 만든 뒤 기본50개로 slice한다. `snapshotExportLimit <= 0`이면 전부 보낸다. DB의 2000개와 package의50개는 서로 다른 정책이다.

### package 내 snapshot 본문 이중 보관과 호환성

`luieContainerEntries.ts:97`은 `snapshots/index.json`에 **content를 포함한 전체 snapshot 배열**을 저장하며, `:110`은 같은 개별 snapshot 전체를 `snapshots/{id}.snap`에도 저장한다. 즉 .luie 내부의 snapshot 본문이 두 번 표현된다.

현재 repository importer `importOpen/collections.ts:289`, `:312`, `:332`는 **index.json만** 읽는다. 개별 snapshot file을 따라 읽는 정상 import 경로는 없다. 그러나 index의 content를 바로 제거해서 metadata-only로 만들면 `LuieSnapshotSchema.content`가 optional이라 validation을 통과하고(`projectLuieSchemas.ts:142`), `buildSnapshotCreateRows.ts`가 아니라 **`projectImportCodec.ts:213`**에서 누락 content를 빈 문자열로 바꾼다. 결과는 빈 snapshot으로 조용히 복구될 수 있다.

최소 위험 순서: 우선 full index를 유지한다. 개별 .snap의 repo importer 소비는 없으나 외부 도구/수동 추출 계약을 확인한 뒤 중복 제거를 검토한다. metadata-only index를 원하면 format version과 reader migration을 같이 설계하고, 과거 full-index package와 신규 per-file-body package의 양방향 읽기를 검증해야 한다. “index만 줄이면 된다”는 변경은 금지해야 한다.

별도 손실: export snapshot mapping(`projectExportPayload.ts:137`)과 import row(`projectImportCodec.ts:231`) 모두 type을 보존하지 않는다. 로컬 Snapshot.type의 default는 AUTO(`database/schema/snapshot.ts:14`)이므로 .luie로 DB를 재구성하면 **MANUAL 구분이 사라진다**. 수동 이력 보존 정책 설계 전 round-trip에서 type/pin/source를 보존해야 한다.

## 5. 복구 계층별 실제 용도와 빈틈

### Latest / timestamp mirror

- latest: userData/SNAPSHOT_MIRROR_DIR/project/chapter/latest.snap에 gzip JSON 전문. trigger 직후와 DB 성공 직후 둘 다 요청하므로 첫 쓰기가 완료된 경우 같은 content가 또 기록된다. pending queue 병합은 있지만 저장한 hash 비교는 없다. `autoSaveManager.ts:195`, `autoSavePerformSave.ts:70`, `autoSaveMirrorStore.ts:56`.
- timestamp mirror: 일반 자동 snapshot job 성공 뒤 한 번 + **200글자 이하** 입력에 한해 **5초** gate의 emergency micro mirror. 후자는 동일본문/빈본문도 길이 조건만 통과하면 가능하다(`autoSaveSnapshotJobs.ts:43`). 챕터 폴더별 최근50개이며 latest는 그50개에서 제외한다(`autoSaveMirrorStore.ts:93`).
- startup/shutdown 복구는 **latest.snap만** 찾는다. DB chapter가 없거나 deleted이면 해당 mirror directory를 정리한다. DB본문과 같거나 DB updatedAt보다 오래됐으면 skip, 최신 Snapshot.createdAt보다 오래돼도 skip. 더 새로운 미러는 chapter를 직접 덮어쓰지 않고 **선택 가능한 AUTO Snapshot으로 승격**한다(`autoSaveMirrorStore.ts:138`, `:191`, `:225`).
- 일반 recovery 후보 목록은 artifact roots만 탐색하므로 timestamp mirror는 정상 복원 UI에 연결되지 않는다(`artifacts/paths.ts:64`). 안전한 계층 감축 전에 “썼는가”뿐 아니라 “실제 사용자가 찾고 복구할 수 있는가”를 따져야 한다.
- mirror writer는 내부 catch로 실패를 로그만 남긴다(`autoSaveMirrorStore.ts:71`). `flushCritical`의 mirrored++는 Promise resolve를 success로 취급하므로 파일 내구성 성공의 증거가 될 수 없다(`autoSaveFlushOps.ts:121`).

### FullSnapshot artifact

`writeFullSnapshotArtifact`는 **매 Snapshot 생성마다** project/settings/활성chapters/characters/terms를 DB에서 읽고 입력 focus 본문을 추가해 stringify+gzip한다. 압축은 한 번이고 같은 buffer를 최대3곳에 쓴다(`snapshotArtifacts.ts:173`, `:239`, `:256`, `:277`, `:286`).

경로는 project 인접 `.luie/snapshots/projectid`, userData snapshot backup, project 인접 `backup{projectid}`다. 인접2곳은 대개 같은 volume이라 서로 다른 디스크 고장 영역을 뜻하지 않는다. 별도 이력 파일의 개수·읽기 부담은 대략 snapshot수 ×3이며, 자동 이력 DB hard cap2000까지 가면 해당 project의 생존 artifact도 최대6000개가 가능하다(경로가 모두 유효하고 쓰기 성공 시; 외부 환경 실측 아님).

**이름은 FullSnapshot이지만 현재 project의 모든 데이터를 담지 않는다.** `artifacts/types.ts:1`, `snapshotArtifacts.ts:194` 기준, factions/events/world entities/relations/world documents/drawing/scrap/canonical memory/ChapterRevision/이전 Snapshot history는 빠진다. 현재 full package serializer와 다른 오래된 스키마다. 독립 backup을 이 형식만으로 대체하면 해당 도메인의 보존이 깨진다.

또한 artifact `data.focus.content`는 미저장/긴급 본문일 수 있지만 importer는 `snapshot.data.chapters`를 생성하고 해당 content를 복구한다(`snapshotImportFromFile.ts:122`). focus의 실제 소비는 preview(`artifacts/preview.ts:24`)뿐이다. **DB chapter가 A, 긴급 focus가 B이면 복구 미리보기는 B이고 새 프로젝트 본문은 A가 되는 소스 경로**다. 자동 정상 save 뒤 snapshot에서는 A=B일 수 있지만 flushCritical, 미러 승격, 수동 snapshot은 다를 수 있다. 복구 규칙을 통합하기 전 이 차이를 없애야 한다.

### DB 손실과 orphan 정리의 충돌 가능성

Artifact orphan cleanup은 DB Snapshot.id 집합에 없는 UUID artifact를 unlink한다(`snapshotArtifacts.ts:109`, `:135`, `:149`). startup은 mirror 승격 뒤 prune와 전체 orphan cleanup을 병렬 실행한다(`deferredStartupMaintenance.ts:24`). 따라서 DB가 새로 만들어졌거나 package에서50개만 복구된 경우, userData에 남은 과거 backup artifact를 DB의 부재만으로 고아로 판정할 수 있다. 이것은 복구 저장소가 DB 인덱스와 독립적인 안전망이 아니라 DB 생존 집합에 종속된다는 뜻이다. 실제 DB 손실 전체 시나리오는 root의 격리 검증 범위이며, 여기서는 source-level 위험으로 구분한다.

**불변조건:** 복구 catalog 재발견/검증이 끝나기 전에는 빈 DB를 근거로 backup을 삭제하면 안 된다. 명시적 사용자 삭제와 “인덱스에 없음”을 구분한 tombstone, 유예 기간 또는 격리 디렉터리가 필요하다.

### Emergency JSON

Snapshot create 실패 시 userData mirror/_emergency에 전문 input + error를 JSON으로 남긴다. temp-write/file fsync/rename/directory fsync를 시도한다(`snapshotEmergencyFile.ts:18`). 이 파일은 최신 mirror scanner에서 `_emergency`를 제외하고, artifact 후보는 .snap만 찾으므로 정상 복구 발견 경로가 없다. scoped production search에서 이 형식 reader/retention도 확인되지 않았다. 실패 상태에서 무제한 파일 보관이 가능하고, 존재 자체가 사용 가능한 자동 복구를 보장하지 않는다. 당장 삭제하기보다 이 형식과 기존 파일을 읽을 수 있는 recovery importer를 먼저 마련해야 한다.

## 6. 이력 보존 정책이 서로 다르며 ChapterRevision은 사용되지 않는다

- AUTO Snapshot 시간 간격 prune: 24시간 이내 전부, 1–7일은 시간당1개, 7일 이상은 날짜당1개. **project 전체 기준**이며 chapter별 bucket이 아니다. 여러 챕터를 편집하면 오래된 동일 시간대에서 한 챕터의 snapshot만 남을 수 있다(`snapshotRetention.ts:100`, `:117`).
- deleteOld hard cap: project 전체 최근2000개, **MANUAL도 제외하지 않는다**(`snapshotRetention.ts:30`). 시간 prune이 MANUAL을 보호하더라도 hard cap은 삭제한다.
- package: 기본최근50개(프로젝트 전체), 선택 한도0이하는 전부. 오래된 manual snapshot도 자동 제외될 수 있다.
- timestamp mirror: 챕터별50개, latest 별도1개.
- 외부 artifact: 시간 policy 자체가 아니라 DB Snapshot존재/삭제에 연동.
- ChapterRevision: content update마다 전문 INSERT, `reason:manual_save`로 autosave까지 동일 표기. production `ChapterRevision/chapterRevision` 검색은 writer·schema·index metadata만 확인됐고 read/restore/prune/package mapping은 없다. chapter hard delete에는 FK cascade, soft delete는 바로 정리되지 않는다. 따라서 현재 비용은 발생하지만 사용 가능한 복구 기능으로 연결되지 않은 별도 append-only layer다.

권장 보존 정책은 `AUTO`와 `MANUAL/pinned`를 먼저 구분하고, AUTO는 **챕터별 최근 복구점 최소치 + 시간 버킷 + byte budget**을 같이 적용한다. MANUAL/pinned는 자동 cap/prune에서 제외하거나 명확한 별도 사용자 정책을 둔다. package로 이동할 때 보존되는 범위도 UI/포맷 계약에 명시해야 한다. 전체 프로젝트 snapshot이라면 project별 bucket이 가능하지만 지금 DB Snapshot은 대부분 한 챕터 본문이므로 같은 정책을 섞지 않는다.

## 7. 검색 cache와 memory는 “전부 버릴 수 있는 메모리”가 아니다

검색 `ChapterSearchDocument`는 별도 cacheDb에 title/synopsis/content를 합친 searchText를 저장하고 FTS에도 반영한다(`chapterSearchCacheService.ts:43`, `:91`, `:223`). `rebuildProject`는 ChapterBody 우선/Chapter legacy fallback으로 전체 project를 다시 만들 수 있다(`:373`, `:406`). 이 두 검색 표현은 **재생성 가능한 파생 데이터**이며 canonical 전문이나 이력 보존 역할을 맡기지 않는다.

다만 현재 hydration은 row 수를 비교하므로 본문만 변경돼 개수가 같으면 stale cache를 감지하지 못한다(`:339`, `:366`). snapshot restore는 Chapter/Body를 직접 변경하지만 일반 update의 검색/메모리 enqueue를 통과하지 않는다(`snapshotService.ts:342`). 복구·import·일반 저장 모두에 공통 **revision 기반 파생 데이터 invalidation**을 적용해야 cache를 안전하게 지우거나 재생성할 수 있다. 동일 count는 동일 버전의 증거가 아니다.

memory persistence policy는 명시적으로 두 가지를 분리한다(`memoryPersistencePolicy.ts:11`, `:25`):

- export canonical: MemoryEntity/Alias, Episode/Evidence, Fact/Evidence/Invalidation, EvalCase/Evidence/Entity/Relation 11테이블. Entity/Alias/Fact는 confirmed/rejected/deprecated 상태만 export하고, Fact evidence가 참조하는 Episode/Evidence 등을 함께 보낸다(`internal/buildPayload.ts:37`, `:133`, `:161`). 사람의 확인/기각과 근거 연결은 재생성 cache 취급하면 안 된다.
- regenerable: chunks, embeddings, build/search jobs, chapter summary, entity mention, episode extraction job/participant, state-change candidate, temporal state projections, narrative summary/source, eval run/result. Package에는 포함하지 않는다. 원문·canonical facts·model/version 등의 재생성 입력과 rebuild 진행 상태가 전제다.

`.luie`의 `memory/canonical.json`은 위 canonical subset을 포함하지만 외부 FullSnapshot artifact는 이 메모리 도메인을 포함하지 않는다. “스냅샷만 남기고 DB 지우기”와 “.luie checkpoint로 이동하기”의 보존 범위가 다르다.

## 8. 감축 순서와 지켜야 할 불변조건

불변조건:

1. **accepted, DB committed, recovery durable, package checkpointed를 분리**한다. 최신 revision/hash를 같은 요청에 연결하고 성공 UI가 어느 단계를 뜻하는지 명확히 한다.
2. 최신 commit 이후 DB 또는 package 중 적어도 하나의 검증된 복구 원본을 확보하기 전에 중간 layer를 삭제하지 않는다. detached project의 DB도 authoritative working copy다.
3. 원본과 snapshot은 일관된 revision의 모든 필수 도메인을 포함해야 하며 focus override는 실제 restore에도 적용한다. `FullSnapshot` 명칭만으로 보존 범위를 추정하지 않는다.
4. backup은 DB 손실 시에도 발견 가능해야 한다. 누락 인덱스만으로 삭제하지 않고 명시적 삭제/유예/검증을 거친다.
5. MANUAL type/pin, chapter linkage, content hash, schema version, 생성 revision을 round-trip으로 보존한다. index만 줄여 빈본문을 만드는 migration을 피한다.
6. 파생 데이터는 canonical commit과 같은 transaction에서 dirty revision을 남기고, rebuild 결과가 요청한 source revision과 일치할 때만 완료 처리한다.

실행 순서 제안:

1. 기존 renderer/main pending flush 결함을 먼저 해결한다(별도 감사 보고서). 저장 단계/오류 전달/세대 식별을 먼저 안정화해야 안전망 삭제 판단이 가능하다.
2. 현재 비용을 기능으로 정당화하지 못하는 **ChapterRevision**을 먼저 결정한다. 쓸 복구 API가 없다면 새 append를 중단하는 최소 변경을 검토하되, 이미 보유한 history는 즉시 삭제하지 말고 보존/추출 정책을 정한다. 쓸 계획이라면 Snapshot과 하나의 이력 모델로 통합해 동일 전문을 매 autosave 두 역사 테이블에 쌓지 않는다.
3. snapshot metadata(type/size/hash) round-trip을 보완하고 package 내 동일본문 이중저장을 포맷 계약 확인 뒤 제거한다. metadata-only index는 reader versioning과 함께 한다.
4. latest mirror는 DB commit 전 수신분을 구하는 목적을 명확히 유지하되, 같은 revision/content를 DB 성공 뒤 다시 쓰는 중복은 hash/revision ack로 제거한다. 반환값/오류를 보존해 emergency flush count가 실제 성공을 나타내게 한다.
5. timestamp mirror와 _emergency의 실제 recovery discoverability를 먼저 완성한다. 이후 duplicate timestamp mirror나 같은 디스크의 세번째 전체 artifact부터 감축한다. 존재하지만 UI에서 못 찾는 파일을 안전망 개수로 세지 않는다.
6. 외부 전체 snapshot과 package serializer를 공통 canonical payload 계약으로 맞춘다. 자동 chapter history는 chapter content-addressed blob + metadata로 작게 유지하고, 독립 프로젝트 backup은 명시적/저빈도 checkpoint로 운영하는 방안을 검토한다. 복구 기준점 없이 처음부터 delta-only 체계를 만드는 복잡한 설계는 피한다.
7. snapshot create + retention의 후속 package 작업을 동일 checkpoint로 묶고, 빈번한 derived-job 상태 변경은 export를 유발하지 않도록 revision domain을 분리한다. 관련 상세 queue/DB trigger 문제는 root/package agent 보고서와 합친다.

검증은 DB loss→package import, DB loss→외부 artifact, 미저장focus 복구, manual pin/retention, 구포맷full-index→신reader 및 신포맷metadata-index→구reader 거절, save→restore→검색 최신화, mirror write failure→오류전달을 합성 fixture로 확인해야 한다. OS별 실제 디스크/fsync/rename/권한/긴경로 및 전원실패 시험은 별도이며 소스 검토만으로 통과를 선언하지 않는다.

## 9. 검증 범위 및 기존 테스트 해석

이 재조사에서는 source call chain 및 schema/import/export mappings를 확인했고 추가 테스트를 실행하지 않았다(root 요청으로 중복 DB setup/벤치 실행을 피함). 제품 코드 수정 없음. root가 공유한 테스트 상태를 본 보고서의 신규 성공처럼 세지 않는다.

- `snapshotService.packageBehavior.unit.test.ts`: 현재 서비스는 Drizzle인데 mock은 구 Prisma API여서9중7실패. 이 테스트 실패만으로 package 저장 결함을 확정할 수 없다.
- `snapshotListProjection`은 root가 DB setup을 켜서 통과 확인.
- `luieDbLossRecovery`의 getAllChapters content 기대는 현재 metadata DTO와 맞지 않아 root가 임시 fixture에서 getChapter(id) 조회로 맞춰 원고·snapshot 본문 복원을 재검증했고 통과했다. 기존 assertion 실패를 본문복구 결함의 증거로 사용하지 않는다.
- dormant scheduler를 테스트에서 setConfig로 활성화하는 것은 production wiring의 증거가 아니다.

핵심 우선순위는 복구 권위와 보존 범위 정리(P1), focus/이력 type/backup orphan 처리의 복구 계약 보완(P1), 사용되지 않는 full revision/중복 full snapshot·package 기록 감축(P2), gate와 보존정책 단순화(P2)다.
