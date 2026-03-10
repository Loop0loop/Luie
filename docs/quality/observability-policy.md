# Observability Policy

## Goal
- Validation, persist, migration, recovery, IPC, and runtime failures must emit structured logs.
- Renderer, preload, and main must use the same envelope shape so failures can be grouped by `domain`, `event`, and `scope`.

## Required Fields
- `schemaVersion`
- `domain`
- `event`
- `scope`
- `durationMs` for performance events
- `zod` summary for validation failures
- `requestId` and `channel` for IPC failures when available
- `storageKey`, `persistedVersion`, `targetVersion` for persisted-state failures when available

## Severity
- `warn`: validation failures, degraded recovery, retryable operational issues
- `error`: runtime crashes, unrecoverable boundary failures
- `info`: successful migrations, recovery actions, performance measurements

## Minimum Coverage
- Persist rehydrate and migration
- IPC request validation rejection
- Renderer error boundaries
- Preload invoke timeout / invoke failure
- World-package persisted payload validation

## Review Rule
- New runtime boundaries must either emit structured logs or explicitly justify why no operational signal is needed.
