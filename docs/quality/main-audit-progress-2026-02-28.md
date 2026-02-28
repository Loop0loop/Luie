# MAIN Audit Progress Report (2026-02-28)

## Scope
- Priority 1: `.luie` extension paths and package integrity
- Priority 2: Sync/async conflict safety
- Priority 3: `.db` / Prisma / cache recovery paths
- Focus area in this update: requested 4 items (P1 completion set)

## Completed 4 Items

### 1) DB ABI fallback for test/dev stability (P1)
- Implemented runtime fallback when `@prisma/adapter-better-sqlite3` cannot be loaded (common ABI mismatch case after Electron rebuild).
- Behavior:
  - packaged runtime: keep strict mode (throw on adapter load failure)
  - dev/test runtime: fallback to Prisma default sqlite engine to avoid test blockage
- File:
  - `src/main/database/index.ts`

### 2) Update chain completion (P2 core hardening)
- Added end-to-end update lifecycle service:
  - secure feed parse (HTTPS only)
  - semantic version compare
  - manifest extraction (`version/url/sha256/size`)
  - download with max-size guard + SHA-256 verification
  - pending/current/rollback metadata management
  - apply + rollback flow
  - state broadcast to renderer
- Wired IPC handlers in main process for:
  - `app:get-update-state`
  - `app:download-update`
  - `app:apply-update`
  - `app:rollback-update`
- Files:
  - `src/main/services/features/appUpdateService.ts`
  - `src/main/handler/system/ipcWindowHandlers.ts`

### 3) Crash reporting/error collection readiness (P2)
- Added crash reporting lifecycle module with file persistence under userData:
  - process hooks: `uncaughtExceptionMonitor`, `unhandledRejection`
  - app hooks: `render-process-gone`, `child-process-gone`
  - secret redaction for tokens/JWT-like patterns
  - bounded retention pruning
- Registered at main bootstrap.
- Files:
  - `src/main/lifecycle/crashReporting.ts`
  - `src/main/index.ts`

### 4) `.luie` re-scan (priority re-check)
- Re-verified core `.luie` paths:
  - zip entry path traversal guard (`normalizeZipPath`, `isSafeZipPath`)
  - realpath-root check for directory packages
  - write path atomic replace + integrity verify (`meta.json` format/container/version)
  - sync path absolute projectPath enforcement before package read/write
- Result: no new P1 crack found in current `.luie` handling path.
- Main files checked:
  - `src/main/utils/luiePackage.ts`
  - `src/main/handler/system/ipcFsHandlers.ts`
  - `src/main/services/features/syncService.ts`

## Additional Contract/Type Wiring Completed
- Added app update event subscription fallback handling in renderer API (`onUpdateState`).
- Updated preload contract baseline after intentional preload surface change.
- Files:
  - `src/shared/api/index.ts`
  - `docs/quality/preload-contract-baseline.json`

## Verification Results
- `pnpm -s typecheck` ✅
- `pnpm -s check:ipc-contract-map` ✅
- `pnpm -s check:preload-contract-regression` ✅ (baseline updated)
- `SKIP_DB_TEST_SETUP=1 pnpm -s vitest tests/main/handler/ipcWindowHandlers.test.ts tests/main/services/appUpdateService.test.ts tests/main/lifecycle/crashReporting.test.ts` ✅
- `SKIP_DB_TEST_SETUP=1 pnpm -s vitest tests/main/handler/ipcFsHandlers.luieMigration.test.ts tests/main/services/dbRecoveryService.test.ts tests/shared/logger.redaction.test.ts` ✅

## Open Risk Notes (next queue)
- Update distribution trust is still feed+hash based; full platform signature verification/rollback orchestration remains a separate hardening track.
- Full installer/UAC/notarization/SmartScreen flow is not covered by these code-level tests.
- End-to-end crash upload pipeline (external backend) is not yet wired; current mode is local persisted reports.
