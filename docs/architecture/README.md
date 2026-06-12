# Luie Architecture

이 문서는 Luie의 현재 Electron 아키텍처를 보존 가능한 형태로 기록하는 단일 진입점입니다.

## 목적

- 현재 코드 구조를 먼저 사실 기준으로 고정한다.
- `main`, `preload`, `renderer`, `shared` 경계를 명확히 문서화한다.
- 이후 리아키텍처는 소스 삭제가 아니라 호환 레이어를 둔 점진 이전으로만 진행한다.
- 파일당 500 LOC 내외 원칙을 장기 품질 기준으로 둔다.

## 현재 기준 문서

- [current-main.md](./current-main.md): Electron main process 구조
- [current-shared.md](./current-shared.md): shared 계약 경계 구조
- [current-renderer.md](./current-renderer.md): renderer/SPA 구조
- [target-architecture.md](./target-architecture.md): 목표 Electron 아키텍처
- [constants.md](./constants.md): shared/domain/feature 상수 배치 기준
- [utility-process-llm-runtime.md](./utility-process-llm-runtime.md): utility process와 LLM runtime/sidecar 목표 경계
- [migration-map.md](./migration-map.md): 현재 구조에서 목표 구조로 가는 매핑
- [migration-guardrails.md](./migration-guardrails.md): 무손실 이전 금지/허용 규칙

## 현재 전체 구조

```text
src/
  main/       Electron lifecycle, window, IPC handler, DB, FS, service, manager
  preload/    contextBridge 기반 renderer capability API
  renderer/   React UI, feature-first domain, Zustand stores
  shared/     cross-process contracts, IPC channels, schemas, DTO, constants
```

## 핵심 흐름

```text
renderer feature/store
  -> @shared/api 또는 window.api
  -> preload safeInvoke
  -> ipcRenderer.invoke(IPC_CHANNELS.*)
  -> main registerIpcHandler
  -> main domain handler
  -> service/manager/database/fs/native/utility process
  -> IPCResponse
  -> renderer
```

## 목표 아키텍처 방향

사실: 현재 프로젝트는 이미 Electron 기본 경계를 갖고 있습니다.

의견: 전면 재작성보다 현재 경계를 보존하면서 책임을 명확히 하는 방식이 안전합니다.

```text
main      = OS, Electron, DB, FS, long-running work
preload   = secure capability bridge
renderer  = React UI, screen state, user interaction
shared    = contract, schema, DTO, channel, constants
```

## 장기 원칙

- 기존 IPC 채널명, preload API, DB schema, `.luie` package format은 임의 변경하지 않는다.
- 기존 import 경로는 즉시 제거하지 않고 re-export/adapter로 호환성을 유지한다.
- `shared`는 중앙 허브이되 비즈니스 로직 저장소가 아니다.
- renderer는 Node/Electron API를 직접 쓰지 않고 preload capability만 사용한다.
- 500 LOC 초과 파일은 도메인 내부 역할 단위로 쪼갠다.
- 문서와 테스트 없이 큰 파일 이동을 하지 않는다.
