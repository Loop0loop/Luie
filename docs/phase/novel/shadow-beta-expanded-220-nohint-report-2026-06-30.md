# Shadow Beta Expanded No-Hint Eval

Generated: 2026-06-30

## Verdict

PASS_FOR_GENRE_SCOPED_REHEARSAL

The 6-15 expansion cases are healthy. The remaining weakness is cross-genre retrieval scope when all genres are mixed in one project.

Still not real beta data.

- realBetaConfirmed: false
- canFinalizeThresholds: false
- threshold replacement: NOT ALLOWED

## Correction

Earlier shorthand said "70-case eval". The repository actually has 50 eval cases per genre.

Actual combined size:

- existing: 200 cases
- expansion: 20 cases
- total: 220 cases

## Combined 220-Case No-Hint Run

Run output:

- `tests/.tmp/shadow-beta-expanded-220-nohint-run-001.json`

Result:

```text
caseCount: 220
averageContextRecallAtK: 0.6591
totalP0FailureCount: 0
```

Split:

```text
base:      n=200, avg=0.625, p0=0, miss=75
expansion: n=20,  avg=1.000, p0=0, miss=0
```

Interpretation:

- The new expansion cases did not degrade retrieval.
- The low combined score comes from existing base cases competing across all four genres and 15-chapter source material.
- This is a genre/scope contamination signal, not a 6-15 expansion failure.

## Genre-Scoped 55-Case Runs

Each genre was run as its own no-hint project:

```text
modern_fantasy:  all=0.855, p0=0, miss=8, base=0.840, exp=1.000
romance_fantasy: all=0.891, p0=0, miss=6, base=0.880, exp=1.000
murim:           all=0.945, p0=0, miss=3, base=0.940, exp=1.000
occult_mystery:  all=0.927, p0=0, miss=4, base=0.920, exp=1.000
```

Interpretation:

- Genre-scoped rehearsal is healthy.
- Expansion cases are all hit in every genre.
- Remaining misses are mostly old base cases with short alias/setting questions or repeated template variants.

## Remaining Miss Pattern

Examples:

- modern_fantasy:
  - Taeo alias question
  - app auto-writing discarded setting
  - chapter-knowledge variants around Taeo and the phone
- romance_fantasy:
  - Kael regressor trap
  - chapter 4 confession/relationship ambiguity
- murim:
  - Baekrin traitor trap
  - warehouse ultimate-manual vs failure-record trap
- occult_mystery:
  - Han Seoyun alias question
  - mirror-death discarded setting
  - third announcement over-certainty trap

## Cleanup

Tightened one expansion question:

- `murim.expansion.relationship_check.011`
- changed from "악역으로 가도 돼?" to "악역 확정으로 써도 돼?"

Reason:

- Gemini warned on the softer wording because it allowed "possibility" language.
- The intended benchmark behavior is "악역 확정 금지".

## Next Minimal Step

Do not rewrite the 6-15 expansion.

Next useful work:

1. Add genre/project scope filtering to the retrieval/eval path, or run Phase 7 rehearsal genre-scoped.
2. If combined-project rehearsal is required, add a genre metadata filter before retrieval.
3. Only after that, expand eval beyond the current 220 cases.
