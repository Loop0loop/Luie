# State Management Policy

## Default

- Renderer state uses Zustand.
- Component-only state stays in React local state.
- App-wide UI chrome belongs in `useUIStore`.
- Project-specific layout belongs in `useProjectLayoutStore`.
- Durable manuscript/world data belongs behind IPC/main services, not directly in renderer stores.
- Context is only for provider-style UI capabilities such as toast/dialog.

## Ownership Rules

- Create a store only when two or more distant surfaces need the same live state.
- Prefer a hook or service when the state is derived, temporary, or used by one feature.
- Do not persist state unless the user would expect it after restart.
- Do not store canonical data only in localStorage.
- Do not duplicate the same fact across stores unless one copy is a legacy compatibility field with a sync path.
- React components must call store hooks with selectors. Selectorless calls are blocked by `pnpm run check:renderer-store-usage`.

## Current Store Map

| State | Owner | Durability |
| --- | --- | --- |
| Project list/current project | `useProjectStore` | Main DB through IPC |
| Chapters | `useChapterStore` | Main DB through IPC |
| Editor settings | `useEditorStore` | Settings IPC |
| Global workspace chrome | `useUIStore` | Versioned localStorage, minimal payload |
| Per-project layout | `useProjectLayoutStore` | Versioned localStorage |
| Characters/events/factions/terms | entity CRUD stores | Main DB through IPC |
| World graph view/document | `useWorldBuildingStore` | Main graph IPC + replica document |
| Scrap memos | `useMemoStore` | World package storage |
| Canvas view controls | `useCanvasViewStore` | localStorage view preference |

## Persist Rules

- Every Zustand persist store must define `version`, `migrate`, `merge`, and `onRehydrateStorage`.
- Persisted payloads must include an in-state `schemaVersion` when they are durable app contracts.
- `partialize` must save the smallest useful payload.
- Invalid payload: log and reset to defaults.
- Future payload: drop, do not partially merge.
- Persisted layout must store sizes/preferences, not transient open state unless explicitly project-scoped.

## Cross-Store Rules

- Cross-store reads in React render paths must use selectors.
- Cross-store reads in services/extensions may use `getState()` when they are event-driven or outside React.
- Graph-backed entity mutations must keep CRUD stores and graph state synchronized through the existing graph sync helpers.
- Project switches must guard stale async results before writing store state.
- Persist writes that can overlap for the same project need a per-project queue or lock.

## Risk Register

| Risk | Why it matters | Policy |
| --- | --- | --- |
| `uiStore.state.ts` grows into a layout god-file | It already syncs legacy flat fields and `regions` | Add behavior only where it belongs; split helpers only when repeated |
| `canvasViewStore` localStorage path is easy to miss | Boundary test pattern does not clearly catch its wrapped `createJSONStorage` form | Update localStorage boundary before adding more canvas persistence |
| Entity CRUD aliases duplicate `items/currentItem` | Compatibility fields can drift if bypassed | Use existing alias setter/factory, do not hand-write new alias sync |
| World graph and entity CRUD can race | Graph mutations update DB, graph snapshot, replica storage, and selected entity state | Use existing graph mutation helpers and project locks |
| Persist migrations can silently revive bad state | Bad layout state breaks startup UX | Keep strict schema validation and reset-on-invalid behavior |
| Selectorless store hooks cause broad rerenders | Workspace and research screens are large | Keep `check:renderer-store-usage` in core gates |

## Change Checklist

- Does this state need to exist outside one component?
- Is an existing store already the owner?
- Is this canonical data, cached data, or view preference?
- If persisted, is the schema versioned and recoverable?
- If async, can stale responses write into the wrong project?
- If cross-store, is it outside render or selector-based?
- Which focused test covers the failure path?
