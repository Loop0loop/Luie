# Cache Lifecycle (DB vs .luie)

## Source of truth
- `.luie` is the master package and must always be treated as canonical.
- The SQLite database is a cache that can be rebuilt from `.luie`.

## Snapshot storage
- Snapshot artifacts are stored inside `.luie` for durability.
- The `Snapshot` table in SQLite is treated as a cache for fast access and UI listing.

## Recovery rules
- If the database is missing, rebuild it from `.luie`.
- If `.luie` is missing or corrupted and the database exists, export from the DB to recreate `.luie`.
- On conflicts, prefer `.luie` unless DB has a newer timestamp and explicit recovery is requested.

## Pruning policy
- Keep recent snapshots in DB for fast access.
- Prune old DB snapshots after exporting to `.luie` (main process housekeeping).
- The DB cache can be dropped and rebuilt at any time.
