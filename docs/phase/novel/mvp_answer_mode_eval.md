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

Dataset validation on 2026-06-30:

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
wire answerMode into the product answer UI only after this runner stays stable.
```

## Gemini Smoke Runs

Runner:

```text
scripts/run-answer-mode-eval.ts
```

Run 001:

```text
model: gemini-3.5-flash
cases: 32
pass: 31
fail: 1
output: tests/.tmp/answer-mode-v1-run-001.json
```

Failure:

```text
case: murim.answer_mode_v1.evidence.002
question: 백린이 물러나는 건 겁이 많아서야?
expected: EVIDENCE
actual: INSUFFICIENT
```

Diagnosis:

```text
The failure exposed weak gold evidence, not a clear model failure.
The original quote said 백린's hearing is a strength and the delay is a training issue,
but it did not directly include the "not fear" contrast asked by the question.
```

Fix:

```text
Added the direct manuscript quote from novel/murim/manuscript/murim_007.txt:
"겁나서 멈춘 게 아닙니다." 류진이 말했다. "숨을 너무 오래 붙잡아서 발이 늦는 겁니다."
```

Run 002:

```text
model: gemini-3.5-flash
cases: 32
pass: 32
fail: 0
output: tests/.tmp/answer-mode-v1-run-002.json
```

Meaning:

```text
This proves the answer-mode leash can be tested in a small controlled harness:
EVIDENCE answers stay evidence-backed,
INSUFFICIENT answers abstain,
ADVISORY answers remain advice rather than canon.

It does not prove real writer fit or production threshold readiness.
```

## Current Status

```text
answer_mode_v1 dataset: ready for MVP harness use
Gemini answer-mode smoke: passed 32/32 after evidence alignment fix
real beta replacement: NOT ALLOWED
next risk: product UI must expose mode, evidence, and uncertainty clearly
```
