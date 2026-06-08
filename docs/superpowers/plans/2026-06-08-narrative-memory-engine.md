# Narrative Memory Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Luie를 단순 RAG 앱이 아니라, 장편 웹소설의 원문 근거·시점·정체성·사건·관계·확정성을 관리하는 Narrative Memory Engine으로 전환한다.

**Architecture:** 기존 Electron + Drizzle/SQLite + utility process + FTS/vector/RRF 구조를 유지하되, `EntityRelation`/world graph와 별개인 evidence-backed memory graph read/write model을 추가한다. LLM은 기억 저장소가 아니라 추출·검증·설명 계층이며, 모든 확정 memory fact는 원문 evidence, 시점, confidence, provenance를 가져야 한다.

**Tech Stack:** Electron, TypeScript, Drizzle, SQLite, sqlite-vec, FTS5, utility process, existing IPC/preload contracts, existing renderer research/world graph surfaces.

---

## Decision Record

### 사실

- 현재 Luie의 RAG는 `MemoryChunk`, `MemoryChunkFts`, `MemoryEmbedding`, `ChapterSummary`, `contextAssembler` 중심이다.
- 현재 `EntityRelation`은 사용자/세계관 graph에 가까우며, 원문 근거·valid time·confidence·invalidation을 가진 temporal evidence graph가 아니다.
- 현재 wiki visual hook은 mock data를 반환한다.
- 현재 AI 분석 prompt는 본문 외 세계관/RAG 정보를 쓰지 않도록 제한한다.
- 현재 앱 구조는 로컬 Electron 앱이고 SQLite/Drizzle/better-sqlite3/sqlite-vec를 이미 사용한다.

### 추정

- 이건 확인된 사실이 아니라 추정입니다. 현재 RAG 품질 저하의 핵심 원인은 모델 자체보다 memory data model 부재, entity resolution 부재, temporal validity 부재, evidence provenance 부재일 가능성이 높다.
- 이건 확인된 사실이 아니라 추정입니다. 외부 graph DB를 지금 도입하면 기능 품질보다 패키징/백업/오프라인/동기화 복잡도가 먼저 커질 가능성이 높다.

### 의견

- Luie의 핵심은 RAG가 아니라 memory engine이다.
- Chunk는 기억이 아니라 증거다.
- 서사 memory의 기본 단위는 entity 하나가 아니라 event와 state transition이다.
- 요약은 원문보다 권위가 낮아야 한다.
- GraphRAG류 global search보다 temporal evidence graph와 평가셋이 먼저다.

## Non-Negotiable Principles

1. No evidence, no confirmed memory.
2. Summary cannot become canonical fact without source evidence.
3. LLM-extracted memory is `suggested` until validated by evidence rules or user approval.
4. Facts, relations, and states must support time boundaries.
5. Old facts are invalidated, not overwritten.
6. `EntityRelation` is not the engine graph store.
7. `contextAssembler` is not the memory engine query layer.
8. Eval starts in Phase 1, not after the engine is built.

## Target Memory Taxonomy

### Evidence Memory

Raw source-backed memory.

- chapter/scene/paragraph/window chunk
- source type
- source id
- chapter id/order
- scene id
- start/end offset
- content hash
- contextual label

### Entity Memory

Canonical identity memory.

- canonical entity
- alias
- mention span
- merge/split audit
- user approval status
- source evidence

### Episode Memory

Narrative event memory.

- who
- did what
- to whom
- where
- when
- why
- result
- changed facts
- evidence spans

### Temporal Semantic Memory

Point-in-time world state.

- relation state
- character state
- faction state
- known secret state
- possession/status/location/goal
- valid from/to
- invalidated by
- confidence
- evidence

### Procedural/Author Memory

Writer-facing rules and preferences.

- style rules
- rejected settings
- user-approved canon rules
- draft/idea/canon distinction

This is useful, but lower priority than evidence/entity/episode/temporal memory.

## Phase 0: Stop Further Contamination

**Goal:** Prevent current RAG from presenting ungrounded memory as confirmed truth.

**User-visible result:**

- RAG answers display evidence.
- Answers can say `확정`, `추정`, `근거 부족`, `충돌`.
- No evidence-backed answer is treated as canonical memory.

**Main changes:**

- Add answer confidence/status at the RAG result contract level.
- Keep claim-level verification out of Phase 0; answer-level grounding is the first safety gate.
- Update prompts so unsupported claims must be labeled.
- Add diagnostics for evidence gaps and context overfill.

**Files likely touched:**

- `src/shared/types/search.ts`
- `src/main/services/features/rag/contextAssembler.ts`
- `src/main/utility/rag/ragQaWorker.ts`
- `src/renderer/src/features/research/components/AnalysisSection.tsx`
- tests under `tests/main/services/**`

**Success criteria:**

- RAG answer with no retrieved evidence cannot be labeled confirmed.
- Evidence gap is visible in result payload and UI.
- Regression test proves unsupported answer path does not silently pass as normal.

**Critical risks:**

- Too much UI/status work before data model work.
- Existing RAG UX may become more conservative and feel weaker.

**Mitigation:**

- Treat conservative output as correct behavior. A memory engine must say “근거 부족” when it does not know.

## Phase 1: Evaluation Harness MVP

**Goal:** Make memory quality measurable before adding new graph extraction.

**User-visible result:**

- Developer/internal memory quality report.
- Basic “기억 신뢰도” signal can later be surfaced to user.

**Core eval dimensions:**

- context recall
- context precision
- faithfulness
- entity accuracy
- relation accuracy
- temporal accuracy
- contamination rate

**Schema direction:**

- `MemoryEvalCase`
- `MemoryEvalEvidence`
- `MemoryEvalEntity`
- `MemoryEvalRelation`
- `MemoryEvalRun`
- `MemoryEvalResult`

**MVP dataset:**

- 10-20 sample chapters
- 100 questions
- 150-300 evidence spans
- 50-100 entities
- 50-100 relations
- 30 temporal questions
- 20 contamination/conflict cases

**Files likely touched:**

- `src/main/database/schema/**`
- `drizzle/main/**`
- `src/main/services/features/memory/**`
- `tests/main/services/**`
- `scripts/**` for local eval runner

**Success criteria:**

- `SKIP_DB_TEST_SETUP=1 pnpm vitest ...` can run targeted eval tests.
- Eval runner reports top-k evidence hit for fixed cases.
- P0 failure categories are explicit:
  - deleted/draft fact used as confirmed
  - future fact used in past-time answer
  - relation direction reversed
  - unsupported confirmed claim

**Critical risks:**

- Eval scope becomes too large.
- LLM judge becomes false authority.

**Mitigation:**

- Start with retrieval/evidence/entity/temporal checks that can be mechanically inspected.
- Use LLM judge only as secondary signal.

**Phase 1 implementation status (2026-06-08):**

사실:

- Added dedicated `MemoryEval*` Drizzle tables for cases, gold evidence, expected entities, expected relations, runs, and results.
- Added a pure scoring/suite runner for top-k gold evidence recall and unsupported confirmed-answer P0 detection.
- Eval scoring now also flags deleted/draft facts used as confirmed memory, future facts used in past-time answers, and reversed relation direction.
- Added a live project eval runner boundary that loads `MemoryEvalCase`/gold evidence/relation fixtures, runs an injected answerer, scores results, and persists `MemoryEvalRun`/`MemoryEvalResult` rows.
- Added a renderer-safe memory eval IPC/API endpoint and analysis-panel eval report surface for running and viewing project memory eval results.
- Added schema parity coverage through existing DB parity tests.

아직 미구현:

- 확인된 Phase 1 미구현 항목 없음.

## Phase 2: Evidence Memory Read Model

**Goal:** Strengthen raw evidence retrieval before graph extraction.

**User-visible result:**

- “이 답의 근거 보기” is reliable at chapter/scene/offset level.
- Results show where a fact came from, not just similar text.

**Core changes:**

- Add contextual chunk metadata.
- Keep parent-child retrieval: small child chunk for search, larger parent window for answer context.
- Preserve original offsets and source hash.
- Add chapter order and scene/paragraph window metadata.
- Add contextual prefix for indexing, but keep raw quote separate.

**Files likely touched:**

- `src/main/services/features/memory/projection/chunking.ts`
- `src/main/services/features/memory/memoryProjectionService.ts`
- `src/main/services/features/search/chunkSearch.ts`
- `src/main/database/schema/memory.ts`
- `src/shared/types/search.ts`

**Success criteria:**

- Korean proper nouns and short aliases still work via FTS/LIKE.
- Vector search remains optional and graceful.
- Retrieved evidence can expand to surrounding window without losing original quote span.

**Critical risks:**

- Contextual prefix contaminates quoted source.
- Chunk offsets break after package import/export.

**Mitigation:**

- Store `rawContent`/source offsets separately from `indexText`.
- Make source hash part of evidence validation.

**Phase 2 implementation status (2026-06-08):**

사실:

- `MemoryChunk.content` remains the raw quote text returned to users.
- Added `MemoryChunk.indexText`, `indexTextHash`, `contextLabel`, and `sourceContentHash`.
- Chunk FTS, short-token fallback, and embedding projection now use `indexText`.
- Added coverage that a chapter title can be searched through contextual index text while returned chunk content remains raw.

- Memory canonical import/export now treats `MemoryEpisode` and `MemoryEpisodeEvidence` as canonical exportable anchors.
- `MemoryFactEvidence` import remaps depend on both `MemoryFact` and `MemoryEpisodeEvidence`, preventing FK-dangling fact evidence after restore.
- `MemoryFactInvalidation` remains canonical-imported and status-agnostic by design to preserve conflict graph continuity.
- Canonical payload builder now deduplicates IDs before `IN`-clause fetches for episode evidence and episode rows, limiting SQL parameter churn on large projects.

아직 미구현:

- Parent-window expansion API is not implemented yet.
- Scene/paragraph hierarchical retrieval is not implemented yet.
- Existing chunks need normal rebuild jobs before `indexText` is populated with contextual labels.

## Phase 3: Canonical Entity and Mention Layer

**Goal:** Stop entity duplication and alias confusion before relation graph extraction.

**User-visible result:**

- Character/entity cards show aliases, mentions, first/last appearance, and evidence.
- User can approve, split, merge, reject suggested identities.

**Schema direction:**

- `MemoryEntity`
- `MemoryEntityAlias`
- `MemoryEntityMention`
- `MemoryEntityMergeAudit`

**Rules:**

- Do not merge purely by fuzzy string match.
- Keep unresolved mentions.
- Keep surface form; do not discard original wording.
- User-approved identity outranks LLM suggestion.

**Files likely touched:**

- `src/main/database/schema/**`
- `src/main/services/features/memory/**`
- `src/main/handler/world/**` or new `src/main/handler/memory/**`
- `src/shared/ipc/channels.ts`
- `src/preload/api/**`
- renderer research/wiki entity UI

**Success criteria:**

- Alias resolution eval cases exist.
- Merge/split is reversible.
- Canonical profile cannot contain confirmed data without evidence.

**Critical risks:**

- UI world entities and engine entities diverge confusingly.
- Entity resolution becomes endless manual work.

**Mitigation:**

- Use bridge pointers between world entity and memory entity.
- Default to suggestion, not auto-merge.

**Phase 3 implementation status (2026-06-08):**

사실:

- Added dedicated `MemoryEntity`, `MemoryEntityAlias`, and `MemoryEntityMention` tables.
- Added deterministic alias normalization helpers.
- `MemoryEntityMention.chunkId` is stored as a snapshot id, not an FK to mutable chunk projection rows.
- `MemoryEntityMention` stores quote, offsets, `contentHash`, and `sourceContentHash` snapshots for later evidence validation.
- Added `MemoryEntityMergeAudit` schema/migration/packaged bootstrap coverage for merge/split history.
- Added entity alias review, confirmation, rejection, merge, and split service/API/IPC/UI flows.
- Added an injectable entity extraction runner boundary that reads memory chunks and stores suggested canonical entities, aliases, and evidence-backed mentions from LLM/deterministic extractor output.
- Added a nullable `WorldEntity.memoryEntityId` bridge pointer with Drizzle migration, packaged bootstrap/metadata coverage, API validation support, and package export/import preservation.

아직 미구현:

- 확인된 Phase 3 미구현 항목 없음.

## Phase 4: Episode Memory MVP

**Goal:** Extract and store chapter/scene-level narrative events with evidence.

**User-visible result:**

- Per chapter/scene “이 에피소드가 바꾼 설정” list.
- Events show participants, changed relationships, new knowledge, unresolved threads.

**Schema direction:**

- `MemoryEpisode`
- `MemoryEpisodeParticipant`
- `MemoryEpisodeEvidence`
- `MemoryStateChangeCandidate`

**Extraction scope:**

- Start with chapters/scenes only.
- First target:
  - character appears
  - character learns secret
  - relation changes
  - faction relation changes
  - major event occurs
  - promise/foreshadowing opened or resolved

**Success criteria:**

- Episode extraction can be rerun incrementally by content hash.
- Evidence span is mandatory.
- User can mark an episode extraction as wrong/rejected.

**Critical risks:**

- LLM extracts too many weak events.
- Background job queue starves existing chunk/summary/embedding jobs.

**Mitigation:**

- Separate extraction job type/version/dependency.
- Batch incrementally; do not full-rebuild on every edit.
- Keep “candidate” and “confirmed” separate.

**Phase 4 implementation status (2026-06-08):**

사실:

- Added dedicated episode extraction queue table: `MemoryEpisodeExtractionJob`.
- Added `MemoryEpisode`, `MemoryEpisodeParticipant`, `MemoryEpisodeEvidence`, and `MemoryStateChangeCandidate`.
- Episode/state rows default to `suggested`; rejection fields are present.
- Episode evidence stores quote, offsets, `contentHash`, and `sourceContentHash` snapshots.
- Added helper coverage that episode candidates require at least one evidence span.
- Added a transactional storage boundary that inserts episode and evidence rows together.
- `MemoryStateChangeCandidate.evidenceId` is mandatory so state-change claims stay tied to a concrete episode evidence span.
- Chunk projection now enqueues `MemoryEpisodeExtractionJob` rows after source chunks are rebuilt, keyed by source content hash and extractor version.
- Added an episode extraction processor boundary that claims pending jobs, passes source chunks to an injected extractor, stores suggested episode/evidence candidates, and marks jobs completed or retryable.
- Added an LLM episode extractor boundary that prompts for evidence-backed episode JSON, parses structured output, and rejects evidence that references unknown chunks.
- Derived worker now includes pending `MemoryEpisodeExtractionJob` projects and runs LLM episode extraction behind `LUIE_ENABLE_LLM_EPISODE_EXTRACTION=1`.
- Added episode review/rejection service and renderer-safe IPC/API contracts for listing suggested episodes and rejecting incorrect suggestions.
- Added an analysis-panel episode review queue UI with rejection action for suggested episode candidates.
- Added an offline episode extractor calibration harness that checks expected episode type/title/evidence chunk coverage without requiring a live LLM call.
- Added default episode calibration cases and renderer-safe `memoryAdmin.runEpisodeCalibration` IPC/API support so the real LLM episode extractor route can be run from the analysis panel and reported with pass/fail details.
- Added `scripts/run-memory-production-calibration.ts` for headless production-route calibration. Verified Phase 4 episode calibration against the real OpenAI remote route (`externalapi`, `gpt-4o-mini`) on 2026-06-08: 2/2 cases passed.

아직 미구현:

- No production calibration/eval run against live project data yet.

## Phase 5: Temporal Relation and State Graph

**Goal:** Store relationship and state facts with validity windows and invalidation.

**User-visible result:**

- “N화 기준 관계”
- “현재 최신화 기준 관계”
- relationship timeline
- knowledge/secret timeline
- contradiction candidates

**Do not reuse:**

- Do not turn `EntityRelation` into the temporal engine graph store.

**Schema direction:**

- `MemoryFact`
- `MemoryFactEvidence`
- `MemoryFactInvalidation`
- `MemoryRelationState`
- `MemoryCharacterState`
- `MemoryKnowledgeState`

**Required fields for fact-like rows:**

- projectId
- subject entity id
- predicate
- object entity/value
- value type
- validFromChapter/order
- validToChapter/order
- observedAtChapter/order
- confidence
- status: suggested/confirmed/conflicting/rejected/deprecated
- source extractor version
- source content hash
- invalidatedBy fact id

**Success criteria:**

- Can answer “A와 B는 10화 기준 어떤 관계인가?”
- Can answer “A는 8화 기준 C의 정체를 아는가?”
- Future information is not used for past-time answers.
- Conflicting facts are surfaced, not silently merged.

**Critical risks:**

- SQL complexity grows quickly.
- Relation ontology becomes too broad.

**Mitigation:**

- Start with narrow predicates:
  - allied_with
  - hostile_to
  - belongs_to
  - knows_secret
  - revealed_identity
  - betrayed
  - protects
  - seeks
  - located_at
  - alive_status

### Phase 5 Implementation Status

사실:

- Added temporal fact/state tables: `MemoryFact`, `MemoryFactEvidence`, `MemoryFactInvalidation`, `MemoryRelationState`, `MemoryCharacterState`, and `MemoryKnowledgeState`.
- `MemoryFact` stores subject, predicate, object entity/value, value type, validity window, observed chapter order, confidence, status, extractor version, source content hash, and invalidating fact pointer.
- Fact evidence is linked to `MemoryEpisodeEvidence`, keeping temporal claims tied to concrete quoted episode evidence.
- Fact evidence, invalidation, relation state, character state, and knowledge state use project-scoped foreign keys so cross-project memory contamination is rejected at the database boundary.
- Relation, character, and knowledge state projections reference `MemoryEntity` directly so orphaned entity states are not accepted.
- Invalidated facts are not allowed to silently become valid again when an invalidating fact is deleted; the invalidated fact is deleted with the invalidating fact.
- Added packaged schema bootstrap and integrity metadata for the new tables and indexes.
- Added temporal validity helpers that exclude future-observed facts, facts outside their validity window, rejected/deprecated facts, and invalidated facts.
- Narrative memory query now reads temporal facts through the validity helper for relation/state-at-chapter style questions.
- Conflict candidates are surfaced through the memory conflict queue query/API/UI path instead of being silently merged.
- Added a temporal fact candidate storage boundary that writes `MemoryFact`, `MemoryFactEvidence`, and relation/character/knowledge projection rows transactionally.
- Added an LLM temporal fact extractor boundary that prompts for evidence-backed relation/state/knowledge JSON and rejects unknown evidence/entity references.
- Derived worker now runs LLM temporal fact extraction behind `LUIE_ENABLE_LLM_TEMPORAL_FACT_EXTRACTION=1` after chunk/episode processing clears enough source evidence.
- Added temporal fact review/rejection/confirmation service and renderer-safe IPC/API contracts for suggested fact candidates.
- Added an analysis-panel fact review queue UI with confirm/reject actions.
- Added a dedicated conflict-resolution action that confirms the selected fact and rejects the opposing conflicting fact in one transaction.

아직 미구현:

- 확인된 Phase 5 미구현 항목 없음.

## Phase 6: Narrative Memory Query Service

**Goal:** Replace one-size RAG context assembly with intent-specific memory retrieval.

**User-visible result:**

- Same question UI, more stable answers.
- “관계”, “현재 상태”, “근거 찾기”, “충돌 검사” behave differently without user managing retrieval.

**New service:**

- `NarrativeMemoryQueryService`

**Query intents:**

- evidence-trace
- entity-profile
- entity-state-at-chapter
- relationship-at-chapter
- event-causality
- contradiction-check
- unresolved-thread-check
- global-summary

**Rules:**

- `contextAssembler` can consume memory query output, but must not own memory reasoning.
- Graph facts retrieve candidate state; final answer still cites source evidence.
- Summary can route, but raw evidence verifies.

**Success criteria:**

- Query route is logged.
- Unit tests verify route-specific source selection.
- “No sufficient evidence” is a valid successful answer.

**Critical risks:**

- Router becomes opaque and impossible to debug.

**Mitigation:**

- Return retrieval trace in dev payload.
- Keep deterministic route tests for common question patterns.

### Phase 6 Implementation Status

사실:

- Added `NarrativeMemoryQueryService` as a separate memory reasoning boundary instead of embedding memory routing inside `contextAssembler`.
- Added deterministic intent routing for evidence trace, entity profile, entity state at chapter, relationship at chapter, event causality, contradiction check, unresolved thread check, and global summary.
- The service returns retrieval trace, selected sources, candidate temporal facts, memory evidence spans, and `insufficient_evidence` as a successful state.
- Temporal fact lookup uses the Phase 5 validity helper so future-observed facts and out-of-window facts are excluded for bounded chapter questions.
- `contextAssembler` now consumes the narrative memory query output as `Layer 2.5 — Narrative Memory Query`; raw Layer 3 evidence remains the final verification layer.
- Memory query evidence is shown in the prompt layer but is not merged into Phase 0 RAG grounding evidence; grounding remains tied to Layer 3 raw retrieval.
- Added unit coverage for route-specific source selection and insufficient-evidence formatting.
- Added renderer-facing `RagQaResult.narrativeMemory` summary (intent/status/trace/fact/evidence counts) so analysis stream can show retrieval route metadata.
- `buildRagGrounding` now returns `충돌` when narrative memory route status is `conflicting`.
- Analysis panel now renders a compact narrative-memory trace block for assistant answers.
- Added renderer-safe `memory.queryNarrative` and conflict queue IPC/API endpoints for direct memory query inspection and contradiction review.
- Added Korean entity name extraction for chapter-bounded state/identity/profile questions, and the query service passes extracted names into memory entity resolution.
- Added an env-gated LLM-assisted intent classifier boundary for narrative memory routing with validated intent/source output and deterministic fallback on classifier failure.
- Added an intent-classifier calibration harness with default cases covering every narrative memory intent, plus renderer-safe `memoryAdmin.runIntentCalibration` IPC/API support and analysis-panel controls so deterministic and explicit LLM classifier runs can be evaluated through the app boundary.
- Strengthened the LLM intent classifier prompt with an explicit required source matrix for every supported intent.
- Verified Phase 6 intent-classifier production calibration with `scripts/run-memory-production-calibration.ts` against the real OpenAI remote route (`externalapi`, `gpt-4o-mini`) on 2026-06-08: 8/8 cases passed.

아직 미구현:

- 확인된 Phase 6 미구현 항목 없음.

## Phase 7: Evidence-Backed UI Integration

**Goal:** Replace mock relationship visualization and connect AI analysis to memory safely.

**User-visible result:**

- Entity visual cards show real relationships and evidence.
- Relationship graph can toggle by chapter/time.
- AI analysis can include prior state when explicitly enabled.
- Conflict queue becomes visible.

**Files likely touched:**

- `src/renderer/src/features/research/components/wiki/visual/useEntityVisualData.ts`
- `src/renderer/src/features/research/components/wiki/visual/**`
- `src/main/handler/**`
- `src/shared/api/**`
- `src/preload/api/**`
- `src/main/services/features/analysis/**`

**Success criteria:**

- No mock relationship data remains in production path.
- Every displayed relation has evidence or `추정`/`검토 필요` status.
- AI analysis can run in two modes:
  - current chapter only
  - chapter + prior confirmed memory

**Critical risks:**

- UI over-trusts inferred memory.
- AI analysis leaks future facts into past/chapter-local analysis.

**Mitigation:**

- Always pass a chapter/time boundary to memory query.
- Display source/status badges.

### Phase 7 Implementation Status

사실:

- Added a renderer-safe `memory.queryNarrative` IPC/API contract for direct narrative memory inspection.
- Registered the main-process handler through the existing memory/search IPC boundary and validated input with `narrativeMemoryQuerySchema`.
- The entity visual hook no longer imports or returns production mock relationship data directly.
- Entity visual data now queries `NarrativeMemoryQueryService` through preload API with explicit `entityName`/`entityType` resolution rather than assuming world entity ids equal memory entity ids.
- Visual relation cards display predicate, status, and fact-level evidence availability in the existing relation card shape.
- Empty or failed memory results render as an explicit no-evidence bundle instead of fabricated relationships.
- Added IPC contract coverage for `memory.queryNarrative`, including blank-question rejection.
- Added analysis memory scope toggle (`현재 챕터만`, `현재+과거`) and wired it to RAG narrative memory temporal boundary filtering.
- Added entity visual relationship panel memory-scope toggle (`현재 챕터만`, `현재+과거`) and pass-through filtering through narrative query.
- Hardened entity-based temporal fact resolution by returning no fact hits when explicit name input cannot be resolved, preventing unscoped fact contamination.
- Added conflict queue API (`memory:get-conflict-queue`) and conflict UI panel in research analysis.
- Entity visual identity cards now preserve and display canonical memory profile metadata from `NarrativeMemoryQueryService`, including status, alias chips, mention count, and first/last mention chapter range.
- Added entity alias review queue service/API/IPC/UI for suggested canonical alias candidates.
- Alias confirmation marks the alias and its canonical memory entity as `confirmed`; alias rejection marks the alias as `rejected` without changing the canonical entity status.
- Added entity merge service/API/IPC/UI for consolidating a suggested duplicate memory entity into a target canonical entity.
- Entity merge reassigns aliases, mentions, participants, state-change candidates, temporal facts, and state projections from the source entity to the target entity, then marks the source entity as `deprecated`.
- Added entity alias split service/API/IPC/UI for separating an incorrect alias into a new confirmed canonical memory entity.
- Entity alias split moves the alias and alias-linked mentions to the new entity while preserving the original canonical entity.
- Relation label fallback now keeps the related memory entity id when canonical profile lookup cannot resolve a display name, preventing unresolved relations from disappearing or degrading to empty labels.
- Added `MemoryEntityMergeAudit` schema/migration/packaged bootstrap coverage for merge/split history.
- Entity merge and alias split now write audit rows with source entity, target entity, optional alias id, action, actor, and timestamps.
- Relation label fallback now preserves unresolved related entity ids in data without exposing raw ids as display names.

아직 미구현:

- 확인된 Phase 7 미구현 항목 없음.

## Phase 8: Hierarchical Narrative Summaries

**Goal:** Add RAPTOR/GraphRAG-like hierarchy after temporal facts exist.

**User-visible result:**

- Arc/volume/global memory.
- Long-range plot, theme, unresolved thread, faction movement questions improve.

**Hierarchy:**

- scene summary
- chapter summary
- arc summary
- volume summary
- project/world summary
- community summary over entity/relation graph

**Rules:**

- Summary rows must link to source episodes/facts/chunks.
- Summary cannot override temporal fact.
- Summary drift is evaluated.

**Success criteria:**

- Global questions retrieve summary plus underlying evidence.
- Summary contamination is measurable.

**Critical risks:**

- Adding hierarchy too early amplifies wrong facts.

**Mitigation:**

- Keep this after evidence/entity/episode/temporal graph MVP.

### Phase 8 Implementation Status

사실:

- Added `MemoryNarrativeSummary` for scene/chapter/arc/volume/project/community-level summary rows.
- Added `MemoryNarrativeSummarySource` so summaries must link back to source episodes, temporal facts, chunks, or chapter summaries.
- Summary source links use project-scoped foreign keys to reject cross-project evidence contamination.
- Summary source rows enforce exactly one source pointer that matches `sourceType`.
- Summary rows carry status, confidence, extractor version, source content hash, generated timestamp, and rejection fields.
- Summary storage is separate from `MemoryFact`; summaries can support global retrieval but do not overwrite temporal fact state.
- Added migration, packaged bootstrap SQL, and packaged integrity metadata for the new summary tables.
- Added narrative query path for `global-summary` intent so chapter summaries are returned in retrieval (chapter-bound filtering + chapter-level scoping).
- Added a project-level hierarchy runner that builds confirmed `project_overview` narrative summaries from non-fallback chapter summaries and links every source row back to `ChapterSummary`.
- Derived job worker now runs the project-level hierarchy runner after chapter-summary backlog is clear, before embedding projection.
- Added a project-level summary drift evaluator that recomputes linked chapter-summary source hashes and marks narrative summaries stale when source hashes or source counts diverge.
- Added an automated stale project-summary refresh policy: derived jobs create a project overview when none exists and refresh stale project overviews when linked chapter-summary hashes drift.
- Added a scoped hierarchy runner for bounded arc and volume summaries using explicit chapter ranges, preserving `summaryType`, `scopeType`, `scopeId`, and source links.
- Added a community-level hierarchy runner that summarizes confirmed, non-invalidated temporal facts for an explicit entity community and links sources through `MemoryNarrativeSummarySource.sourceType=fact`.
- Added automatic arc/volume hierarchy scheduling based on chapter-number ranges after chapter-summary backlog is clear in the derived worker.
- Added automatic community hierarchy scheduling based on connected components of confirmed, non-invalidated relation facts after chapter-summary backlog is clear in the derived worker.
- Added renderer-safe narrative summary status API/IPC and an analysis-panel hierarchy summary status surface that shows total summaries, type counts, source counts, and project-summary drift state.
- The analysis-panel hierarchy summary surface now includes summary detail previews for project, arc, volume, and community summaries.

아직 미구현:

- 확인된 Phase 8 미구현 항목 없음.

## Phase 9: Package Persistence and Sync Policy

**Goal:** Define what memory data is canonical, cached, exportable, and regenerable.

**Policy:**

- Regenerable:
  - chunks
  - embeddings
  - extractor candidates
  - unapproved summaries
- Canonical/exportable:
  - user-approved facts
  - user-approved entity merges/splits
  - user corrections
  - rejected/deprecated settings
  - eval cases created by user

**Success criteria:**

- Import/export does not lose user-approved memory.
- Rebuild can regenerate projections from source text.
- Sync does not treat stale generated data as canon.

**Critical risks:**

- Derived memory bloats `.luie` package.
- User corrections are lost if treated as cache.

**Mitigation:**

- Separate canonical memory from derived projection tables at schema and package layers.

### Phase 9 Implementation Status

사실:

- Added a code-level memory persistence policy that separates canonical exportable memory from regenerable projections.
- Canonical/exportable policy currently includes user-reviewable memory identity, alias, facts, fact evidence links, invalidations, and eval case gold data.
- Regenerable projection policy includes chunks, embeddings, build jobs, summaries, episodes, mentions, state projections, generated narrative summaries, and eval run/results.
- Canonical export status policy excludes `suggested` and generated `conflicting` rows by default; reviewed exportable states are `confirmed`, `rejected`, and `deprecated`.
- Status-bearing canonical memory rows require an exportable status; missing status is not treated as exportable.
- Added tests that lock full known memory table classification, no canonical/regenerable overlap, and row-level export eligibility.
- `.luie` package export now writes canonical memory rows to `memory/canonical.json`.
- `.luie` package import collection reading now validates allowed `memory/canonical.json` table names, required row identity/project scope, and exportable statuses before exposing the payload.
- Local sync bundle/package payload construction now carries `memoryCanonicalRows` into the `.luie` package payload and excludes deleted canonical memory rows.
- `.luie` package import now applies canonical memory identities, aliases, temporal facts, fact invalidations, and eval gold rows back into the local DB inside the project import transaction.
- Imported canonical memory rows are re-scoped to the resolved local project id to avoid package/project id drift.
- Imported canonical memory row ids are remapped with project/table scope and internal entity/fact/eval foreign keys are rewritten to avoid global primary-key collisions.
- Canonical memory import rejects payloads that mix source project ids or disagree with package `meta.projectId`.
- Supabase remote sync now has a first-class `memory_canonical_rows` table with owner RLS, repository fetch/upsert mapping, and sync bundle round-trip tests.
- `MemoryFactEvidence` package export/import now restores through canonical/importable `MemoryEpisode` and `MemoryEpisodeEvidence` anchors and drops dangling evidence links when linked fact or episode evidence is filtered out.
- Sync conflict resolution now includes user-approved canonical memory package payload rows through `memoryCanonical` conflict items and local/remote resolution keys.
- Temporal fact confirmation now returns an explicit canonical export marker, and the analysis fact review UI labels confirmation as user approval into canonical memory.

아직 미구현:

- 확인된 Phase 9 미구현 항목 없음.

## Sub-Agent Critical Review Summary

### Architecture Reviewer

**Verdict:** Risky unless engine graph is separated from world graph.

Must change:

- Do not reuse `EntityRelation` as temporal evidence graph.
- Do not put all extraction into existing `MemoryBuildJob` without version/dependency isolation.
- Require offset/contentHash/extractorVersion/confidence for every fact.
- Add `NarrativeMemoryQueryService`; do not stuff graph logic into `contextAssembler`.
- Decide package persistence policy early.

### Research Reviewer

**Verdict:** Luie should implement temporal memory before full GraphRAG.

Must follow:

- Chunk is evidence, not memory.
- Event/state transition is the core unit.
- GraphRAG helps global sensemaking but not precise point-in-time state alone.
- LLM extraction must be validated before write.
- Golden temporal QA eval is the real success measure.

### Product/Eval Reviewer

**Verdict:** The first product win must be grounded memory QA plus relationship/state cards.

Must show early:

- evidence-backed answers
- confidence/status badges
- N-chapter 기준 답변
- user approval/rejection of suggested facts
- conflict queue
- correction loop so repeated mistakes stop

## MVP Slice

**MVP name:** 근거 있는 작품 기억 QA + 관계/상태 카드

**MVP scope:**

- Evidence Memory MVP
- Eval Harness MVP
- Canonical Entity suggestion MVP
- Episode Memory MVP for character/relation/secret state changes
- Narrow Temporal Relation Graph for person-to-person relation and secret knowledge
- Entity visual card backed by real evidence

**MVP non-goals:**

- full general-purpose graph
- all entity types
- full automatic canon generation
- external graph DB
- polished global GraphRAG
- fully automatic contradiction resolution

**MVP pass condition:**

- 100 eval questions produce zero P0 failures.
- Every confirmed answer has source evidence.
- User correction prevents repeated same error.
- Past-time query does not use future facts.
- Relationship card shows latest state and history with evidence.

## Open Questions

1. Which source types are canon by default: manuscript only, or user world notes too?
2. Should user-approved world settings outrank manuscript if they conflict?
3. Does Luie need reader-knowledge vs character-knowledge separation in MVP?
4. Should generated memory candidates be stored in `.luie`, or only user-approved memory?
5. What is the first benchmark project: synthetic sample or real user manuscript?
