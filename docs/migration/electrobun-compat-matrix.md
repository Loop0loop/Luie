# Electrobun Compatibility Matrix (Luie)

Last updated: 2026-02-24

## Runtime and Platform

| Area | Current Electron Path | Electrobun Migration Status | Gate |
|---|---|---|---|
| Main runtime bootstrap | `src/main/index.ts` | Platform bridge introduced; shell scaffold added | parity bootstrap logs/events |
| App/window lifecycle | `appReady`/`shutdown` | scaffold only, adapter pending | clean startup/quit parity |
| Deep link OAuth callback | `setAsDefaultProtocolClient`, `open-url`, argv parsing | scaffold uses existing deep-link port contract | OAuth callback end-to-end pass |
| Main/renderer transport | preload `ipcRenderer` direct calls | transport bridge added in preload | no regression in `window.api` |

## Storage and Security

| Area | Current Electron Path | Electrobun Migration Status | Gate |
|---|---|---|---|
| Token secure storage | `safeStorage` direct in sync auth | `SecureTokenStore` abstraction added | token encrypt/decrypt parity |
| Settings persistence | `electron-store` | unchanged | settings read/write parity |

## Database

| Area | Current Electron Path | Electrobun Migration Status | Gate |
|---|---|---|---|
| ORM + SQLite adapter | Prisma + `@prisma/adapter-better-sqlite3` | compatibility gate added | no Bun+better-sqlite3 production usage |
| Bun runtime path | N/A in production | explicit fail-fast until libsql branch | dedicated libsql implementation |

## IPC Surface

| Area | Current Electron Path | Electrobun Migration Status | Gate |
|---|---|---|---|
| Channel constants | `src/shared/ipc/channels.ts` | transport channel grouping added | no channel contract breaks |
| Handler registration | `registerIpcHandler` with `ipcMain.handle` | routed via `PlatformBridge` | all core tests pass |

## Open Items

- Implement Electrobun concrete runtime adapters for app/window/dialog/menu/protocol.
- Add libsql adapter branch and verify Prisma path under Bun runtime.
- Complete macOS-focused E2E parity checklist before default runtime switch.

