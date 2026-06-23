# TESTS KNOWLEDGE BASE

## OVERVIEW

Multi-layer suite split across main, renderer, dom, scripts, e2e, and shared. Vitest is primary; Playwright covers e2e/stress/visual/smoke.

## STRUCTURE

```text
tests/
├── main/      # main process services/handlers/lifecycle
├── renderer/  # hooks/stores/services/components
├── dom/       # jsdom-based UI/operational flows
├── scripts/   # policy/check script tests
├── e2e/       # Playwright projects
└── shared/    # cross-layer utility tests
```

## WHERE TO LOOK

| Task                                | Location                           | Notes                                  |
| ----------------------------------- | ---------------------------------- | -------------------------------------- |
| Main IPC/service regressions        | `tests/main/**`                    | Mirrors `src/main` domains             |
| Renderer hook/store behavior        | `tests/renderer/**`                | Targeted behavior + integration checks |
| UI rerender/operational regressions | `tests/dom/**`                     | Runs in jsdom per Vitest config        |
| Guard script integrity              | `tests/scripts/**`                 | Verifies policy checks (`check:*`)     |
| End-to-end workflow                 | `tests/e2e/**` + Playwright config | Requires build/test preparation        |

## CONVENTIONS

- Naming: unit/integration `*.test.ts(x)`, e2e uses `*.spec.ts`.
- Default Vitest env is node; DOM tests switch to jsdom via `environmentMatchGlobs`.
- Many targeted suites run with `SKIP_DB_TEST_SETUP=1` for speed/isolation.

## ANTI-PATTERNS

- Don’t rely on full-db setup for targeted renderer tests unless required.
- Don’t move DOM tests outside `tests/dom/**` if jsdom behavior is needed.
- Don’t skip updating script tests when changing `scripts/check-*` policies.

## NOTES

- `qa:core` command encodes required quality baseline; use it for broad safety checks.
- Native module ABI issues can affect broad test runs; targeted suites often avoid this via env/scripted flows.
