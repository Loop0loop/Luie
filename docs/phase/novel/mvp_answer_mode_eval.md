# MVP Answer Mode Eval v1

Purpose: verify Luie separates evidence-backed manuscript answers from insufficient-evidence refusals and general writing advice.

This is not a real writer beta.

## Modes

| Mode | Expected behavior |
| --- | --- |
| `EVIDENCE` | Answer from retrieved manuscript/context evidence. Include source evidence. |
| `INSUFFICIENT` | Do not invent canon. Say the manuscript evidence is insufficient or not confirmed. |
| `ADVISORY` | Give general writing advice, explicitly labeled as advice rather than manuscript fact. |

## Dataset

Files:

- `novel/modern_fantasy/eval/answer_mode_v1.jsonl`
- `novel/romance_fantasy/eval/answer_mode_v1.jsonl`
- `novel/murim/eval/answer_mode_v1.jsonl`
- `novel/occult_mystery/eval/answer_mode_v1.jsonl`

Distribution:

```text
4 genres * 8 cases = 32 cases
EVIDENCE: 12
INSUFFICIENT: 12
ADVISORY: 8
```

## Pass Criteria

- `EVIDENCE` answers cite actual project evidence.
- `INSUFFICIENT` answers do not invent canon and do not over-answer.
- `ADVISORY` answers do not pretend to be canon or manuscript evidence.
- The answer mode must be explicit.

## Product Meaning

This eval prevents two bad extremes:

1. Too strict: every non-evidence question becomes "근거 없음".
2. Too loose: general advice gets mixed into canon answers.

Correct behavior:

```text
근거 질문은 근거 안에서만 답한다.
근거가 없으면 미확정이라고 한다.
일반 조언은 제공하되, 정사처럼 말하지 않는다.
```

## Validation

Generated on 2026-06-30:

```text
modern_fantasy: 8
romance_fantasy: 8
murim: 8
occult_mystery: 8
total: 32
EVIDENCE: 12
INSUFFICIENT: 12
ADVISORY: 8
answer_mode_v1 validation ok
```

Validation checks:

- JSONL parse
- genre match
- `answerMode === expectedMode`
- mode is one of `EVIDENCE`, `INSUFFICIENT`, `ADVISORY`
- `EVIDENCE` rows include real source quotes
- non-`EVIDENCE` rows carry no gold evidence in v1

Next connection point:

```text
wire answerMode into the eval runner/prompt layer only after this dataset shape is stable.
```
