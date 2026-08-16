# Shadow Beta Genre Scope And LLM Rules

Generated: 2026-06-30

## Verdict

PASS

Genre-scoped retrieval fixes the combined-project contamination observed in the expanded 220-case run.

This is still shadow beta only.

- realBetaConfirmed: false
- canFinalizeThresholds: false
- threshold replacement: NOT ALLOWED

## What Changed

### Retrieval Scope

Added optional shadow beta genre scoping to the eval runner:

```bash
--shadow-beta-genre-scope
```

When enabled, the runner extracts the genre from case ids like:

```text
shadow-beta:{genre}:...
```

and restricts RAG chunk search to chunk ids with:

```text
{projectId}:shadow-beta:{genre}:
```

No DB migration was added.

### LLM Answer Rules

The Gemini faithfulness smoke prompt now gives the model explicit writer-editor rules:

```text
1. Do not invent facts outside the evidence.
2. Say "not confirmed" when information is not confirmed.
3. Do not treat discarded/draft settings as canon.
4. Warn when later-chapter information would leak into the current answer.
5. If ambiguous, do not assert; give the currently safe writing direction.
```

This is the useful kind of steering: it biases the model toward conservative writer support without allowing it to fabricate.

## Eval Results

### Before Genre Scope

Run:

- `tests/.tmp/shadow-beta-expanded-220-nohint-run-001.json`

```text
n=220
averageContextRecallAtK=0.659
p0=0
miss=75
```

### After Genre Scope

Run:

- `tests/.tmp/shadow-beta-expanded-220-nohint-genre-scope-run-003.json`

```text
n=220
averageContextRecallAtK=0.905
p0=0
miss=21
```

Genre split:

```text
modern_fantasy   0.855  p0=0  miss=8  n=55
murim            0.945  p0=0  miss=3  n=55
occult_mystery   0.927  p0=0  miss=4  n=55
romance_fantasy  0.891  p0=0  miss=6  n=55
```

Base vs expansion:

```text
base      n=200  avg=0.895  miss=21
expansion n=20   avg=1.000  miss=0
```

## Interpretation

- The 6-15 expansion remains healthy.
- Combined-project weakness was mostly cross-genre contamination.
- Genre-scoped retrieval gives the same shape as running each genre separately.
- Remaining misses are old base cases, mostly short alias questions or repeated template variants.

## Verification Note

`tsc --noEmit` currently fails on an unrelated existing issue:

```text
src/shared/schemas/world.ts
Zod issue object is missing required origin for code "too_big"
```

The eval CLI path itself ran successfully.

## Next Minimal Step

Use `--shadow-beta-genre-scope` for Phase 7 shadow beta rehearsal runs.

Do not expand more data until the old base-case misses are either accepted as hard cases or cleaned up.
