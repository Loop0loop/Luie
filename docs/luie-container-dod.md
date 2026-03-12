# Luie Container DoD

> Status: Phase 8A complete, Phase 8B pending
> Scope: `.luie` container evolution without breaking existing project behavior

## Philosophy

- Correctness before optimization.
- Existing `.luie` projects must keep opening and exporting while Phase 8 is in progress.
- No "clever" storage rewrite is allowed if we cannot explain the failure mode and recovery path.
- We do not claim performance wins without measurement.
- We do not accept pathological regressions in exchange for abstraction.

## Guardrails

- No forced migration on open.
- No silent fallback that leaves canonical state only in `replica.db`.
- No background conversion that mutates a user `.luie` file without an explicit write action.
- No `.luie-wal` or `.luie-shm` sidecar files for canonical sqlite-backed `.luie`.
- No per-keystroke full-project container rewrite.
- No format-specific logic scattered across feature services once the container seam exists.

## Phase 8 Overall DoD

Phase 8 is done when all of the following are true:

1. Existing package-based `.luie` files still open, export, analyze, sync, attach, and recover correctly.
2. The app can identify a `.luie` container kind before mutating it.
3. Core project import/export flows depend on a `LuieContainer` seam, not raw zip helpers.
4. SQLite-backed `.luie` can be introduced without rewriting project services again.
5. Attached canonical writes persist to the attached `.luie` or fail loudly with an explicit recovery path.
6. Deleting `replica.db` does not destroy canonical `.luie` data.
7. The current container kind and compatibility contract are documented and test-covered.

## Phase 8A DoD

Phase 8A is the compatibility slice. It is done when:

1. A `LuieContainer` probe/read/write interface exists.
2. The current package-based `.luie` implementation sits behind that interface as `package-v1`.
3. Core project import/export and attachment-meta reads use the interface.
4. Container probing can distinguish `package-v1`, `sqlite-v2`, and missing/unknown files.
5. Tests lock current behavior for package file, package directory, and sqlite-header detection.
6. No user-facing project workflow regresses from the current package-based behavior.

## Explicit Non-Goals For 8A

- No sqlite-backed `.luie` read path yet.
- No sqlite-backed `.luie` write path yet.
- No automatic migration from package `.luie` to sqlite `.luie`.
- No performance tuning beyond avoiding obviously bad write-amplification patterns.

## What Will Count As Failure

- A valid old `.luie` file no longer opens.
- `.luie` export/import changes behavior without a test catching it.
- A new abstraction adds more full-project rewrites than the current package flow.
- A feature service has to know whether `.luie` is zip or sqlite to do normal project work.
