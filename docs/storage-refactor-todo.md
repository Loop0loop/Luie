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
- Sync currently carries only `projects`, `chapters`, `characters`, `terms`, `world_documents`, `memos`, `snapshots`, `tombstones`.

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

### 4. UI status semantics are wrong

- `pathMissing` really means "this local absolute `.luie` path is not readable"
- UI uses it like "the project/file is broken or missing"
- synced-but-detached and genuinely missing-file states are conflated

Result:

- template/project list is reporting the wrong problem
- `(No path)` becomes a user-facing symptom of a deeper modeling bug

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

## Phase 0. Reality audit and terminology freeze

- [ ] Define storage states: `attached`, `detached`, `missing-attachment`, `invalid-attachment`, `corrupt-package`
- [ ] Replace `pathMissing` semantics in service and UI language
- [ ] Publish one source-of-truth matrix: canonical domain vs transport vs replica vs cache vs app-local
- [ ] Mark older cache docs as outdated once the replacement is accepted
- [ ] Freeze new work that adds durable `localStorage` writes

Done when:

- every status label has one meaning only
- no doc claims the whole local DB is rebuildable cache

## Phase 1. Canonical contract freeze

- [ ] Define the canonical domain inventory model by model
- [ ] Decide the role of `ProjectSettings`: shared project setting vs device-local setting
- [ ] Reclassify `Snapshot` as canonical user data everywhere
- [ ] Review every `firstAppearance` field and classify it as authored or derived
- [ ] Declare `graph` as transport/view data, not an independent canonical model
- [ ] Define lossless transforms between canonical world models and `graph` payload

Done when:

- there is exactly one semantic source-of-truth for each user-visible concept
- runtime tables and `graph` payload have a documented one-way or two-way transform

## Phase 2. Detached-first runtime split

- [ ] Extract attachment metadata out of `Project`
- [ ] Design `app.db` tables for `ProjectAttachment`, recent projects, and last-opened state
- [ ] Design `replica.db` as durable local mirror of canonical domain
- [ ] Move world document and memo persistence off renderer `localStorage`
- [ ] Make detached project open/read/write use `replica.db`

Done when:

- a synced-but-unattached project survives restart and remains editable
- no canonical edit path depends on browser `localStorage`

## Phase 3. Sync transport repair

- [ ] Remove the false expectation that `project_path` is portable sync data
- [ ] Decide sync transport strategy for world graph semantics
- [ ] Option A: add first-class sync entities for `Event`, `Faction`, `WorldEntity`, `EntityRelation`
- [ ] Option B: keep `graph` as the sync transport but make hydrate/dehydrate to runtime tables deterministic and lossless
- [ ] Persist remote `world_documents` into `replica.db`
- [ ] Persist remote `memos` into `replica.db`
- [ ] Make detached local edits collect/upload from `replica.db`, not `.luie`
- [ ] Ensure tombstones and conflict rules cover the final canonical surface

Done when:

- sync covers the full canonical domain semantics
- detached projects round-trip through sync without relying on a local `.luie`

## Phase 4. `.luie` reconciliation and materialization

- [ ] Make `.luie` export read from canonical domain, not ad hoc local fallbacks
- [ ] Make `.luie` import hydrate the same canonical domain contract used by sync
- [ ] Define "attach existing `.luie`" flow
- [ ] Define "materialize detached project into new `.luie`" flow
- [ ] Separate missing attachment from corrupt package recovery

Done when:

- `.luie`, sync, and replica all describe the same canonical project content
- users can attach or materialize without data shape changes

## Phase 5. Cache isolation

- [ ] Move `CharacterAppearance` and `TermAppearance` into `cache.db`
- [ ] Define rebuild triggers and invalidation rules
- [ ] Move analysis/search/FTS artifacts into cache-only storage
- [ ] Prove `cache.db` can be deleted without losing user content

Done when:

- cache deletion is a safe maintenance operation

## Phase 6. Container evolution

- [ ] Decide whether `.luie` stays package-based or becomes SQLite-backed
- [ ] If `.luie` becomes SQLite-backed, keep the canonical contract unchanged
- [ ] Design migration from current package layout
- [ ] Preserve import/export compatibility for existing `.luie`

Done when:

- canonical semantics do not depend on the current container implementation

## Immediate hotspots

### Contract / schema

- [ ] `/Users/user/Luie/prisma/schema.prisma`
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

## Open decisions

- [ ] Should sync store world graph semantics as first-class structured rows or keep `graph` as a transport blob?
- [ ] Which `ProjectSettings` fields are truly project-canonical?
- [ ] Are `firstAppearance` values authored or derived?
- [ ] Should scrap memos remain a separate sync surface or be fully folded into `scrap` world document?
