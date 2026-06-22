# Current Shared Architecture

이 문서는 `src/shared`의 현재 구조를 사실 기준으로 기록합니다.

## 확인 범위

주요 근거 파일:

- `src/shared/AGENTS.md`
- `src/shared/README.md`
- `src/shared/ipc/channels.ts`
- `src/shared/ipc/response.ts`
- `src/shared/api/index.ts`
- `src/shared/api/windowApi.contract.ts`
- `src/shared/contracts/index.ts`
- `src/shared/schemas/index.ts`
- `src/shared/types/index.ts`
- `src/shared/constants/**`
- `src/shared/logger/index.ts`
- `src/shared/utils/**`
- `src/preload/index.ts`
- `src/preload/api/**`
- `src/main/handler/core/ipcHandler.ts`
- `scripts/check-ipc-contract-map.mjs`
- `scripts/check-ipc-handler-schemas.mjs`
- `scripts/check-preload-contract-regression.mjs`

## 현재 역할

사실:

- `src/shared`는 main/preload/renderer 사이의 cross-process contract boundary입니다.
- `contracts`는 현재 독립 계약 정의라기보다 `api`, `ipc`, `schemas`, `types`를 재수출하는 barrel에 가깝습니다.
- `api`는 `RendererApi` 타입과 renderer에서 쓰는 지연 proxy runtime을 함께 가집니다.
- `ipc`는 channel map과 공통 `IPCResponse` envelope/factory를 가집니다.
- `schemas`는 Zod 기반 IPC, persist, config, file, world, plugin 검증 schema가 한 파일에 집중되어 있습니다.
- `types`는 DTO, input type, settings, sync, world graph, plugin type이 한 파일에 집중되어 있습니다.
- `constants`는 config, path, error, layout, sidebar, world, canvas, persistence 값을 분리해 둡니다.
- `logger`는 main/renderer 공통 logging format과 redaction을 제공합니다.
- `utils`에는 순수 유틸과 browser/renderer 전용 유틸이 섞여 있습니다.
- `ui`, `hooks`는 React/DOM/renderer store 의존이 있는 renderer-safe compatibility 영역입니다.

## Contract Flow

```text
shared/ipc/channels.ts
  -> IPC_CHANNELS / IPCChannel

shared/api/index.ts
  -> RendererApi
  -> renderer api proxy

preload/index.ts + preload/api/*
  -> createRendererApi
  -> contextBridge.exposeInMainWorld("api", rendererApi)
  -> safeInvoke(IPC_CHANNELS.*)

main/handler/index.ts
  -> domain handler registration

main/handler/core/ipcHandler.ts
  -> argsSchema.safeParse
  -> createSuccessResponse/createErrorResponse

shared/ipc/response.ts
  -> IPCResponse envelope
```

## 보존 불가침 경계

사실:

- `IPC_CHANNELS` 문자열 값은 preload/main/lifecycle/services/docs 품질 맵과 연결되어 있어 임의 변경하면 안 됩니다.
- `IPCResponse` envelope는 preload timeout/error, main handler wrapper, renderer API 반환 계약의 공통 shape입니다.
- `registerIpcHandler`의 schema 검증과 response wrapping은 중앙 계약입니다.
- `Window["api"]`와 `RendererApi`의 양방향 호환성은 `windowApi.contract.ts`가 검증합니다.
- `@shared/ui`, `@shared/hooks`, `@shared/utils`는 기존 호환 경로입니다.
- 새 boundary 작업은 `@shared/contracts`를 우선해야 한다는 문서 정책이 있습니다.

## Electron-safe Shared와 Renderer-safe Compatibility

사실:

- `src/shared/types`, `schemas`, `ipc`, `constants`는 cross-process safe 영역으로 유지해야 합니다.
- `src/shared/ui`, `src/shared/hooks`, 일부 `src/shared/utils`는 React/DOM/localStorage/store 의존이 있어 main-safe가 아닙니다.
- `src/shared/api/index.ts`는 type뿐 아니라 renderer runtime proxy도 포함합니다.

의견:

- `shared`를 중앙화하되 비즈니스 로직 저장소로 키우면 Electron process boundary가 흐려질 위험이 큽니다.
- 향후 문서와 import 규칙에서는 `Electron-safe shared`와 `renderer-safe compatibility`를 분리해야 합니다.

## 500 LOC 초과 Shared 파일

사실:

- `src/shared/types/search.ts`는 Phase 3에서 기존 import/export shape를 유지하는 재수출 진입점으로 축소되었습니다.
- search DTO 본문은 `src/shared/types/search/` 아래의 큰 계약 축(`chunks`, `core`, `narrative`, `rag`, `review`, `status`)으로 분리되어 모두 500 LOC 이하입니다.
- `src/shared/schemas/*.ts`, `src/shared/api/*.ts`의 500 LOC 초과 파일은 없습니다.

## 위험 지점

의견:

- `types/index.ts`, `schemas/index.ts`, `api/index.ts`는 기존 import 호환을 위한 barrel 경계입니다.
- `@shared/api`를 main/preload에서 value import하면 renderer runtime proxy가 섞일 수 있습니다.
- `localStorage`, React hook, renderer store factory를 Electron-safe shared로 오해하면 main/preload bundle 경계가 깨질 수 있습니다.

## 분리 후보

의견:

기존 barrel export를 유지한 채 아래처럼 나누는 방식이 가장 안전합니다.

```text
src/shared/types/
  project.ts
  manuscript.ts
  world.ts
  sync.ts
  settings.ts
  export.ts
  plugin.ts
  search/
  index.ts       # 기존 export 유지

src/shared/schemas/
  project.ts
  world.ts
  sync.ts
  settings.ts
  persistence.ts
  index.ts       # 기존 export 유지

src/shared/api/
  rendererApi.ts
  browserProxy.ts
  windowApi.contract.ts
  index.ts       # 기존 export 유지
```
