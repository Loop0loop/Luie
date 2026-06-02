# Architecture Migration Map

이 문서는 현재 구조를 목표 구조로 옮길 때의 매핑을 기록합니다.

주의: 이 문서는 삭제 계획이 아닙니다. 모든 항목은 기존 경로와 public contract를 보존한 상태에서 점진 이전합니다.

## Migration Strategy

```text
current file
  -> responsibility inventory
  -> target domain/config/helper
  -> new file added
  -> old file keeps public export/import compatibility
  -> targeted tests
  -> typecheck/lint
  -> old path cleanup only in later explicit phase
```

## Top-Level Mapping

| Current | Target | Migration rule |
| --- | --- | --- |
| `src/main/lifecycle/**` | `src/main/app/lifecycle/**` | 문서상 목표. 실제 이동은 후순위 |
| `src/main/manager/windowManager.ts` | `src/main/app/windows/**` | public singleton 유지 |
| `src/main/handler/**` | `src/main/ipc/**` | handler registration contract 유지 |
| `src/main/services/core/**` | `src/main/domains/project`, `manuscript` | service public method 유지 |
| `src/main/services/world/**` | `src/main/domains/world/**` | world entity/relation 계약 유지 |
| `src/main/services/features/sync/**` | `src/main/domains/sync/**` | sync/auth/conflict contract 유지 |
| `src/main/services/features/analysis/**` | `src/main/domains/analysis/**` | stream/event channel 유지 |
| `src/main/services/features/snapshot/**` | `src/main/domains/recovery/**` | snapshot API 유지 |
| `src/main/database/**` | `src/main/infra/database/**` | DB singleton/schema/package 계약 유지 |
| `src/main/utility/**` | `src/main/infra/utility-process/**` | message protocol 유지 |
| `src/renderer/src/features/**` | `src/renderer/src/domains/**` | 현 feature-first와 호환하며 점진 검토 |
| `src/shared/types/index.ts` | `src/shared/types/<domain>.ts` | 기존 `index.ts` barrel 유지 |
| `src/shared/schemas/index.ts` | `src/shared/schemas/<domain>.ts` | 기존 schema export 유지 |
| `src/shared/api/index.ts` | `rendererApi.ts`, `browserProxy.ts` | 기존 `@shared/api` export 유지 |

## Phase 0: Documentation Only

상태: 진행 중.

목표:

- 현재 구조 문서화
- 목표 구조 문서화
- 보존 경계 문서화
- migration map 작성

변경 허용:

- `docs/architecture/**`만 추가/수정

## Phase 1A: Main Domain Folder Index

상태: 진행 중.

완료:

- `src/main/database/index.ts`는 기존 DB singleton 진입점으로 유지합니다.
- `src/main/handler/system/index.ts`는 system handler 등록 진입점으로 유지합니다.
- `src/main/handler/world/index.ts`는 world handler 등록 진입점으로 유지합니다.
- `src/main/manager/autoSave/index.ts`를 추가해 autoSave helper export를 제공합니다.
- `src/main/services/llm/index.ts`를 추가해 LLM service/helper export를 제공합니다.
- `src/main/utils/index.ts`를 추가해 main utility export를 제공합니다.
- `src/main/services/features/sync/index.ts`를 추가해 sync public service export를 제공합니다.
- 이후 Phase 2/3 분리 작업은 도메인 하위 폴더와 `index.ts` 배럴 export 방식을 기본으로 유지합니다.

검증:

```bash
bun run typecheck
bun run check:core-complexity
```

## Phase 1: Shared Contract Split

상태: 부분 완료.

완료:

- `src/shared/types/index.ts`를 호환 barrel로 축소했습니다.
- `src/shared/schemas/index.ts`를 호환 barrel로 축소했습니다.
- `src/shared/api/index.ts`를 호환 barrel로 축소했습니다.
- 기존 `@shared/types` 공개 타입 이름은 보존했습니다.
- 기존 `@shared/schemas` 공개 schema 이름은 보존했습니다.
- 기존 `@shared/api` 공개 export는 보존했습니다.
- 모든 `src/shared/types/*.ts`, `src/shared/schemas/*.ts`, `src/shared/api/*.ts` 파일은 500 LOC 이하입니다.
- 2026-06-02 기준 `pnpm run typecheck` 통과.

미완료:

- shared 계약 분리 후 IPC guard script 재검증

추천 이유:

- shared는 main/preload/renderer 계약의 중앙 경계입니다.
- `types/index.ts`, `schemas/index.ts`, `api/index.ts`는 1차 분리로 호환 barrel이 됐습니다.
- 다음 shared split은 guard script 결과를 기준으로 잔여 계약 drift를 확인합니다.
- 기존 barrel export를 유지하면 기능 보존 가능성이 상대적으로 높습니다.

대상:

```text
src/shared/types/index.ts
src/shared/schemas/index.ts
src/shared/api/index.ts
```

목표:

```text
src/shared/types/
  project.ts
  manuscript.ts
  world.ts
  search.ts
  settings.ts
  snapshot.ts
  export.ts
  analysis.ts
  index.ts

src/shared/schemas/
  project.ts
  manuscript.ts
  world.ts
  sync.ts
  settings.ts
  export.ts
  persistence.ts
  plugin.ts
  index.ts

src/shared/api/
  rendererApi.ts
  browserProxy.ts
  events.ts
  windowApi.contract.ts
  index.ts
```

보존 규칙:

- `import { ... } from "@shared/types"`는 계속 동작해야 합니다.
- `import { ... } from "@shared/schemas"`는 계속 동작해야 합니다.
- `import { api, type RendererApi } from "@shared/api"`는 계속 동작해야 합니다.
- `Window["api"]`와 `RendererApi` 타입 호환 검증은 유지합니다.
- runtime proxy와 type-only imports를 분리하되 기존 export shape는 유지합니다.

검증:

현재 검증 명령은 `package.json`의 `packageManager: pnpm@11.5.0`과 `pnpm` scripts를 기준으로 기록합니다. `AGENTS.md`의 bun 지침과 충돌하는 경우, 실제 실행 전 현재 `package.json`을 우선 확인합니다.

```bash
pnpm run typecheck
pnpm run check:ipc-contract-map
pnpm run check:ipc-handler-schemas
pnpm run check:preload-contract-regression
```

## Phase 2: Main High-Risk Service Split

상태: 진행 중.

완료:

- `src/main/services/core/projectService.ts`는 476 LOC입니다.
- `src/main/services/core/chapterService.ts`는 361 LOC입니다.
- `src/main/manager/autoSaveManager.ts`는 492 LOC입니다.
- `src/main/services/features/dbMaintenanceService.ts`는 473 LOC입니다.
- `src/main/services/features/snapshot/snapshotService.ts`는 411 LOC입니다.
- `src/main/services/features/snapshot/snapshotArtifacts.ts`는 297 LOC입니다.
- `src/main/handler/system/ipcSettingsHandlers.ts`는 15 LOC입니다.
- `src/main/services/features/sync/syncBundleCollector.ts`는 154 LOC입니다.
- `src/main/services/features/sync/syncRepository.ts`는 75 LOC입니다.
- `src/main/services/features/memory/memoryProjectionService.ts`는 231 LOC입니다.
- `src/main/services/core/project/projectExportEngine.ts`는 170 LOC입니다.
- `snapshotArtifacts.ts`의 기존 public export인 `readFullSnapshotArtifact`, `listSnapshotRestoreCandidates`, `cleanupOrphanSnapshotArtifacts`, `writeFullSnapshotArtifact`는 유지했습니다.
- snapshot artifact의 path 탐색, restore preview 계산, DB payload 조립, payload 타입은 `snapshot/artifacts/index.ts` 배럴 폴더로 분리했습니다.
- `ipcSettingsHandlers.ts`의 기존 public export인 `registerSettingsIPCHandlers`는 유지했습니다.
- settings IPC의 기본 설정, LLM 설정, 모델 다운로드, llmfit/embedding handler는 `handler/system/settings/index.ts` 배럴 폴더로 분리했습니다.
- `syncBundleCollector.ts`의 기존 public export인 `buildLocalSyncBundle`, `hydrateMissingWorldDocsFromPackage`는 유지했습니다.
- sync bundle row append, world document hydrate/scrap memo 처리, collector-local 타입/normalizer는 `sync/bundleCollector/index.ts` 배럴 폴더로 분리했습니다.
- `syncRepository.ts`의 기존 public export인 `syncRepository` singleton과 `fetchBundle`, `upsertBundle`, `isConfigured` method shape는 유지했습니다.
- Supabase REST fetch/upsert, remote row mapper, upsert payload builder, row normalizer는 `sync/repository/index.ts` 배럴 폴더로 분리했습니다.
- `memoryProjectionService.ts`의 기존 public export인 `memoryProjectionService` singleton과 `chunkText`는 유지했습니다.
- memory chunking, source row 조회, retry/yield policy는 `memory/projection/index.ts` 배럴 폴더로 분리했습니다.
- `projectExportEngine.ts`의 기존 public export인 `exportProjectPackageWithOptions`는 유지했습니다.
- export용 DB record 조회, replica/package world payload 읽기, export-local 타입은 `project/exportEngine/index.ts` 배럴 폴더로 분리했습니다.
- 2026-06-02 기준 `bun run typecheck`, `bun run check:core-complexity`, `bun run check:ipc-handler-schemas`, `bun run check:ipc-contract-map` 통과.
- 2026-06-02 기준 `SKIP_DB_TEST_SETUP=1 bun vitest tests/main/handler/ipcSettingsHandlers.security.test.ts` 통과.
- 2026-06-02 기준 `SKIP_DB_TEST_SETUP=1 bun vitest tests/main/services/syncService.test.ts` 통과.
- 2026-06-02 기준 `SKIP_DB_TEST_SETUP=1 bun vitest tests/main/services/syncRepository.test.ts tests/main/services/syncService.test.ts` 통과.
- 2026-06-02 기준 `bun vitest tests/main/services/memoryProjectionService.test.ts` 통과.
- 2026-06-02 기준 `SKIP_DB_TEST_SETUP=1 bun vitest tests/main/services/projectExportEngine.test.ts` 통과.

검증 제약:

- `SKIP_DB_TEST_SETUP=1 bun vitest tests/main/services/snapshotArtifacts.pathValidation.test.ts tests/main/services/snapshotService.packageBehavior.unit.test.ts`는 현재 mock DB client가 Drizzle `select`/`insert` API를 제공하지 않아 실패합니다.
- 실패 지점은 `store.select is not a function`, `db.getClient(...).insert is not a function`입니다.
- 이건 확인된 사실입니다. native DB 포함 테스트 재실행 전에 테스트 mock 또는 `better-sqlite3`/Drizzle test setup 정리가 필요합니다.

대상 후보:

```text
src/main/database/packagedSchema.ts
src/main/database/schema.ts
src/main/manager/settingsManager.ts
src/main/services/features/sync/syncMapper.ts
src/main/services/features/analysis/analysisStreamRunner.ts
src/main/services/features/sync/syncLocalApply.ts
src/main/services/core/project/projectImportOpen.ts
src/main/services/features/utility/utilityProcessBridge.ts
src/main/services/features/searchService.ts
```

목표:

- public class/method shape 유지
- 내부 helper를 domain policy/mapper/queue/repository 성격 파일로 분리
- handler import 경로는 즉시 바꾸지 않음
- DB/package/IPC 계약은 변경하지 않음

예상 분리 축:

```text
projectService.ts
  -> projectPathPolicy
  -> projectPackagePersistence
  -> projectImportOpen
  -> projectExportScheduling
  -> projectDeletionPolicy

chapterService.ts
  -> chapterMutationPolicy
  -> chapterKeywordTracking
  -> chapterSearchInvalidation
  -> chapterPackagePersistence

autoSaveManager.ts
  -> autoSaveQueue
  -> autoSaveFlushOps
  -> autoSaveMirrorStore
  -> autoSaveSnapshotJobs

snapshotArtifacts.ts
  -> artifacts/index
  -> artifacts/types
  -> artifacts/paths
  -> artifacts/preview
  -> artifacts/projectLoader

ipcSettingsHandlers.ts
  -> settings/index
  -> settings/coreHandlers
  -> settings/llmHandlers
  -> settings/modelDownloadHandlers
  -> settings/llmfitEmbeddingHandlers
  -> settings/managerLoader

syncBundleCollector.ts
  -> bundleCollector/index
  -> bundleCollector/recordAppenders
  -> bundleCollector/worldDocuments
  -> bundleCollector/types

syncRepository.ts
  -> repository/index
  -> repository/http
  -> repository/mappers
  -> repository/payload
  -> repository/rowUtils

memoryProjectionService.ts
  -> projection/index
  -> projection/chunking
  -> projection/sourceRows
  -> projection/jobPolicy

projectExportEngine.ts
  -> exportEngine/index
  -> exportEngine/projectRecord
  -> exportEngine/worldPayload
  -> exportEngine/types
```

검증:

```bash
pnpm run typecheck
pnpm run check:core-complexity
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/services/projectService.test.ts
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/services/chapterService.test.ts
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/services/autoSaveManager.runtimeStats.test.ts
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/services/snapshotArtifacts.pathValidation.test.ts
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/handler/ipcSettingsHandlers.security.test.ts
```

## Phase 3: Renderer Shell Split

상태: 미시작.

대상 후보:

```text
src/renderer/src/app/App.tsx
src/renderer/src/features/workspace/components/layout/EditorRoot.tsx
src/renderer/src/features/workspace/stores/projectLayoutStore.ts
src/renderer/src/features/research/stores/worldBuildingStore.actions.ts
src/renderer/src/features/editor/components/EditorToolbar.tsx
```

2026-06-02 기준 후보 LOC:

| File | LOC |
| --- | ---: |
| `src/renderer/src/features/editor/components/EditorToolbar.tsx` | 818 |
| `src/renderer/src/features/workspace/stores/projectLayoutStore.ts` | 655 |
| `src/renderer/src/features/research/stores/worldBuildingStore.actions.ts` | 639 |
| `src/renderer/src/app/App.tsx` | 612 |
| `src/renderer/src/features/workspace/components/layout/EditorRoot.tsx` | 536 |

목표:

- `App.tsx`는 window mode/bootstrap/project gate coordinator로 축소
- `EditorRoot.tsx`는 layout shell 유지, branch별 component/hook 분리
- `EditorToolbar.tsx`는 button/menu/color/typography groups로 분리
- `worldBuildingStore.actions.ts`는 graph load, persistence queue, CRUD sync를 분리
- 직접 `window.api` 예외는 domain adapter로 감싸되 기존 fallback 유지

검증:

```bash
pnpm run typecheck
pnpm run check:renderer-store-usage
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/dom/appOperationalScenarios.test.tsx
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/dom/rendererRerenderRegression.test.tsx
```

## Phase 4: Target Folder Adoption

주의: 이 단계는 가장 늦게 진행합니다.

목표:

- 새 `domains`/`infra`/`ipc` 폴더를 실제 source layout으로 채택
- 기존 경로는 re-export 또는 compatibility wrapper로 유지
- import path cleanup은 별도 PR/작업으로 분리

금지:

- 한 번에 `src/main/services` 삭제
- 한 번에 `src/renderer/src/features` 삭제
- preload API shape 변경
- IPC channel rename

## First Recommended Implementation Unit

의견:

첫 구현 단위는 `src/shared/types/index.ts` 또는 `src/shared/schemas/index.ts`의 domain split입니다.

이유:

- 현재 목표 아키텍처의 중앙 계약 정리에 직접 연결됩니다.
- 기존 barrel export를 유지할 수 있습니다.
- main/renderer business logic을 직접 변경하지 않습니다.
- 실패 시 typecheck에서 빠르게 드러날 가능성이 큽니다.

권장 시작:

```text
1. shared/types inventory 작성
2. world/project/sync/settings/export grouping 결정
3. 새 파일 추가
4. index.ts에서 re-export
5. typecheck
```

확실하지 않습니다: 실제 import graph와 type-only/value import 차이는 구현 직전 다시 확인해야 합니다.
