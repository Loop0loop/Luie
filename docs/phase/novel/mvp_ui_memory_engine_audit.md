# MVP UI Memory Engine Audit

Date: 2026-07-01

## Verdict

```text
UI is partial but the first answer-mode label path is wired.
Evidence-backed, insufficient-evidence, and advisory labels can now travel through the product contract.
```

## Checked Path

```text
renderer chat:
src/renderer/src/features/research/components/analysisSection/chat/MessageList.tsx
src/renderer/src/features/research/stores/analysis/actions/ragChatActions.ts

shared contract:
src/shared/types/search/rag.ts
src/shared/schemas/search.ts

main RAG result:
src/main/utility/rag/ragQaWorker.ts
src/main/services/features/rag/grounding.ts
```

## What Already Works

- Assistant messages show evidence quotes before the answer.
- Evidence buttons include chunk, chapter, offset, and quote.
- Safety labels show `확정`, `추정`, `근거 부족`, `충돌`, `회차 기준 불가`, `정사 아님`, `차단`.
- A confirmed assistant message with no evidence is downgraded in UI to `근거 부족`.
- Existing DOM tests cover evidence display and no-evidence downgrade.

## What Was Missing Before This Patch

### 1. Product-level `answerMode`

`RagQaResult` has:

```text
answer
evidence
grounding
safety
narrativeMemory
```

The RAG result now has:

```text
answerMode: EVIDENCE | INSUFFICIENT | ADVISORY
```

### 2. `ADVISORY` is still heuristic

The current RAG request still accepts only:

```text
projectId
question
chapterId
includePriorMemory
```

There is no dedicated request mode for general writing advice yet. `ADVISORY` is derived server-side from a small Korean question heuristic.

### 3. UI labels are safety labels, not answer-mode labels

Current labels are useful, but they answer a different question:

```text
safety label: can this answer be trusted as grounded/canonical?
answer mode: what kind of answer is this?
```

For MVP, the answer-mode label is now visible, while safety labels remain separate.

## MVP Gap

```text
EVIDENCE: wired through answerMode + evidence + safety
INSUFFICIENT: wired through answerMode + safety
ADVISORY: wired through answerMode label, heuristic only
```

## Minimum Next Fix

```text
Replace the advisory heuristic with the answer-mode eval classifier only if real usage shows the heuristic mislabels common writer questions.
```

## Do Not Do Yet

- Do not add a new mode router UI.
- Do not add a new provider-specific prompt framework.
- Do not rewrite the RAG worker.
- Do not claim real writer beta readiness from this.

## Current MVP Readiness Impact

```text
Memory Engine UI path: partial but usable for MVP leash display
MVP blocker removed: ADVISORY now has a visible product label
Recommended next step: run the app and verify labels against real chat flow
```
