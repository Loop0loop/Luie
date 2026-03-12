# Luie Container DoD

> Status: Phase 8D complete
> Policy: `.luie` is now SQLite-only (`sqlite-v2`)

## Philosophy

- Correctness before optimization.
- `.luie` is the canonical project artifact.
- `replica.db` may be deleted; `.luie` must still recover project content and snapshots.
- Legacy package `.luie` files are not silently migrated, not partially opened, and not best-effort repaired.
- We do not claim performance wins without measurement.

## Guardrails

- No dual-format runtime behavior.
- No automatic package-to-sqlite migration.
- No silent fallback that leaves canonical state only in `replica.db`.
- No `.luie-wal` or `.luie-shm` sidecar files.
- No feature service should need to know about zip/package containers anymore.

## Phase 8D DoD

Phase 8D is done when all of the following are true:

1. New `.luie` creation, materialize, snapshot import, sync persistence, and immediate durability writes all produce `sqlite-v2`.
2. `package-v1` is no longer a supported read path. Open, attach, import, and raw entry reads fail with the same explicit legacy-unsupported error.
3. Project attachment state distinguishes `unsupported-legacy-container` from `missing-attachment` and `invalid-attachment`.
4. Renderer UI exposes one materialize action only. Users do not choose container kind.
5. `fs.readLuieEntry` reads sqlite-backed `.luie` entries only and rejects legacy containers explicitly.
6. Recovery tests prove that deleting `replica.db` does not destroy project or snapshot data as long as the sqlite `.luie` exists.
7. QA evidence is tracked in `/Users/user/Luie/docs/phase-8d-qa-gate.md`.

## Explicit Non-Goals

- No legacy importer.
- No background or one-shot conversion tool.
- No compatibility guarantee for pre-cutover package `.luie` files during alpha.
- No speculative performance tuning beyond avoiding obviously pathological write paths.

## Failure Conditions

- A new `.luie` write path creates anything other than `sqlite-v2`.
- Legacy package `.luie` files partially open instead of failing deterministically.
- A feature silently falls back to local cache when canonical `.luie` access should fail loudly.
- Deleting `replica.db` loses snapshots or user-authored project data.
