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

## Phase 1: Shared Contract Split

추천 이유:

- shared는 main/preload/renderer 계약의 중앙 경계입니다.
- `types/index.ts`, `schemas/index.ts`, `api/index.ts`가 500 LOC를 크게 초과합니다.
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
  sync.ts
  settings.ts
  export.ts
  analysis.ts
  plugin.ts
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

대상 후보:

```text
src/main/services/core/projectService.ts
src/main/services/core/chapterService.ts
src/main/manager/autoSaveManager.ts
src/main/services/features/dbMaintenanceService.ts
src/main/services/world/entityRelationService.ts
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
```

검증:

```bash
pnpm run typecheck
pnpm run check:core-complexity
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/services/projectService.test.ts
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/services/chapterService.test.ts
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/services/autoSaveManager.runtimeStats.test.ts
```

## Phase 3: Renderer Shell Split

대상 후보:

```text
src/renderer/src/app/App.tsx
src/renderer/src/features/workspace/components/layout/EditorRoot.tsx
src/renderer/src/features/workspace/stores/projectLayoutStore.ts
src/renderer/src/features/research/stores/worldBuildingStore.actions.ts
src/renderer/src/features/editor/components/EditorToolbar.tsx
```

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
