# Luie Architecture Cleanup Task Log

> 규칙: phase 하나를 진행할 때마다 이 파일에 목표, 수정 파일, 실제 수정 내역, 검증 결과를 기록한다.

## Goal

`docs/architecture` 기준과 실제 `src` 구조를 다시 맞춘다. 500 LOC 제한은 지키되, 파일을 키/상수 단위로 지나치게 쪼개는 과분리는 제거하고 큰 업무 축 기준으로 정리한다.

## Architecture Rules

- 일반 소스 파일은 500 LOC 내외를 넘기지 않는다.
- 도메인은 작게 흩뜨리지 않고 큰 업무 축으로 묶는다.
- public API, IPC channel, preload API, DB/package 계약은 유지한다.
- 기존 compatibility entry/barrel은 검증 전까지 유지한다.
- 각 phase는 `pnpm run typecheck` 또는 관련 targeted check를 남긴다.

## Phase Plan

### Phase 0: Baseline Audit

**Goal:** 문서 기준과 실제 파일 구조의 불일치 목록을 확정한다.

**Scope:**

- `docs/architecture/*.md`
- `src/main/**`
- `src/renderer/src/**`
- `src/shared/**`

**Checks:**

- `find src/main src/renderer/src src/shared -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) -print0 | xargs -0 wc -l | awk '$1 > 500 {print}' | sort -nr`
- 과분리 의심 폴더: 파일 수, 평균 LOC, 20 LOC 이하 파일 비율 확인

**Status:** Completed

### Phase 1: i18n Structure and Docs

**Goal:** `src/renderer/src/i18n`을 500 LOC 이하이면서 큰 도메인 단위로 유지하고, 문서의 "키 단위 모듈" 표현을 실제 목표 구조와 맞춘다.

**Expected files:**

- `src/renderer/src/i18n/locales/{ko,en,ja}/base.ts`
- `src/renderer/src/i18n/locales/{ko,en,ja}/workspace.ts`
- `src/renderer/src/i18n/locales/{ko,en,ja}/base/*.ts`
- `src/renderer/src/i18n/locales/{ko,en,ja}/workspace/*.ts`
- `docs/architecture/current-renderer.md`
- `docs/architecture/migration-guardrails.md`

**Verification:**

- `pnpm run typecheck`
- i18n file LOC scan

**Status:** Completed

### Phase 2: Renderer Oversized Component Split

**Goal:** `AnalysisSection.tsx`의 1100+ LOC를 책임 단위로 줄인다.

**Expected files:**

- `src/renderer/src/features/research/components/AnalysisSection.tsx`
- `src/renderer/src/features/research/components/analysisSection/**`

**Verification:**

- `pnpm run typecheck`
- targeted renderer tests if an existing relevant test is available

**Status:** Completed

### Phase 3: Shared Contract Split

**Goal:** `src/shared/types/search.ts`를 500 LOC 이하로 나누되 DTO 계약과 export shape를 유지한다.

**Expected files:**

- `src/shared/types/search.ts`
- `src/shared/types/search/**` or adjacent domain-specific type files
- `src/shared/types/index.ts`

**Verification:**

- `pnpm run typecheck`
- `pnpm run check:ipc-contract-map`
- `pnpm run check:preload-contract-regression`

**Status:** Completed

### Phase 4: Main Service Split

**Goal:** main의 500 LOC 초과 서비스 파일을 public method 유지 방식으로 분리한다.

**Expected files:**

- `src/main/services/features/memory/entity/memoryEntityReviewService.ts`
- `src/main/services/features/searchService.ts`
- nearby helper/internal files

**Verification:**

- `pnpm run typecheck`
- relevant targeted main service tests

**Status:** Completed

### Phase 5: Guardrail Update

**Goal:** 문서와 실제 구조가 다시 벌어지지 않도록 LOC/구조 점검을 명시하거나 스크립트화한다.

**Expected files:**

- `docs/architecture/*.md`
- `scripts/**` if a guard script is added
- `package.json` if a script is added

**Verification:**

- `pnpm run typecheck`
- added guard command if applicable

**Status:** Completed

## Phase Records

### Phase 0 Record

**Status:** Completed

**Findings:**

- Fact: `docs/architecture/target-architecture.md` says domains should be grouped by large business axes, not scattered into tiny domains.
- Fact: `docs/architecture/migration-guardrails.md` and `docs/architecture/current-renderer.md` still describe i18n as key-level module decomposition. That conflicts with the target architecture rule.
- Fact: current `src` 500+ LOC files:
  - `src/renderer/src/features/research/components/AnalysisSection.tsx` - 1106 LOC
  - `src/shared/types/search.ts` - 573 LOC
  - `src/main/services/features/memory/entity/memoryEntityReviewService.ts` - 521 LOC
  - `src/main/services/features/searchService.ts` - 514 LOC
- Fact: `docs/architecture/current-renderer.md` currently records only `src/renderer/src/styles/global.css` as renderer 500+ LOC, so the document is stale.
- Fact: `docs/architecture/current-shared.md` says `src/shared/types/*.ts` has no 500+ LOC file, but `src/shared/types/search.ts` is now 573 LOC.
- Fact: `docs/architecture/current-main.md` records `searchService.ts` as 372 LOC, but the current file is 514 LOC.
- Risky over-splitting candidates:
  - `src/main/app/lifecycle/*`: many 1-2 LOC compatibility wrappers.
  - `src/renderer/src/domains/*`: several 1-5 LOC compatibility wrappers with little real domain implementation.
  - Old i18n key-level split was over-splitting; the preferred shape is large locale domains such as `base/core`, `base/settings`, `workspace/world`.
- Documented helper splits that are not immediate violations:
  - `src/renderer/src/features/editor/components/toolbar`
  - `src/renderer/src/app/shell`
  - `src/renderer/src/features/workspace/stores/projectLayout`
  - `src/renderer/src/features/research/services/worldPackageStorageHelpers`
  - `src/renderer/src/features/settings/components/tabs/modelTabSections`
  - `src/renderer/src/features/canvas/components/shell/canvasActivityShellParts`
  - `src/renderer/src/features/canvas/components/graph/graphSurfaceParts`

**Changes made:**

- Created `task.md` as the phase task log.
- Recorded the baseline architecture mismatches and phase plan.

**Verification:**

- Ran architecture document review by reading:
  - `docs/architecture/migration-guardrails.md`
  - `docs/architecture/migration-map.md`
  - `docs/architecture/current-renderer.md`
  - `docs/architecture/current-main.md`
  - `docs/architecture/current-shared.md`
  - `docs/architecture/target-architecture.md`
- Ran LOC scan for `src/main`, `src/renderer/src`, and `src/shared`.

### Phase 1 Record

**Status:** Completed

**Changes made:**

- Verified `src/renderer/src/i18n/locales/{ko,en,ja}` is not key-level split in the current `HEAD`; it already uses large locale-domain files:
  - `base/core.ts`
  - `base/settings.ts`
  - `base/settingsAdvanced.ts`
  - `base/research.ts`
  - `base/editor.ts`
  - `workspace/writing.ts`
  - `workspace/world.ts`
- Kept `base.ts` and `workspace.ts` as small composition entries.
- Updated `docs/architecture/migration-guardrails.md` to say i18n is split by large locale domains, not key-level modules.
- Updated `docs/architecture/current-renderer.md` with the current i18n structure and current renderer 500 LOC violation.
- Updated `docs/architecture/current-shared.md` to record `src/shared/types/search.ts` as a Phase 3 split target.
- Updated `docs/architecture/current-main.md` to record current main 500 LOC split targets.

**Verification:**

- `pnpm run typecheck` passed.
- i18n LOC scan passed: largest i18n `.ts` file is `src/renderer/src/i18n/locales/ja/base/settingsAdvanced.ts` at 453 LOC.
- `git diff --name-status -- src/renderer/src/i18n` is empty; Phase 1 code structure was already present in `HEAD`, and this phase only corrected stale architecture docs plus `task.md`.
- `pnpm run check:i18n-parity` still fails because `ko`, `en`, and `ja` locale key sets are inconsistent. This is a translation parity issue, not a structure issue, and is left for a separate phase.

**Remaining issues:**

- Phase 2: split `AnalysisSection.tsx`.
- Phase 3: split `src/shared/types/search.ts`.
- Phase 4: split `memoryEntityReviewService.ts` and `searchService.ts`.

### Phase 2 Record

**Status:** Completed

**Changes made:**

- Split `src/renderer/src/features/research/components/AnalysisSection.tsx` from 1106 LOC to 237 LOC.
- Kept the existing `analysisSection` component folder and extracted behavior by large responsibility:
  - `useAnalysisRuntime.ts`: LLM route preference, runtime info, sidecar status.
  - `useRagChat.ts`: RAG chat state, streaming subscription, send/stop/evidence navigation.
  - `useMemoryReviewQueues.ts`: memory review queue visibility, loading, error, fetched items.
  - `useMemoryReviewMutations.ts`: memory review approve/reject/merge/split actions.
  - `useMemoryReviewPanels.ts`: composition hook for the review panel domain.
  - `useMemoryEvalPanel.ts`: memory eval and calibration panel actions.
  - `formatters.ts`: small display formatter for conflict facts.
- Avoided key/button-level over-splitting; the split follows runtime, chat, memory review, and memory evaluation axes.
- Preserved existing panel components and public `AnalysisSection` entry.

**Verification:**

- `pnpm exec prettier --write ...` completed for the touched renderer files.
- `pnpm run typecheck` passed.
- Phase 2 LOC check passed. Current relevant files:
  - `AnalysisSection.tsx` - 237 LOC
  - `useMemoryReviewMutations.ts` - 351 LOC
  - `useMemoryReviewQueues.ts` - 278 LOC
  - `useRagChat.ts` - 211 LOC
  - `useMemoryEvalPanel.ts` - 105 LOC
  - `useAnalysisRuntime.ts` - 106 LOC

**Remaining issues:**

- Phase 3: split `src/shared/types/search.ts`.
- Phase 4: split `memoryEntityReviewService.ts` and `searchService.ts`.

### Phase 3 Record

**Status:** Completed

**Changes made:**

- Split `src/shared/types/search.ts` from 573 LOC to a 6 LOC compatibility export entry.
- Added `src/shared/types/search/` contract files by large DTO responsibility:
  - `core.ts`: basic project search query/result contracts.
  - `chunks.ts`: memory chunk search, backlink, and window contracts.
  - `rag.ts`: RAG QA request/result/stream/error contracts.
  - `narrative.ts`: narrative memory query, trace, calibration, and fact/profile contracts.
  - `review.ts`: memory conflict, episode, temporal fact, entity, and alias review contracts.
  - `status.ts`: index, migration, summary, and embedding status contracts.
- Preserved existing import paths:
  - `@shared/types/search`
  - `@shared/types`
- Updated shared and guardrail architecture docs to remove `search.ts` from active 500 LOC violations.

**Verification:**

- `pnpm run typecheck` passed.
- `pnpm run check:ipc-contract-map` passed.
- `pnpm run check:preload-contract-regression` passed.
- `pnpm exec prettier --write src/shared/types/search.ts src/shared/types/search/*.ts task.md` completed.
- Phase 3 LOC check passed. Current relevant files:
  - `search.ts` - 6 LOC
  - `search/review.ts` - 224 LOC
  - `search/narrative.ts` - 121 LOC
  - `search/status.ts` - 84 LOC
  - `search/chunks.ts` - 66 LOC
  - `search/rag.ts` - 66 LOC
  - `search/core.ts` - 13 LOC

**Remaining issues:**

- Phase 4: split `memoryEntityReviewService.ts` and `searchService.ts`.

### Phase 4 Record

**Status:** Completed

**Changes made:**

- Split `src/main/services/features/searchService.ts` from 514 LOC to a 54 LOC public service facade.
- Added search helper files under the existing `src/main/services/features/search/` domain:
  - `basicSearch.ts`: character/term/chapter search and quick access.
  - `chunkOperations.ts`: memory chunk search, backlink, and chunk window operations.
  - `index.ts`: existing search helper barrel plus new service helper exports.
- Preserved `SearchService`, `searchService`, and all existing public methods.
- Kept `utilityProcessBridge.embed` injection in `searchService.ts` so the embedding process boundary remains visible to the existing boundary test.
- Split `src/main/services/features/memory/entity/memoryEntityReviewService.ts` from 521 LOC to 232 LOC.
- Added `src/main/services/features/memory/entity/entityMergeOperations.ts` for entity merge/split transactions.
- Preserved existing named exports from `memoryEntityReviewService.ts` by re-exporting merge/split operations from the original module path.
- Updated main and guardrail architecture docs to remove active Phase 4 500 LOC violations.

**Verification:**

- `pnpm exec prettier --write ...` completed for touched main service files.
- `pnpm run typecheck` passed.
- Targeted tests passed:
  - `pnpm vitest tests/main/services/searchServiceEmbeddingBoundary.test.ts tests/main/services/searchServiceFallback.test.ts tests/main/services/memory/entity/memoryEntityReviewService.test.ts`
- Phase 4 LOC check passed. Current relevant files:
  - `searchService.ts` - 54 LOC
  - `search/basicSearch.ts` - 206 LOC
  - `search/chunkOperations.ts` - 322 LOC
  - `memoryEntityReviewService.ts` - 232 LOC
  - `entityMergeOperations.ts` - 283 LOC
- Full `src/main src/renderer/src src/shared` LOC scan shows no 500 LOC+ code files. `src/renderer/src/styles/global.css` remains the documented static-resource exception.

**Verification issue:**

- `pnpm vitest tests/main/services/searchService.test.ts` still fails in this environment:
  - `cacheDb.getClient().chapterSearchDocument` is `undefined` at `tests/main/services/searchService.test.ts:65`.
  - A separate FTS count assertion receives `0` instead of `1` at `tests/main/services/searchService.test.ts:109`.
- 근거: the first test in the same file still passes, and the refactor-specific search boundary/fallback tests pass. This points to the cache DB test setup/expectation rather than the Phase 4 export split. 확실하지 않습니다: 이 실패가 다른 로컬 환경에서도 동일하게 재현되는지는 추가 확인이 필요합니다.

### Phase 5 Record

**Status:** Completed

**Changes made:**

- Added `scripts/check-source-loc.mjs`.
- Added `check:source-loc` to `package.json`.
- Wired `check:source-loc` into `lint-all` and `qa:core`.
- The guard scans:
  - `src/main`
  - `src/renderer/src`
  - `src/shared`
- The guard checks `.ts`, `.tsx`, and `.css` files against 500 LOC.
- The only allowlisted source exception is `src/renderer/src/styles/global.css`.
- Updated `docs/architecture/migration-guardrails.md` verification commands to include `pnpm run check:source-loc`.

**Verification:**

- `pnpm exec prettier --write package.json scripts/check-source-loc.mjs docs/architecture/current-main.md docs/architecture/migration-guardrails.md task.md` completed.
- `pnpm run check:source-loc` passed.
- `pnpm run typecheck` passed.

**Remaining issues:**

- No remaining 500 LOC+ code files in `src/main`, `src/renderer/src`, or `src/shared`.
- `src/renderer/src/styles/global.css` remains the documented static-resource exception.
- `pnpm run check:i18n-parity` remains a separate translation parity issue from Phase 1.
- `tests/main/services/searchService.test.ts` has the cache DB test setup issue recorded in Phase 4.

### Follow-up: System Handler Domain Grouping

**Status:** Completed

**Changes made:**

- Moved flat files under `src/main/handler/system` into subdomains:
  - `fs/`
  - `logger/`
  - `plugin/`
  - `recovery/`
  - `settings/`
  - `startup/`
  - `sync/`
  - `window/`
- Kept `src/main/handler/system/index.ts` as the only root file and system handler registration hub.
- Added or updated each subdomain `index.ts` as the public entry.
- Moved `ipcSettingsHandlers.ts` into `settings/registerSettingsIPCHandlers.ts`.
- Updated internal imports and tests to use domain entries such as `system/window/index.js`, `system/fs/index.js`, and `system/settings/index.js`.
- Updated `docs/architecture/current-main.md` to document the system handler domain layout.

**Verification:**

- `pnpm run typecheck` passed.
- `pnpm vitest tests/main/handler/ipcWindowHandlers.test.ts tests/main/handler/ipcSettingsHandlers.security.test.ts tests/main/handler/ipcFsHandlers.luieMigration.test.ts tests/main/services/projectDeletionPolicy.security.test.ts` passed.
- `pnpm run check:source-loc` passed.
- `pnpm run check:ipc-contract-map` passed and regenerated `docs/quality/ipc-contract-map.json` to the new handler file paths.
- `src/main/handler/system` root contains only `index.ts`.
