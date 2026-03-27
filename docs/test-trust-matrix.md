# Test Trust Matrix

This document separates tests by proof strength so "pass" does not imply the same thing everywhere.

## Levels

| Level | Meaning |
| --- | --- |
| `REAL_FS_INTEGRATION` | Uses real filesystem-backed `.luie` files and verifies read/write/reopen behavior. |
| `REAL_DB_INTEGRATION` | Uses the real test database and real service flow, without mocking the core persistence path. |
| `HANDLER_INTEGRATION` | Exercises IPC handler registration and handler behavior with Electron mocked only at the boundary. |
| `HYBRID_INTEGRATION` | Uses real DB or filesystem plus targeted spies/mocks for policy hooks. |
| `UNIT_MOCKED` | Verifies branching, error handling, or policy decisions with persistence mocked out. |

## Current Mapping

| File | Level | What it proves |
| --- | --- | --- |
| `tests/main/services/luieContainer.extreme.test.ts` | `REAL_FS_INTEGRATION` | SQLite-backed `.luie` files survive large mixed-language payloads, reopen, and sidecar checks. |
| `tests/main/services/luieContainer.test.ts` | `REAL_FS_INTEGRATION` | Canonical container write/read detection on real files and explicit legacy rejection. |
| `tests/main/services/projectService.test.ts` | `REAL_DB_INTEGRATION` | Project + attached `.luie` behavior against real DB state and real package files. |
| `tests/main/services/snapshotResilience.test.ts` | `REAL_DB_INTEGRATION` | Snapshot/mirror/recovery flows against real DB and filesystem artifacts. |
| `tests/main/handler/ipcFsHandlers.luieMigration.test.ts` | `HANDLER_INTEGRATION` | IPC layer behavior for SQLite-only `.luie` and legacy rejection. |
| `tests/main/services/snapshotService.test.ts` | `REAL_DB_INTEGRATION` | Snapshot create/restore behavior against the real test database with targeted policy spies. |
| `tests/main/services/projectService.pathSafety.test.ts` | `UNIT_MOCKED` | Path-safety branching in project update logic with mocked DB/logger/settings dependencies. |
| `tests/main/services/projectService.immediateDurability.test.ts` | `UNIT_MOCKED` | Immediate-export branching and retry policy only. |
| `tests/main/services/luiePackageWriter.rollback.test.ts` | `HYBRID_INTEGRATION` | Atomic replacement rollback on real temp files with injected rename failures. |
| `tests/main/services/snapshotService.packageBehavior.unit.test.ts` | `UNIT_MOCKED` | Snapshot durability policy branches, fallback handling, and mocked persistence. |

## Reporting Rule

When reporting results, use the level name in the sentence:

- `real filesystem integration pass`
- `real DB integration pass`
- `handler integration pass`
- `Electron boundary handler integration pass`
- `hybrid integration pass`
- `mocked unit pass`

Do not flatten all of them into a generic "pass."

## Recommended Tiers

### Release Gate

Use this tier when you want evidence that is strong enough to block a release if it fails.

- `REAL_FS_INTEGRATION`
  - [`tests/main/services/luieContainer.test.ts`](/Users/user/Luie/tests/main/services/luieContainer.test.ts)
  - [`tests/main/services/luieContainer.extreme.test.ts`](/Users/user/Luie/tests/main/services/luieContainer.extreme.test.ts)
- `REAL_DB_INTEGRATION`
  - [`tests/main/services/projectService.test.ts`](/Users/user/Luie/tests/main/services/projectService.test.ts)
  - [`tests/main/services/snapshotResilience.test.ts`](/Users/user/Luie/tests/main/services/snapshotResilience.test.ts)
  - [`tests/main/services/snapshotService.test.ts`](/Users/user/Luie/tests/main/services/snapshotService.test.ts)
- `HANDLER_INTEGRATION`
  - [`tests/main/handler/ipcFsHandlers.luieMigration.test.ts`](/Users/user/Luie/tests/main/handler/ipcFsHandlers.luieMigration.test.ts)
- `HYBRID_INTEGRATION`
  - [`tests/main/services/luiePackageWriter.rollback.test.ts`](/Users/user/Luie/tests/main/services/luiePackageWriter.rollback.test.ts)

### Fast Dev

Use this tier for quick feedback while editing code.

- `UNIT_MOCKED`
  - [`tests/main/services/snapshotService.packageBehavior.unit.test.ts`](/Users/user/Luie/tests/main/services/snapshotService.packageBehavior.unit.test.ts)
  - [`tests/main/services/projectService.immediateDurability.test.ts`](/Users/user/Luie/tests/main/services/projectService.immediateDurability.test.ts)
  - [`tests/main/services/projectService.pathSafety.test.ts`](/Users/user/Luie/tests/main/services/projectService.pathSafety.test.ts)
- Optional quick integration checks
  - [`tests/main/services/luiePackageWriter.rollback.test.ts`](/Users/user/Luie/tests/main/services/luiePackageWriter.rollback.test.ts)
  - [`tests/main/services/snapshotService.test.ts`](/Users/user/Luie/tests/main/services/snapshotService.test.ts)

### Portfolio / Interview

Use this framing when describing the work outside the codebase.

- `real filesystem integration pass`
  - [`tests/main/services/luieContainer.test.ts`](/Users/user/Luie/tests/main/services/luieContainer.test.ts)
  - [`tests/main/services/luieContainer.extreme.test.ts`](/Users/user/Luie/tests/main/services/luieContainer.extreme.test.ts)
- `real DB integration pass`
  - [`tests/main/services/projectService.test.ts`](/Users/user/Luie/tests/main/services/projectService.test.ts)
  - [`tests/main/services/snapshotResilience.test.ts`](/Users/user/Luie/tests/main/services/snapshotResilience.test.ts)
  - [`tests/main/services/snapshotService.test.ts`](/Users/user/Luie/tests/main/services/snapshotService.test.ts)
- `handler integration pass`
  - [`tests/main/handler/ipcFsHandlers.luieMigration.test.ts`](/Users/user/Luie/tests/main/handler/ipcFsHandlers.luieMigration.test.ts)
- `hybrid integration pass`
  - [`tests/main/services/luiePackageWriter.rollback.test.ts`](/Users/user/Luie/tests/main/services/luiePackageWriter.rollback.test.ts)
- `mocked unit pass`
  - [`tests/main/services/snapshotService.packageBehavior.unit.test.ts`](/Users/user/Luie/tests/main/services/snapshotService.packageBehavior.unit.test.ts)
  - [`tests/main/services/projectService.immediateDurability.test.ts`](/Users/user/Luie/tests/main/services/projectService.immediateDurability.test.ts)
