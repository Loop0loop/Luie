---
name: project-canvas-feature
description: Canvas feature (graph/static viewport, Obsidian-style explorer) is under active WIP on feature/canvas branch — mostly mock-data UI scaffolding
metadata:
  type: project
---

The canvas feature in `src/renderer/src/features/canvas/` is WIP UI scaffolding on the `feature/canvas` branch, not yet wired to real data.

**Why:** It's being built UI-first ("UI/UX 밑작업" per file headers) — graph/inspector/explorer all read from mock constants (`MOCK_GRAPH_NODES/EDGES`, `mockExplorerData`, `MOCK_MEMORY_*`). Toolbar handlers are intentional stubs that only log/toast. `CanvasStatusBar` gets `projection={null}` by design for now.

**How to apply:** When reviewing canvas code, treat mock-data imports and stub handlers as known/expected scaffolding — the user already knows about them. Focus reviews on durable concerns: i18n gaps, className duplication, magic numbers, and architecture choices (e.g. dual data sources) that will bite when real data lands. The feature already has a `constants/` dir (edge.ts, node.ts, panel.ts) — the team's convention is to extract constants there, so flag inline magic values against that established pattern.
