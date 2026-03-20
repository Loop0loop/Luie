# SHARED BOUNDARY KNOWLEDGE BASE

## OVERVIEW

`src/shared` is the cross-process contract boundary: IPC channels, schemas, constants, shared DTO/types, logging, and renderer-safe shared UI/hooks.

## WHERE TO LOOK

| Task                         | Location                             | Notes                                                    |
| ---------------------------- | ------------------------------------ | -------------------------------------------------------- |
| Add IPC channel              | `ipc/channels.ts`, `ipc/response.ts` | Update map + typed response contracts together           |
| Add shared API contracts     | `contracts/`, `api/`                 | Prefer contract-first path for preload-renderer boundary |
| Add shared validation        | `schemas/`                           | Keep payload checks centralized                          |
| Shared constants and paths   | `constants/`                         | Cross-process safe values only                           |
| Shared logging/observability | `logger/`                            | Structured events reused in main + renderer              |
| Shared UI primitives         | `ui/`, `hooks/`                      | Renderer-safe only; no Node/Electron direct access       |

## CONVENTIONS

- This directory is the stable interface between main/preload/renderer.
- Prefer adding new boundary changes here before touching process-specific code.
- Keep modules platform-agnostic where possible (especially `types`, `utils`, `world`).
- Preserve alias usage (`@shared/*`) to avoid brittle relative imports.

## ANTI-PATTERNS

- Don’t import main-process-only modules from shared UI/hooks.
- Don’t create process-specific side effects in shared constants/types files.
- Don’t add IPC channels without corresponding handler + preload coverage.

## NOTES

- `src/shared/README.md` documents taxonomy and renderer-owned shared exception paths.
- Existing compatibility paths are maintained; new boundary work should prefer contract-centric modules.
