# Persist Migration Policy

## Rules
- Every Zustand `persist` store must define `version`, `migrate`, `merge`, and `onRehydrateStorage`.
- Persisted payloads must carry an in-state `schemaVersion` in addition to Zustand's storage `version`.
- Invalid or unsupported persisted payloads must fall back to defaults without crashing the app.
- Recovery must be best-effort and must log what was dropped.

## Fallback Policy
- Validation failure: warn log + reset to defaults
- Future schema version: recovery log + drop persisted payload
- Rehydrate exception: recovery log + drop persisted payload
- Legacy supported version: migrate forward and keep the app running

## Current Versioned Stores
- `uiStore`
- `projectLayoutStore`
- `world scrap memos`

## Reviewer Questions
- What is the new target schema version?
- What happens to older payloads?
- What happens to newer payloads from a downgraded client?
- Is the fallback idempotent?
- Is the recovery logged with enough context to debug user reports?
