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

## Review follow-up — detached skip and shutdown wiring

- RED: 2 files/20 tests, 5 expected failures from detached work counted/exported as success output
- Queue callback result is internal `boolean | "skipped"`; public `runNow` remains boolean
- missing, non-`.luie`, invalid relative path, and missing-project attachment `null` cleanly skip
- skip clears dirty state without failure stat, export engine call, or exported revision mark
- manual-save callers receive local-save success; a later valid attachment and schedule exports normally
- timeout followed by late throw retains dirty and retries on the next flush
- real `before-quit` wiring covers cancel/re-entry, hard retry success, explicit skip, and hard failure/timeout cancel
- Focused: 5 files/34 tests PASS
- Task 8~14 regression: 17 files/109 tests PASS
- Electron-as-Node recovery: 2 files/2 tests PASS
- Target ESLint and diff-check: PASS
- Typecheck: follow-up errors 0; only the known user dirty baseline remains
