# MAIN PROCESS KNOWLEDGE BASE

## OVERVIEW

Electron main process owns lifecycle, IPC handler registration, service orchestration, DB bootstrapping, and desktop integrations.

## STRUCTURE

```text
src/main/
├── index.ts         # bootstrap + lazy module imports
├── lifecycle/       # appReady, shutdown, deepLink, crash reporting
├── handler/         # IPC registration and domain handler modules
├── services/        # core/world/features/io service layers
├── manager/         # window/settings/autosave runtime managers
├── database/        # Prisma/sqlite bootstrap and schema apply
└── utils/           # environment/path/security helpers
```

## WHERE TO LOOK

| Task                       | Location                                                 | Notes                                               |
| -------------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| App bootstrap order        | `index.ts`                                               | Startup is lazy-loaded via `Promise.all` imports    |
| Main window readiness      | `lifecycle/appReady.ts`                                  | Deferred maintenance + crash recovery + CSP wiring  |
| Add IPC handler            | `handler/index.ts` + `handler/<domain>/`                 | Register in hub and keep channel contracts synced   |
| Add domain service         | `services/{core,world,features,io}/`                     | Keep layer boundaries; avoid handler business logic |
| DB init/migration behavior | `database/index.ts`                                      | Dev/test/prod schema paths diverge intentionally    |
| Auto-save / window runtime | `manager/autoSaveManager.ts`, `manager/windowManager.ts` | Async managers loaded lazily in lifecycle/handler   |

## CONVENTIONS

- `handler/*` should orchestrate; service modules hold business logic.
- Keep IPC contracts source-of-truth in `src/shared/ipc/channels.ts` and mirror changes in handlers + preload.
- Prefer lazy import for heavy startup modules in `index.ts` and lifecycle paths.
- Use shared logger (`createLogger`) with structured context objects.

## ANTI-PATTERNS

- Don’t directly expose Node/Electron internals to renderer; route via preload contracts.
- Don’t put schema/channel literals inline in handlers.
- Don’t skip startup/deferred maintenance guards in `appReady.ts`.
- Don’t add raw unsafe DB paths without `ensureSafeAbsolutePath` style checks.

## NOTES

- `database/index.ts` intentionally falls back in local dev/test when native adapter ABI mismatches.
- Release/runtime stability depends on graceful shutdown + autosave flush hooks.
