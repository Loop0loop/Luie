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
| `src/main/services/features/memory/memoryProjectionService.ts` | 530 |
| `src/main/services/features/sync/syncRepository.ts` | 529 |
| `src/main/services/core/project/projectExportEngine.ts` | 524 |
| `src/main/manager/settingsManager.ts` | 519 |
| `src/main/services/features/sync/syncMapper.ts` | 518 |
| `src/main/services/features/analysis/analysisStreamRunner.ts` | 518 |
| `src/main/services/features/sync/syncLocalApply.ts` | 517 |
| `src/main/services/core/project/projectImportOpen.ts` | 516 |
| `src/main/services/features/utility/utilityProcessBridge.ts` | 511 |
| `src/main/services/features/searchService.ts` | 504 |

사실: `src/main/services/features/snapshot/snapshotArtifacts.ts`는 snapshot artifact 읽기/후보 목록/고아 cleanup/write orchestration만 유지하도록 축소되어 297 LOC입니다. 분리된 helper는 모두 같은 snapshot feature 폴더에 있으며 public export 경로는 유지합니다.

| Snapshot helper | 책임 | LOC |
| --- | --- | ---: |
| `snapshotArtifactTypes.ts` | full snapshot payload와 DB record 타입 | 89 |
| `snapshotArtifactPaths.ts` | artifact root/path/priority/snap file scan | 98 |
| `snapshotArtifactPreview.ts` | restore candidate 제목/excerpt 계산 | 30 |
| `snapshotArtifactProjectLoader.ts` | DB에서 full snapshot record 조립 | 106 |

사실: `src/main/handler/system/ipcSettingsHandlers.ts`는 settings IPC 등록 진입점만 유지하도록 축소되어 15 LOC입니다. 분리된 helper는 모두 같은 system handler 폴더에 있으며 IPC channel과 등록 계약은 유지합니다.

| Settings IPC helper | 책임 | LOC |
| --- | --- | ---: |
| `ipcSettingsCoreHandlers.ts` | editor/language/menu/shortcut/window/reset 기본 설정 IPC | 183 |
| `ipcSettingsLlmHandlers.ts` | LLM preference/key/local LLM/sidecar/Ollama IPC | 171 |
| `ipcModelDownloadHandlers.ts` | model download/cancel/HF search/files IPC | 164 |
| `ipcLlmfitEmbeddingHandlers.ts` | llmfit와 embedding model IPC | 115 |
| `ipcSettingsManagerLoader.ts` | settingsManager lazy import cache | 14 |

사실: `src/main/services/features/sync/syncBundleCollector.ts`는 local sync bundle orchestration과 기존 public export만 유지하도록 축소되어 154 LOC입니다.

| Sync bundle helper | 책임 | LOC |
| --- | --- | ---: |
| `syncBundleRecordAppenders.ts` | project/chapter/world entity/tombstone row append | 192 |
| `syncBundleWorldDocuments.ts` | world document replica/package hydrate, scrap memo append | 208 |
| `syncBundleCollectorTypes.ts` | collector-local logger/doc type/normalizer helpers | 29 |

## 위험 지점

의견:

- `projectService.ts`, `chapterService.ts`, `autoSaveManager.ts`는 public method가 많고 DB/FS/export/snapshot/derived-job 연계가 섞여 있어 책임 과다 위험이 큽니다.
- `database/schema.ts`, `database/packagedSchema.ts`는 LOC보다 package/DB 계약 변경 파급이 더 큽니다.
- `utilityProcessBridge.ts`는 message protocol, timeout, stream routing, sidecar lifecycle이 맞물려 있어 부분 변경 위험이 큽니다.
