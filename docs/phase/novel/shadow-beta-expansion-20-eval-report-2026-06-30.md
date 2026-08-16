# Shadow Beta 6-15 Expansion Eval Smoke

Generated: 2026-06-30

## Verdict

PASS_WITH_ONE_WARN

The 20-case expansion set is ready for the next Phase 7 rehearsal step.

Still not real beta data.

- realBetaConfirmed: false
- canFinalizeThresholds: false
- threshold replacement: NOT ALLOWED

## Inputs

Expansion eval files:

- `novel/modern_fantasy/eval/chapter_06_15_eval_expansion.jsonl`
- `novel/romance_fantasy/eval/chapter_06_15_eval_expansion.jsonl`
- `novel/murim/eval/chapter_06_15_eval_expansion.jsonl`
- `novel/occult_mystery/eval/chapter_06_15_eval_expansion.jsonl`

Total cases: 20

## Static Checks

- JSONL parse: OK
- goldEvidence quote exists in source files: OK
- goldEvidence chapter <= allowedUntilChapter: OK
- existing pack validator: OK

## No-Hint Retrieval

Project: `shadow-beta-expansion-20-nohint`

Run output:

- `tests/.tmp/shadow-beta-expansion-20-nohint-run-002.json`

Result:

```text
caseCount: 20
averageContextRecallAtK: 1.0
totalP0FailureCount: 0
```

Genre split:

```text
modern_fantasy: 1.000, p0=0, n=5
murim: 1.000, p0=0, n=5
occult_mystery: 1.000, p0=0, n=5
romance_fantasy: 1.000, p0=0, n=5
```

Note:

- First run had 2 misses caused by under-specified questions.
- Fixed only those two question phrasings.
- No manuscript rewrites were needed.

## Gemini Faithfulness

Run output:

- `tests/.tmp/shadow-beta-expansion-20-gemini-faithfulness-run-001.json`

Result:

```text
cases: 20
pass: 19
warn: 1
fail: 0
```

Warn case:

- `murim.expansion.relationship_check.011`
- Question: `문소하가 백린 다치게 할 뻔했으니까 악역으로 가도 돼?`
- Reason: Gemini answered that villain direction is possible but not confirmed. This is acceptable as warning-level phrasing, but the gold answer should prefer "악역 확정 아님" more strongly.

## Next Minimal Step

Do not expand to hundreds of cases yet.

Next:

1. Tighten the one warning case prompt/expectedAnswer if needed.
2. Merge these 20 cases into the normal eval import path only after deciding whether expansion cases should become permanent benchmark rows.
3. Then run combined 70-case no-hint eval: existing 50 + expansion 20.
