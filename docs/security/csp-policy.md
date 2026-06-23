# CSP Policy (Renderer)

## Single source of truth
- Runtime CSP is controlled only in `/Users/user/Luie/src/main/lifecycle/appReady.ts` via `session.defaultSession.webRequest.onHeadersReceived`.
- `/Users/user/Luie/src/renderer/index.html` does not define a meta CSP.

## Environment behavior
- `dev` (default): no CSP header injection to keep Vite preamble + HMR stable.
- `dev` with `LUIE_DEV_CSP=1`: injects a permissive development CSP header.
- `preview/prod`: injects strict CSP header (`buildProdCspPolicy`).

## Security warning policy
- Development Electron CSP warning is tolerated when dev CSP is disabled.
- Production goal is zero CSP warnings and zero CSP violations.
