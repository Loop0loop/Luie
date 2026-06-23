# PRELOAD BOUNDARY KNOWLEDGE BASE

## OVERVIEW

Preload is the security boundary that exposes a constrained renderer API over IPC (`contextBridge` + guarded invoke paths).

## WHERE TO LOOK

| Task                               | Location                                           | Notes                                             |
| ---------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| Public renderer capability surface | `index.ts`                                         | `createRendererApi` is bridged to `window.api`    |
| Add a new API method               | `api/*.ts` + `api/types.ts`                        | Keep invoke typing + response contracts aligned   |
| Timeout/retry behavior             | `index.ts` (`safeInvoke`, long/retry channel sets) | Adjust channel sets carefully                     |
| Logging from renderer              | `index.ts` logger batching/flush                   | Observability events are structured and sanitized |

## CONVENTIONS

- Sanitize payloads crossing IPC boundaries (`sanitizeForIpc`).
- Keep long-running channels explicit in `LONG_TIMEOUT_CHANNELS`.
- Keep read-retry behavior explicit in `RETRYABLE_CHANNELS`.
- Expose only minimal safe APIs through `contextBridge`.

## ANTI-PATTERNS

- Don’t expose raw `ipcRenderer` usage directly to feature code.
- Don’t add channels in preload without shared channel-map updates.
- Don’t bypass timeout and error envelope behavior for new methods.

## NOTES

- Preload build emits CJS output configured in `electron.vite.config.ts`.
- Contract drift is guarded by `check:preload-contract-regression` scripts/tests.
