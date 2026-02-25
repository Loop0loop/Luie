# Electrobun Migration Start Plan

Last updated: 2026-02-24
Scope: macOS-first, staged dual-runtime rollout

## Goals

- Start migration groundwork without breaking current Electron production path.
- Keep renderer public API (`window.api`) stable while transport/runtime internals evolve.
- Enforce Go/No-Go gates before any default-runtime switch.

## Baseline

```bash
git checkout -b codex/feature/electronBun
pnpm -s qa:core
```

## Phase 1: Core Abstractions

- Add `PlatformBridge` for main-process runtime edge.
- Add `SecureTokenStore` to remove direct `safeStorage` coupling from sync auth.
- Add `TransportBridge` to isolate preload IPC invoke/on/send boundaries.

## Phase 2: Electrobun Shell Scaffold

- Add Electrobun startup entry scaffold mirroring Electron startup order:
  - protocol registration
  - single-instance lock
  - initial deep-link callback handoff
  - app-ready and shutdown hook registration

## Phase 3: DB Compatibility Gate

- Add runtime gate for Bun + `better-sqlite3` path.
- Default remains `better-sqlite3` on Electron/Node.
- Emit explicit failure for Bun path until libsql branch is implemented.

## Phase 4: Validation

- `pnpm -s qa:core` must pass.
- Verify parity-critical flows:
  - app bootstrap/shutdown
  - OAuth deep-link callback
  - sync connect/reconnect
  - snapshot and `.luie` read/write

## Decision Gates

- **Go** when runtime parity + DB stability pass on macOS.
- **No-Go** when OAuth deep-link parity or DB integrity fails.
