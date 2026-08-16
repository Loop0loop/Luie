# Shadow Beta Genre-Scope Gemini Faithfulness Sample

Generated: 2026-06-30

## Verdict

PASS_WITH_CHAPTER_SCOPE_WARNING

Genre scope improves retrieval, but LLM faithfulness still needs chapter/time scope to prevent future-info leakage and over-confirmation.

Still not real beta data.

- realBetaConfirmed: false
- canFinalizeThresholds: false
- threshold replacement: NOT ALLOWED

## Input

Source retrieval run:

- `tests/.tmp/shadow-beta-expanded-220-nohint-genre-scope-run-003.json`

Balanced sample:

- 60 cases total
- per genre:
  - 10 base cases
  - 5 expansion cases

Sample input:

- `tests/.tmp/shadow-beta-expanded-220-genre-scope-faithfulness-sample-60-input.json`

## Gemini Faithfulness Result

Run:

- `tests/.tmp/shadow-beta-expanded-220-genre-scope-gemini-faithfulness-sample-60-run-001.json`

Result:

```text
cases: 60
pass: 56
warn: 0
fail: 4
```

Genre split:

```text
modern_fantasy:  pass=14, fail=1, total=15
murim:           pass=15, fail=0, total=15
occult_mystery:  pass=13, fail=2, total=15
romance_fantasy: pass=14, fail=1, total=15
```

## Failed Cases

### modern_fantasy.expansion.chapter_knowledge_state.010

Question:

```text
태오가 10화에서 앱 기능까지 아는 걸로 써도 돼?
```

Issue:

- Answer correctly says "안 됩니다".
- But it adds unsupported phrasing like Taeo only "어렴풋이" suspects the app and that app-function recognition is "5화 이후 예정".
- This is a mild hallucination inside an otherwise correct direction.

### occult_mystery.expansion.chapter_knowledge_state.015

Question:

```text
서윤 첫 잔상 나왔으니까 능력 기원 확정해도 돼?
```

Issue:

- The question is ambiguous.
- Evidence says the origin is glimpsed, but the full origin/background remains unresolved.
- This case should be rewritten to ask "능력의 전체 기원" explicitly.

### occult_mystery.expansion.foreshadowing_status.006

Question:

```text
무연백화점 6화에서 같은 문양 보관표면 전부 같은 표로 처리해도 돼?
```

Issue:

- First run incorrectly answered "같은 표로 처리해도 괜찮습니다."
- After prompt tightening, answer became correct: "안 됩니다."
- Judge returned malformed JSON in the rerun, so it is warning-level parser noise after answer correction.

### romance_fantasy.expansion.setting_check.010

Question:

```text
레오나를 10화에서 최종 조작자로 박아도 돼?
```

Issue:

- Answer correctly says "안 됩니다".
- But it uses "15화까지도 직접 조작자는 확정되지 않았다", which may be future information for a 10화 기준 question.
- This is the clearest signal that retrieval/LLM needs `allowedUntilChapter` filtering, not just genre filtering.

## Prompt Adjustment

Added one rule to the Gemini answer prompt:

```text
질문이 '써도 돼?', '가도 돼?', '처리해도 돼?', '확정해도 돼?'이면 첫 문장에서 '안 됩니다' 또는 '됩니다'로 판정하라.
```

This improves answer shape, but it does not solve chapter-scope leakage by itself.

## Conclusion

Genre scope fixed cross-genre contamination.

It does not fix:

- future chapter leakage
- partial clue over-confirmation
- answer phrasing that invents "scheduled later" language

Next minimal technical need:

```text
allowedUntilChapter scope
```

The LLM prompt should remain conservative, but retrieval must stop handing the model future chapters for chapter-bounded questions.
