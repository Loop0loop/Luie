# Luie Memory Engine Product Definition

## One-Line Definition

Memory Engine is Luie's local-first manuscript context layer.

It is not "AI that remembers the novel." It is the app's own structured context system that keeps the manuscript, chapters, notes, characters, relationships, foreshadowing, and revision history searchable and evidence-backed. AI is only an optional reader of that context.

Korean one-liner:

```text
Memory Engine은 AI가 아니라, Luie 앱 안에 상시 쌓이는 원고 context layer다.
```

## Product Position

Luie is not an AI subscription writing tool.

Luie is a local-first long-form writing app where the manuscript itself becomes reusable context.

The app should work without AI:

- store manuscript locally
- preserve chapters and notes
- search manuscript evidence
- expose character, setting, relationship, and foreshadowing context
- show where an answer or claim came from

AI, when enabled, should only read from this context and summarize or answer within the evidence boundary.

## Core Philosophy

1. The manuscript is the source of truth.
2. Memory Engine belongs to the app, not to an LLM provider.
3. AI is optional and subordinate.
4. Evidence comes before answers.
5. If evidence is missing, "not confirmed" is a correct result.
6. Future chapters must not leak into a current-chapter answer.
7. Draft, discarded, and canon facts must not be mixed silently.
8. Luie should help the writer inspect their own work, not pretend to know how all writers work.

## What Memory Engine Is

Memory Engine is the local context system that turns a writing project into queryable memory.

Minimum context types:

- manuscript text
- chapter order
- chapter/body chunks
- writer notes
- character records
- relationship records
- timeline records
- foreshadowing/promise records
- revision history
- discarded or draft settings
- evidence links back to source text

Minimum behaviors:

- find relevant source text
- limit answers by project/chapter scope
- distinguish canon from draft/discarded material
- surface uncertainty
- return evidence with answers
- work without requiring a cloud AI subscription

## What Memory Engine Is Not

Memory Engine is not:

- an AI co-writer
- automatic novel generation
- a popularity predictor
- a genre trend oracle
- a replacement for real writer beta feedback
- a perfect model of every writer's workflow
- a threshold finalization basis when only synthetic data exists

## MVP

The MVP is small.

```text
local manuscript
→ indexed project context
→ user asks or searches
→ Luie retrieves evidence
→ optional AI answers only from retrieved evidence
→ if evidence is insufficient, Luie says not confirmed
```

MVP user questions:

- "이 인물이 7화 시점에서 이 사실을 알아?"
- "이 설정은 폐기한 거야, 정사야?"
- "이 떡밥 회수됐어, 아직 심어둔 상태야?"
- "이 장면 앞 회차랑 충돌해?"
- "근거가 어디야?"

MVP must support:

- local project storage
- chapter-aware retrieval
- evidence display
- current-chapter scope
- basic notes/world context
- optional LLM answer using only retrieved context
- no-evidence refusal
- answer mode separation

MVP should not include:

- automatic chapter writing
- writer-style imitation
- commercial trend prediction
- paid AI bundle as core product value
- broad author-workflow claims before real beta data

## Answer Leash Policy

The LLM must not answer every question in the same mode.

It needs three visible modes:

| Mode | When | Required behavior |
| --- | --- | --- |
| `EVIDENCE` | User asks about manuscript facts, canon, timeline, relationships, foreshadowing, or conflicts. | Answer only from Memory Engine evidence. Cite evidence. |
| `INSUFFICIENT` | User asks for a manuscript/canon answer but retrieved evidence is missing or weak. | Say it is not confirmed. Do not invent. Say what evidence would be needed. |
| `ADVISORY` | User asks for general writing help, brainstorming, wording, pacing, or alternatives. | Give advice, but label it as general advice, not manuscript fact. |

Policy sentence:

```text
Luie는 근거 없는 내용을 정사처럼 답하지 않는다.
하지만 원고 근거와 분리해서 일반 조언은 제공할 수 있다.
```

Answer format:

```text
[mode: EVIDENCE | INSUFFICIENT | ADVISORY]
[scope: project / chapter / selected text / none]
[answer]
[evidence: source quotes or "none"]
[caution: optional]
```

Examples:

```text
Q: 7화 기준으로 태오가 앱 기능까지 알아?
A:
[mode: EVIDENCE]
[scope: chapter <= 7]
아니요. 7화 기준 태오는 은재가 무언가 숨긴다는 낌새만 알고, 앱 기능은 모릅니다.
[evidence: ...]
```

```text
Q: 이 장면 더 세게 가도 돼?
A:
[mode: ADVISORY]
[scope: selected text]
원고 정사 판단은 아닙니다. 일반 작법 조언으로는 갈등을 세게 만들려면 선택지를 A/B로 나눌 수 있습니다.
[evidence: none]
[caution: 정사 충돌 여부는 관련 회차를 지정하면 따로 확인해야 합니다.]
```

```text
Q: 이 떡밥 회수된 거 맞지?
A:
[mode: INSUFFICIENT]
[scope: project]
현재 검색된 근거만으로는 회수됐다고 확정할 수 없습니다.
[evidence: none]
[caution: 회수 장면 후보 회차나 키워드를 지정하면 다시 확인할 수 있습니다.]
```

## Phase 7 Meaning

Phase 7 shadow beta tests are not proof that Luie understands real writers.

They are harness tests for the Memory Engine:

- Did retrieval find the correct evidence?
- Did retrieval respect genre/project/chapter scope?
- Did the answer avoid future chapter leakage?
- Did the answer avoid discarded-setting leakage?
- Did the system say "not confirmed" when evidence was insufficient?
- Did the system separate evidence-backed answers from general advice?
- Did AI stay inside the Memory Engine boundary?

Synthetic shadow beta data can test the harness.

It cannot prove product-market fit.
It cannot replace real writer beta.
It cannot finalize production thresholds.

## Current MVP Check

Status as of 2026-06-30:

| MVP Requirement | Current State | Status |
| --- | --- | --- |
| Local manuscript/project storage | Electron + SQLite project/chapter storage exists. | Mostly present |
| Chapter/body indexing | MemoryChunk and chapter/body projection exist. | Present |
| Evidence retrieval | RAG layer and Layer 3 evidence retrieval exist. | Present |
| Chapter scope | Shadow beta chapter scope added and tested. | Present for harness |
| Project/work scope | Project exists; work-level scope is still future expansion. | Partial |
| Evidence display in UI | Evidence-backed UI exists in parts, but product-level flow needs audit. | Partial |
| Optional AI answer | Gemini/local runtime architecture exists; AI is not fully product-positioned as subordinate in UI. | Partial |
| No-evidence refusal | `answer_mode_v1` includes insufficient-evidence cases and Gemini smoke passed. UI/product path still needs audit. | Partial |
| Answer mode separation | `EVIDENCE`/`INSUFFICIENT`/`ADVISORY` policy and 32-case runner exist. UI audit shows `ADVISORY` is not wired into the product contract yet. | Partial |
| Draft/discarded/canon separation | Test data and some guards exist; real product UX needs audit. | Partial |
| Real writer validation | No real beta data. | Missing |

MVP readiness:

```text
Memory Engine infrastructure: ~65%
MVP product clarity after this definition: ~70%
MVP implementation confidence: ~60-65%
Real writer workflow validation: low, needs beta
```

## Next Required Work

Do not add more broad features first.

Next smallest useful work:

1. Add `answerMode` to the RAG result contract and render it in chat.
2. Ensure AI answer surfaces mode, evidence, and uncertainty, not just prose.
3. Add more no-evidence / abstention cases after the UI path is wired.
4. Keep local-first and non-AI usage visible in product copy/UI.
5. Run real writer beta later; until then, label results as rehearsal only.

## Final Anchor

```text
Luie is a local-first writing app where the manuscript becomes context.
Memory Engine is the context layer.
AI is optional and must stay inside that context.
```
