# .luie 저장 포맷·전체 재작성 비용·증분 저장 설계 재검토

조사일: 2026-09-08. 범위: 현재 실제 package writer/export collector/queue/reader와 관련 테스트. 제품 소스 및 사용자 DB는 수정·접근하지 않았고 앱을 실행하지 않았다. 아래 실험은 임시 synthetic `.luie`만 사용했다. 이전 전체 DB 감사와 중복되는 일반 병목은 줄이고, “SQLite로 바꾸었는데 왜 작은 변경도 전체 파일을 다시 쓰는가”에 집중했다.

**결론: SQLite 자체가 전체 재작성을 요구하는 것이 아니다. 현재 `.luie`는 프로젝트 정규화 DB가 아니라 기존 논리 파일을 SQLite의 `path → content TEXT` 행에 담는 컨테이너이고, exporter가 변경 경로 없이 프로젝트 전체를 수집한 뒤 새 SQLite 파일을 생성·교체하기 때문이다. 현재 v2 포맷을 유지하면서 entry 단위 저장으로 큰 비용을 줄일 수 있다. 다만 기존 단건 API는 여러 statement가 각각 커밋되어 그대로 자동저장에 연결하면 안 된다. 먼저 변경 entry 집합·meta·info를 하나의 동기 SQLite transaction으로 묶고, 수집 revision과 완료 ACK를 연결해야 한다.**

## 1. 실제 포맷과 JSON이 남는 위치 — 소스 확정

`src/main/services/io/luieSqliteContainer.ts:33`의 schema는 다음 두 테이블뿐이다.

- `LuieContainerInfo`: id=1, format, container, version, createdAt, updatedAt.
- `LuieContainerEntry`: path TEXT PRIMARY KEY, content TEXT, createdAt, updatedAt. updatedAt 보조 인덱스가 있다.

`Chapter`, `Character`, `Relation` 등을 정규화한 app DB schema가 이 파일 안에 들어가는 구조가 아니다. SQLite 외피 안에서 논리 경로가 기존 파일 이름 역할을 한다.

| entry | 현재 내용 | 변경 최소 단위 |
|---|---|---|
| `meta.json` | 프로젝트 metadata와 모든 장의 id/title/order/file 목록 | 전체 meta JSON |
| `manuscript/<id>.md` | chapter.content 문자열 그대로, 별도 Markdown 변환 없음 | 장 한 개 본문 |
| `world/characters.json`, `world/terms.json` | 전체 인물·용어 배열 JSON | 해당 collection JSON |
| `world/synopsis.json`, `plot.json`, `drawing.json`, `mindmap.json`, `scrap-memos.json`, `graph.json` | 문서별 JSON | 문서 한 개 JSON |
| `memory/canonical.json` | export 대상 canonical memory tables를 하나로 합친 JSON | 현재는 canonical memory 전체 |
| `snapshots/index.json` | snapshot metadata만이 아니라 **content를 포함한 전체 snapshot 배열** | export 대상 snapshot 배열 전체 |
| `snapshots/<id>.snap` | 개별 snapshot content·metadata JSON | snapshot 한 개 |

근거: `src/main/services/io/luieContainerEntries.ts:51`, `:97`, `:102`, `:110`; 상수는 `src/shared/constants/storage/paths.ts:41`, `:43`.

따라서 C개의 장, S개의 snapshot이면 현재 valid payload의 entry 수는 **11+C+S**, JSON.stringify 호출 대상은 **11+S**다. 장 본문은 stringify하지 않지만 모든 본문을 다시 SQLite로 전달한다. snapshot 본문은 index와 개별 .snap에 이중 저장된다. Synthetic package에서 두 entry의 content 일치도 assert했다. world graph에도 일부 canonical entity 속성이 별도로 표현되므로 인물·용어 JSON과 일부 정보 중복이 있다(`projectExportPayload.ts:311`).

`meta.chapters`에는 id/title/order/file만 들어가고 chapter contentHash/wordCount/synopsis는 없다(`src/main/services/core/project/projectExportPayload.ts:86`). package meta에는 project revision도 없다(`:394`). `luiePackageIntegrity.ts`는 포맷 호환과 meta 정규화를 담당하며 현재 writer에 전체 파일 hash/entry hash/manifest checksum 계산 단계는 없다. 현재 경로에서 “해시 때문에 모든 본문을 다시 읽어야 한다”는 제약은 발견되지 않았다.

## 2. 한 번의 full export 비용 — 소스 확정 + 복잡도 추론

기호: B=모든 장 본문의 합, W=export하는 world/canonical JSON 총량, S=export하는 snapshot 본문의 합, H=DB에 저장된 전체 snapshot 본문의 합, C=장 수. 아래 O 표기는 접근 데이터량 관점이다.

| 단계 | 실제 동작과 근거 | 비용/제약 |
|---|---|---|
| collector | `projectExportEngine.ts:71`에서 getProjectForExport를 먼저 호출하고 :73 이후 attachment/target 확인 | direct export 경로는 target 없음 확인 전 전체 수집 가능. 일반 queue는 attachment skip guard가 있음 |
| DB 수집 | `exportEngine/projectRecord.ts:23` project 조회 + :41 8개 collection 조회. chapters SELECT는 legacy content와 chapterBody.content 모두 포함(:43), snapshot은 LIMIT 없음(:75) | O(B+H+entities). Drizzle better-sqlite3 adapter이므로 Promise.all은 SQL 병렬 실행 보장이 아님 |
| export DTO | `projectExportPayload.ts:77`, :133 전체 map; snapshot limit는 DB 조회·전체 map 이후 slice(:145) | 유지 설정이 작아도 이미 H를 읽음. object/array 추가 할당; 문자열 reference 공유까지 전부 복제로 셈하면 안 됨 |
| memory/world | `projectExportEngine.ts:91` canonical 전체 export, :92 replica world. replica 누락 문서만 :103 package fallback | valid replica면 fallback 없음. 누락시 최대 6개 문서별 package header/stat/open/read/close/JSON parse 비용 추가 |
| meta/graph 구성 | :130 world graph 구성, :133 전체 updatedAt 후보 계산, :141 meta 생성 | 전체 metadata/collection 순회. change set 없음 |
| entry 직렬화 | `luieSqliteContainer.ts:237` → `luieContainerEntries.ts:51`에서 JSON.stringify pretty2 | O(W+2S+meta), 장 raw 본문은 그대로 entry에 연결 |
| SQLite 생성 | `luieSqliteContainer.ts:228` 새 temp Database, :232 DELETE journal, :233 synchronous FULL, :234 bootstrap | 매 export 새 DB/schema/index 생성. bootstrap DDL은 아래 명시적 data transaction 밖 |
| 삽입 | :242 transaction에서 info+모든 entry INSERT(:267) | O(B+W+2S+metadata)의 논리 content 전달 및 새 파일 생성. 변경되지 않은 entry도 모두 다시 INSERT |
| commit/close | :273 동기 native transaction, :274 close | Promise 반환 함수 안이지만 native SQL/JSON은 현재 호출 thread에서 동기 실행 |
| replace | :278 → `luiePackageWriter.ts:64` rename(temp,target) | 정상 경로는 rename 1회. JS에 copyFile 없음. 기존 파일과 완성 temp가 동시에 존재하는 디스크 공간 필요 |
| fallback | `luiePackageWriter.ts:68` 특정 오류에만 target→bak(:79), temp→target(:81), bak 제거(:82), 실패시 복구 rename(:87) | backup은 **파일 내용 복사 아닌 rename**. 정상 경로에 매 저장 별도 백업 복사 없음 |

SQLite `synchronous=FULL` 설정은 확인했지만 이번 함수 계측은 커널 `fsync` 호출 수/실제 디스크 write bytes를 측정하지 않았다. JS writer에는 별도 fileHandle.sync/parent directory fsync가 없다. 소스의 atomicReplace 함수명과 rename 실패 테스트만으로 정전 후 디렉터리 변경 내구성까지 보장한다고 할 수 없다. OS별/파일시스템별 crash test가 별도 필요하다.

현행 full export 비용의 주항은 **전체 데이터 materialization + 전체 새 파일 생성**이다. JSON pretty 공백·배열 map·schema bootstrap 최적화도 유효하지만 변경 1건의 전체 데이터 수집/재삽입을 유지한 채로는 크기에 비례하는 비용을 없애지 못한다.

## 3. 실제 writer 최소 재현 — 실측

재현 script: `/private/tmp/luie-package-cost-repro.cjs`
결과: `/private/tmp/luie-package-cost-results.json`

```bash
NODE_PATH=/Users/user/Luie/node_modules node /private/tmp/luie-package-cost-repro.cjs
```

- Node v22.23.0 / macOS arm64, 현재 설치된 better-sqlite3와 실제 `writeLuieContainer` / `writeLuieContainerEntry` 소스를 esbuild로 임시 bundle해 실행.
- chapter 50/250/1000개, 각각 UTF-8 64KiB. snapshot 20개, 각각 본문64KiB. world/memory는 빈 기본 문서. 기존 package에서 chapter 하나 끝의 **1 byte 변경**.
- 최초 생성은 제외하고 full writer 3회, current entry writer 3회. 표는 각 방식 wall time 중앙값.
- payload는 측정 전에 이미 만들어져 있다. 따라서 **main DB 수집/DTO/실제 풍부한 world/memory 데이터 비용은 포함하지 않는다**. 함수 계측 wrapper overhead가 포함된다. 단건 writer는 안전한 새 구현이 아니라 현행 API다.

| 장 수 | 최종 파일 크기 | full writer wall | current entry wall | full entry INSERT 수 | full 논리 content bytes | entry 논리 content bytes |
|---:|---:|---:|---:|---:|---:|---:|
| 50 | 5,967,872 B | 12.318 ms | 1.224 ms | 81 | 5,910,059 B | 71,435 B |
| 250 | 19,222,528 B | 25.369 ms | 1.307 ms | 281 | 19,040,659 B | 94,835 B |
| 1000 | 68,890,624 B | 80.908 ms | 2.970 ms | 1031 | 68,281,159 B | 183,335 B |

1000장 full의 JSON.stringify 중앙값 4.737ms, SQLite data transaction 중앙값72.144ms. entry 방식은 chapter+meta 2개 UPSERT, 추가 info UPDATE가 있고 명시적 transaction은 0개다. full은 data transaction 1개를 사용한다. full 정상 JS FS 호출은 stat1/open1/mkdir1/rename1, current entry는 stat2/open1로 관측됐다(native SQLite I/O 제외).

full은 매번 inode가 변경됐고 current entry는 동일 inode였다. final 파일끼리 비교한 달라진 4KiB page 수는 1000장 full1036/entry7이었다. **최종 byte 차이 page 수는 실제 쓰인 page 수와 다르다.** full은 unchanged bytes도 새 파일에 기록하므로 final diff로 full 물리 쓰기를 추정하면 과소평가한다. 위 logical content bytes도 native binding에 전달한 문자열 UTF-8 합계이지 커널 disk bytes가 아니다.

해석: 장 하나의 64KiB 본문을 갱신할 때 full은68.28MB, entry는183KB만 entry bind에 전달했다. entry도 meta 전체 chapter 목록을 갱신하므로 O(changed body+meta(C))이며 완전 O(1)은 아니다. full 대비 약10~27배 wall 차이는 **이 fixture/장치/계측 범위에서만** 확인됐다. Windows/Linux에서 같은 배수를 약속할 수 없고 UI end-to-end 응답성 수치도 아니다.

## 4. 왜 coalescing이 증분 저장으로 이어지지 않는가 — 소스 확정

`src/main/services/features/project/projectService.ts:48`는 chapter create/update, 인물·용어 등 create/update/delete, graph, snapshot:create를 debounce한다. `src/shared/constants/runtime/interactionTiming.ts:4` 설정은500ms. chapter 변경의 실제 caller는 `src/main/services/core/chapter/chapterWriteOperations.ts:319`이다. reason allowlist 밖의 변경은 `projectService.ts:466` 즉시 checkpoint 경로를 탄다. 모든 키 입력이 반드시 export1회를 일으킨다는 뜻은 아니다. 위로 renderer/main autosave coalescing도 있고 여기서 다시500ms로 합친다.

그러나 `projectExportQueue.ts:30` state는 timer/inFlight/dirty boolean뿐이다. 변경 chapterId/path/delete tombstone이 없다. `.schedule`(:119)는 타이머를 계속 reset한다. `.runNow`(:131)는 source가 동일해도 dirty를 강제로 세운다. export 중 새 mutation은 dirty/revision 증가로 while(:152)에서 추가 **full export**를 유발한다. 이 층에는 debounce maxWait가 없어500ms보다 촘촘한 연속 schedule은 checkpoint를 미룰 수 있다. 실제 발생 빈도는 상위 autosave 주기에 달려 있다.

queue는 capturedRevision(:159)을 runExport에 넘기지만 `projectService.ts:103` callback은 projectId만 받아 무시한다. 성공 뒤 local attachment exportedRevision을 갱신(:175)하고 latest revision으로 재실행을 결정(:177)한다. 이는 변경 도중의 후속 full export를 보수적으로 보장하는 장점이 있지만, 특정 revision의 일관된 payload를 capture하는 구현은 아니다.

`getProjectForExport`의 여러 await/query, 이후 memory/world 수집은 한 read snapshot 안에 묶이지 않았다. package path lock은 **이 수집이 끝난 다음 writer 진입**에서 획득한다. 따라서 path lock이 있어도 오래전에 수집한 payload가 더 최근 entry 쓰기 뒤에 replace되는 논리적 순서는 막지 못한다. 실제 사용 빈도/피해는 추가 race 실험이 필요하므로 이 항목은 **설계상 경쟁 가능성**으로 분류한다.

## 5. 기존 단건 API를 그대로 사용하면 생기는 정확성 문제 — P1 후보, 소스·실제 재현 확정

위치: `src/main/services/io/luieSqliteContainer.ts:347`, `:349`, `:357`.

현재 단건 writer는 (1) 본문 entry UPSERT, (2) meta.updatedAt 갱신 UPSERT, (3) info.updatedAt UPDATE를 **transaction 없이 차례로 실행**한다. 두 번째 또는 세 번째 statement 실패 시 앞의 statement는 이미 커밋되어 있다. Promise reject를 “아무것도 저장하지 못함”으로 해석할 수 없다.

실제 caller는 `src/main/handler/system/fs/fsPackageOperations.ts:208`의 package entry IPC와 `src/main/services/features/memory/persistence/memoryCanonicalPackageSyncVerifier.ts:239`의 repair다. API는 미사용 코드가 아니다.

재현 script: `/private/tmp/luie-package-atomicity-repro.cjs`
결과: `/private/tmp/luie-package-atomicity-results.json`

```bash
NODE_PATH=/Users/user/Luie/node_modules node /private/tmp/luie-package-atomicity-repro.cjs
```

실제 source writer에 synthetic SQLite trigger로 later statement 실패를 주입했다.

| 주입 실패 | Promise | 저장된 chapter | meta.updatedAt | info.updatedAt |
|---|---|---|---|---|
| meta UPDATE | reject | 새 본문 `after` | 이전값 | 이전값 |
| info UPDATE | reject | 새 본문 `after` | 새값 | 이전값 |

실제 디스크 부족·정전 실험은 아니지만 later statement failure 이후 partial commit은 실제 SQLite 파일을 열어 확인했다.

최소 수정 설계는 **entry upsert/delete 집합+meta+info를 하나의 native synchronous transaction으로 묶는 batch API**다. 기존 Promise path lock은 유지하되 transaction callback 내부에서 await/외부 I/O를 하지 않는다. begin→모든 entry→meta→info→commit 중 예외면 전부 rollback되어야 한다. 또한 meta에 존재하는 장 추가/삭제/재정렬은 단건 arbitrary entry API가 자동으로 처리하지 않으므로 caller가 연관 entry를 함께 명시해야 한다.

## 6. v2 포맷 유지 증분 저장에 필요한 계약

### 바로 얻을 수 있는 이점

기존 reader는 path별 SELECT이므로 같은 schema/논리 경로를 유지한 transactional UPSERT는 format migration 없이 읽을 수 있다. chapter content-only부터 시작하면 다른 모든 chapter/world/snapshot을 읽거나 stringify할 이유가 없어진다. 초기 생성·Save As·import materialization·손상 복구는 기존 full writer를 유지할 수 있다. 전체 normalized project schema를 package에 옮기는 대규모 포맷 개편은 이 1차 개선에 필수가 아니다.

### 반드시 같이 설계해야 하는 경계

1. **변경집합과 generation**: project queue가 chapter/path별 최신 변경 revision 및 delete를 보관한다. batch가 capture한 집합만 성공 후 제거하며 export 중 추가된 generation을 지우지 않는다. reason 문자열이나 global dirty boolean만으로는 어떤 entry가 필요한지 알 수 없다.
2. **내용 수집 시점**: source project revision과 변경 rows를 한 일관된 read snapshot에서 얻는다. native SQLite의 sync transaction에 async callback을 넣지 않는다. 수집을 위해 전체 데이터 clone/해시를 하는 방식이면 DB 측 O(B) 병목이 남는다.
3. **한 revision의 전체 변경을 포괄**: chapter만 최신이라고 전체 project exportedRevision을 올리면 안 된다. 같은 revision 범위의 world/meta/snapshot 변경까지 빠짐없이 commit한 뒤 ACK해야 한다. 미지원 mutation이 하나라도 있으면 해당 batch는 안전한 full export로 fallback한다.
4. **canonical DB와 package는 별도 파일**: package commit과 local attachment exportedRevision 갱신이 지금 하나의 transaction은 아니다. 먼저 package commit, 뒤에 local ACK를 유지하여 crash시 같은 batch 재실행이 가능하게 한다. 반대 순서는 미export 상태를 완료로 오인하게 한다.
5. **복구**: 초기에는 in-memory dirty set을 잃은 경우 existing `Project.revision > exportedRevision` 복구 경로(`projectRevisionStore.ts:108`)로 full checkpoint를 수행할 수 있다. 재시작에서도 증분 replay가 필요해질 때 durable dirty-entry outbox를 추가한다. 단, root가 확인한 open/import의 timestamp 기반 역방향 덮어쓰기 문제를 먼저 수정하지 않으면 stale `.luie`가 미checkpoint DB를 덮을 수 있다. 현재 app DB를 언제나 버려도 되는 cache로 취급하면 안 된다.
6. **package의 revision 식별**: 현재 meta에는 revision이 없고 `updatedAt`만 있다. `LuieMetaSchema`는 top-level passthrough(`projectLuieSchemas.ts:30`)이므로 optional package checkpoint marker를 추가하는 것은 읽기 호환성 여지가 있다. 그러나 import/relink/다른 기기의 로컬 revision 리셋까지 같은 숫자로 비교하면 안 된다. project/attachment generation 또는 epoch와 revision의 의미를 함께 정해야 한다. 단순 timestamp 비교로 완전성을 판단하지 않는다.
7. **writer 소유권**: generic FS entry 쓰기, memory repair, full export, incremental export가 같은 coordinator를 따라야 한다. `withPackageWriteLock`은 path.resolve 문자열 기준 process/module-local Promise lock이다. 여러 process, 다른 symlink/대소문자 alias, 외부 편집까지 배타 제어하지 않는다. payload를 lock 밖에서 수집하는 stale write도 별도 처리해야 한다.
8. **삭제/중복 관계**: chapter 삭제는 manuscript row 삭제+meta 목록 변경; snapshot prune은 index 변경+개별 .snap 삭제; entity 변경은 collection JSON과 graph 등 해당 파생 package 문서가 함께 변경될 수 있다. dirty mapping을 기능별로 정해야 한다.

meta 전체 목록을 매번 stringify하는 O(C) 비용은 body 전체 O(B)에 비해 작지만 남는다. 먼저 current reader 호환을 유지한 chapter+meta delta로 측정하고, meta가 실제 병목일 때 개별 metadata 정규화 또는 업데이트 시각 분리 등을 후속 포맷 변경으로 검토하는 편이 비용 대비 효과가 좋다.

snapshot 중복 본문 제거 역시 유효하지만 현재 importer는 `snapshots/index.json`의 content 배열을 이용한다(`src/main/services/core/project/importOpen/collections.ts:289`, `:408`; `projectImportCodec.ts:195`). index를 manifest-only로 바꾸려면 reader도 .snap 로드하도록 고쳐야 한다. 단순히 content를 지워서는 안 된다. canonical memory/world를 개별 row로 정규화하는 변경은 migration/구버전 호환/외부 도구 영향을 포함하므로 1차 chapter delta와 분리해 비용을 판단한다.

## 7. 구현 선택지의 비용과 권장 순서 — 설계 추론

| 선택지 | 기대효과 | 구현·검증 부담 | 판단 |
|---|---|---|---|
| snapshot SELECT에 실제 export limit 적용, chapter legacy/body 중복 SELECT 축소, no-op export skip | full collector 낭비 감소 | 작음~중간; limit=0 의미·정렬·timestamp 계산 확인 | 의미 보존이 쉬운 보조 개선 |
| 현행 full 유지, JSON 공백 제거만 | aggregate JSON byte 감소 | 작음이나 포맷 가독성 변화; 본문 B 비용 유지 | 주요 병목 해결책 아님 |
| 기존 단건 writer를 자동저장에서 바로 호출 | 실험상 큰 비용 감소 | partial commit/ACK 불일치/관련 문서 누락 | 채택 불가 |
| transactional entry batch + chapter dirty set + revision ACK + full fallback | 가장 흔한 작은 변경에서 전체 수집/재작성 제거 | 중간~큼; 저장 신뢰성 회귀 테스트 필수 | 우선 권장 |
| 모든 domain의 durable dirty-entry outbox | crash 이후도 선택적 replay, 정확한 pending 추적 | 큼; source mutation transaction에 결합 필요 | 1차 결과·복구 요구에 따라 확장 |
| package 내부를 완전히 정규화한 project DB로 재설계 | world/memory 부분 변경과 질의도 세분화 가능 | 가장 큼; format migration, import/export, plugin/reader 호환 | 지금 full rewrite 해소의 필수 선행작업 아님 |
| package SQL/serialize를 worker/utility process로 이동 | main thread stall 완화 | IPC payload 복제·writer owner·crash restart 설계 필요 | 작업량 축소 후 병행 검토. full payload IPC 전달은 O(B) 복제 위험 |

크로스플랫폼 공통 구현은 동일한 SQLite transaction/dirty revision 계약을 쓴다. portable `.luie`는 standalone 파일 요구와 기존 테스트가 있으므로 무조건 WAL로 전환하는 것을 권하지 않는다. DELETE rollback journal도 transient journal을 사용하며 transaction page 변경만으로 증분 commit 가능하다. WAL을 택한다면 checkpoint/close와 sidecar 생명주기까지 별도 계약이 필요하다. 단건 증분은 inplace 파일의 유휴 freelist가 남을 수 있으므로 파일 축소는 주기적 명시적 compaction/full checkpoint로 처리하고 매 저장 VACUUM하지 않는다.

OS별 실측 대상은 macOS/APFS 및 arm64/x64, Windows/NTFS의 file-handle/백신/동기화 클라이언트 영향, Linux/ext4의 실제 저장 장치다. 이번 실험은 macOS arm64 한 환경만 검증했다. 위 수정의 차수 개선은 공통이지만 fsync/rename 지연, 권한·외부 파일 잠금에 대한 동작은 환경별 검증이 필요하다.

## 8. 추가로 드러난 제한과 검증 계획

**현재 read/write 크기 계약 불일치(소스·실제 재현 확정):** `luieSqliteContainer.ts:30` entry read limit5MiB, :31 package read limit256MiB, :198 row를 materialize한 뒤 크기를 검사한다. full writer는 동일 entry/최종 package 상한 사전검사를 하지 않고, 단건 writer는 기존 package 크기만 검사(:303)한 뒤 신규 content를 넣는다. 큰 `memory/canonical.json` 또는 `snapshots/index.json`이 한계 초과 상태로 저장될 수 있다. 증분화와 별개로 write와 read의 허용범위를 맞추거나 aggregate 포맷을 나누어야 한다. 실제 writer/read API에 ASCII chapter 5MiB+1=5,242,881 bytes를 넣었다. full writer와 단건 writer 모두 정상 resolve하고 SQLite에 정확히5,242,881 bytes가 저장됐으나, 같은 앱 reader는 `FS_2001: SQLite-backed .luie entry is too large`로 거부했다. 생성 파일은5,267,456 bytes로 package256MiB 제한과 무관하다. 이 결과는 chapter 단일 entry로 확인했으며 snapshot/index 또는 canonical/import 후속 손실은 별도 caller 분석이 필요하다.

재현: `/private/tmp/luie-package-size-limit-repro.cjs`, 결과 `/private/tmp/luie-package-size-limit-results.json`.

```bash
NODE_PATH=/Users/user/Luie/node_modules node /private/tmp/luie-package-size-limit-repro.cjs
```

이미 갖춘 방어는 유지할 가치가 있다: per-path write 직렬화, full writer의 data transaction, temp 완성 후 replace, 실패시 temp 정리·rename rollback, source revision 기반 재export, path traversal 검증, legacy container 거부, read size 제한. 기존 `tests/main/services/luiePackageWriter.rollback.test.ts:44`는 실제 temp 파일과 rename 오류 주입으로 복구를 확인하며 :90은 pre-replace 실패의 tmp 정리를 확인한다. `luieContainer.extreme.test.ts`는 실제 entry 읽기/쓰기·경로/JSON 검증·sidecar 부재를 다룬다. `projectExportQueue.test.ts`는 mock source revision 변동 재실행·실패 dirty 유지·detached skip을 다룬다. 이번 감사에서 이 테스트 전체를 재실행했다고 주장하지 않는다.

증분 구현 전에 명확히 해야 할 통과 기준:

- 같은 revision의 full export와 delta export를 실제 reader/importer로 읽으면 전체 프로젝트 의미가 같을 것.
- 중간 entry/meta/info 실패 시 전 batch rollback, success ACK 없음. package commit 뒤 local ACK 전에 crash하면 idempotent replay될 것.
- export 중 동일 chapter 신규 generation과 다른 world 변경이 도착해도 pending이 사라지지 않을 것.
- 장 생성/삭제/순서 변경, snapshot prune, graph와 canonical entity 동시 변경을 누락하지 않을 것.
- stale package open이 미checkpoint DB를 timestamp만 보고 덮어쓰지 않을 것(root 별도 실제 재현).
- 동일 내용 저장은 package write 생략; 수동 저장은 현재 revision의 durable completion을 기다릴 것.
- macOS/Windows/Linux에서 normal commit, replace 오류, 외부 read handle, 강제종료 후 reopen을 실제 temp package로 검증할 것.
- perf 회귀는 장50/250/1000의 단건 변경에서 SQL rows/논리 content bytes, main event-loop delay, RSS peak, wall p50/p95, 실제 OS I/O를 함께 기록할 것. fixture의 숫자를 제품 성능 보장으로 사용하지 않을 것.

이번 범위에서 소스 확정과 실제 synthetic 재현은 구별해 기재했다. 제품 구조 변경, native module rebuild, 사용자 파일 변경은 수행하지 않았다.
