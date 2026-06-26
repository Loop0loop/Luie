# Language: Korean

Always Korean Prompt

# PROJECT KNOWLEDGE BASE

**Generated:** 2026-03-20 11:57:46 KST  
**Commit:** 8d0c2c5  
**Branch:** feature/graph

## OVERVIEW

Electron desktop app for long-form writing workflows. Stack: Electron 40 + React 19 + TypeScript 5 + Drizzle/SQLite + pnpm toolchain.

## STRUCTURE

```text
Luie/
├── src/main/                  # Electron main process (services, lifecycle, IPC handlers)
├── src/preload/               # contextBridge + safe IPC invocation layer
├── src/renderer/src/features/ # feature-first UI domains
├── src/shared/                # cross-process contracts/constants/types/ui-safe shared code
├── tests/                     # main/renderer/dom/e2e/script test suites
├── scripts/                   # quality gates + release/build utility scripts
├── supabase/                  # backend function/config boundary
└── plugin/                    # plugin packaging area
```

## WHERE TO LOOK

| Task                            | Location                                                                                 | Notes                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| App startup / lifecycle order   | `src/main/index.ts`, `src/main/lifecycle/appReady.ts`                                    | Main bootstrap uses deferred startup maintenance and deep-link handling |
| IPC contract additions          | `src/shared/ipc/channels.ts`, `src/main/handler/**`, `src/preload/api/**`                | Add channel/type/schema together; keep main/preload/renderer aligned    |
| Renderer feature changes        | `src/renderer/src/features/**`                                                           | Feature-first folders; world graph lives under `research`               |
| Shared constants/types          | `src/shared/constants/**`, `src/shared/types/**`                                         | Cross-process safe only                                                 |
| Build or packaging issues       | `electron.vite.config.ts`, `electron-builder.json`, `scripts/**`, `.github/workflows/**` | pnpm scripts orchestrate build + package                                |
| Test behavior / env differences | `vitest.config.ts`, `tests/**`, `package.json` scripts                                   | `SKIP_DB_TEST_SETUP=1` appears in targeted suites                       |

## CODE MAP

| Symbol/Module                  | Type           | Location                                     | Role                                                   |
| ------------------------------ | -------------- | -------------------------------------------- | ------------------------------------------------------ |
| `registerAllIPCHandlers`       | function       | `src/main/handler/index.ts`                  | Main IPC registration hub                              |
| `db` (`DatabaseService`)       | singleton      | `src/main/database/index.ts`                 | DB init/migration/bootstrap + Drizzle client lifecycle |
| `registerAppReady`             | lifecycle      | `src/main/lifecycle/appReady.ts`             | Main window flow + deferred maintenance                |
| `createRendererApi` bridge     | module         | `src/preload/index.ts` + `src/preload/api/*` | Controlled renderer capability surface                 |
| `IPC_CHANNELS`                 | constant map   | `src/shared/ipc/channels.ts`                 | Canonical channel registry                             |
| `features/*` stores/components | domain modules | `src/renderer/src/features/**`               | UI/business domains (editor/research/workspace/etc.)   |

## CONVENTIONS (PROJECT-SPECIFIC)

- Package manager is **pnpm** 
- TypeScript strictness is tightened with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.
- Aliases: `@renderer/* -> src/renderer/src/*`, `@shared/* -> src/shared/*`.
- Build flow usually requires pre steps (`predev`, `postinstall` include Electron rebuild work).
- Renderer DOM tests are split by glob to `jsdom` (`tests/dom/**/*.test.tsx`), default test env is `node`.

## ANTI-PATTERNS (THIS PROJECT)

- Don’t commit secrets/tokens in Supabase config (`supabase/config.toml` explicit warnings).
- Don’t bypass guard scripts in change-critical work (`check:*` scripts encode repo policy gates).
- Don’t add Node/Electron direct access in renderer shared UI/hooks; keep boundary through preload API.
- Don’t introduce IPC channels without updating shared channel map and main handler registration.

## UNIQUE STYLES

- Heavy use of script-based policy enforcement (`check-no-escape-hatches`, `check-ipc-*`, `check-target-file-drift`, etc.).
- Main process uses lazy imports at startup for performance and staged readiness.
- Release automation split: Windows tag-triggered workflow + manual DMG upload workflow.

## COMMANDS

```bash
pnpm dev
pnpm run typecheck
pnpm run build
pnpm run lint
pnpm run qa:core
SKIP_DB_TEST_SETUP=1 pnpm vitest tests/renderer/hooks/canvasBlockNameGeneration.test.ts
pnpm run build:mac:arm64
pnpm run build:win:x64
```

## NOTES

- This repo is large (34k+ files including generated/vendor artifacts): avoid broad scans; scope commands.
- Native module ABI mismatches can happen in local test envs; rebuild flows are already scripted.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
