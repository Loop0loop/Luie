# Storage Contract

> Status: Phase 0 frozen on 2026-03-12
> Scope: canonical semantics, transport semantics, local durability boundaries

## Purpose

This document fixes the semantic ownership of project data before any physical storage split.
It is the source-of-truth for deciding whether data belongs to canonical project content,
transport-only payloads, durable local replica state, rebuildable cache, or machine-local app metadata.

## Physical homes

| Home | Role | Data loss allowed | Portability |
| --- | --- | --- | --- |
| `.luie` | canonical project file container | no | portable |
| `replica.db` | durable local working replica for attached and detached projects | no | local |
| `cache.db` | rebuildable derived artifacts | yes | local |
| `app.db` | machine-local attachment and app metadata | yes, with UX loss only | local |
| sync transport | remote exchange format | no, for covered canonical semantics | portable |

## Canonical placement matrix

| Concept | Canonical | Primary home | Notes |
| --- | --- | --- | --- |
| `Project` identity, title, description | yes | `.luie`, `replica.db` | project content |
| `Project.projectPath` | no | `app.db` | attachment metadata only |
| `ProjectLocalState.lastOpenedAt` | no | `app.db` | recent/opened ordering metadata |
| `ProjectSettings.autoSave`, `ProjectSettings.autoSaveInterval` | no | `replica.db` or `app.db` | local runtime policy, not portable project content |
| `Chapter` | yes | `.luie`, `replica.db` | canonical |
| `Character` | yes | `.luie`, `replica.db` | canonical |
| `Event` | yes | `.luie`, `replica.db` | canonical |
| `Faction` | yes | `.luie`, `replica.db` | canonical |
| `Term` | yes | `.luie`, `replica.db` | canonical |
| `Snapshot` | yes | `.luie`, `replica.db` | user recovery/history data |
| `WorldEntity` | yes | `.luie`, `replica.db` | canonical |
| `EntityRelation` | yes | `.luie`, `replica.db` | canonical |
| world documents: `synopsis`, `plot`, `drawing`, `mindmap`, `scrap` | yes | `.luie`, `replica.db` | canonical authored content |
| scrap memos | yes | `.luie`, `replica.db` | canonical authored content |
| `graph` payload | no | `.luie` transport, sync transport | derived transport/view of canonical world models |
| `CharacterAppearance`, `TermAppearance` | no | `cache.db` | rebuildable |
| FTS, analysis cache, derived graph layout | no | `cache.db` | rebuildable |
| recent project list, last opened state, window/layout state | no | `app.db` | machine-local metadata |

## Phase 0 decisions

### `ProjectSettings`

`ProjectSettings` is not canonical portable project content in the current contract.
The current fields (`autoSave`, `autoSaveInterval`) are local runtime policy for how this install handles a project.

Implications:

- sync does not need to treat current `ProjectSettings` as canonical
- `.luie` does not need to carry current `ProjectSettings`
- snapshot recovery may still preserve them as local recovery metadata

### `Snapshot`

`Snapshot` is canonical user data.
It is not cache.

Implications:

- deleting snapshots loses user history and recovery state
- future sync/materialization work must preserve snapshot semantics if snapshots are declared portable
- current transport omission is a known gap, not a semantic excuse

### `graph`

`graph` is not an independent domain model.
It is a transport/view representation derived from canonical world entities and relations.

Implications:

- runtime world tables remain the semantic source-of-truth
- sync may keep `graph` as transport only if hydrate/dehydrate remains deterministic and lossless
- `.luie` export/import must not let `graph` become a competing source-of-truth

### `firstAppearance`

`firstAppearance` is canonical user-visible metadata, not cache.
It is currently mixed-origin data: users can set it explicitly, and some services auto-fill it when missing.

Implications:

- do not move `firstAppearance` into rebuildable cache
- auto-fill must be treated as a defaulting path, not the semantic owner
- future refactors may split authored vs inferred provenance, but not at the cost of data loss

## Local storage boundary

`localStorage` is not allowed to become a new durable store for project content.

Allowed uses today:

- UI-only app metadata stores
- the legacy bridge in `worldPackageStorage.ts`, which must be removed in Phase 2

Disallowed going forward:

- new durable project-content writes in renderer `localStorage`
- new canonical or replica semantics built on browser storage

## Phase 6 durability policy

- renderer-side high-frequency mirror flows remain mirror-first for UX and crash recovery, while attached projects still write `.luie` directly where that path already exists
- main-process canonical entity writes (`Chapter`, `Character`, `Term`, `Event`, `Faction`, `WorldEntity`, `EntityRelation`) and snapshot mutations use immediate `.luie` durability attempts with queued retry fallback
- `Project` create/update remains the one queued-export exception for now; it is lower-risk metadata than chapter/entity/snapshot state and can be revisited separately

## Current known gaps

- detached world documents and memos still carry a legacy `localStorage` migration bridge, even though durable writes now go to replica storage
- sync does not yet cover the full canonical world model surface
- attachment metadata is still physically stored on `Project.projectPath`
- packaged `.luie` bootstrap still carries attachment metadata
- `snapshots` exist in sync merge types but not in sync transport
- `Project` create/update still rely on queued export rather than the immediate durability helper
- cache isolation is only partially complete: appearance cache is split out, but analysis/search/FTS artifacts are still mixed into the replica runtime surface
