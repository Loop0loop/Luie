# Constants Placement Policy

## 목적

상수 위치를 `shared`로 몰아넣지 않고, 영향 범위에 따라 배치한다.

목표:

- Electron process boundary를 흐리지 않는다.
- SPA/feature/domain 응집도를 유지한다.
- 도메인 전용 정책값이 전역 shared에 쌓이지 않게 한다.
- 공통 계약값은 한 곳에서 안정적으로 재사용한다.

## 기본 원칙

```text
전역 계약 / 앱 전체 영향
  -> src/shared/constants

main 전용 도메인 정책
  -> src/main/services/<domain>/constants.ts
  -> src/main/services/features/<feature>/<domain>Constants.ts
  -> src/main/services/features/<feature>/<subdomain>/constants.ts

renderer feature 전용 UI/상태 값
  -> src/renderer/src/features/<feature>/constants.ts
  -> src/renderer/src/features/<feature>/constants/*.ts
  -> src/renderer/src/features/<feature>/<component-or-store>/constants.ts
```

판단 기준은 "누가 import해야 하는가"다.

## `src/shared/constants`에 둘 것

사실:

- `shared`는 main/preload/renderer가 함께 쓰는 cross-process contract boundary다.

허용:

- IPC, persistence, package, schema, DTO와 맞물리는 전역 계약값
- 앱 전체 기본값
- 여러 process가 같은 의미로 해석해야 하는 enum-like value
- 여러 도메인에서 실제로 공유하는 error code, path/config key, persistence key

예시:

- `src/shared/constants/errorCode.ts`
- `src/shared/constants/paths.ts`
- `src/shared/constants/persistence.ts`
- `src/shared/constants/memoryPersistencePolicy.ts`

주의:

- 단순히 두 파일에서 쓴다는 이유만으로 shared로 올리지 않는다.
- renderer-only UI 크기, main-only retry policy, feature-local label map은 shared로 올리지 않는다.
- shared에 React, DOM, Electron, Node runtime dependency가 들어가면 안 된다.

## main service 도메인 내부에 둘 것

사실:

- 현재 main 도메인 기준은 `src/main/services`다.
- 이미 `src/main/services/features/memory/memoryJobConstants.ts`, `src/main/services/llm/sidecarConstants.ts`, `src/main/services/llm/embeddingModelConstants.ts` 같은 도메인 상수 파일이 존재한다.

허용:

- main에서만 쓰는 retry/backoff/TTL/threshold
- DB job state machine 정책
- provider/runtime/download 정책
- benchmark budget처럼 main script/service에서만 쓰는 값
- 도메인 내부 SQL/query limit

권장 위치:

```text
src/main/services/features/memory/job/policy.ts
src/main/services/features/memory/job/constants.ts
src/main/services/features/memory/benchmark/budgets.ts
src/main/services/features/rag/internal/constants.ts
src/main/services/llm/sidecarConstants.ts
```

규칙:

- 도메인 밖에서 써야 하는 값이면 해당 도메인의 `index.ts`에서 명시적으로 export한다.
- 내부 구현 전용이면 `internal/constants.ts` 아래에 둔다.
- 상수와 helper 함수를 한 파일에 섞지 않는다. helper는 `utils.ts`, `format.ts`, `policy.ts` 같은 별도 파일로 분리한다.

## renderer feature 내부에 둘 것

허용:

- UI sizing
- tab key
- local component option list
- store persistence version/key
- view-mode specific label/config
- canvas/editor/research 등 SPA feature 전용 값

예시:

- `src/renderer/src/features/editor/components/toolbar/constants.ts`
- `src/renderer/src/features/canvas/constants/*.ts`
- `src/renderer/src/features/workspace/stores/projectLayout/constants.ts`
- `src/renderer/src/features/research/components/wiki/visual/constants.ts`

규칙:

- renderer feature 전용 값은 `src/shared/constants`로 올리지 않는다.
- 여러 renderer feature가 공유하지만 main/preload가 몰라도 되는 값은 `src/renderer/src/shared` 또는 더 상위 renderer feature config를 검토한다.
- 서버/main policy와 UI 표시 label이 같은 문자열을 공유해야 한다면, 원본 contract는 shared에 두고 UI label은 renderer i18n에 둔다.

## shared로 올릴지 상의해야 하는 값

아래 값은 영향 범위를 확인한 뒤 결정한다.

### Memory build job status/type/target type

판단:

- renderer Settings UI와 main service가 모두 의미를 해석한다.
- IPC DTO에도 포함된다.

권장:

- contract value는 shared type/schema 또는 shared constants 후보.
- main-only priority/retry/dedupe policy는 memory domain 내부 후보.

### Review action 문자열

예:

- `defer`
- `reject`
- `resolve`

판단:

- renderer action과 IPC schema가 공유한다.

권장:

- action union/schema는 shared.
- action별 처리 정책은 main memory review domain 내부.
- action별 표시 문구는 renderer i18n.

### Benchmark budget

판단:

- Phase 4 benchmark/report 계약에는 중요하지만 앱 전체 런타임 계약은 아니다.

권장:

- `src/main/services/features/memory/benchmark/budgets.ts`에 둔다.
- 문서나 report schema에 노출해야 하면 타입만 shared로 올릴지 별도 검토한다.

## 금지 패턴

- 도메인 전용 상수를 `src/shared/constants/index.ts`에 계속 추가한다.
- 상수 파일에 formatting/helper/error-detection 함수를 같이 넣는다.
- renderer-only 값을 main에서 import 가능한 shared에 둔다.
- main-only native/path/download policy를 shared에 둔다.
- 같은 의미의 문자열 literal을 main, preload, renderer에 각각 복붙한다.
- `constants.ts`가 200 LOC를 넘도록 방치한다.

## Refix 적용 기준

Phase 1-5 refix에서는 아래 기준을 적용한다.

1. 새 상수 추가 전 사용 process를 확인한다.
2. 한 process/도메인 전용이면 해당 도메인 내부에 둔다.
3. main과 renderer가 IPC contract로 함께 해석하면 shared에 둔다.
4. shared로 올린 값은 schema/type/contract와 함께 문서화한다.
5. 기존 shared 상수 중 renderer-only 또는 main-only로 보이는 값은 즉시 이동하지 않고 별도 cleanup 후보로 기록한다.

