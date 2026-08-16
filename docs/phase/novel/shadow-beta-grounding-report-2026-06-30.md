# Shadow Beta Grounding/Faithfulness Report

Date: 2026-06-30

## Scope

This report checks the current Phase 7 Shadow Beta no-hint eval runs.

Important limitation: the current headless eval answer is the assembled RAG evidence section, not a generated prose answer. Therefore this is a grounding proxy check, not a full LLM faithfulness evaluation.

## Latest Runs

| Genre | Run File | Cases | Recall@5 | P0 Failures | Evidence Labels In Answer | Retrieved Chunk IDs In Answer |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| modern_fantasy | `shadow-beta-modern-fantasy-nohint-eval-run-004.json` | 50 | 0.96 | 0 | 100% | 100% |
| romance_fantasy | `shadow-beta-romance-fantasy-nohint-eval-run-004.json` | 50 | 0.94 | 0 | 100% | 100% |
| murim | `shadow-beta-murim-nohint-eval-run-003.json` | 50 | 0.98 | 0 | 100% | 100% |
| occult_mystery | `shadow-beta-occult-mystery-nohint-eval-run-003.json` | 50 | 1.00 | 0 | 100% | 100% |

## Task Recall

| Genre | setting_check | relationship_check | foreshadowing_status | chapter_knowledge_state | draft_canon_conflict |
| --- | ---: | ---: | ---: | ---: | ---: |
| modern_fantasy | 1.00 | 0.90 | 1.00 | 0.90 | 1.00 |
| romance_fantasy | 1.00 | 0.80 | 1.00 | 0.90 | 1.00 |
| murim | 1.00 | 0.90 | 1.00 | 1.00 | 1.00 |
| occult_mystery | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |

## Grounding Proxy Judgment

The current eval path is grounded by construction:

- The answer text is produced from `buildLayer3Evidence(...)`.
- The output includes `[E#]` evidence labels.
- Every eval result includes retrieved chunk IDs in the answer section.
- No P0 failures were observed in the latest no-hint set.

This means the current run can validate retrieval grounding and context recall. It cannot yet validate whether a later LLM-generated answer faithfully summarizes the evidence.

## Remaining Work

The next useful test is a real answer-generation faithfulness pass:

1. Generate short writer-facing answers from the retrieved evidence.
2. Check whether each answer is supported by retrieved quotes.
3. Flag unsupported claims, over-certainty, and future-information leakage.
4. Keep this separate from threshold finalization.

No additional novel data is required for that step.

