# Current Main Architecture

이 문서는 `src/main`의 현재 구조를 사실 기준으로 기록합니다.

## 확인 범위

주요 근거 파일:

- `src/main/index.ts`
- `src/main/lifecycle/appReady.ts`
- `src/main/lifecycle/bootstrap.ts`
- `src/main/lifecycle/shutdown.ts`
- `src/main/lifecycle/deepLink.ts`
- `src/main/lifecycle/crashReporting.ts`
- `src/main/handler/index.ts`
- `src/main/handler/core/ipcHandler.ts`
- `src/main/handler/core/ipcRegistrar.ts`
- `src/main/database/index.ts`
- `src/main/database/cacheDb.ts`
- `src/main/manager/windowManager.ts`
- `src/main/manager/settingsManager.ts`
- `src/main/manager/autoSaveManager.ts`
- `src/main/services/**`

## 현재 역할

사실:

- `src/main/index.ts`는 Electron main bootstrap entry입니다.
- `index.ts`는 env 로딩, single instance lock, logger 설정, protocol 등록, deep link 처리, lifecycle 등록, utility process start/stop 조립을 담당합니다.
- `registerAppReady()`는 `app.whenReady()` 이후 DB bootstrap, IPC 등록, CSP 헤더, renderer readiness, 메뉴, startup wizard/main window 분기를 담당합니다.
- `WindowManager`는 `BrowserWindow` 생성, preload path, route loading, secure webPreferences, main/startup/export/world-graph window lifecycle을 관리합니다.
- `handler/index.ts`는 project/world/writing/search/system/analysis IPC handler 등록 허브입니다.
- `handler/core/ipcHandler.ts`는 `ipcMain.handle` 공통 래퍼입니다.
- main/cache SQLite는 `database/index.ts`, `database/cacheDb.ts` singleton이 소유합니다.
- `services/*`는 얇은 repository가 아니라 business rule, DB query, derived jobs, `.luie` export scheduling을 포함하는 두꺼운 service layer입니다.
- `manager/*`는 runtime singleton 상태를 관리합니다.
- RAG QA, embedding, llama-server sidecar는 utility process와 `UtilityProcessBridge`로 분리됩니다.

## Phase 1 Domain Folder Index

사실: 2026-06-02 기준 Phase 1 지정 도메인의 폴더 영역과 `index.ts` export 상태입니다.

| Domain | Index | 상태 |
| --- | --- | --- |
| `src/main/database` | `src/main/database/index.ts` | DB singleton 진입점 유지 |
| `src/main/handler/system` | `src/main/handler/system/index.ts` | system handler 등록 진입점 유지 |
| `src/main/handler/world` | `src/main/handler/world/index.ts` | world handler 등록 진입점 유지 |
| `src/main/manager/autoSave` | `src/main/manager/autoSave/index.ts` | autoSave helper 배럴 추가 |
| `src/main/services/llm` | `src/main/services/llm/index.ts` | LLM service/helper 배럴 추가 |
| `src/main/utils` | `src/main/utils/index.ts` | main utility 배럴 추가 |
| `src/main/services/features/sync` | `src/main/services/features/sync/index.ts` | sync public service 배럴 추가 |

사실: Phase 2에서 분리된 snapshot/settings/sync 내부 helper는 도메인 하위 폴더의 `index.ts`를 통해 제공합니다.

| Area | Index |
| --- | --- |
| snapshot artifact helpers | `src/main/services/features/snapshot/artifacts/index.ts` |
| settings IPC helpers | `src/main/handler/system/settings/index.ts` |
| sync bundle collector helpers | `src/main/services/features/sync/bundleCollector/index.ts` |
| sync repository helpers | `src/main/services/features/sync/repository/index.ts` |

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

사실: 2026-06-02 기준 `src/main/**/*.ts`의 500 LOC 초과 파일입니다.

| File | LOC |
| --- | ---: |
| `src/main/database/packagedSchema.ts` | 639 |
| `src/main/database/schema.ts` | 623 |
| `src/main/services/features/utility/utilityProcessBridge.ts` | 511 |

사실: `src/main/services/features/snapshot/snapshotArtifacts.ts`는 snapshot artifact 읽기/후보 목록/고아 cleanup/write orchestration만 유지하도록 축소되어 297 LOC입니다. 분리된 helper는 `snapshot/artifacts/index.ts` 배럴을 통해 제공하며 public export 경로는 유지합니다.

| Snapshot helper | 책임 | LOC |
| --- | --- | ---: |
| `artifacts/types.ts` | full snapshot payload와 DB record 타입 | 89 |
| `artifacts/paths.ts` | artifact root/path/priority/snap file scan | 98 |
| `artifacts/preview.ts` | restore candidate 제목/excerpt 계산 | 30 |
| `artifacts/projectLoader.ts` | DB에서 full snapshot record 조립 | 106 |
| `artifacts/index.ts` | artifact helper 배럴 export | 11 |

사실: `src/main/handler/system/ipcSettingsHandlers.ts`는 settings IPC 등록 진입점만 유지하도록 축소되어 15 LOC입니다. 분리된 helper는 `handler/system/settings/index.ts` 배럴을 통해 제공하며 IPC channel과 등록 계약은 유지합니다.

| Settings IPC helper | 책임 | LOC |
| --- | --- | ---: |
| `settings/coreHandlers.ts` | editor/language/menu/shortcut/window/reset 기본 설정 IPC | 183 |
| `settings/llmHandlers.ts` | LLM preference/key/local LLM/sidecar/Ollama IPC | 171 |
| `settings/modelDownloadHandlers.ts` | model download/cancel/HF search/files IPC | 164 |
| `settings/llmfitEmbeddingHandlers.ts` | llmfit와 embedding model IPC | 115 |
| `settings/managerLoader.ts` | settingsManager lazy import cache | 14 |
| `settings/index.ts` | settings IPC helper 배럴 export | 5 |

사실: `src/main/services/features/sync/syncBundleCollector.ts`는 기존 public export를 유지하는 compatibility export입니다. 실제 local sync bundle orchestration은 `sync/bundleCollector/index.ts` 배럴에서 제공합니다.

| Sync bundle helper | 책임 | LOC |
| --- | --- | ---: |
| `bundleCollector/index.ts` | local sync bundle orchestration과 public helper export | 154 |
| `bundleCollector/recordAppenders.ts` | project/chapter/world entity/tombstone row append | 192 |
| `bundleCollector/worldDocuments.ts` | world document replica/package hydrate, scrap memo append | 208 |
| `bundleCollector/types.ts` | collector-local logger/doc type/normalizer helpers | 29 |

사실: `src/main/services/features/sync/syncRepository.ts`는 기존 public export를 유지하는 compatibility export입니다. 실제 Supabase sync repository orchestration은 `sync/repository/index.ts` 배럴에서 제공합니다.

| Sync repository helper | 책임 | LOC |
| --- | --- | ---: |
| `repository/index.ts` | Supabase sync repository singleton orchestration | 75 |
| `repository/http.ts` | Supabase REST fetch/upsert와 retry | 84 |
| `repository/mappers.ts` | remote DB row를 SyncBundle record로 변환 | 263 |
| `repository/payload.ts` | SyncBundle record를 remote upsert row로 변환 | 139 |
| `repository/rowUtils.ts` | row normalizer와 primitive coercion | 56 |

사실: `src/main/services/features/memory/memoryProjectionService.ts`는 memory chunk job orchestration만 유지하도록 축소되어 231 LOC입니다. 분리된 helper는 `memory/projection/index.ts` 배럴을 통해 제공하며 기존 public export인 `memoryProjectionService`와 `chunkText`는 유지합니다.

| Memory projection helper | 책임 | LOC |
| --- | --- | ---: |
| `projection/chunking.ts` | content hash, token estimate, paragraph-aware chunk split | 121 |
| `projection/sourceRows.ts` | memory build job target별 source row 조회 | 201 |
| `projection/jobPolicy.ts` | retry 가능 여부와 event loop yield 정책 | 22 |
| `projection/index.ts` | projection helper 배럴 export | 14 |

사실: `src/main/services/core/project/projectExportEngine.ts`는 `.luie` package export orchestration만 유지하도록 축소되어 170 LOC입니다. 분리된 helper는 `project/exportEngine/index.ts` 배럴을 통해 제공하며 기존 public export인 `exportProjectPackageWithOptions`는 유지합니다.

| Project export helper | 책임 | LOC |
| --- | --- | ---: |
| `exportEngine/projectRecord.ts` | export용 project/chapter/world entity/snapshot DB record 조립 | 94 |
| `exportEngine/worldPayload.ts` | replica/package world payload 읽기와 schema fallback | 252 |
| `exportEngine/types.ts` | export engine logger/world payload 타입 | 33 |
| `exportEngine/index.ts` | export engine helper 배럴 export | 11 |

사실: `src/main/services/features/sync/syncMapper.ts`는 기존 public export를 유지하는 compatibility export로 축소되어 19 LOC입니다. 실제 SyncBundle 타입/merge orchestration은 `sync/mapper/index.ts` 배럴에서 제공합니다.

| Sync mapper helper | 책임 | LOC |
| --- | --- | ---: |
| `mapper/types.ts` | SyncBundle record 타입과 merge option 타입 | 129 |
| `mapper/index.ts` | mergeSyncBundles orchestration과 public export | 138 |
| `mapper/textConflicts.ts` | chapter/memo 텍스트 충돌 복사와 conflict summary | 121 |
| `mapper/tombstones.ts` | project/entity tombstone 적용 | 102 |
| `mapper/entityMerge.ts` | timestamp/latest 선택과 일반 entity/world doc merge | 69 |
| `mapper/bundle.ts` | empty SyncBundle factory | 14 |

사실: `src/main/manager/settingsManager.ts`는 settings store API만 유지하도록 축소되어 450 LOC입니다. 레거시 설정 파일/윈도우/LLM migration은 `manager/settings/settingsMigration.ts`로 분리했습니다.

| Settings manager helper | 책임 | LOC |
| --- | --- | ---: |
| `settings/settingsMigration.ts` | legacy settings path 계산, legacy file/window/LLM migration | 125 |

사실: `src/main/services/features/searchService.ts`는 통합 검색 service API와 DB result mapping만 유지하도록 축소되어 373 LOC입니다. Memory chunk token/FTS fallback/vector/RRF helper는 `features/search/index.ts` 배럴 폴더로 분리했습니다.

| Search helper | 책임 | LOC |
| --- | --- | ---: |
| `search/chunkSearch.ts` | memory chunk FTS query, short-token LIKE fallback, vector rank, RRF merge | 137 |
| `search/index.ts` | search helper 배럴 export | 7 |

사실: `src/main/services/features/sync/syncLocalApply.ts`는 project/entity local DB apply helper만 유지하도록 축소되어 310 LOC입니다. Replica world document materialization은 `sync/localApply/index.ts` 배럴 폴더로 분리했습니다.

| Sync local apply helper | 책임 | LOC |
| --- | --- | ---: |
| `localApply/worldState.ts` | replica world document map, payload normalization, scrap memo materialization | 214 |
| `localApply/index.ts` | local apply helper 배럴 export | 1 |

사실: `src/main/services/features/analysis/analysisStreamRunner.ts`는 Gemini analysis stream orchestration과 fallback/error handling만 유지하도록 축소되어 415 LOC입니다. Loose JSON stream parsing은 `analysis/streamRunner/index.ts` 배럴 폴더로 분리했습니다.

| Analysis stream helper | 책임 | LOC |
| --- | --- | ---: |
| `streamRunner/jsonStreamParser.ts` | noisy/fenced JSON object/array extraction and parse warning handling | 134 |
| `streamRunner/index.ts` | analysis stream helper 배럴 export | 1 |

사실: `src/main/services/core/project/projectImportOpen.ts`는 .luie open/recovery/import orchestration만 유지하도록 축소되어 287 LOC입니다. .luie 내부 world/snapshot collections 읽기와 schema validation은 `project/importOpen/index.ts` 배럴 폴더로 분리했습니다.

| Project import/open helper | 책임 | LOC |
| --- | --- | ---: |
| `importOpen/collections.ts` | .luie world/snapshot entry read, JSON parse, schema validation, import collection normalization | 240 |
| `importOpen/index.ts` | project import/open helper 배럴 export | 1 |

## 위험 지점

의견:

- `projectService.ts`, `chapterService.ts`, `autoSaveManager.ts`는 public method가 많고 DB/FS/export/snapshot/derived-job 연계가 섞여 있어 책임 과다 위험이 큽니다.
- `database/schema.ts`, `database/packagedSchema.ts`는 LOC보다 package/DB 계약 변경 파급이 더 큽니다.
- `utilityProcessBridge.ts`는 message protocol, timeout, stream routing, sidecar lifecycle이 맞물려 있어 부분 변경 위험이 큽니다.
