# Target Architecture

이 문서는 Luie의 목표 Electron 아키텍처를 정의합니다.

주의: 이 문서는 즉시 파일 이동을 지시하지 않습니다. 실제 전환은 [migration-guardrails.md](./migration-guardrails.md)의 보존 규칙을 따릅니다.

## 목표

- Electron process boundary를 명확히 유지한다.
- `shared`를 얇고 강한 계약 계층으로 유지한다.
- 도메인은 작게 흩뜨리지 않고 큰 업무 축으로 묶는다.
- 파일당 500 LOC 내외 원칙을 장기 품질 기준으로 둔다.
- 하드코딩 값은 constants/config/policy로 격리한다.
- 기존 IPC, preload API, DB, `.luie` package 계약은 보존한다.

## Process Boundary

```text
main
  OS/Electron/DB/FS/native/long-running work

preload
  secure capability bridge

renderer
  React UI, screen state, user interaction

shared
  contract, schema, DTO, channel, constants, error shape
```

## Target Source Layout

```text
src/
  main/
    app/
      lifecycle/
      windows/
      startup/
      shutdown/
    ipc/
      core/
      project/
      manuscript/
      world/
      sync/
      export/
      settings/
      analysis/
    domains/
      project/
      manuscript/
      world/
      sync/
      export/
      recovery/
      analysis/
      settings/
    infra/
      database/
      filesystem/
      native/
      utility-process/
      logging/

  preload/
    api/
    bridge.ts
    safeInvoke.ts

  renderer/src/
    app/
    domains/
      project/
      manuscript/
      editor/
      world/
      sync/
      export/
      settings/
      canvas/
    shared/
      ui/
      hooks/
      store/
      error-boundaries/

  shared/
    contracts/
    ipc/
    schemas/
    types/
    constants/
    errors/
    logger/
    utils/
```

## Domain Model

의견: 큰 도메인 기준은 아래처럼 잡는 것이 현재 프로젝트와 가장 잘 맞습니다.

| Domain | 의미 |
| --- | --- |
| `project` | 프로젝트 생성, 열기, `.luie` 연결, project package export/import |
| `manuscript` | chapter, writing state, autosave trigger, manuscript search context |
| `world` | character, term, event, faction, memo, world graph, world package payload |
| `sync` | Supabase sync, auth, conflict, tombstone, baseline |
| `export` | DOCX/HWPX/export preview/package export UI |
| `settings` | app/editor/model/sync/startup settings |
| `analysis` | manuscript analysis, RAG QA, embedding, memory projection |
| `recovery` | snapshot, emergency save, restore candidate, DB/cache recovery |
| `canvas` | renderer canvas view, graph surface, visual exploration |

주의: `character`, `term`, `event`, `faction`은 최상위 도메인이 아니라 `world` 내부 모델로 취급합니다.

## Main Target Rules

사실: 현재 main은 lifecycle, handler, services, manager, database 경계를 갖고 있습니다.

목표:

- `app`은 Electron lifecycle/window/startup/shutdown만 담당한다.
- `ipc`는 channel registration, schema validation, response wrapping만 담당한다.
- `domains`는 application service와 domain policy를 담당한다.
- `infra`는 DB, FS, native dialog, utility process, logger adapter를 담당한다.
- handler 안에는 business rule을 넣지 않는다.
- service public method는 이동 중 유지한다.

```text
ipc handler
  -> domain service
  -> infra adapter
```

## Preload Target Rules

목표:

- preload는 renderer capability API만 노출한다.
- `safeInvoke`는 timeout/error/event cleanup 정책을 중앙화한다.
- preload API shape는 `RendererApi`와 계속 일치해야 한다.
- Node/Electron object를 renderer에 직접 노출하지 않는다.
- 기존 `window.api` shape는 즉시 변경하지 않는다.

## Renderer Target Rules

사실: 현재 renderer는 feature-first 구조입니다.

목표:

- renderer domain은 UI, hook, store, adapter를 한 도메인 안에 응집한다.
- `workspace`는 도메인이 아니라 layout orchestration 성격으로 문서화한다.
- `App.tsx`는 window mode/bootstrap/project gate coordinator로 줄인다.
- `EditorRoot.tsx`는 layout shell로 유지하되 각 layout branch를 작은 component로 분리한다.
- renderer에서 desktop capability는 domain adapter 또는 `@shared/api`를 통해 호출한다.
- 직접 `window.api` 호출은 문서화된 예외에서 시작해 adapter로 점진 이전한다.

```text
renderer domain component/hook/store
  -> renderer domain adapter
  -> @shared/api
  -> preload
```

## Shared Target Rules

목표:

- `shared`는 business logic을 소유하지 않는다.
- `shared/types`는 DTO와 cross-process type만 둔다.
- `shared/schemas`는 IPC/persist/config/file payload validation만 둔다.
- `shared/ipc`는 channel registry와 response envelope만 둔다.
- `shared/constants`는 하드코딩 방지 값만 둔다.
- renderer-only UI/hook/store는 root `shared`가 아니라 `src/renderer/src/shared`로 둔다.
- 기존 compatibility export는 충분한 검증 전까지 유지한다.

## Error and Result Shape

목표:

```text
main domain error
  -> ServiceError or mapped error code
  -> registerIpcHandler
  -> IPCResponse { success:false, error, meta }
  -> preload
  -> renderer domain adapter
```

- IPC response envelope는 유지한다.
- error code는 `shared/errors` 또는 기존 constants에서 중앙화한다.
- renderer는 raw thrown error보다 typed result/error path를 우선한다.

## Hardcoding Policy

하드코딩 방지 위치:

- cross-process 값: `src/shared/constants`
- renderer-only UI sizing/state key: `src/renderer/src/shared` 또는 renderer domain config
- main-only path/native policy: `src/main/infra` 또는 main domain policy
- IPC channel: `src/shared/ipc/channels.ts`
- validation limits: `src/shared/schemas` 또는 domain schema config

## 500 LOC Policy

목표:

- 일반 소스 파일은 500 LOC 내외를 넘지 않는다.
- 초과 시 새 기능 추가보다 분리 계획을 먼저 세운다.
- i18n locale, generated schema, packaged schema는 예외 후보지만 문서화해야 한다.
- 분리는 public API 유지, barrel export 유지, targeted test 순서로 진행한다.

## Verification Policy

아키텍처 전환은 최소 관련 검증을 실행합니다.

```bash
pnpm run typecheck
pnpm run lint
pnpm run check:ipc-contract-map
pnpm run check:ipc-handler-schemas
pnpm run check:preload-contract-regression
pnpm run check:renderer-store-usage
pnpm run check:core-complexity
```

확실하지 않습니다: 현재 `AGENTS.md`는 bun 명령을 언급하지만 `package.json`은 `pnpm@11.5.0`과 `pnpm` scripts를 기준으로 합니다. 이 문서는 현재 `package.json` 사실에 맞춰 `pnpm` 검증 명령을 기록합니다.

