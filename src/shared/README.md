# Shared Taxonomy

`src/shared`는 `main`과 `renderer`가 공통으로 참조하는 안정 경계만 둡니다.

## Directory roles

- `contracts`
  preload <-> renderer, main <-> renderer 계약의 진입점입니다. 새 IPC/API 계약은 여기서 시작합니다.
- `api`
  preload가 노출하는 capability API 타입입니다.
- `ipc`
  IPC 채널과 응답 포맷입니다.
- `schemas`
  IPC, persist, config, file payload를 검증하는 Zod schema입니다.
- `types`
  공통 DTO와 domain type입니다.
- `constants`
  프로세스 간 공유 가능한 상수입니다.
- `logger`
  프로세스 공통 로깅/관측성 포맷입니다.
- `utils`
  React/Electron 의존이 없는 순수 유틸만 둡니다.
- `world`
  world package codec 같은 순수 shared domain codec입니다.
- `ui`, `hooks`
  renderer-safe shared UI/hook입니다. Electron API, Node API를 직접 참조하면 안 됩니다.

## Renderer-owned shared code

renderer 전용이지만 feature 경계를 넘는 상태성 로직은 `src/renderer/src/shared`에 둡니다.

- `src/renderer/src/shared/error-boundaries`
- `src/renderer/src/shared/hooks`
- `src/renderer/src/shared/store`

기존 `@shared/ui`, `@shared/hooks`, `@shared/utils` 경로는 호환을 위해 유지하지만, 새 계약 코드는 `@shared/contracts`를 우선 사용합니다.
