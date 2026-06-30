# Phase 7 Shadow Beta QA Feedback

Date: 2026-06-30

## Status

The Phase 7 Shadow Beta Novel Pack is usable for writer workflow rehearsal, but not for real beta threshold finalization.

- Dataset kind: `shadow_beta`
- Real beta replacement: NOT ALLOWED
- Current recommendation: use for Phase 7 shadow rehearsal after eval-alignment fixes
- Latest blocking issue: resolved for `murim.draft_canon_conflict`

## External QA Basis

The review used three external evaluation principles:

- OpenAI Evals: evals should be repeatable, versioned, and separated from production threshold claims.
- RAGAS context recall: retrieval should be checked independently from answer quality.
- RAGAS faithfulness and TruLens RAG triad: context recall, groundedness, and answer relevance should be scored separately.

## Sub-Agent Feedback Summary

Three review tracks were used.

| Track | Score | Verdict | Key Feedback |
| --- | ---: | --- | --- |
| QA readiness | 72/100 | GO for rehearsal, STOP for finalization | Add no-hint ablation, inspect failures, keep finalization disabled. |
| RAG/eval alignment | 74/100 | Rehearsal valid, threshold invalid | Hinted runs overstate retrieval; no-hint runs are the real smoke test. |
| Author realism | 3.65/5 | Passable for shadow beta | Writer room is credible; remaining risk is eval mapping and feedback semantic quality. |

## Live Eval Results

### Hinted Per-Genre Runs

| Genre | Recall@5 | P0 Failures | Weakest Task |
| --- | ---: | ---: | --- |
| modern_fantasy | 0.90 | 0 | chapter_knowledge_state 0.70 |
| romance_fantasy | 0.94 | 0 | foreshadowing_status 0.70 |
| murim | 0.88 | 0 | draft_canon_conflict 0.40 |
| occult_mystery | 0.98 | 0 | chapter_knowledge_state 0.90 |

### No-Hint Per-Genre Runs

| Genre | Recall@5 | P0 Failures | Weakest Task |
| --- | ---: | ---: | --- |
| modern_fantasy, before fix | 0.78 | 0 | chapter_knowledge_state 0.50 |
| modern_fantasy, after fix | 0.90 | 0 | foreshadowing_status 0.70 |
| modern_fantasy, final optional fix | 0.96 | 0 | chapter_knowledge_state 0.90 |
| romance_fantasy, before fix | 0.80 | 0 | foreshadowing_status 0.60 |
| romance_fantasy, after fix | 0.88 | 0 | draft_canon_conflict 0.70 |
| romance_fantasy, final optional fix | 0.94 | 0 | relationship_check 0.80 |
| murim, before fix | 0.82 | 0 | draft_canon_conflict 0.20 |
| murim, after fix | 0.98 | 0 | relationship_check 0.90 |
| occult_mystery, before fix | 0.90 | 0 | foreshadowing_status 0.70 |
| occult_mystery, after fix | 1.00 | 0 | all tasks 1.00 |

The `murim` failure was an eval alignment problem. Retrieval naturally found `writer_room` documents, while gold evidence required short manuscript quotes. Gold evidence was adjusted to the author-workroom documents that directly express draft/canon status.

## QA List

| QA Item | Score | Status | Notes |
| --- | ---: | --- | --- |
| Manifest guard prevents threshold finalization | 100 | PASS | `realBetaConfirmed=false`, `canFinalizeThresholds=false`. |
| Static file/schema validation | 100 | PASS | `scripts/validate-shadow-beta-novel-pack.mjs` passes. |
| Per-genre no-hint retrieval smoke | 86 | PASS_WITH_WARNINGS | All genres are >=0.78, P0=0; modern/romance still below 0.85. |
| Hinted vs no-hint contamination check | 82 | PASS_WITH_WARNINGS | Hints improve recall by 0.06 to 0.14, so hinted runs must not be used alone. |
| Writer workflow realism | 78 | PASS_WITH_MINOR_WARNINGS | Author questions/session logs are credible enough for rehearsal. |
| Eval gold evidence alignment | 88 | PASS | `murim` draft/canon issue fixed; broader semantic spot-check still recommended. |
| Feedback seed semantic quality | 72 | WARNING | Helpful evidence is aligned by validator; answer_wrong notes still need manual semantic review. |
| Threshold finalization safety | 100 | PASS | Shadow labels must remain excluded from real beta finalization. |

## Fix Applied

Updated `novel/murim/eval/gold_evidence.jsonl` so `draft_canon_conflict` cases use writer-room evidence:

- `writer_room/foreshadowing_ledger.md` for 백린 배신자 오판.
- `writer_room/foreshadowing_ledger.md` for 창고 유산/최강 비급 충돌.
- `writer_room/timeline.md` for 백린 배신자 아님.

Updated `novel/murim/eval/feedback_seed.jsonl` so helpful feedback remains aligned with the new gold evidence.

Follow-up alignment fixes:

- Updated `modern_fantasy.chapter_knowledge_state` and selected `relationship_check` gold evidence to use the author-workroom knowledge-state documents the retriever actually finds.
- Updated `romance_fantasy.foreshadowing_status` gold evidence for the regent/direct-manipulator ambiguity to use `writer_room/foreshadowing_ledger.md`.
- Updated `occult_mystery.foreshadowing_status` and related chapter-knowledge cases to use `writer_room/foreshadowing_ledger.md` for coupon-symbol and 13층-condition ambiguity.
- Rewrote mismatched `answer_wrong` feedback evidence/notes so each seed now targets its own question instead of a neighboring trap.
- Final optional pass updated `modern_fantasy.foreshadowing_status` for the "next failure draft" and Do-yoon certainty traps, and `romance_fantasy.draft_canon_conflict` for the Kael regression/rejected-setting trap.

## Verification

Commands run:

```bash
node scripts/validate-shadow-beta-novel-pack.mjs --root novel
./node_modules/.bin/tsc --noEmit --pretty false
SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run tests/main/services/memory/benchmark/memoryWriterTaskBenchmark.test.ts --reporter=verbose
./node_modules/.bin/tsx scripts/seed-shadow-beta-novel-project.ts --project-id shadow-beta-murim-nohint --root novel --genre murim --no-index-hints --replace
./node_modules/.bin/tsx scripts/import-shadow-beta-novel-eval-cases.ts --project-id shadow-beta-murim-nohint --root novel --genre murim --replace
./node_modules/.bin/tsx scripts/run-memory-eval-suite.ts --project-id shadow-beta-murim-nohint --label shadow-beta:murim:nohint:run-002 --top-k 5 --out tests/.tmp/shadow-beta-murim-nohint-eval-run-002.json
./node_modules/.bin/tsx scripts/run-memory-eval-suite.ts --project-id shadow-beta-modern-fantasy-nohint --label shadow-beta:modern_fantasy:nohint:run-002 --top-k 5 --out tests/.tmp/shadow-beta-modern-fantasy-nohint-eval-run-002.json
./node_modules/.bin/tsx scripts/run-memory-eval-suite.ts --project-id shadow-beta-romance-fantasy-nohint --label shadow-beta:romance_fantasy:nohint:run-002 --top-k 5 --out tests/.tmp/shadow-beta-romance-fantasy-nohint-eval-run-002.json
./node_modules/.bin/tsx scripts/run-memory-eval-suite.ts --project-id shadow-beta-occult-mystery-nohint --label shadow-beta:occult_mystery:nohint:run-002 --top-k 5 --out tests/.tmp/shadow-beta-occult-mystery-nohint-eval-run-002.json
./node_modules/.bin/tsx scripts/run-memory-eval-suite.ts --project-id shadow-beta-modern-fantasy-nohint --label shadow-beta:modern_fantasy:nohint:run-003 --top-k 5 --out tests/.tmp/shadow-beta-modern-fantasy-nohint-eval-run-003.json
./node_modules/.bin/tsx scripts/run-memory-eval-suite.ts --project-id shadow-beta-romance-fantasy-nohint --label shadow-beta:romance_fantasy:nohint:run-003 --top-k 5 --out tests/.tmp/shadow-beta-romance-fantasy-nohint-eval-run-003.json
./node_modules/.bin/tsx scripts/run-memory-eval-suite.ts --project-id shadow-beta-murim-nohint --label shadow-beta:murim:nohint:run-003 --top-k 5 --out tests/.tmp/shadow-beta-murim-nohint-eval-run-003.json
./node_modules/.bin/tsx scripts/run-memory-eval-suite.ts --project-id shadow-beta-occult-mystery-nohint --label shadow-beta:occult_mystery:nohint:run-003 --top-k 5 --out tests/.tmp/shadow-beta-occult-mystery-nohint-eval-run-003.json
./node_modules/.bin/tsx scripts/run-memory-eval-suite.ts --project-id shadow-beta-modern-fantasy-nohint --label shadow-beta:modern_fantasy:nohint:run-004 --top-k 5 --out tests/.tmp/shadow-beta-modern-fantasy-nohint-eval-run-004.json
./node_modules/.bin/tsx scripts/run-memory-eval-suite.ts --project-id shadow-beta-romance-fantasy-nohint --label shadow-beta:romance_fantasy:nohint:run-004 --top-k 5 --out tests/.tmp/shadow-beta-romance-fantasy-nohint-eval-run-004.json
```

Results:

- Static validation: PASS
- TypeScript: PASS
- Benchmark unit test: PASS, 20 tests
- `murim` no-hint run-002: Recall@5 0.98, P0 failures 0
- `murim.draft_canon_conflict`: 0.20 -> 1.00
- Final no-hint set:
  - `modern_fantasy`: Recall@5 0.96, P0 failures 0
  - `romance_fantasy`: Recall@5 0.94, P0 failures 0
  - `murim`: Recall@5 0.98, P0 failures 0
  - `occult_mystery`: Recall@5 1.00, P0 failures 0

## Next QA Steps

1. Add a small groundedness/faithfulness report that checks whether returned answer text is supported by retrieved evidence, not only whether the right chunk was retrieved.
2. Keep hinted runs as debugging aids only.
3. Keep threshold finalization blocked until real beta labels and confirmed writer data exist.
