# Shadow Beta Bubble Breaker Priorities

Date: 2026-06-30

## Current Position

The current Phase 7 shadow beta work is useful as a rehearsal harness.

It is not yet proof that Luie solves real writer memory problems.

Safe statement:

```text
Luie can retrieve many of the evidence points intentionally planted in the current shadow beta dataset, with genre and chapter scope enabled.
```

Unsafe statement:

```text
Luie's Memory Engine is proven on real long-form writer workflow.
```

## Bubble Verdict

Three independent sub-agent audits returned `BUBBLE`.

Main reasons:

- Expansion eval cases are too easy; some gold quotes contain the answer too directly.
- The 220 cases likely overstate the number of independent writer dilemmas.
- `P0 = 0` is too weak because unsupported answers and future leakage are not fully scored as hard failures.
- Gemini faithfulness samples were not representative enough.
- Chapter scope is currently based on shadow-beta chunk-id strings, not durable metadata.
- `parentWindow` can re-expand context without the same chapter scope.

## Saved Priority Order

### P0. Fix Scope Correctness Before More Claims

Do this before adding more data or celebrating metrics.

1. Apply the same chapter scope to `parentWindow` retrieval.
2. If `--shadow-beta-chapter-scope` is enabled and `queryChapterOrder` is missing, fail fast.
3. Add a regression test where a scoped chunk's parent window would otherwise pull a future chunk.

Reason:

Retrieval scope is a trust boundary. If scope leaks, every downstream answer metric is suspect.

### P1. Replace Easy-Mode Eval With Hard-Mode Eval

Do not rewrite the whole dataset yet.

Add a separate hard set first.

Rules:

- Gold evidence must not contain the exact expected answer sentence.
- Use indirect evidence from scenes, dialogue, actions, and revision residue.
- Include cases where the correct answer is `not confirmed`.
- Include cases where retrieved evidence is insufficient and the answer must abstain.
- Count clustered variants as one dilemma family, not many independent wins.

Minimum target:

```text
hard_set_v1:
  20 cases total
  5 per genre
  no direct-answer gold quote
  all chapter-scoped
```

### P2. Split Retrieval Metrics From Answer Metrics

Current recall is not enough.

Track these separately:

- context recall: did we retrieve required evidence?
- context precision: did irrelevant evidence rank above relevant evidence?
- faithfulness: did the answer stay inside evidence?
- answer correctness: did it answer the actual question?
- polarity correctness: did Korean confirmation questions get the yes/no direction right?
- abstention correctness: did it refuse to confirm when evidence is insufficient?
- writer usefulness: can the author act on the answer?

### P3. Make Gemini/Judge Evaluation Less Self-Deceptive

Current sample runs are useful smoke tests, not final QA.

Fix:

- Use balanced samples by genre and task type.
- Stop slicing the first N cases.
- Run repeated samples or fixed seeds to measure variance.
- Treat malformed judge JSON as `invalid`, not `warn`.
- Score `맞지/아니지/돼?` polarity separately from faithfulness.
- Remove generic `됩니다/안 됩니다` forcing unless the question form supports it.

### P4. Add Writer-Room Memory Without Future Leakage

Current chapter scope excludes writer_room because it is seeded as chapter 0 and contains future information.

Do not re-enable writer_room wholesale.

Instead:

- create chapter-scoped cue cards;
- include `workId`, `chapterOrder`, `canonLayer`, `anchorType`;
- keep original manuscript/note as value;
- add short cue/abstraction only as retrieval key;
- never let a cue include facts after `allowedUntilChapter`.

### P5. Bring In Blind External Writer Questions

Shadow beta can only test the traps we imagined.

Before claiming realism, add:

```text
30-50 blind writer-like questions
```

They should be written after reading the manuscript/workroom package, not generated from eval metadata.

## External Research Notes

### RAG Evaluation

RAGAS separates retrieval and generation quality. Its context precision metric evaluates whether relevant chunks are ranked above irrelevant chunks, and its faithfulness metric evaluates whether the answer is supported by retrieved contexts.

Source:

- https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_precision/
- https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/

LlamaIndex also separates response evaluation from retrieval evaluation. It lists correctness, semantic similarity, faithfulness, context relevancy, answer relevancy, and guideline adherence for response evaluation, while retrieval evaluation uses ranking-style metrics such as MRR, hit-rate, and precision.

Source:

- https://developers.llamaindex.ai/python/framework/module_guides/evaluating/

LangSmith treats evaluation as a dataset + evaluator + experiment loop, with human, code-rule, LLM-as-judge, and pairwise evaluators. It also emphasizes feeding failing production traces back into datasets.

Source:

- https://docs.langchain.com/langsmith/evaluation

ARES argues that automated RAG eval still benefits from a small set of human annotations through prediction-powered inference.

Source:

- https://arxiv.org/abs/2311.09476

RAGChecker-style work argues for fine-grained diagnostics across retrieval and generation rather than one aggregate pass number.

Source:

- https://arxiv.org/abs/2408.08067

### Long-Term Memory Evaluation

LongMemEval evaluates long-term memory with distinct abilities: information extraction, multi-session reasoning, temporal reasoning, knowledge updates, and abstention.

Source:

- https://arxiv.org/abs/2410.10813

LongMemEval-V2 frames memory as context gathering: systems consume long histories and return compact evidence. This is close to Luie's desired writer memory behavior.

Source:

- https://arxiv.org/abs/2605.12493

Zep uses a temporal knowledge graph architecture for agent memory and reports stronger temporal memory performance than static RAG-style retrieval.

Source:

- https://arxiv.org/abs/2501.13956

MemGPT frames long-context memory as virtual context management with memory tiers.

Source:

- https://arxiv.org/abs/2310.08560

Recent memory-system work argues that long-term memory correctness is about how memory state evolves, not just whether individual records are retrieved.

Source:

- https://arxiv.org/abs/2605.26252

### Design Implication For Luie

External systems converge on the same lesson:

```text
Do not trust one pass number.
Separate retrieval, grounding, temporal scope, update/conflict handling, abstention, and user usefulness.
```

For Luie, the next valid path is:

```text
scope correctness -> hard eval set -> separated metrics -> cue-card writer_room -> blind writer questions
```

not:

```text
more generated cases -> bigger pass number -> claim Memory Engine works
```
