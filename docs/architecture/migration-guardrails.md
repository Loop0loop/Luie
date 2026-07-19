# Architecture Migration Guardrails

이 문서는 Luie 아키텍처 전환을 소스 보존형으로 진행하기 위한 금지/허용 규칙입니다.

## 기본 원칙

사실: 현재 프로젝트는 이미 `main`, `preload`, `renderer`, `shared` 경계를 갖고 있습니다.

의견: 리아키텍처는 전면 재작성보다 현재 경계를 보존하고 책임을 더 명확히 하는 방식으로 진행해야 합니다.

## 절대 금지

- 기존 기능 삭제
- 기존 IPC 채널명 변경
- 기존 preload API 제거
- 기존 `Window["api"]` / `RendererApi` 계약 파괴
- DB schema/package format 임의 변경
- `.luie` package canonical storage 규칙 변경
- renderer에서 Node/Electron API 직접 import 추가
- main/preload에서 renderer-only shared value import 추가
- 대량 파일 이동 후 테스트 없이 종료
- 기존 import 경로를 즉시 제거
- `uiStore.regions`와 legacy fields를 한 번에 제거

## 허용

- 문서 추가
- 새 폴더 추가
- 기존 파일을 re-export barrel로 유지
- 내부 구현을 작은 파일로 분리
- 기존 API shape를 유지하는 adapter 추가
- domain별 schema/type 파일 추가 후 기존 `index.ts`에서 재수출
- 직접 `window.api` 호출을 domain adapter로 감싸되 기존 동작 보존
- 큰 파일의 책임을 helper/service/policy/mapper로 쪼개되 public method 유지

## 안전한 이전 순서

```text
1. 현재 구조 문서화
2. 보존 불가침 경계 문서화
3. 큰 파일/위험 파일 inventory 작성
4. 새 domain/config/contract 파일 추가
5. 기존 barrel export 유지
6. 내부 import만 점진 이동
7. targeted test 실행
8. typecheck/lint 실행
9. 기존 경로 제거는 별도 단계로 분리
```

## 목표 구조

```text
src/main/
  app/          Electron lifecycle/window/startup 후보
  ipc/          IPC registration/validation 후보
  domains/      project/manuscript/world/sync/export/recovery/analysis/settings 후보
  infra/        db/fs/native/logger adapters 후보

src/preload/
  api/          renderer capability API
  bridge.ts

src/renderer/src/
  app/          bootstrap/layout shell
  domains/      project/manuscript/editor/world/sync/export/settings 후보
  shared/       renderer-only UI/hooks/store

src/shared/
  contracts/    cross-process contracts
  schemas/      Zod schemas
  types/        DTO only
  constants/    hardcoding 방지 값
  ipc/          channel registry
  errors/       error code/result shape
```

주의: 위 구조는 목표 후보입니다. 현재 코드를 즉시 이동한다는 뜻이 아닙니다.

## 500 LOC 원칙

의견:

- hand-written production TS/TSX/CSS와 test TS/TSX 파일당 500 LOC 이하를 장기 품질 기준으로 둡니다.
- `src/main/services/features/memory/query/narrativeMemoryQueryService.ts`는 `query/internal/*`로 분리되어 현재 167 LOC입니다.
- generated/vendor artifact만 생성 경로와 근거를 기록한 정책 예외로 허용합니다.
- i18n locale 파일은 키 단위가 아니라 큰 locale 도메인 단위로 분해해 관리합니다.
- 500 LOC 초과 파일은 우선 삭제가 아니라 책임 분리 후보로 표시합니다.

사실(2026-07-20 기준):

현재 `scripts/check-source-loc.mjs` 기준 hand-written production source를 재계수하면 `src` 9개, 별도 TS/TSX 계수 기준 `tests` 18개가 500 LOC를 초과합니다. 세부 경로와 batch는 `docs/superpowers/plans/2026-07-18-save-integrity.md`의 Phase 20이 실행 SSOT입니다. `src` 초과는 다음과 같습니다. script는 line terminator 기준이라 `wc -l`보다 1 크게 계산될 수 있으며 gate 수치를 정본으로 사용합니다.

| 경로                                                                       | LOC |
| -------------------------------------------------------------------------- | --: |
| `src/renderer/src/i18n/locales/ko/base/settingsAdvanced.ts`                | 572 |
| `src/renderer/src/i18n/locales/ja/base/settingsAdvanced.ts`                | 538 |
| `src/renderer/src/i18n/locales/en/base/settingsAdvanced.ts`                | 538 |
| `src/renderer/src/styles/components/editor.css`                            | 532 |
| `src/main/services/features/project/projectService.ts`                     | 528 |
| `src/main/services/features/memory/benchmark/memoryWriterTaskBenchmark.ts` | 524 |
| `src/main/services/features/llm/modelRuntimeFactory.ts`                    | 510 |
| `src/renderer/src/features/research/components/AnalysisSection.tsx`        | 507 |
| `src/shared/types/settings.ts`                                             | 506 |

`tests` 초과 18개는 sync 2, world/renderer 4, memory 7, lifecycle/project 5개로 분류한다. 같은 파일이 여러 분류에 중복되지 않는다. 실행 전 자동 계수로 baseline drift가 없는지 확인하는 것이 Phase 20.1의 첫 문서 gate다.

의견: `tests/main/handler/ipcInputValidation.test.ts`는 공통 세팅 분리로 테스트 본체를 `ipcInputValidation.shared.ts`, `ipcInputValidation.memory.test.ts`, `ipcInputValidation.system.test.ts`로 쪼개 500 LOC 한도 위험에서 해소했습니다.

## 현재 500 LOC 초과 아카이브

사실:

- 과거 2026-06-08 기준 `src` 0개 기록은 현재 코드와 드리프트해 위 2026-07-20 baseline으로 대체합니다.
- `src/renderer/src/features/research/components/AnalysisSection.tsx`는 현재 507 LOC(source gate 기준)로 다시 기준을 넘었으며 Phase 20 후보입니다.
- `src/shared/types/search.ts`는 Phase 3에서 6 LOC 재수출 진입점으로 축소되어 해소되었습니다.
- `src/main/services/features/search/searchService.ts`는 Phase 4에서 54 LOC public facade로 축소되어 해소되었습니다.
- `src/main/services/features/memory/entity/memoryEntityReviewService.ts`는 Phase 4에서 232 LOC로 축소되어 해소되었습니다.
- 스타일 번들 `src/renderer/src/styles/global.css`는 현재 12 LOC(source gate 기준)이므로 예외가 아닙니다.
- tests도 Phase 20 완료 조건에 포함하며 behavior별 suite로 분리합니다.

## 구조 개선 후보 (500 LOC 기준 외, 단계적 정리 대상)

사실과 의견을 합친, 구조 정합성 위험 중심 우선순위:

- `src/main/services/core/projectService.ts` / `src/main/services/core/chapterService.ts`
  - 단일 파일 내 정책 분산이 있는 구간이 있어 필요 시 도메인 helper 분리 후보로 유지.
- `src/main/services/features/utility/utilityProcessBridge.ts`
  - 예외 1 LOC wrapper 이후 브리지 protocol helper 경계 점검 필요.
- `src/renderer/src/app/App.tsx` / `src/renderer/src/features/workspace/components/layout/EditorRoot.tsx`
  - shell-orchestration 한 파일에서 orchestration이 집중되는 구간으로, 리그레션 없는 추가 분리 가능성 점검 대상.
- `src/renderer/src/features/research/stores/worldBuildingStore.actions.ts`
  - load/mutation/persist queue 경계가 맞물리는 구간이라, 분리 시 테스트 동반 필요.

## 검증 규칙

아키텍처 전환 작업은 최소 아래 중 관련 검증을 실행해야 합니다.

현재 검증 명령은 `package.json`의 `packageManager: pnpm@11.5.0`과 `pnpm` scripts를 기준으로 기록합니다. `AGENTS.md`의 bun 지침과 충돌하는 경우, 실제 실행 전 현재 `package.json`을 우선 확인합니다.

```bash
pnpm run typecheck
pnpm run lint
pnpm run check:ipc-contract-map
pnpm run check:ipc-handler-schemas
pnpm run check:preload-contract-regression
pnpm run check:renderer-store-usage
pnpm run check:core-complexity
pnpm run check:source-loc
```

특정 도메인 변경 시에는 관련 targeted test를 추가로 실행합니다.

## 불확실성

확실하지 않습니다: 정적 코드 탐색만으로 동적 런타임 동작을 100% 보장할 수는 없습니다.

따라서 실제 이전 작업은 문서화, 작은 단위 변경, targeted test, typecheck/lint 순서로만 진행합니다.
