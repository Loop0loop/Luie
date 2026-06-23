# AI Review Protocol

AI-generated changes are reviewed against these mandatory questions before merge.

## 1. State Ownership

- Why is this state not local component state?
- Why must this state be shared across components or event flows?
- Can any stored value be derived during render instead of being persisted in store state?

## 2. Store Subscription

- Which selector does each consumer use?
- Does the selector subscribe only to the fields used during render?
- If the selector returns an object or array, is `useShallow` justified?
- Which high-frequency updates should use transient subscription instead of React render?

## 3. Hook Design

- Is the hook sharing logic or trying to act like a global singleton?
- Does each effect synchronize with an external system?
- Is any effect being used only to derive state or route user events?

## 4. Electron Boundary

- Is the renderer free of direct `electron`, `node:*`, `fs`, and `path` imports?
- Did preload expose capability-focused methods rather than raw IPC?
- Is there any new untrusted content path sharing a boundary with privileged APIs?

## 5. IPC / Persist Contracts

- Where is the request schema?
- Where is the persisted payload schema?
- Are extra keys rejected with strict objects where the boundary is untrusted?
- What is the fallback path when rehydrate or IPC validation fails?

## 6. Merge Gate

- `check:renderer-store-usage` passes.
- `check:ipc-handler-schemas` passes.
- `check:ipc-contract-map` passes without drift.
- Relevant DOM rerender regression tests pass.
