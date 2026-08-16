# Shadow Beta Gemini Faithfulness Smoke Report

Date: 2026-06-30

## Scope

This pass uses Gemini as the temporary answer generator and judge. Local LLM is not used.

The test reads the latest no-hint retrieval runs, asks Gemini to produce short writer-facing answers from the retrieved evidence, then asks Gemini to judge whether the generated answer is supported by that evidence.

## Script

```bash
./node_modules/.bin/tsx scripts/run-shadow-beta-gemini-faithfulness.ts \
  --input tests/.tmp/shadow-beta-modern-fantasy-nohint-eval-run-004.json \
  --out tests/.tmp/shadow-beta-modern-fantasy-gemini-faithfulness-10.json \
  --limit 10
```

The script requires `GEMINI_API_KEY`. It defaults to `GEMINI_MODEL` or `gemini-2.0-flash`.

## Smoke Results

| Genre | Cases | Pass | Warn | Fail | Output |
| --- | ---: | ---: | ---: | ---: | --- |
| modern_fantasy | 10 | 9 | 0 | 1 | `tests/.tmp/shadow-beta-modern-fantasy-gemini-faithfulness-10.json` |
| romance_fantasy | 10 | 10 | 0 | 0 | `tests/.tmp/shadow-beta-romance-fantasy-gemini-faithfulness-10.json` |
| murim | 10 | 10 | 0 | 0 | `tests/.tmp/shadow-beta-murim-gemini-faithfulness-10.json` |
| occult_mystery | 10 | 10 | 0 | 0 | `tests/.tmp/shadow-beta-occult-mystery-gemini-faithfulness-10.json` |

Overall: 39 pass, 0 warn, 1 fail.

## Failure

### `modern_fantasy.setting_check.003`

Question:

```txt
은재가 수치대로 고치면 태오 목소리 사라지는 장면 근거 충분해?
```

Generated answer said the evidence was not sufficient, while also citing the relevant point that following app numbers makes Tae-o's manuscript resemble other manuscripts. This is a generation-side interpretation failure, not a retrieval miss.

Root cause:

- The question asks a writer-like "is this evidence enough?" form.
- Gemini interpreted "태오 목소리 사라짐" too literally and rejected the softer manuscript evidence "태오의 원고는 잘 팔리는 다른 원고와 더 비슷해졌다."
- The retrieved context was present.

Suggested fix:

- In the answer-generation prompt, tell the model to treat writer shorthand such as "목소리 사라짐" as authorial intent when the evidence supports an equivalent manuscript effect.
- Keep the judge strict; the failure is useful.

## Verdict

Gemini faithfulness smoke is good enough to continue:

- Retrieval alignment is already strong.
- Generated writer-facing answers are mostly faithful.
- The one failure exposes a real prompt/interpretation edge case.

Do not use this for real beta threshold finalization.

