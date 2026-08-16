# Phase 7 Shadow Beta Hard Set v1 Results

Date: 2026-06-30

Status: rehearsal evidence only. Not real beta. Not allowed for threshold finalization.

## What Changed

- Added `hard_set_v1.jsonl` for all four genres.
- Total hard cases: 20
  - `modern_fantasy`: 5
  - `romance_fantasy`: 5
  - `murim`: 5
  - `occult_mystery`: 5
- Hard cases are separate from the existing 220-case shadow beta set.
- Hard cases target indirect author dilemmas instead of easy direct quote lookup.
- Built a temporary hard-set root at `tests/.tmp/shadow-beta-hard-v1-root`.
- Seeded/imported the hard set as project `shadow-beta-hard-v1-nohint` with `--no-index-hints`.

## Code Fixes Made During Hard-Set Run

- `scripts/import-shadow-beta-novel-eval-cases.ts`
  - Allows empty `feedback_seed.jsonl` by skipping `memoryEvalFeedback` insert when there are zero feedback rows.
  - Reason: hard-set retrieval QA does not need feedback rows.
- `scripts/run-shadow-beta-gemini-faithfulness.ts`
  - Increased Gemini answer token budget from 640 to 2048.
  - Increased Gemini judge token budget from 512 to 1024.
  - Strengthened judge prompt to forbid fenced markdown JSON.
  - Reason: Gemini answers/judge JSON were being truncated with smaller budgets.

## Validation

Hard-set file validation:

- JSONL parse: PASS
- Row count: PASS, 20 total
- Quote existence in manuscript/writer files: PASS
- Evidence chapter <= `allowedUntilChapter`: PASS
- Evidence chapter <= `mustNotUseAfterChapter`: PASS

## Retrieval Run

Command shape:

```bash
pnpm tsx scripts/run-memory-eval-suite.ts \
  --project-id shadow-beta-hard-v1-nohint \
  --label shadow-beta:hard-v1:nohint:genre-chapter-scope:run-001 \
  --top-k 5 \
  --optimization-mode quality \
  --shadow-beta-genre-scope \
  --shadow-beta-chapter-scope \
  --out tests/.tmp/shadow-beta-hard-v1-nohint-genre-chapter-scope-run-001.json
```

Result:

```json
{
  "caseCount": 20,
  "averageContextRecallAtK": 0.85,
  "totalP0FailureCount": 0
}
```

Genre breakdown:

| Genre | Cases | Avg Recall@5 | P0 Failures | Notes |
| --- | ---: | ---: | ---: | --- |
| modern_fantasy | 5 | 0.60 | 0 | Two hard cases missed top-5 evidence. |
| romance_fantasy | 5 | 1.00 | 0 | Retrieval is strong, possibly still too easy. |
| murim | 5 | 0.80 | 0 | One relationship dilemma missed top-5 evidence. |
| occult_mystery | 5 | 1.00 | 0 | Retrieval is strong, possibly still too easy. |

Top-5 misses:

| Case | Issue |
| --- | --- |
| `modern_fantasy.hard_v1.relationship_check.014` | Relevant chapter appeared below top-5, so writer relationship nuance is not reliably retrieved. |
| `modern_fantasy.hard_v1.foreshadowing_status.015` | Ambiguous origin/evidence question did not bring target evidence into top-5. |
| `murim.hard_v1.relationship_check.009` | Relationship-direction dilemma depends on 9화 nuance, but early training chapters dominated retrieval. |

Interpretation:

- This is the first useful anti-bubble signal.
- The old 220-case set still looks too scaffolded/easy.
- Hard v1 is better because it exposes ranking failures without creating P0 future-leak failures.
- Retrieval quality is not bad, but modern_fantasy relationship/foreshadowing and murim relationship queries need improved semantic matching or better evidence distribution.

## Gemini Faithfulness Run

Initial issue:

- `gemini-2.0-flash` and `gemini-2.5-flash-lite` hit model-format/API errors.
- `gemini-2.5-flash` and `gemini-3.5-flash` worked, but small token budgets caused truncated Korean answers and incomplete judge JSON.
- After increasing token budgets, `gemini-3.5-flash` produced stable output.

Command shape:

```bash
pnpm tsx scripts/run-shadow-beta-gemini-faithfulness.ts \
  --input tests/.tmp/shadow-beta-hard-v1-nohint-genre-chapter-scope-run-001.json \
  --out tests/.tmp/shadow-beta-hard-v1-gemini-faithfulness-run-001.json \
  --project-id shadow-beta-hard-v1-gemini \
  --limit 20 \
  --model gemini-3.5-flash
```

Result:

```json
{
  "cases": 20,
  "pass": 19,
  "warn": 1,
  "fail": 0
}
```

Warning case:

- `modern_fantasy.hard_v1.relationship_check.014`
- Retrieval missed top-5 target evidence, but broader context still let Gemini answer reasonably.
- This should not be counted as pure retrieval success.

Interpretation:

- Gemini answer faithfulness is good when evidence is present.
- This does not prove the Memory Engine is solved.
- Retrieval and answer faithfulness must remain separate metrics.
- Gemini judge itself needed calibration; earlier truncated output would have produced false warnings.

## Verification Commands

Passed:

```bash
pnpm vitest tests/main/services/ragShadowBetaChapterScope.test.ts \
  tests/scripts/memoryRunEvalSuiteRunner.test.ts \
  tests/main/services/memory/eval/memoryEvalRunner.test.ts \
  --reporter=verbose \
  --no-file-parallelism
```

Result:

```text
3 test files passed
9 tests passed
```

Passed:

```bash
pnpm run typecheck
```

Result:

```text
tsc6 --noEmit
```

## Current QA Scorecard

| Area | Score | Reason |
| --- | ---: | --- |
| Dataset structure | 8/10 | Good enough for rehearsal; hard set separate from 220 easy cases. |
| Evidence validity | 9/10 | Quotes and chapter bounds validated. |
| Retrieval realism | 7/10 | Hard set finally exposes misses; still too few cases. |
| Chapter-scope safety | 8/10 | P0 leakage guard patched and tested, including parent windows. |
| LLM faithfulness | 7/10 | Good after token fix, but judge depends on Gemini and prompt stability. |
| Anti-bubble confidence | 6/10 | Better than before, but only 20 hard cases. Needs larger hard/negative set. |

## Next Priorities

1. Expand hard set from 20 to 80 cases.
   - 20 per genre.
   - Keep `--no-index-hints`.
   - Require indirect evidence, not answer-sentence quotes.

2. Add negative/abstention cases.
   - Questions with no sufficient evidence.
   - Expected behavior: say not confirmed, not invent.

3. Split metrics in reports.
   - Retrieval recall@5.
   - P0 future leakage.
   - Answer faithfulness.
   - Abstention correctness.
   - Writer usefulness.

4. Improve retrieval for relationship and foreshadowing dilemmas.
   - Modern fantasy relationship/foreshadowing misses.
   - Murim relationship-direction miss.

5. Re-run external anti-bubble review after hard 80.
   - Ask agents to attack the benchmark, not validate it.
   - Require them to identify easy-answer leakage, repeated evidence, and judge bias.

## Bottom Line

The Memory Engine is no longer just passing a friendly test. The hard v1 set exposed real ranking misses while preserving chapter/genre scope safety. That is useful.

But this is still rehearsal. The correct status is:

```text
Phase 7 shadow rehearsal: progressing
Memory retrieval on easy 220: pass
Memory retrieval on hard 20: partial pass, 0.85 recall@5
Gemini faithfulness on hard 20: 19 pass / 1 warn after token calibration
Real beta threshold replacement: NOT ALLOWED
```

## Hard 80 Follow-Up

Added `hard_set_v1_extra.jsonl` for each genre.

Total hard cases now available:

| Genre | Base v1 | Extra | Total |
| --- | ---: | ---: | ---: |
| modern_fantasy | 5 | 15 | 20 |
| romance_fantasy | 5 | 15 | 20 |
| murim | 5 | 15 | 20 |
| occult_mystery | 5 | 15 | 20 |
| Total | 20 | 60 | 80 |

Validation:

```text
total 80
validation ok
```

Seed/import:

```text
projectId: shadow-beta-hard80-nohint
chunks: 100
cases: 80
evidence: 115
feedback: 0
```

Retrieval command shape:

```bash
pnpm tsx scripts/run-memory-eval-suite.ts \
  --project-id shadow-beta-hard80-nohint \
  --label shadow-beta:hard80:nohint:genre-chapter-scope:run-001 \
  --top-k 5 \
  --optimization-mode quality \
  --shadow-beta-genre-scope \
  --shadow-beta-chapter-scope \
  --out tests/.tmp/shadow-beta-hard80-nohint-genre-chapter-scope-run-001.json
```

Retrieval result:

```json
{
  "caseCount": 80,
  "averageContextRecallAtK": 0.9375,
  "totalP0FailureCount": 0
}
```

Genre breakdown:

| Genre | Cases | Avg Recall@5 | P0 Failures | Misses |
| --- | ---: | ---: | ---: | ---: |
| modern_fantasy | 20 | 0.850 | 0 | 3 |
| romance_fantasy | 20 | 1.000 | 0 | 0 |
| murim | 20 | 0.900 | 0 | 2 |
| occult_mystery | 20 | 1.000 | 0 | 0 |

Top-5 misses:

| Case | Meaning |
| --- | --- |
| `modern_fantasy.hard_v1.relationship_check.014` | Relationship nuance still hard to rank. |
| `modern_fantasy.hard_v1.foreshadowing_status.015` | App/report origin ambiguity still hard to rank. |
| `modern_fantasy.hard_v1_extra.foreshadowing_status.006b` | Ominous report prop is too indirect for top-5. |
| `murim.hard_v1.relationship_check.009` | Saje relationship-direction dilemma still hard to rank. |
| `murim.hard_v1_extra.setting_check.015b` | 백린's growth/old-label conflict misses target evidence. |

Miss-only Gemini check:

```bash
pnpm tsx scripts/run-shadow-beta-gemini-faithfulness.ts \
  --input tests/.tmp/shadow-beta-hard80-misses-only.json \
  --out tests/.tmp/shadow-beta-hard80-misses-gemini-faithfulness-run-001.json \
  --project-id shadow-beta-hard80-misses-gemini \
  --limit 5 \
  --model gemini-3.5-flash
```

Result:

```json
{
  "cases": 5,
  "pass": 3,
  "warn": 2,
  "fail": 0
}
```

Interpretation:

- Hard80 is useful, but still too friendly in `romance_fantasy` and `occult_mystery`.
- Modern fantasy and murim are the only genres currently exposing ranking weakness.
- Miss-only Gemini can still answer many cases from nearby context, so faithfulness cannot be used as a replacement for retrieval recall.
- Next hard set should add abstention/no-evidence cases. Current hard80 mostly tests "find the right supporting evidence", not "refuse when evidence is insufficient".
