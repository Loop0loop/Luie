# Bundle Optimization Plan

## Goal

- Reduce packaged app size (`.app` / `.exe`) and production JS bundle size.
- Preserve all existing functionality and runtime behavior.

## Constraints

- Main/preload use `externalizeDepsPlugin()`, so runtime-required main-process packages must remain in `dependencies`.
- Renderer packages bundled by Vite do not need to remain in packaged runtime `node_modules`.
- Prisma packaging must keep packaged app runtime working.

## Evidence

- Main build currently emits `out/main/syncService-*.js` around 5.2 MB.
- Renderer build currently emits large chunks including `vendor-editor`, `vendor-react`, `vendor-graph`, `EditorRoot`, `SettingsModal`, and locale/global-css related assets.
- `node_modules/@prisma/client/runtime` is ~74.6 MB, `node_modules/@prisma/client` is ~75.2 MB, `node_modules/.prisma` is ~9 MB.
- Renderer-only packages currently in `dependencies` include React, Zustand, Tiptap, React Flow, lucide-react, DnD kit, i18n/browser detector, etc., causing likely packaged duplication.

## Execution Order

### 1. Move renderer-only libraries from `dependencies` to `devDependencies`

- Move only packages verified to be used exclusively from renderer/shared-renderer code.
- Keep main-process runtime packages in `dependencies`.
- Reinstall dependencies after editing `package.json`.

#### Verification

- Run `bun run check:deps`.
- Run `bun run build`.
- Success criteria:
  - dependency classification checks pass;
  - main/preload build still resolves runtime-required modules;
  - renderer build still bundles renderer-only packages successfully.

### 2. Tighten packaged Prisma resources

- Restrict `electron-builder.json` Prisma resource copying so only necessary runtime files are included.
- Avoid removing files needed by packaged Prisma verification.

#### Verification

- Run `bun run build:mac:package`.
- Run `bun run verify:packaged-prisma`.
- Success criteria:
  - packaged app is created successfully;
  - packaged Prisma verification passes;
  - Prisma runtime assets required by the packaged app are still present.

### 3. Split main sync feature loading

- Refactor `src/main/services/features/sync/syncService.ts` to replace heavy top-level imports with method-level dynamic imports.
- Preserve public API and startup behavior.

#### Verification

- Run `bun -s vitest tests/main/services/syncAuthService.test.ts tests/main/services/syncService.test.ts tests/main/services/syncMapper.test.ts tests/main/services/syncRepository.test.ts`.
- Run `bun run build`.
- Success criteria:
  - sync tests pass;
  - production build still succeeds;
  - sync startup/initialization path remains intact while main chunk size is reduced or redistributed.

### 4. Split renderer locale/settings loading

- Refactor renderer i18n setup to lazily load locale resources by selected language.
- Refactor `SettingsModal` to lazy-load tab content per active tab.
- Preserve language switching behavior and settings UX.

#### Verification

- Run `bun run check:i18n-parity`.
- Run `bun -s vitest tests/dom/appOperationalScenarios.test.tsx tests/dom/projectInitOperationalScenarios.test.tsx tests/dom/rendererRerenderRegression.test.tsx`.
- Run `bun run build`.
- Success criteria:
  - i18n parity checks pass;
  - renderer operational tests pass;
  - language switching still works;
  - settings tabs still open/render correctly with lazy loading.

### 5. Verify

- Run diagnostics on changed files.
- Run install/build/typecheck or targeted verification needed after dependency movement.
- Run production build and compare output sizes.
- If packaging verification exists for Prisma, run it.

#### Verification

- Capture pre/post build output for `bun run build`.
- Capture packaged artifact sizes from `dist/` after packaging.
- Success criteria:
  - before/after numbers are recorded for main, preload, renderer, and packaged artifacts;
  - at least one measurable reduction is demonstrated in JS chunks and packaged app size;
  - no regression checks above fail.

## Validation Checklist

- No runtime `MODULE_NOT_FOUND` for main/preload features.
- Renderer still starts and all lazy-loaded screens/tabs/languages work.
- Sync still initializes and runs.
- Packaged Prisma verification passes.
- Build output shows reduced package/runtime duplication and/or smaller chunks.
