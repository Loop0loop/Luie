# Current Main Architecture

이 문서는 `src/main`의 현재 구조를 사실 기준으로 기록합니다.

## 확인 범위

주요 근거 파일:

- `src/main/index.ts`
- `src/main/lifecycle/index.ts`
- `src/main/lifecycle/*/index.ts`
- `src/main/handler/index.ts`
- `src/main/handler/core/ipcHandler.ts`
- `src/main/handler/core/ipcRegistrar.ts`
- `src/main/database/index.ts`
- `src/main/database/main/databaseService.ts`
- `src/main/database/cache/cacheDb.ts`
- `src/main/database/runtime/index.ts`
- `src/main/manager/index.ts`
- `src/main/manager/window/windowManager.ts`
- `src/main/manager/settings/settingsManager.ts`
- `src/main/manager/autoSave/autoSaveManager.ts`
- `src/main/utility/index.ts`
- `src/main/utility/process/utilityProcessMain.ts`
- `src/main/utility/rag/ragQaWorker.ts`
- `src/main/services/**`

## 현재 역할

사실:

- `src/main/index.ts`는 Electron main bootstrap entry입니다.
- `index.ts`는 env 로딩, single instance lock, logger 설정, protocol 등록, deep link 처리, lifecycle 등록, utility process start/stop 조립을 담당합니다.
- `registerAppReady()`는 `app.whenReady()` 이후 DB bootstrap, IPC 등록, CSP 헤더, renderer readiness, 메뉴, startup wizard/main window 분기를 담당합니다.
- `WindowManager`는 `BrowserWindow` 생성, preload path, route loading, secure webPreferences, main/startup/export/world-graph window lifecycle을 관리합니다.
- `handler/index.ts`는 project/world/writing/search/system/analysis IPC handler 등록 허브입니다.
- `handler/core/ipcHandler.ts`는 `ipcMain.handle` 공통 래퍼입니다.
- main/cache SQLite는 `database/index.ts` public entry를 통해 제공되며 실제 singleton 구현은 `database/main/databaseService.ts`, `database/cache/cacheDb.ts`가 소유합니다.
- `services/*`는 얇은 repository가 아니라 business rule, DB query, derived jobs, `.luie` export scheduling을 포함하는 두꺼운 service layer입니다.
- `manager/*`는 runtime singleton 상태를 관리합니다.
- RAG QA, embedding, llama-server sidecar는 utility process와 `UtilityProcessBridge`로 분리됩니다.

## Phase 1 Domain Folder Index

사실: 2026-06-02 기준 Phase 1 지정 도메인의 폴더 영역과 `index.ts` export 상태입니다.

| Domain                            | Index                                      | 상태                                |
| --------------------------------- | ------------------------------------------ | ----------------------------------- |
| `src/main/database`               | `src/main/database/index.ts`               | DB singleton 진입점 유지            |
| `src/main/handler/system`         | `src/main/handler/system/index.ts`         | system handler 등록 진입점 유지     |
| `src/main/handler/world`          | `src/main/handler/world/index.ts`          | world handler 등록 진입점 유지      |
| `src/main/manager/autoSave`       | `src/main/manager/autoSave/index.ts`       | autoSave helper 배럴 추가           |
| `src/main/manager/settings`       | `src/main/manager/settings/index.ts`       | settings singleton/helper 배럴 추가 |
| `src/main/manager/window`         | `src/main/manager/window/index.ts`         | window singleton/helper 배럴 추가   |
| `src/main/utility`                | `src/main/utility/index.ts`                | utility process build entry 유지    |
| `src/main/services/llm`           | `src/main/services/llm/index.ts`           | LLM service/helper 배럴 추가        |
| `src/main/utils`                  | `src/main/utils/index.ts`                  | main utility 배럴 추가              |
| `src/main/services/features/sync` | `src/main/services/features/sync/index.ts` | sync public service 배럴 추가       |

사실: `src/main/lifecycle`은 lifecycle 루트에 구현 파일을 두지 않고 lifecycle 단계별 entry를 통해 조립합니다.

| Lifecycle domain  | Entry                                | 책임                            |
| ----------------- | ------------------------------------ | ------------------------------- |
| `app-ready`       | `lifecycle/app-ready/index.ts`       | app ready/bootstrap window flow |
| `bootstrap`       | `lifecycle/bootstrap/index.ts`       | database bootstrap status       |
| `crash`           | `lifecycle/crash/index.ts`           | crash report registration       |
| `deep-link`       | `lifecycle/deep-link/index.ts`       | OAuth/deep link handling        |
| `menu`            | `lifecycle/menu/index.ts`            | application menu policy         |
| `shutdown`        | `lifecycle/shutdown/index.ts`        | quit/flush/disconnect flow      |
| `single-instance` | `lifecycle/single-instance/index.ts` | single instance lock            |
| root              | `lifecycle/index.ts`                 | lifecycle public export         |

사실: `src/main/utils`는 utils 루트에 구현 파일을 두지 않고 유틸 성격별 entry를 통해 제공합니다.

| Utils domain | Entry                       | 책임                             |
| ------------ | --------------------------- | -------------------------------- |
| `env`        | `utils/env/index.ts`        | environment/package/userData     |
| `error`      | `utils/error/index.ts`      | ServiceError                     |
| `fs`         | `utils/fs/index.ts`         | atomic write/path validation     |
| `package`    | `utils/package/index.ts`    | .luie package path/entry helpers |
| `query`      | `utils/query/index.ts`      | query helper utilities           |
| `validation` | `utils/validation/index.ts` | schema validation helper         |
| root         | `utils/index.ts`            | main utils public export         |

사실: `src/main/services/features`는 feature service 루트에 구현 파일을 두지 않고 도메인별 entry를 통해 제공합니다.

| Feature service domain | Entry                                 | 책임                               |
| ---------------------- | ------------------------------------- | ---------------------------------- |
| `dbMaintenance`        | `features/dbMaintenance/index.ts`     | DB/search/memory maintenance       |
| `derivedJobs`          | `features/derivedJobs/index.ts`       | derived search/memory job worker   |
| `export`               | `features/export/index.ts`            | DOCX/HWPX export facade            |
| `graphPlugin`          | `features/graphPlugin/index.ts`       | graph plugin catalog/install/apply |
| `recovery`             | `features/recovery/index.ts`          | SQLite recovery service            |
| `search`               | `features/search/index.ts`            | search facade/cache/chunk helpers  |
| `startup`              | `features/startup/index.ts`           | startup readiness service          |
| `worldReplica`         | `features/worldReplica/index.ts`      | replica world document persistence |
| root                   | `src/main/services/features/index.ts` | feature service public export      |

사실: Phase 2에서 분리된 snapshot/settings/sync 내부 helper는 도메인 하위 폴더의 `index.ts`를 통해 제공합니다.

| Area                          | Index                                                      |
| ----------------------------- | ---------------------------------------------------------- |
| snapshot artifact helpers     | `src/main/services/features/snapshot/artifacts/index.ts`   |
| settings IPC helpers          | `src/main/handler/system/settings/index.ts`                |
| sync bundle collector helpers | `src/main/services/features/sync/bundleCollector/index.ts` |
| sync repository helpers       | `src/main/services/features/sync/repository/index.ts`      |

사실: `src/main/handler/system`은 system 루트에 구현 파일을 두지 않고 하위 도메인 entry를 통해 조립합니다.

| System handler domain | Entry                              | 책임                        |
| --------------------- | ---------------------------------- | --------------------------- |
| `fs`                  | `handler/system/fs/index.ts`       | filesystem/package IPC      |
| `logger`              | `handler/system/logger/index.ts`   | renderer logger IPC         |
| `plugin`              | `handler/system/plugin/index.ts`   | graph plugin IPC            |
| `recovery`            | `handler/system/recovery/index.ts` | recovery IPC                |
| `settings`            | `handler/system/settings/index.ts` | settings/model/LLM IPC      |
| `startup`             | `handler/system/startup/index.ts`  | startup readiness IPC       |
| `sync`                | `handler/system/sync/index.ts`     | sync/runtime config IPC     |
| `window`              | `handler/system/window/index.ts`   | app/window/update IPC       |
| root                  | `handler/system/index.ts`          | system handler registration |

## Main IPC Flow

```text
Renderer feature/store
  -> window.api.* 또는 @shared/api
  -> preload safeInvoke(channel, ...args)
  -> ipcRenderer.invoke(IPC_CHANNELS.*)
  -> main ipcMain.handle(channel)
  -> registerIpcHandler
      - argsSchema safeParse
      - requestId/duration/channel meta
      - ServiceError mapping
      - IPCResponse wrapping
      - mutating channel auto-sync trigger
  -> handler/<domain>/ipc*Handlers
  -> services/core | services/world | services/features | manager
  -> db/cacheDb/fs/Electron native/utility process
  -> IPCResponse
```

## Startup Flow

```text
index.ts
  -> dotenv/config
  -> registerSingleInstance
  -> logger setup
  -> lazy import lifecycle/services
  -> registerCrashReporting
  -> initDatabaseEnv
  -> macOS open-url handler
  -> register luie:// protocol
  -> argv deep link 처리
  -> registerAppReady
  -> app.whenReady().then(utilityProcessBridge.start)
  -> before-quit utilityProcessBridge.stop
  -> registerShutdownHandlers
```

## 보존 불가침 경계

사실:

- IPC 채널명은 `src/shared/ipc/channels.ts`가 source of truth입니다.
- 표준 IPC 응답은 `IPCResponse<T>`의 `{ success, data?, error?, meta? }` 구조입니다.
- IPC 등록은 `registerIpcHandlers(logger, [{ channel, logTag, failMessage, argsSchema, handler }])` 패턴입니다.
- handler 입력 검증은 shared Zod schema를 사용합니다.
- renderer는 preload `contextBridge.exposeInMainWorld("api", rendererApi)`를 통해 main capability에 접근합니다.
- DB lifecycle은 `db.initialize()`, `db.getClient()`, `db.disconnect()`, `cacheDb.*` 계약에 의존합니다.
- `.luie` package는 canonical storage이며 SQLite DB는 rebuild 가능한 cache로 취급됩니다.
- FS 접근은 approved root, absolute path validation, restricted roots, `.luie` package permission 구분을 보존해야 합니다.
- shutdown은 renderer flush, autosave critical flush, pending package export, derived worker/sidecar stop, snapshot pruning, DB checkpoint/disconnect 순서를 보존해야 합니다.
- utility process message method와 request/response shape는 bridge와 utility entry가 함께 의존합니다.

## 500 LOC 초과 Main 파일

사실: Phase 4 이후 현재 `src/main`에는 500 LOC 초과 코드 파일이 없습니다.

| File                                                                    | LOC | 비고                                                      |
| ----------------------------------------------------------------------- | --: | --------------------------------------------------------- |
| `src/main/services/features/memory/entity/memoryEntityReviewService.ts` | 232 | Phase 4에서 `entityMergeOperations.ts`로 merge/split 분리 |
| `src/main/services/features/memory/entity/entityMergeOperations.ts`     | 283 | entity merge/split transaction helper                     |
| `src/main/services/features/search/searchService.ts`                    |  56 | Phase 4에서 public service facade로 축소                  |
| `src/main/services/features/search/basicSearch.ts`                      | 206 | character/term/chapter search and quick access            |
| `src/main/services/features/search/chunkOperations.ts`                  | 322 | memory chunk search/backlink/window operations            |
| `src/main/database/main/packagedSchema.ts`                              |  24 | bootstrap SQL 조합 진입점                                 |
| `src/main/database/main/packagedSchema/projectSchema.sql.ts`            | 238 | bootstrap SQL 프로젝트/초기 마이그레이션 파트             |
| `src/main/database/main/packagedSchema/memorySchema.sql.ts`             | 281 | bootstrap SQL 메모리 도메인 파트                          |
| `src/main/database/main/packagedSchema/worldAndIndexesSchema.sql.ts`    | 243 | bootstrap SQL 월드/인덱스 파트                            |
| `src/main/database/packagedSchema/metadataTables.ts`                    |  49 | required table 목록                                       |
| `src/main/database/packagedSchema/metadataColumnPatches.ts`             | 148 | column patch 목록                                         |
| `src/main/database/packagedSchema/metadataIndexPatches.ts`              | 150 | index patch 목록                                          |
| `src/main/database/packagedSchema/metadataRequiredColumns.ts`           | 321 | required column map                                       |

사실: `src/main/services/features/rag/internal/contextAssembler.layer0.ts`, `contextAssembler.layer2.ts`, `contextAssembler.layer3.ts`는 책임 분리 후 재구성되어 각 파일이 500 LOC 이하입니다.
사실: `src/main/services/features/memory/query/narrativeMemoryQueryService.ts`는 500 LOC 이하이며, `query/internal/{plan,chapter,entity,temporal,summaries,conflicts,evidence,formatter}.ts`로 책임 분리되어 있습니다.

사실: `src/main/database` 루트 TypeScript 파일은 `index.ts`만 남기고, database 구현은 `main/`, `cache/`, `runtime/`, `schema/` 하위 폴더 entry로 분리했습니다.

사실: `src/main/manager` 루트 TypeScript 파일은 `index.ts`만 남기고, window/settings/autoSave singleton 구현은 각 하위 폴더 entry로 분리했습니다.

사실: `src/main/utility` 루트 TypeScript 파일은 `index.ts`만 남기고, utility process entry 구현과 RAG QA worker는 `process/`, `rag/` 하위 폴더로 분리했습니다.

| Database area | 책임                                                                                   | Entry                       |
| ------------- | -------------------------------------------------------------------------------------- | --------------------------- |
| root entry    | main/cache/runtime/schema public export 조립                                           | `database/index.ts`         |
| main DB       | main SQLite singleton, packaged bootstrap, seed, pointer trigger, memory FTS migration | `database/main/index.ts`    |
| cache DB      | cache SQLite singleton, cache schema/bootstrap, cache packaged schema                  | `database/cache/index.ts`   |
| runtime       | DB handle/type, env datasource/path resolver, migration path resolver                  | `database/runtime/index.ts` |
| schema        | Drizzle main schema tables와 row 타입                                                  | `database/schema/index.ts`  |

사실: `src/main/database/main/packagedSchema.ts`는 bootstrap SQL 조합 진입점입니다. 실제 SQL/metadata는 분리 모듈에서 로드되며 기존 public export인 `PACKAGED_SCHEMA_REQUIRED_TABLES`, `PACKAGED_SCHEMA_REQUIRED_COLUMNS`, `PACKAGED_SCHEMA_COLUMN_PATCHES`, `PACKAGED_SCHEMA_INDEX_PATCHES`, `PACKAGED_SCHEMA_BOOTSTRAP_SQL`는 유지합니다.

| Packaged schema helper                      | 책임                 | LOC |
| ------------------------------------------- | -------------------- | --: |
| `packagedSchema/index.ts`                   | metadata 배럴 export |   6 |
| `packagedSchema/metadataTables.ts`          | required table 목록  |  49 |
| `packagedSchema/metadataColumnPatches.ts`   | column patch 목록    | 148 |
| `packagedSchema/metadataIndexPatches.ts`    | index patch 목록     | 150 |
| `packagedSchema/metadataRequiredColumns.ts` | required columns map | 321 |
| `packagedSchema/metadataTypes.ts`           | metadata type alias  |  10 |

사실: `src/main/database/schema/index.ts`는 기존 Drizzle schema public export와 row 타입 export를 함께 제공합니다. 실제 table 정의는 같은 폴더 아래 도메인별 helper로 제공합니다.

| Drizzle schema helper  | 책임                                                                         | LOC |
| ---------------------- | ---------------------------------------------------------------------------- | --: |
| `schema/foundation.ts` | Project, attachment, local state, settings table 정의                        |  79 |
| `schema/manuscript.ts` | Chapter, Scene, body/revision, note/synopsis/plot table 정의                 | 169 |
| `schema/search.ts`     | SearchDirtyQueue table 정의                                                  |  28 |
| `schema/memory.ts`     | MemoryChunk, build job, summary, embedding table 정의                        | 119 |
| `schema/world.ts`      | character/event/faction/document/scrap/term/world entity/relation table 정의 | 205 |
| `schema/snapshot.ts`   | Snapshot table 정의                                                          |  33 |
| `schema/index.ts`      | Drizzle schema helper 배럴 export와 row 타입 export                          |  14 |

사실: `src/main/services/features/snapshot/snapshotArtifacts.ts`는 snapshot artifact 읽기/후보 목록/고아 cleanup/write orchestration만 유지하도록 축소되어 297 LOC입니다. 분리된 helper는 `snapshot/artifacts/index.ts` 배럴을 통해 제공하며 public export 경로는 유지합니다.

| Snapshot helper              | 책임                                       | LOC |
| ---------------------------- | ------------------------------------------ | --: |
| `artifacts/types.ts`         | full snapshot payload와 DB record 타입     |  89 |
| `artifacts/paths.ts`         | artifact root/path/priority/snap file scan |  98 |
| `artifacts/preview.ts`       | restore candidate 제목/excerpt 계산        |  30 |
| `artifacts/projectLoader.ts` | DB에서 full snapshot record 조립           | 106 |
| `artifacts/index.ts`         | artifact helper 배럴 export                |  11 |

사실: `src/main/handler/system/settings/registerSettingsIPCHandlers.ts`는 settings IPC 등록 진입점만 유지하도록 축소되어 17 LOC입니다. 분리된 helper는 `handler/system/settings/index.ts` 배럴을 통해 제공하며 IPC channel과 등록 계약은 유지합니다.

| Settings IPC helper                       | 책임                                                     | LOC |
| ----------------------------------------- | -------------------------------------------------------- | --: |
| `settings/coreHandlers.ts`                | editor/language/menu/shortcut/window/reset 기본 설정 IPC | 183 |
| `settings/llmHandlers.ts`                 | LLM preference/key/local LLM/sidecar/Ollama IPC          | 234 |
| `settings/modelDownloadHandlers.ts`       | model download/cancel/HF search/files IPC                | 173 |
| `settings/llmfitEmbeddingHandlers.ts`     | llmfit와 embedding model IPC                             | 122 |
| `settings/managerLoader.ts`               | settingsManager lazy import cache                        |  14 |
| `settings/registerSettingsIPCHandlers.ts` | settings IPC 등록 진입점                                 |  17 |
| `settings/index.ts`                       | settings IPC helper 배럴 export                          |   6 |

사실: `src/main/services/features/sync/syncBundleCollector.ts`는 기존 public export를 유지하는 compatibility export입니다. 실제 local sync bundle orchestration은 `sync/bundleCollector/index.ts` 배럴에서 제공합니다.

| Sync bundle helper                   | 책임                                                      | LOC |
| ------------------------------------ | --------------------------------------------------------- | --: |
| `bundleCollector/index.ts`           | local sync bundle orchestration과 public helper export    | 154 |
| `bundleCollector/recordAppenders.ts` | project/chapter/world entity/tombstone row append         | 192 |
| `bundleCollector/worldDocuments.ts`  | world document replica/package hydrate, scrap memo append | 208 |
| `bundleCollector/types.ts`           | collector-local logger/doc type/normalizer helpers        |  29 |

사실: `src/main/services/features/sync/syncRepository.ts`는 기존 public export를 유지하는 compatibility export입니다. 실제 Supabase sync repository orchestration은 `sync/repository/index.ts` 배럴에서 제공합니다.

| Sync repository helper   | 책임                                             | LOC |
| ------------------------ | ------------------------------------------------ | --: |
| `repository/index.ts`    | Supabase sync repository singleton orchestration |  89 |
| `repository/http.ts`     | Supabase REST fetch/upsert와 retry               | 141 |
| `repository/mappers.ts`  | remote DB row를 SyncBundle record로 변환         | 322 |
| `repository/payload.ts`  | SyncBundle record를 remote upsert row로 변환     | 151 |
| `repository/rowUtils.ts` | row normalizer와 primitive coercion              |  56 |

사실: `src/main/services/features/memory/memoryProjectionService.ts`는 memory chunk job orchestration만 유지하도록 축소되어 246 LOC입니다. 분리된 helper는 `memory/projection/index.ts` 배럴을 통해 제공하며 기존 public export인 `memoryProjectionService`와 `chunkText`는 유지합니다.

| Memory projection helper   | 책임                                                      | LOC |
| -------------------------- | --------------------------------------------------------- | --: |
| `projection/chunking.ts`   | content hash, token estimate, paragraph-aware chunk split | 121 |
| `projection/sourceRows.ts` | memory build job target별 source row 조회                 | 211 |
| `projection/jobPolicy.ts`  | retry 가능 여부와 event loop yield 정책                   |  22 |
| `projection/index.ts`      | projection helper 배럴 export                             |  14 |

사실: `src/main/services/core/project/projectExportEngine.ts`는 `.luie` package export orchestration만 유지하도록 축소되어 173 LOC입니다. 분리된 helper는 `project/exportEngine/index.ts` 배럴을 통해 제공하며 기존 public export인 `exportProjectPackageWithOptions`는 유지합니다.

| Project export helper           | 책임                                                          | LOC |
| ------------------------------- | ------------------------------------------------------------- | --: |
| `exportEngine/projectRecord.ts` | export용 project/chapter/world entity/snapshot DB record 조립 |  94 |
| `exportEngine/worldPayload.ts`  | replica/package world payload 읽기와 schema fallback          | 252 |
| `exportEngine/types.ts`         | export engine logger/world payload 타입                       |  33 |
| `exportEngine/index.ts`         | export engine helper 배럴 export                              |  11 |

사실: `src/main/services/features/sync/syncMapper.ts`는 기존 public export를 유지하는 compatibility export로 축소되어 20 LOC입니다. 실제 SyncBundle 타입/merge orchestration은 `sync/mapper/index.ts` 배럴에서 제공합니다.

| Sync mapper helper        | 책임                                                | LOC |
| ------------------------- | --------------------------------------------------- | --: |
| `mapper/types.ts`         | SyncBundle record 타입과 merge option 타입          | 129 |
| `mapper/index.ts`         | mergeSyncBundles orchestration과 public export      | 143 |
| `mapper/textConflicts.ts` | chapter/memo 텍스트 충돌 복사와 conflict summary    | 121 |
| `mapper/tombstones.ts`    | project/entity tombstone 적용                       | 105 |
| `mapper/entityMerge.ts`   | timestamp/latest 선택과 일반 entity/world doc merge |  69 |
| `mapper/bundle.ts`        | empty SyncBundle factory                            |  14 |

사실: `src/main/manager/settings/settingsManager.ts`는 settings store API만 유지하도록 축소되어 450 LOC입니다. 레거시 설정 파일/윈도우/LLM migration은 `manager/settings/settingsMigration.ts`로 분리했습니다.

| Settings manager helper         | 책임                                                        | LOC |
| ------------------------------- | ----------------------------------------------------------- | --: |
| `settings/index.ts`             | settings singleton/helper 배럴 export                       |   4 |
| `settings/settingsMigration.ts` | legacy settings path 계산, legacy file/window/LLM migration | 125 |

사실: manager와 utility의 루트 source entry는 public export/build entry만 조립합니다.

| Area              | Entry                                | 구현                                                                                          |
| ----------------- | ------------------------------------ | --------------------------------------------------------------------------------------------- |
| manager root      | `src/main/manager/index.ts`          | `manager/window/index.ts`, `manager/settings/index.ts`, `manager/autoSave/index.ts` re-export |
| window manager    | `src/main/manager/window/index.ts`   | `window/windowManager.ts`, window helper                                                      |
| auto-save manager | `src/main/manager/autoSave/index.ts` | `autoSave/autoSaveManager.ts`, `autoSave/helpers.ts`                                          |
| utility process   | `src/main/utility/index.ts`          | `utility/process/utilityProcessMain.ts` side-effect entry                                     |
| RAG QA worker     | -                                    | `utility/rag/ragQaWorker.ts`                                                                  |

사실: `src/main/services/features/search/searchService.ts`는 public service facade로 유지하고, DB result mapping과 chapter cache 검색은 `search/basicSearch.ts`, memory chunk 검색은 `search/chunkOperations.ts`로 분리했습니다. `src/main/services/features` 루트에는 구현 파일을 두지 않습니다.

| Search helper           | 책임                                                                      | LOC |
| ----------------------- | ------------------------------------------------------------------------- | --: |
| `search/chunkSearch.ts` | memory chunk FTS query, short-token LIKE fallback, vector rank, RRF merge | 137 |
| `search/index.ts`       | search helper/service 배럴 export                                         |  25 |

사실: `src/main/services/features/sync/syncLocalApply.ts`는 project/entity local DB apply helper만 유지하도록 축소되어 310 LOC입니다. Replica world document materialization은 `sync/localApply/index.ts` 배럴 폴더로 분리했습니다.

| Sync local apply helper    | 책임                                                                          | LOC |
| -------------------------- | ----------------------------------------------------------------------------- | --: |
| `localApply/worldState.ts` | replica world document map, payload normalization, scrap memo materialization | 214 |
| `localApply/index.ts`      | local apply helper 배럴 export                                                |   1 |

사실: `src/main/services/features/analysis/analysisStreamRunner.ts`는 Gemini analysis stream orchestration과 fallback/error handling만 유지하도록 축소되어 415 LOC입니다. Loose JSON stream parsing은 `analysis/streamRunner/index.ts` 배럴 폴더로 분리했습니다.

| Analysis stream helper             | 책임                                                                 | LOC |
| ---------------------------------- | -------------------------------------------------------------------- | --: |
| `streamRunner/jsonStreamParser.ts` | noisy/fenced JSON object/array extraction and parse warning handling | 134 |
| `streamRunner/index.ts`            | analysis stream helper 배럴 export                                   |   1 |

사실: `src/main/services/core/project/projectImportOpen.ts`는 .luie open/recovery/import orchestration만 유지하도록 축소되어 337 LOC입니다. .luie 내부 world/snapshot collections 읽기와 schema validation은 `src/main/services/core/project/importOpen/index.ts` 배럴 폴더로 분리했습니다.

| Project import/open helper  | 책임                                                                                            | LOC |
| --------------------------- | ----------------------------------------------------------------------------------------------- | --: |
| `importOpen/collections.ts` | .luie world/snapshot entry read, JSON parse, schema validation, import collection normalization | 263 |
| `importOpen/index.ts`       | project import/open helper 배럴 export                                                          |   1 |

사실: `src/main/services/features/utility/utilityProcessBridge.ts`는 utility process lifecycle, request routing, RAG event forwarding만 유지하도록 축소되어 1 LOC입니다. Bridge protocol type/timeout/unwrap helper는 `utility/utilityProcessBridge/index.ts` 배럴 폴더로 분리했습니다.

| Utility bridge helper              | 책임                                                                               | LOC |
| ---------------------------------- | ---------------------------------------------------------------------------------- | --: |
| `utilityProcessBridge/protocol.ts` | utility process inbound/outbound protocol types, timeout constants, message unwrap |  78 |
| `utilityProcessBridge/index.ts`    | utility bridge helper 배럴 export                                                  |  18 |

## 위험 지점

의견:

- `projectService.ts`, `chapterService.ts`, `autoSaveManager.ts`는 public method가 많고 DB/FS/export/snapshot/derived-job 연계가 섞여 있어 책임 과다 위험이 큽니다.
- `database/schema/**`, `database/packagedSchema/**`는 LOC보다 package/DB 계약 변경 파급이 더 큽니다.
- `utilityProcessBridge.ts`는 message protocol, timeout, stream routing, sidecar lifecycle이 맞물려 있어 부분 변경 위험이 큽니다.
