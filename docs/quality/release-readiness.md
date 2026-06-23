# Release Readiness

## Release Blockers
- `pnpm -s lint-all` must pass.
- `pnpm -s qa:core` must pass.
- IPC contract drift must be committed.
- Persisted-state schema changes must include `version`, `migrate`, `merge`, and `onRehydrateStorage`.
- New runtime boundaries must emit structured logs or explicitly justify why not.

## Advisory Allowed
- Non-blocking complexity warnings are allowed only when ordering, retry, or recovery semantics are documented.
- Performance budgets may be exceeded in development-only flows, but not in primary writing flows.

## Schema / Migration Policy
- Bump schema version when persisted payload shape or required semantics change.
- Older payloads must migrate forward or reset safely.
- Newer payloads from a downgraded runtime must be dropped, not partially merged.

## Recovery Policy
- Validation failure: warn log + safe fallback.
- Rehydrate exception: recovery log + safe reset.
- Uncaught feature error: feature boundary first, global boundary only when not isolated.
- IPC timeout or invoke failure: structured preload diagnostic + user-visible fallback path.

## Performance Baseline Events
- `bootstrap.ensure-ready`
- `persist.rehydrate.ui-store`
- `persist.rehydrate.project-layout-store`
- `project-init.startup-loads`
- `project-init.project-switch-loads`
- `memo-store.load-notes`
- `renderer.startup.setupRenderer`
- `renderer.startup.initI18n`

## New Feature Entry Checklist
- Is state ownership local/shared/global for a concrete reason?
- Are selectors minimal?
- Is persist strictly necessary?
- Are request/response contracts strict and versioned where needed?
- Is there an operational test for the failure path?
