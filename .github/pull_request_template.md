## Summary

- What changed?
- Why does this change exist?

## Verification

- [ ] `pnpm -s typecheck`
- [ ] `pnpm -s lint-all`
- [ ] `pnpm -s qa:core`
- [ ] Additional targeted tests, if any:

## State Ownership Review

- Why is this state not local component state?
- Why does this state belong in a shared/global store?
- Which selectors are used, and why are they the minimum subscription surface?
- Which fields are derived and intentionally not persisted?

## Hook / Effect Review

- Is this custom hook sharing logic only, or also state ownership?
- Which effects synchronize with an external system?
- Which effects were removed because they were only deriving state?

## Persist / Rehydrate Review

- Why is each persisted field necessary after restart?
- What is the target persisted schema version, and how are older/newer payloads handled?
- What resets or fallback paths exist for malformed persisted data?
- Does persisted state include any sensitive or machine-specific values?

## Observability Review

- Which new failure paths emit structured logs?
- Which `domain` / `event` / `scope` values should operators expect?
- Are recovery actions logged separately from validation failures?

## IPC / Electron Boundary Review

- Which preload API surface changed, if any?
- Where are the request and response/runtime schemas defined?
- Is every IPC handler with input parameters guarded by `argsSchema`?
- Is there any renderer code that assumes direct Electron/Node access?

## AI Review Gate

- [ ] Import paths and APIs were checked against the current installed codebase.
- [ ] No selectorless `useXStore()` subscriptions were introduced.
- [ ] No custom hook is claiming to share global state while actually using local state.
- [ ] No effect is used only to derive state or handle a user event.
- [ ] No renderer privileged API usage bypasses preload.
- [ ] No IPC/persist boundary accepts unvalidated payloads.

## References

- Code:
- Docs / contracts:
