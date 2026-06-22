# Shared Types Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `src/shared/types/index.ts` into focused domain files while preserving every existing public import path and exported type name.

**Architecture:** Keep `src/shared/types/index.ts` as the compatibility barrel. Add domain files under `src/shared/types/` and re-export them from `index.ts`, so `@shared/types` and `../../shared/types/index.js` consumers keep working.

**Tech Stack:** TypeScript 6, Electron, React, `pnpm` scripts from `package.json`.

---

## File Structure

Create:

- `src/shared/types/project.ts`: `Project`, `ProjectOpenResult`, project create/update/delete input.
- `src/shared/types/manuscript.ts`: `Chapter`, `Scene`, save state, chapter/scene/note/synopsis/plot/scrap memo inputs.
- `src/shared/types/world.ts`: character/term/event/faction, world documents, graph, relation, plugin types.
- `src/shared/types/export.ts`: package/export record types.
- `src/shared/types/search.ts`: search, memory, RAG QA, chapter summary status/result types.
- `src/shared/types/settings.ts`: app/editor/settings/update/recovery/sync/startup/shortcut/model runtime types.

Modify:

- `src/shared/types/index.ts`: replace inline type declarations with re-exports from the new files and keep the existing `analysis` re-export.

Do not modify:

- `src/shared/types/analysis.ts`
- `src/shared/types/quality.ts`
- `src/shared/types/utils.ts`
- Any main/preload/renderer consumer import path in this phase.

## Task 1: Inventory and Safety Baseline

**Files:**

- Read: `src/shared/types/index.ts`
- Read: `src/shared/types/analysis.ts`
- Read: `package.json`

- [ ] **Step 1: Confirm current exports**

Run:

```bash
rg -n "^(export type|export interface|export enum|export const|export class)" src/shared/types/index.ts
```

Expected: output includes `Project`, `Chapter`, `Character`, `RagQaRequest`, `EditorSettings`, `WorldGraphData`, `GraphPluginApplyTemplateInput`.

- [ ] **Step 2: Confirm existing split files**

Run:

```bash
find src/shared/types -maxdepth 1 -type f -print | sort
```

Expected: output includes `analysis.ts`, `index.ts`, `quality.ts`, `utils.ts`.

- [ ] **Step 3: Confirm package manager command source**

Run:

```bash
node -e "const p=require('./package.json'); console.log(p.packageManager); console.log(Boolean(p.scripts.typecheck));"
```

Expected: first line is `pnpm@11.5.0`; second line is `true`.

## Task 2: Add Project Types

**Files:**

- Create: `src/shared/types/project.ts`
- Modify: `src/shared/types/index.ts`

- [ ] **Step 1: Create project type module**

Create `src/shared/types/project.ts`:

```ts
export type ProjectAttachmentStatus =
  | "attached"
  | "detached"
  | "missing-attachment"
  | "invalid-attachment"
  | "unsupported-legacy-container";

export interface Project {
  id: string;
  title: string;
  description?: string | null;
  projectPath?: string | null;
  lastOpenedAt?: string | Date | null;
  attachmentStatus?: ProjectAttachmentStatus;
  attachmentContainerKind?: "sqlite-v2" | "legacy-package" | "unknown" | null;
  pathMissing?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ProjectOpenResult {
  project: Project;
  recovery?: boolean;
  conflict?: "db-newer" | "luie-newer";
  recoveryPath?: string;
  recoveryReason?: "missing" | "corrupt";
}

export interface ProjectCreateInput {
  title: string;
  description?: string;
  projectPath?: string;
}

export interface ProjectUpdateInput {
  id: string;
  title?: string;
  description?: string;
  projectPath?: string;
}

export interface ProjectDeleteInput {
  id: string;
  deleteFile?: boolean;
}
```

- [ ] **Step 2: Add compatibility export**

At the top of `src/shared/types/index.ts`, add:

```ts
export type {
  Project,
  ProjectAttachmentStatus,
  ProjectCreateInput,
  ProjectDeleteInput,
  ProjectOpenResult,
  ProjectUpdateInput,
} from "./project";
```

- [ ] **Step 3: Remove duplicate inline project declarations**

Remove the matching inline declarations from `index.ts` only after the export above exists.

- [ ] **Step 4: Verify typecheck**

Run:

```bash
pnpm run typecheck
```

Expected: command exits `0`.

## Task 3: Add Manuscript Types

**Files:**

- Create: `src/shared/types/manuscript.ts`
- Modify: `src/shared/types/index.ts`

- [ ] **Step 1: Create manuscript type module**

Move these exact declarations from `index.ts` into `manuscript.ts`:

```text
Chapter
Scene
ChapterSaveStateType
DerivedSyncState
ChapterSaveResult
Note
Synopsis
Plot
ChapterCreateInput
ChapterUpdateInput
SceneCreateInput
SceneUpdateInput
NoteCreateInput
NoteUpdateInput
SynopsisCreateInput
SynopsisUpdateInput
PlotCreateInput
PlotUpdateInput
ScrapMemoCreateInput
ScrapMemoUpdateInput
```

- [ ] **Step 2: Add compatibility export**

Add to `index.ts`:

```ts
export type {
  Chapter,
  ChapterCreateInput,
  ChapterSaveResult,
  ChapterSaveStateType,
  ChapterUpdateInput,
  DerivedSyncState,
  Note,
  NoteCreateInput,
  NoteUpdateInput,
  Plot,
  PlotCreateInput,
  PlotUpdateInput,
  Scene,
  SceneCreateInput,
  SceneUpdateInput,
  ScrapMemoCreateInput,
  ScrapMemoUpdateInput,
  Synopsis,
  SynopsisCreateInput,
  SynopsisUpdateInput,
} from "./manuscript";
```

- [ ] **Step 3: Verify no duplicate declarations**

Run:

```bash
rg -n "export (interface|type) (Chapter|Scene|ChapterSaveStateType|DerivedSyncState|ChapterSaveResult|Note|Synopsis|Plot|ChapterCreateInput|ChapterUpdateInput|SceneCreateInput|SceneUpdateInput|NoteCreateInput|NoteUpdateInput|SynopsisCreateInput|SynopsisUpdateInput|PlotCreateInput|PlotUpdateInput|ScrapMemoCreateInput|ScrapMemoUpdateInput)\\b" src/shared/types/index.ts
```

Expected: no output.

- [ ] **Step 4: Verify typecheck**

Run:

```bash
pnpm run typecheck
```

Expected: command exits `0`.

## Task 4: Add World and Export Types

**Files:**

- Create: `src/shared/types/world.ts`
- Create: `src/shared/types/export.ts`
- Modify: `src/shared/types/index.ts`

- [ ] **Step 1: Create world type module**

Move these declarations from `index.ts` into `world.ts`:

```text
Character
Term
Event
Faction
WorldSynopsisStatus
WorldSynopsisData
WorldPlotCard
WorldPlotColumn
WorldPlotData
WorldDrawingTool
WorldDrawingIconType
WorldDrawingPath
WorldDrawingData
WorldMindmapNodeData
WorldMindmapNode
WorldMindmapEdge
WorldMindmapData
ScrapMemo
WorldScrapMemosData
ReplicaWorldDocumentType
WorldReplicaDocumentResult
WorldReplicaScrapMemosResult
CharacterCreateInput
CharacterUpdateInput
CharacterAppearanceInput
TermCreateInput
TermUpdateInput
TermAppearanceInput
EventCreateInput
EventUpdateInput
FactionCreateInput
FactionUpdateInput
WorldEntityType
WorldEntitySourceType
RelationKind
WorldEntityAttributes
WorldEntity
EntityRelation
WorldEntityCreateInput
WorldEntityUpdateInput
WorldEntityUpdatePositionInput
EntityRelationCreateInput
EntityRelationUpdateInput
WorldGraphNode
WorldGraphCanvasTimelineBlockData
WorldGraphCanvasMemoBlockData
WorldGraphCanvasEdgeDirection
WorldGraphCanvasEdge
WorldGraphCanvasBlock
WorldTimelineSegment
WorldTimelineTrack
WorldGraphData
WorldGraphMentionsQuery
WorldGraphMention
GraphPluginKind
GraphPluginInstallStatus
GraphTemplateManifest
GraphPluginManifest
GraphPluginCatalogItem
InstalledGraphPlugin
GraphPluginTemplateRef
GraphPluginInstallResult
GraphPluginApplyTemplateInput
```

- [ ] **Step 2: Create export type module**

Move these declarations from `index.ts` into `export.ts`:

```text
ChapterExportRecord
CharacterExportRecord
TermExportRecord
EventExportRecord
FactionExportRecord
SnapshotExportRecord
ProjectExportRecord
```

In `export.ts`, import world dependencies as type-only imports:

```ts
import type { EntityRelation, WorldEntity } from "./world";
```

- [ ] **Step 3: Add compatibility exports**

Add to `index.ts`:

```ts
export type {
  Character,
  CharacterAppearanceInput,
  CharacterCreateInput,
  CharacterUpdateInput,
  EntityRelation,
  EntityRelationCreateInput,
  EntityRelationUpdateInput,
  Event,
  EventCreateInput,
  EventUpdateInput,
  Faction,
  FactionCreateInput,
  FactionUpdateInput,
  GraphPluginApplyTemplateInput,
  GraphPluginCatalogItem,
  GraphPluginInstallResult,
  GraphPluginInstallStatus,
  GraphPluginKind,
  GraphPluginManifest,
  GraphPluginTemplateRef,
  GraphTemplateManifest,
  InstalledGraphPlugin,
  RelationKind,
  ReplicaWorldDocumentType,
  ScrapMemo,
  Term,
  TermAppearanceInput,
  TermCreateInput,
  TermUpdateInput,
  WorldDrawingData,
  WorldDrawingIconType,
  WorldDrawingPath,
  WorldDrawingTool,
  WorldEntity,
  WorldEntityAttributes,
  WorldEntityCreateInput,
  WorldEntitySourceType,
  WorldEntityType,
  WorldEntityUpdateInput,
  WorldEntityUpdatePositionInput,
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphCanvasEdgeDirection,
  WorldGraphCanvasMemoBlockData,
  WorldGraphCanvasTimelineBlockData,
  WorldGraphData,
  WorldGraphMention,
  WorldGraphMentionsQuery,
  WorldGraphNode,
  WorldMindmapData,
  WorldMindmapEdge,
  WorldMindmapNode,
  WorldMindmapNodeData,
  WorldPlotCard,
  WorldPlotColumn,
  WorldPlotData,
  WorldReplicaDocumentResult,
  WorldReplicaScrapMemosResult,
  WorldScrapMemosData,
  WorldSynopsisData,
  WorldSynopsisStatus,
  WorldTimelineSegment,
  WorldTimelineTrack,
} from "./world";

export type {
  ChapterExportRecord,
  CharacterExportRecord,
  EventExportRecord,
  FactionExportRecord,
  ProjectExportRecord,
  SnapshotExportRecord,
  TermExportRecord,
} from "./export";
```

- [ ] **Step 4: Verify typecheck**

Run:

```bash
pnpm run typecheck
```

Expected: command exits `0`.

## Task 5: Add Search and Settings Types

**Files:**

- Create: `src/shared/types/search.ts`
- Create: `src/shared/types/settings.ts`
- Modify: `src/shared/types/index.ts`

- [ ] **Step 1: Create search type module**

Move these declarations from `index.ts` into `search.ts`:

```text
SearchIndexStatus
MemoryJobStatus
MigrationHealth
SearchQuery
SearchResult
MemoryChunkSearchQuery
MemoryChunkSearchResult
MemoryChunkBacklink
ChapterSummaryResult
ChapterSummaryStatus
MemoryEmbeddingStatus
RagQaRequest
RagQaEvidence
RagQaResult
RagQaRunHandle
RagQaStreamPayload
RagQaErrorPayload
```

- [ ] **Step 2: Create settings type module**

Move these declarations from `index.ts` into `settings.ts`:

```text
FontFamilyPreset
FontFamily
FontPreset
EditorTheme
ThemeTemperature
ThemeContrast
ThemeAccent
ThemeTexture
WindowMenuBarMode
AppBootstrapStatus
AppUpdateStatus
AppUpdateCheckResult
AppUpdateLifecycleStatus
AppUpdateArtifact
AppUpdateState
AppUpdateDownloadResult
AppUpdateApplyResult
AppUpdateRollbackResult
AppQuitPhase
AppQuitPhasePayload
DbRecoveryCheckpoint
DbRecoveryFileStatus
DbRecoveryStatusReason
DbRecoveryStatus
DbRecoveryResult
SyncProvider
SyncMode
SyncHealth
SyncPendingProjectDelete
SyncConflictItem
SyncConflictSummary
SyncEntityBaseline
SyncConnection
SyncStatus
SyncAuthResultStatus
SyncAuthResultReason
SyncAuthResult
SyncRunResult
RuntimeSupabaseConfig
RuntimeSupabaseConfigView
SyncSettings
StartupCheckKey
StartupCheck
StartupReadiness
StartupSettings
WindowBounds
WindowState
EditorUiMode
EditorSettings
AppSettings
OllamaConnectionResult
LlmRuntimeInfo
HfModelSearchResult
HfModelFile
LlmfitRecommendation
LlmfitResult
LlmfitInstallStatus
EmbeddingModelStatusView
ShortcutAction
ShortcutMap
```

- [ ] **Step 3: Add compatibility exports**

Add explicit `export type { ... } from "./search";` and `export type { ... } from "./settings";` blocks to `index.ts` for every moved type.

- [ ] **Step 4: Verify no major inline declarations remain**

Run:

```bash
rg -n "^(export type|export interface)" src/shared/types/index.ts
```

Expected: output contains only `export type { ... } from ...` re-export blocks.

- [ ] **Step 5: Verify typecheck**

Run:

```bash
pnpm run typecheck
```

Expected: command exits `0`.

## Task 6: Final Validation

**Files:**

- Read: `src/shared/types/index.ts`
- Read: `docs/architecture/migration-map.md`

- [ ] **Step 1: Verify all type files are under 500 LOC**

Run:

```bash
wc -l src/shared/types/*.ts
```

Expected: each non-generated type file is below 500 LOC. If a file exceeds 500 LOC, split it before continuing.

- [ ] **Step 2: Verify existing import paths still work**

Run:

```bash
pnpm run typecheck
```

Expected: command exits `0`.

- [ ] **Step 3: Verify architecture guard checks relevant to shared contracts**

Run:

```bash
pnpm run check:ipc-contract-map
pnpm run check:ipc-handler-schemas
pnpm run check:preload-contract-regression
```

Expected: each command exits `0`.

- [ ] **Step 4: Record result**

Update `docs/architecture/migration-map.md` Phase 1 with a short note:

```md
Phase 1 status: shared types split completed with existing `@shared/types` and `../../shared/types/index.js` import paths preserved.
```

- [ ] **Step 5: Final git status review**

Run:

```bash
git status --short
```

Expected: only intended files under `src/shared/types/` and `docs/architecture/migration-map.md` are modified/created.
