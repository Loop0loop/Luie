# Storage Refactor Rebaseline

> Status: Rebaselined
> Owner: Codex + user
> Scope: canonical contract, sync transport, detached runtime storage, cache split, `.luie` attachment/materialization

## Why the previous phase plan was not enough

The earlier plan treated this mostly as a `storage split` problem.
The codebase is already beyond that.

There are currently five different roles mixed together:

1. Canonical user data
2. Transport representations (`.luie` payloads, Supabase sync rows)
3. Durable local replica for detached work
4. Rebuildable cache
5. App-local machine metadata

If these are not separated first, any schema split will repeat the same failure pattern.

## Fresh analysis summary

### 1. Runtime schema and transport schema already disagree

- Local Prisma runtime models include `Event`, `Faction`, `WorldEntity`, `EntityRelation`.
- `.luie` import/export supports those models through the world graph payload.
- Supabase sync schema does not have first-class rows for them.
- Sync repository currently fetches and upserts only `projects`, `chapters`, `characters`, `terms`, `world_documents`, `memos`, `tombstones`.
- `SyncBundle` still has a `snapshots` lane in types and merge logic, but transport intentionally omits it today.

Result:

- world graph semantics exist in runtime and `.luie`, but sync only knows the `graph` document blob
- detached projects cannot reliably hydrate runtime world tables from sync alone

### 2. `projectPath` is still leaking into the wrong layer

- `Project.projectPath` exists in local Prisma.
- `project_path` also exists in Supabase.
- sync client ignores it on fetch and upload.
- `.luie` persistence still depends on local `projectPath`.

Result:

- attachment state is mixed into project content
- new devices receive a project identity without a valid local attachment

### 3. Detached edits are still not first-class

- renderer world storage falls back to `localStorage` when no `.luie` path exists
- sync collector reads world documents from `.luie`, not from a durable detached replica
- sync apply does not persist remote `world_documents` and `memos` into durable local storage

Result:

- detached synced projects lose durable edit semantics
- what the user sees locally can diverge from what sync fetched

### 4. UI status semantics are only partially repaired

- `pathMissing` semantics have been replaced in the main project list flow
- some renderer and feature flows still branch directly on `projectPath`
- synced-but-detached, missing attachment, and corrupt package handling are still not consistently separated end to end

Result:

- project list semantics are better than before, but the attachment model is still leaking through feature UX
- `(No path)` was only one symptom of a deeper modeling bug

## Current code checkpoint

This is the actual state after the recent fixes.

- `ProjectService.createProject()` and `updateProject()` now preserve `ServiceError` codes such as `VALIDATION_FAILED`.
- attachment status has already been renamed in UI/service flows to `attached`, `detached`, `missing-attachment`, `invalid-attachment`
- a dedicated attachment seam now exists and is already used by project CRUD, import/export, analysis, snapshot artifact handling, and sync package persistence
- attachment metadata is still physically stored on `Project.projectPath`
- renderer world storage still writes durable edits to `localStorage` when no `.luie` is attached
- renderer world editors and `.luie` import flows now resolve usable attachment paths through shared attachment helpers instead of branching directly on raw `currentProject.projectPath`
- sync local apply still only upserts `Project`, `Chapter`, `Character`, and `Term`
- sync transport still does not carry first-class `Event`, `Faction`, `WorldEntity`, or `EntityRelation`
- remote `world_documents` and `memos` still do not become durable local runtime state
- packaged SQLite bootstrap no longer treats `Project.projectPath` as a required integrity column, but the legacy column still exists for runtime compatibility

## Non-negotiable design rules

- `.luie` is the canonical file container for project content.
- `projectPath` is never canonical project content.
- detached synced projects must have a durable local store.
- `localStorage` must never be the durable store for canonical edits.
- cache must be wipeable without losing user data.
- transport format and canonical semantics must be described separately.

## Role model

This refactor needs one semantic model and four physical homes.

### Canonical domain

This is the user-authored project data model.
It answers: "what data must survive any cache wipe or device move?"

Candidate canonical domain:

- `Project` core fields
- `ProjectSettings` shared fields only
- `Chapter`
- `Character`
- `Event`
- `Faction`
- `Term`
- `Snapshot`
- `WorldEntity`
- `EntityRelation`
- world documents: `synopsis`, `plot`, `drawing`, `mindmap`, `scrap`
- scrap memos

Important:

- `graph` is not a separate semantic domain model.
- `graph` is a transport/view representation of characters, factions, events, terms, world entities, and relations.

### Physical homes

#### 1. `.luie`

Canonical file container on disk.

- portable between devices
- import/export boundary
- authoritative user-owned file artifact

#### 2. `replica.db`

Durable local working replica.

- required for detached synced projects
- local read/write target when no `.luie` is attached
- mirror of canonical domain, not cache

#### 3. `cache.db`

Rebuildable only.

- `CharacterAppearance`
- `TermAppearance`
- FTS indexes
- analysis cache
- derived graph/layout/search artifacts

#### 4. `app.db`

Machine-local metadata only.

- attachment records
- recent projects
- last opened project/chapter
- window/layout state
- sync checkpoints and queues

## Canonical placement matrix

| Model / field | Canonical domain | Physical home | Notes |
| --- | --- | --- | --- |
| `Project` core identity/title/description | yes | `.luie`, `replica.db` | canonical |
| `Project.projectPath` | no | `app.db` | attachment metadata only |
| `ProjectSettings` | split required | `.luie` and/or `app.db` | review shared vs device-local fields |
| `Chapter` | yes | `.luie`, `replica.db` | canonical |
| `Character` | yes | `.luie`, `replica.db` | canonical |
| `Event` | yes | `.luie`, `replica.db` | canonical |
| `Faction` | yes | `.luie`, `replica.db` | canonical |
| `Term` | yes | `.luie`, `replica.db` | canonical |
| `Snapshot` | yes | `.luie`, `replica.db` | user data, not cache |
| `WorldEntity` | yes | `.luie`, `replica.db` | canonical |
| `EntityRelation` | yes | `.luie`, `replica.db` | canonical |
| `synopsis/plot/drawing/mindmap/scrap` | yes | `.luie`, `replica.db` | detached cannot rely on `localStorage` |
| scrap memos | yes | `.luie`, `replica.db` | canonical user content |
| `graph` payload | no | sync transport / `.luie` transport | derived transport view of canonical world models |
| `CharacterAppearance` | no | `cache.db` | rebuildable |
| `TermAppearance` | no | `cache.db` | rebuildable |
| `firstAppearance` fields | review required | unknown until classified | canonical if user-authored, cache if derived |

## Current contract mismatches that must be removed

- "The local SQLite DB is just cache for the whole project."
- "The world graph blob and the world tables can both act as source-of-truth."
- "A synced project without a local `.luie` attachment should behave like missing file."
- "Remote `world_documents` are useful even if they never become durable local state."
- "Sync can stay narrower than the canonical domain and the app will fill the rest somehow."

## Rebased phase plan

The new order below matches the code that already exists.
The main point is: do not move physical schema first.
Finish the runtime and sync seams first, then move storage.

## Phase 0. Contract and terminology freeze

- [x] Replace `pathMissing` semantics with explicit attachment states
- [x] Introduce a dedicated attachment seam for main-process file access
- [x] Publish one final source-of-truth matrix: canonical domain vs transport vs replica vs cache vs app-local
- [x] Freeze new work that adds durable `localStorage` writes for project content
- [x] Decide the semantic role of `ProjectSettings`, `Snapshot`, `graph`, and `firstAppearance`

Done when:

- every status label has one meaning only
- every user-visible concept has one declared semantic owner

Reference:

- `/Users/user/Luie/docs/storage-contract.md`

## Phase 1. Finish the attachment boundary

- [ ] Remove remaining feature logic that treats `Project.projectPath` as canonical project content
- [ ] Stop `.luie` bootstrap and packaged schema from requiring `Project.projectPath`
- [ ] Audit renderer and preload consumers that still branch directly on `currentProject.projectPath`
- [ ] Keep all path validation and duplicate detection behind attachment-specific helpers
- [ ] Document attachment states separately from project existence states

Done when:

- project content flows no longer depend on direct `projectPath` field access
- attachment logic is isolated enough that physical storage can move later with minimal churn

## Phase 2. Detached durable runtime

- [x] Introduce a durable local replica for world documents and memos
- [x] Remove renderer `localStorage` as the durable write path for `synopsis`, `plot`, `drawing`, `mindmap`, `scrap`, and scrap memos
- [x] Make detached project open/read/write operate on durable local storage
- [ ] Define how runtime world tables hydrate from detached world document state
- [ ] Prove that a synced-but-unattached project survives restart and remains editable

Done when:

- no canonical edit path depends on browser `localStorage`
- detached projects behave like first-class local projects

Current checkpoint:

- `WorldDocument` and `ScrapMemo` replica tables now exist in local Prisma/bootstrap schema
- renderer world storage now reads `replica -> .luie -> legacy localStorage` and writes `replica -> .luie`
- `localStorage` remains only as a one-time migration bridge for old world payloads

## Phase 3. Sync semantic closure

- [ ] Decide whether sync carries world semantics as first-class entities or as a deterministic `graph` transport
- [ ] Make remote `world_documents` durable in the local runtime
- [ ] Make remote `memos` durable in the local runtime
- [ ] Make detached local edits upload from durable local runtime state instead of `.luie` only
- [ ] Decide whether `snapshots` are part of sync transport or intentionally local-only
- [ ] Extend tombstones and conflict rules to the final canonical surface

Done when:

- sync covers the full declared canonical domain
- a detached project can round-trip through sync without relying on a local `.luie`

## Phase 4. Attachment metadata extraction

- [ ] Move attachment metadata out of `Project`
- [ ] Design `app.db` records for `ProjectAttachment`, recent projects, and last-opened state
- [ ] Remove `project_path` from Supabase sync expectations
- [ ] Remove `Project.projectPath` from packaged `.luie` schema requirements
- [ ] Write migration rules for existing local installs

Done when:

- attachment location is app-local metadata only
- canonical project records are portable between devices and containers

## Phase 5. `.luie` reconciliation and materialization

- [ ] Make `.luie` import hydrate the same canonical contract used by detached runtime and sync
- [ ] Make `.luie` export read from the canonical runtime surface, not ad hoc fallbacks
- [ ] Define "attach existing `.luie`" flow
- [ ] Define "materialize detached project into new `.luie`" flow
- [ ] Separate missing attachment handling from corrupt package recovery

Done when:

- `.luie`, sync, and detached runtime all describe the same project content
- users can attach or materialize without changing data shape

## Phase 6. Cache isolation

- [ ] Move `CharacterAppearance` and `TermAppearance` into cache-only storage
- [ ] Define rebuild triggers and invalidation rules
- [ ] Move analysis/search/FTS artifacts into cache-only storage
- [ ] Prove cache deletion is safe

Done when:

- cache deletion never loses user-authored project data

## Phase 7. Container evolution

- [ ] Decide whether `.luie` stays package-based or becomes SQLite-backed
- [ ] If `.luie` becomes SQLite-backed, keep the canonical contract unchanged
- [ ] Design migration from current package layout
- [ ] Preserve import/export compatibility for existing `.luie`

Done when:

- canonical semantics do not depend on the current container implementation

## Immediate hotspots

### Contract / schema

- [ ] `/Users/user/Luie/prisma/schema.prisma`
- [ ] `/Users/user/Luie/src/main/database/packagedSchema.ts`
- [ ] `/Users/user/Luie/supabase/migrations/20260219000000_luie_sync.sql`

### Sync

- [ ] `/Users/user/Luie/src/main/services/features/sync/syncMapper.ts`
- [ ] `/Users/user/Luie/src/main/services/features/sync/syncRepository.ts`
- [ ] `/Users/user/Luie/src/main/services/features/sync/syncLocalApply.ts`
- [ ] `/Users/user/Luie/src/main/services/features/sync/syncBundleApplier.ts`
- [ ] `/Users/user/Luie/src/main/services/features/sync/syncBundleCollector.ts`
- [ ] `/Users/user/Luie/src/main/services/features/sync/syncPackagePersistence.ts`
- [ ] `/Users/user/Luie/src/main/services/features/sync/syncWorldDocNormalizer.ts`

### `.luie` import/export

- [ ] `/Users/user/Luie/src/main/services/core/project/projectExportPayload.ts`
- [ ] `/Users/user/Luie/src/main/services/core/project/projectLuieSchemas.ts`
- [ ] `/Users/user/Luie/src/main/services/core/project/projectImportOpen.ts`
- [ ] `/Users/user/Luie/src/main/services/core/project/projectImportGraph.ts`

### Runtime / renderer

- [ ] `/Users/user/Luie/src/renderer/src/features/research/services/worldPackageStorage.ts`
- [ ] `/Users/user/Luie/src/main/services/core/project/projectListStatus.ts`
- [ ] `/Users/user/Luie/src/renderer/src/features/project/stores/projectStore.ts`
- [ ] `/Users/user/Luie/src/renderer/src/features/project/hooks/projectTemplateInitialization.ts`
- [ ] `/Users/user/Luie/src/renderer/src/features/project/hooks/useFileImport.ts`

## Open decisions

- [ ] Should sync store world graph semantics as first-class structured rows or keep `graph` as a transport blob?
- [ ] Which `ProjectSettings` fields are truly project-canonical?
- [ ] Are `firstAppearance` values authored or derived?
- [ ] Should scrap memos remain a separate sync surface or be fully folded into `scrap` world document?
- [ ] Are `snapshots` sync data or intentionally local-only recovery data?
