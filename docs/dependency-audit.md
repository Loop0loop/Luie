# Dependency Audit (2026-02-11)

## Unused in source
- `react-markdown` (no imports in src/)
- `remark-gfm` (no imports in src/)
- `@electron/rebuild` (no imports; `electron-rebuild` is used in scripts)

## Suggested cleanup
- Remove `react-markdown` and `remark-gfm` if markdown rendering is no longer planned.
- Keep `electron-rebuild` for scripts and drop `@electron/rebuild` to avoid overlap.
