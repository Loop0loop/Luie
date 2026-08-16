# Main Architecture Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align `src/main/services/core`, `src/main/services/world`, and `src/main/services/llm` with the current main-process domain/feature/infra architecture without changing runtime behavior.

**Architecture:** Keep `src/main/domains/*` as the public domain surface. Move implementation files into `src/main/services/features/*` or `src/main/infra/*`, leave temporary compatibility re-exports at old paths, then update imports and remove broad legacy barrels. No new abstractions unless a moved file already has a clear one-file responsibility.

**Tech Stack:** Electron main process, TypeScript, pnpm, Vitest, existing code-review graph and repo guard scripts.

---

## Target Shape

`src/main/domains/*` remains the only normal import surface for handlers/lifecycle:

```text
src/main/domains/
  project/index.ts       -> services/features/project
  manuscript/index.ts    -> services/features/manuscript + manager/autoSave
  world/index.ts         -> services/features/world + services/features/worldReplica
  settings/llm.ts        -> services/features/llm + infra/llm
```

Implementation files move to:

```text
src/main/services/features/project/
  projectService.ts
  package/*
  import/*
  export/*
  localState/*

src/main/services/features/manuscript/
  chapterService.ts
  chapter/*
  chapterKeywords.ts

src/main/services/features/world/
  entities/*
  documents/*
  graph/*
  cache/*

src/main/services/features/llm/
  *
  providers/*

src/main/infra/llm/
  *
```

Temporary legacy re-export files stay at the old paths until all internal imports are moved:

```ts
export * from "../features/project/projectService.js";
```

---

## Phase 0: Guardrails Before Moving

**Purpose:** Lock the desired architecture with one cheap check before moving files.

**Files:**
- Create: `scripts/check-main-service-boundaries.mjs`
- Modify: `package.json`
- Test: `tests/scripts/mainServiceBoundaries.test.ts`

- [ ] **Step 1: Add boundary checker**

Create `scripts/check-main-service-boundaries.mjs`:

```js
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(process.cwd());
const allowedLegacyImporters = new Set([
  "src/main/domains/project/index.ts",
  "src/main/domains/manuscript/index.ts",
  "src/main/domains/world/index.ts",
  "src/main/domains/settings/llm.ts",
  "src/main/services/index.ts",
]);

const legacyPatterns = [
  /services\/core\//,
  /services\/world\//,
  /services\/llm\//,
];

export function analyzeMainServiceBoundaries(files) {
  const findings = [];
  for (const file of files) {
    const rel = file.replaceAll("\\", "/");
    if (!rel.startsWith("src/main/") || allowedLegacyImporters.has(rel)) continue;
    const source = readFileSync(resolve(root, rel), "utf8");
    const importLines = source
      .split("\n")
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => line.includes("services/"));
    for (const { line, lineNumber } of importLines) {
      if (legacyPatterns.some((pattern) => pattern.test(line))) {
        findings.push({ file: rel, line: lineNumber, source: line.trim() });
      }
    }
  }
  return findings;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = execFileSync("rg", ["--files", "src/main"], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
  const findings = analyzeMainServiceBoundaries(files);
  if (findings.length > 0) {
    console.error("Legacy main service imports found:");
    for (const finding of findings) {
      console.error(`${finding.file}:${finding.line}: ${finding.source}`);
    }
    process.exit(1);
  }
}
```

- [ ] **Step 2: Add checker script**

Modify `package.json` scripts:

```json
"check:main-service-boundaries": "node scripts/check-main-service-boundaries.mjs"
```

- [ ] **Step 3: Add checker test**

Create `tests/scripts/mainServiceBoundaries.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { analyzeMainServiceBoundaries } from "../../scripts/check-main-service-boundaries.mjs";

describe("check-main-service-boundaries", () => {
  it("flags direct legacy service imports outside domain barrels", () => {
    const findings = analyzeMainServiceBoundaries([
      "src/main/handler/example.ts",
    ]);
    expect(Array.isArray(findings)).toBe(true);
  });
});
```

- [ ] **Step 4: Run baseline checks**

Run:

```bash
pnpm vitest tests/scripts/mainServiceBoundaries.test.ts --reporter=verbose
pnpm run typecheck
```

Expected: PASS. Do not enforce `pnpm run check:main-service-boundaries` yet if it reports current legacy imports; this phase introduces the tool first.

---

## Phase 1: Move `services/world` To `services/features/world`

**Purpose:** Fix the clearest mismatch first. World is a domain feature, not a top-level service category.

**Files:**
- Move from: `src/main/services/world/*.ts`
- Move to:
  - `src/main/services/features/world/entities/*`
  - `src/main/services/features/world/documents/*`
  - `src/main/services/features/world/graph/*`
  - `src/main/services/features/world/cache/*`
- Modify: `src/main/domains/world/index.ts`
- Compatibility: recreate old files as re-exports

- [ ] **Step 1: Move entity services**

Move:

```text
src/main/services/world/characterService.ts -> src/main/services/features/world/entities/characterService.ts
src/main/services/world/factionService.ts -> src/main/services/features/world/entities/factionService.ts
src/main/services/world/termService.ts -> src/main/services/features/world/entities/termService.ts
src/main/services/world/eventService.ts -> src/main/services/features/world/entities/eventService.ts
src/main/services/world/worldEntityService.ts -> src/main/services/features/world/entities/worldEntityService.ts
```

Leave old path files as:

```ts
export * from "../features/world/entities/characterService.js";
```

- [ ] **Step 2: Move document services**

Move:

```text
src/main/services/world/sceneService.ts -> src/main/services/features/world/documents/sceneService.ts
src/main/services/world/noteService.ts -> src/main/services/features/world/documents/noteService.ts
src/main/services/world/synopsisService.ts -> src/main/services/features/world/documents/synopsisService.ts
src/main/services/world/plotService.ts -> src/main/services/features/world/documents/plotService.ts
src/main/services/world/scrapMemoService.ts -> src/main/services/features/world/documents/scrapMemoService.ts
```

Leave old path files as re-exports using `../features/world/documents/*.js`.

- [ ] **Step 3: Move graph and cache services**

Move:

```text
src/main/services/world/entityRelationService.ts -> src/main/services/features/world/graph/entityRelationService.ts
src/main/services/world/entityRelationGraph.ts -> src/main/services/features/world/graph/entityRelationGraph.ts
src/main/services/world/entityRelationMaintenance.ts -> src/main/services/features/world/graph/entityRelationMaintenance.ts
src/main/services/world/entityRelationMapper.ts -> src/main/services/features/world/graph/entityRelationMapper.ts
src/main/services/world/entityRelationPointers.ts -> src/main/services/features/world/graph/entityRelationPointers.ts
src/main/services/world/worldMentionService.ts -> src/main/services/features/world/graph/worldMentionService.ts
src/main/services/world/appearanceCacheService.ts -> src/main/services/features/world/cache/appearanceCacheService.ts
src/main/services/world/constants.ts -> src/main/services/features/world/constants.ts
```

- [ ] **Step 4: Add feature barrel**

Create `src/main/services/features/world/index.ts`:

```ts
export { characterService } from "./entities/characterService.js";
export { eventService } from "./entities/eventService.js";
export { factionService } from "./entities/factionService.js";
export { termService } from "./entities/termService.js";
export { worldEntityService } from "./entities/worldEntityService.js";
export { noteService } from "./documents/noteService.js";
export { plotService } from "./documents/plotService.js";
export { sceneService } from "./documents/sceneService.js";
export { scrapMemoService } from "./documents/scrapMemoService.js";
export { synopsisService } from "./documents/synopsisService.js";
export { entityRelationService } from "./graph/entityRelationService.js";
export { worldMentionService } from "./graph/worldMentionService.js";
```

- [ ] **Step 5: Update domain barrel**

Modify `src/main/domains/world/index.ts` to export from `../../services/features/world/index.js` plus existing Character AI and worldReplica exports.

- [ ] **Step 6: Verify world phase**

Run:

```bash
pnpm run typecheck
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/handler/ipcWindowHandlers.test.ts tests/scripts/ipcContractMap.test.ts --reporter=verbose
```

Expected: PASS.

---

## Phase 2: Move `services/core/project` And `chapter`

**Purpose:** Remove the vague `core` bucket. Project/package persistence and manuscript chapter logic become feature modules.

**Files:**
- Move project files to `src/main/services/features/project/*`
- Move chapter files to `src/main/services/features/manuscript/*`
- Modify:
  - `src/main/domains/project/index.ts`
  - `src/main/domains/manuscript/index.ts`

- [ ] **Step 1: Move project service and helpers**

Move:

```text
src/main/services/core/projectService.ts -> src/main/services/features/project/projectService.ts
src/main/services/core/project/* -> src/main/services/features/project/*
```

Keep subfolders:

```text
exportEngine/* -> exportEngine/*
importOpen/* -> importOpen/*
```

Leave old `src/main/services/core/projectService.ts` as:

```ts
export * from "../features/project/projectService.js";
```

- [ ] **Step 2: Move chapter service and helpers**

Move:

```text
src/main/services/core/chapterService.ts -> src/main/services/features/manuscript/chapterService.ts
src/main/services/core/chapter/* -> src/main/services/features/manuscript/chapter/*
src/main/services/core/chapterKeywords.ts -> src/main/services/features/manuscript/chapterKeywords.ts
```

Leave old files as re-exports.

- [ ] **Step 3: Add feature barrels**

Create `src/main/services/features/project/index.ts`:

```ts
export { projectService, ProjectService } from "./projectService.js";
```

Create `src/main/services/features/manuscript/index.ts`:

```ts
export { chapterService, ChapterService } from "./chapterService.js";
```

- [ ] **Step 4: Update domain barrels**

Modify `src/main/domains/project/index.ts`:

```ts
export { projectService } from "../../services/features/project/index.js";
export { graphPluginService } from "../../services/features/graphPlugin/index.js";
```

Modify `src/main/domains/manuscript/index.ts`:

```ts
export { chapterService } from "../../services/features/manuscript/index.js";
export { autoSaveManager } from "../../manager/autoSave/index.js";
export { derivedJobWorker } from "../../services/features/derivedJobs/index.js";
```

- [ ] **Step 5: Verify project/manuscript phase**

Run:

```bash
pnpm run typecheck
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/main/handler/ipcFsHandlers.luieMigration.test.ts tests/main/services/startupReadinessService.test.ts --reporter=verbose
```

Expected: PASS.

---

## Phase 3: Split `services/llm`

**Purpose:** Separate LLM domain runtime from local platform tooling.

**Files:**
- Move runtime/provider files to `src/main/services/features/llm/*`
- Move sidecar/download/install files to `src/main/infra/llm/*`
- Modify:
  - `src/main/domains/settings/llm.ts`
  - `src/main/domains/analysis/index.ts`

- [ ] **Step 1: Move runtime files**

Move:

```text
src/main/services/llm/modelRuntimeFactory.ts -> src/main/services/features/llm/runtime/modelRuntimeFactory.ts
src/main/services/llm/modelRuntimeClient.ts -> src/main/services/features/llm/runtime/modelRuntimeClient.ts
src/main/services/llm/runtimeRoutePlanner.ts -> src/main/services/features/llm/runtime/runtimeRoutePlanner.ts
src/main/services/llm/runtimeProxyConfig.ts -> src/main/services/features/llm/runtime/runtimeProxyConfig.ts
src/main/services/llm/providers/* -> src/main/services/features/llm/providers/*
src/main/services/llm/embeddingModelConstants.ts -> src/main/services/features/llm/embeddingModelConstants.ts
src/main/services/llm/embeddingModelService.ts -> src/main/services/features/llm/embeddingModelService.ts
```

- [ ] **Step 2: Move local tooling files**

Move:

```text
src/main/services/llm/sidecarManager.ts -> src/main/infra/llm/sidecar/sidecarManager.ts
src/main/services/llm/sidecarConstants.ts -> src/main/infra/llm/sidecar/sidecarConstants.ts
src/main/services/llm/modelDownloader.ts -> src/main/infra/llm/downloader/modelDownloader.ts
src/main/services/llm/llmfitInstaller.ts -> src/main/infra/llm/llmfit/llmfitInstaller.ts
src/main/services/llm/llmfitService.ts -> src/main/infra/llm/llmfit/llmfitService.ts
src/main/services/llm/llmfitConstants.ts -> src/main/infra/llm/llmfit/llmfitConstants.ts
```

- [ ] **Step 3: Add LLM barrels**

Create `src/main/services/features/llm/index.ts`:

```ts
export { DEFAULT_EMBEDDING_MODEL } from "./embeddingModelConstants.js";
export { embeddingModelService } from "./embeddingModelService.js";
export type {
  GenerateOptions,
  GenerateResultMeta,
  ModelRuntimeClient,
} from "./runtime/modelRuntimeClient.js";
export {
  invalidateModelRuntimeCache,
  resolveRuntimeModelInfo,
} from "./runtime/modelRuntimeFactory.js";
```

Create `src/main/infra/llm/index.ts`:

```ts
export {
  LLMFIT_ASSET_TARGETS,
  LLMFIT_GITHUB_REPO,
  LLMFIT_LATEST_RELEASE_API,
  llmfitBinaryName,
  resolveLlmfitPlatformKey,
} from "./llmfit/llmfitConstants.js";
export { llmfitInstaller } from "./llmfit/llmfitInstaller.js";
export { llmfitService } from "./llmfit/llmfitService.js";
export {
  downloadGguf,
  downloadLlamaServerBinary,
  getHfModelFiles,
  searchHfModels,
} from "./downloader/modelDownloader.js";
export {
  DEFAULT_MODEL,
  LLAMA_BINARY_SHA256S,
  LLAMA_BINARY_URLS,
  LLAMA_SERVER_BINARY_IN_ZIP,
} from "./sidecar/sidecarConstants.js";
export { sidecarManager } from "./sidecar/sidecarManager.js";
```

- [ ] **Step 4: Update domain barrels**

Modify `src/main/domains/settings/llm.ts`:

```ts
export * from "../../services/features/llm/index.js";
export * from "../../infra/llm/index.js";
```

Modify `src/main/domains/analysis/index.ts` LLM export paths to `../../services/features/llm/index.js`.

- [ ] **Step 5: Verify LLM phase**

Run:

```bash
pnpm run typecheck
SKIP_DB_TEST_SETUP=1 pnpm vitest run tests/main/services/modelRuntimeFactory.utilityBoundary.test.ts --reporter=verbose --no-file-parallelism
```

Expected: PASS.

---

## Phase 4: Cut Legacy Imports And Barrels

**Purpose:** Stop new code from depending on old locations.

**Files:**
- Modify imports under `src/main/**`
- Modify `src/main/services/index.ts`
- Remove compatibility re-export files only after import scan is clean

- [x] **Step 1: Replace direct legacy imports**

Run:

```bash
rg -n "services/(core|world|llm)" src/main -g "*.ts"
```

For each result outside legacy re-export files, replace with one of:

```ts
import { projectService } from "../domains/project/index.js";
import { chapterService } from "../domains/manuscript/index.js";
import { characterService } from "../domains/world/index.js";
import { resolveRuntimeModelInfo } from "../domains/analysis/index.js";
import { sidecarManager } from "../domains/settings/llm.js";
```

- [x] **Step 2: Enforce boundary checker**

Run:

```bash
pnpm run check:main-service-boundaries
```

Expected: PASS.

- [x] **Step 3: Reduce `src/main/services/index.ts`**

Replace `src/main/services/index.ts` with:

```ts
export * from "./features/index.js";
```

If typecheck shows external imports still rely on legacy service exports, update those imports to domains or feature barrels.

- [x] **Step 4: Verify final phase**

Run:

```bash
pnpm run typecheck
pnpm run check:main-service-boundaries
pnpm run qa:core
```

Expected: PASS.

---

## Stop Conditions

Stop and re-plan before continuing if any phase requires changing service behavior, DB schema, IPC channel names, preload contracts, or renderer state logic. This plan is path architecture only.

Do not mix this with `.luie` save/export bug fixes. Those are separate behavior changes.

---

## Execution Order

1. Phase 0: add guardrails.
2. Phase 1: move world.
3. Phase 2: move project/manuscript public service entries; keep deep helpers in `services/core/project/*` and `services/core/chapter/*`.
4. Phase 3: split LLM into `services/features/llm` and `infra/llm`.
5. Phase 4: enforce boundaries, reduce `services/index.ts`, and remove public compatibility stubs.

Each phase should be a separate commit.
