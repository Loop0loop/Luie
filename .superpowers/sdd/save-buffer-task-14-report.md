# Task 14 report — export failure safety

## Scope

- Start: `ec194995`
- Branch: `feature/00-save-integrity`
- Production: project export queue, MANUAL_SAVE handler, shutdown export decision
- Deferred: automatic backoff, project-wide revision coverage

## TDD evidence

- Initial RED: 3 files, 5 expected assertion failures and 1 missing-helper suite
  - export `false` counted as flushed and removed dirty state
  - export throw/scheduled failure removed retry state
  - MANUAL_SAVE returned success for `exported: false`
  - quit had no testable failed-count decision boundary
- Focused GREEN: 3 files/18 tests PASS
- Mutation sensitivity:
  - changing retained `dirty` to false fails the next-flush retry test
  - ignoring `failed > 0` fails the default quit-cancel test

## Result

- `false`/throw retain the project and never advance `exportedRevision`
- the observing run/flush stops; the next schedule/runNow/flush retries once
- flush counts completed false/throw as failed, separately from timeout
- late timeout completion preserves retry or performs successful cleanup
- MANUAL_SAVE only succeeds after a true package export result
- soft/hard export failure and timeout block quit by default; retry success or explicit skip can continue

## Verification

- Task 8~14 non-DB regression: 15 files/93 tests PASS, unhandled rejection 0
- Electron-as-Node DB recovery: 2 files/2 tests PASS
- Target ESLint: PASS
- `git diff --check`: PASS
- `tsc6 --noEmit`: Task 14 errors 0; blocked only by user-owned dirty `BinderSidebarPanelBody.tsx:102` baseline TS2322
