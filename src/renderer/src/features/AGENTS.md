# RENDERER FEATURES KNOWLEDGE BASE

## OVERVIEW

Feature-first renderer domain modules for writing UX, workspace orchestration, world graph/research, settings, and export.

## STRUCTURE

```text
src/renderer/src/features/
├── editor/      # tiptap/editor flow
├── manuscript/  # chapter/binder workflows
├── research/    # world graph + notes + entity tools
├── workspace/   # panel/layout orchestration
├── settings/    # app configuration tabs/modal
├── snapshot/    # snapshot list/viewer/workers
├── export/      # export window/preview
└── ...          # auth/project/startup/trash
```

## WHERE TO LOOK

| Task                                | Location                             | Notes                                                      |
| ----------------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| World graph/canvas behavior         | `research/components/world/graph/**` | Canvas interactions are hook-heavy; keep store sync stable |
| Editor behavior/plugins             | `editor/**`                          | TipTap and input pipelines live here                       |
| Layout mode behavior                | `workspace/**`                       | Panel/mode transitions and persistence rules               |
| Feature state stores                | `*/stores/**`                        | Zustand stores are central integration points              |
| Cross-feature renderer shared logic | `src/renderer/src/shared/**`         | Error boundaries/hooks/store factory support many features |

## CONVENTIONS

- Keep feature boundaries explicit; avoid cross-feature deep imports when shared module exists.
- Renderer must consume desktop capabilities through `window.api`/preload contracts only.
- Use stable callbacks/memoization in high-frequency visual paths (graph/editor/workspace).
- Keep node/edge heavy operations in hooks and stage persistence for drag-end when possible.

## ANTI-PATTERNS

- Don’t import Electron/Node APIs directly in feature components/hooks.
- Don’t duplicate shared UI primitives already in `@shared/ui`.
- Don’t bypass domain stores by mutating cross-feature state ad hoc.
- Don’t introduce broad rerender triggers in graph/editor hot paths.

## NOTES

- `research` and `workspace` are highest-change/high-coupling zones; verify with targeted tests.
- DOM tests use jsdom only for `tests/dom/**/*.test.tsx`; default Vitest env is node.
