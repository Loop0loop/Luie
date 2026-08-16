# CSP Policy (Renderer)

## Single source of truth

- Runtime CSP is controlled in `src/main/lifecycle/app-ready/appReady.ts` via `session.defaultSession.webRequest.onHeadersReceived`.
- `src/renderer/index.html` keeps a development-compatible meta CSP as a fallback.

## Environment behavior

- `dev` (default): no CSP header injection to keep Vite preamble + HMR stable.
- `dev` with `LUIE_DEV_CSP=1`: injects a permissive development CSP header.
- `preview/prod`: injects a strict CSP header (`buildProdCspPolicy`) for all responses, including the packaged `file://` main document. The stricter response header constrains the fallback meta policy.

## Security warning policy

- Development Electron CSP warning is tolerated when dev CSP is disabled.
- Production goal is zero CSP warnings and zero CSP violations.
