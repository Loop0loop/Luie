# Shadow Beta 15-Chapter QA

Generated: 2026-06-30

## Verdict

PASS_FOR_NEXT_EVAL_EXPANSION

The expanded manuscripts are usable as the basis for 6-15 chapter eval expansion.

This remains shadow beta only.

- realBetaConfirmed: false
- canFinalizeThresholds: false
- real beta threshold replacement: NOT ALLOWED

## What Was Checked

### File Count

- modern_fantasy: 15 manuscript files
- romance_fantasy: 15 manuscript files
- murim: 15 manuscript files
- occult_mystery: 15 manuscript files
- total manuscript files: 60

### Validation

Command:

```bash
node scripts/validate-shadow-beta-novel-pack.mjs --root novel
```

Result:

```text
Shadow beta novel pack validation: OK
```

### Manuscript Meta Leakage

Checked for direct dataset/evaluator language in 6-15 chapters:

- `작가라면`
- `작가가 훗날`
- `폐기 설정`
- `정사`
- `원고를 잘못`
- `테스트`
- `Luie`
- `실제 작가`

Result: no remaining matches after cleanup.

## Genre QA

### modern_fantasy

Status: PASS

What works:

- Keeps the app as an analysis signal, not an auto-writing tool.
- Expands the real dilemma from "what does the app say?" to "does the editor's report become manuscript intervention?"
- Taeo suspects Eunjae's strange criteria but still does not know the app's exact function.
- Doyun's hidden report is model-failure evidence, not plagiarism confirmation.

Good eval targets:

- Taeo's knowledge state in chapter 10.
- Difference between reaction rate, conversion, and author voice.
- Whether `intervention trace` is a confirmed writing/delegation metric.
- Whether Doyun knows the app.

### romance_fantasy

Status: PASS

What works:

- Romantic-looking scenes remain grounded in archive access, witness rights, and document authority.
- Kael is confirmed as a record-manipulation survivor, not a regressor.
- Amelia's princess rumor is presented as a court rumor, not canon.
- Leona remains suspicious but not confirmed as direct forger.

Good eval targets:

- Hand-holding in chapter 7: affection or seal-cord cover?
- Half-annulment paper in chapter 11.
- Princess rumor in chapter 12.
- Testimony vs confession in chapter 14.

### murim

Status: PASS

What works:

- Avoids ultimate manual/power-up shortcut.
- Resolves the second flaw through repeated training evidence.
- Baekrin is framed but not made a traitor.
- Ryujin still does not reveal his past life.

Good eval targets:

- Second flaw before and after chapter 15.
- Baekrin traitor trap in chapter 13.
- Mun Soha's conflict as authority/training risk, not villainy.
- Injang symbol as unresolved backing-force clue.

### occult_mystery

Status: PASS_WITH_MINOR_WARNING

What works:

- Uses existing props instead of adding unrelated new ghost rules.
- Keeps Choi as accomplice but not final mastermind.
- Keeps reflection as clue, not instant-death rule.
- Ties "after work" to system record manipulation.

Minor warning:

- Chapter 15 leaves Seoyun inside the 13th floor. This is useful for cliffhanger and future QA, but eval cases must avoid asking for final resolution before the next arc exists.

Good eval targets:

- Two types of storage tags in chapter 6.
- Flashlight as both crime and rescue procedure.
- Third announcement as possible closing signal.
- Choi accomplice vs final mastermind.
- "After work" as real time vs system status.

## Cleanup Performed

Removed manuscript-level meta/evaluator phrasing from:

- `novel/modern_fantasy/manuscript/modern_fantasy_010.txt`
- `novel/romance_fantasy/manuscript/romance_fantasy_007.txt`
- `novel/romance_fantasy/manuscript/romance_fantasy_010.txt`
- `novel/romance_fantasy/manuscript/romance_fantasy_012.txt`
- `novel/murim/manuscript/murim_013.txt`
- `novel/occult_mystery/manuscript/occult_mystery_010.txt`
- `novel/occult_mystery/manuscript/occult_mystery_013.txt`

## Next Minimal Step

Expand eval only where the 6-15 chapters add new memory pressure.

Recommended first batch:

- 5 new eval cases per genre
- total: 20 new cases
- one per task family:
  - setting_check
  - relationship_check
  - foreshadowing_status
  - chapter_knowledge_state
  - draft_canon_conflict

Do not rewrite the whole existing 50-case set yet. Add a small 20-case expansion first, run retrieval and Gemini faithfulness, then decide whether a full 100-case expansion is worth it.
