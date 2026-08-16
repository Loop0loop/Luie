# Memory Enjine Expand Plan

## Current Phase 7 Decision

For the current Phase 7 shadow beta validation, retrieval scope is limited by genre.

This is intentional and temporary.

Current shadow beta genres:

- `modern_fantasy`
- `romance_fantasy`
- `murim`
- `occult_mystery`

In the current dataset, each genre behaves like one isolated work. Because of that, genre scope is good enough for Phase 7 rehearsal.

## Why Genre Scope Is Not The Long-Term Model

Genre is too broad for real writer memory.

Long-term problems:

- One author can have many works in the same genre.
- One work can mix genres.
- Main story, side story, draft, revision, and discarded settings can coexist.
- A question may need "chapter 12 기준" rather than whole-project memory.
- Same names, roles, titles, tropes, or locations can appear across works.
- Genre filtering cannot distinguish canon from draft notes.

So genre scope must not become the product memory model.

## Long-Term Retrieval Scope

Future Memory Engine retrieval should scope by:

- `projectId`
- `workId`
- `canonLayer`
  - `manuscript`
  - `canon`
  - `draft`
  - `discarded`
  - `revision`
  - `session_log`
- `chapterOrder`
- `allowedUntilChapter`
- `sourceKind`
  - `manuscript`
  - `writer_room`
  - `eval`
- optional `arcId`
- optional `characterId`
- optional `timelineId`

Minimum future query shape:

```ts
{
  projectId: string;
  workId: string;
  allowedUntilChapter?: number;
  includeCanonLayers: Array<"manuscript" | "canon" | "revision" | "session_log">;
  excludeCanonLayers: Array<"discarded" | "draft">;
}
```

## Future Answer Rules

The LLM should not decide scope by itself.

The Memory Engine should provide scoped evidence first. The LLM should then follow conservative writer-editor rules:

1. Do not invent facts outside retrieved evidence.
2. If information is not confirmed, say it is not confirmed.
3. Do not treat draft or discarded settings as canon.
4. Do not use chapters after `allowedUntilChapter`.
5. Distinguish reader knowledge from character knowledge.
6. Distinguish implication from confirmation.
7. Give the safest writing direction, not a confident guess.

## Phase 7 Boundary

Do now:

- Keep genre scope for shadow beta validation.
- Use genre scope only because each genre folder currently represents one work.
- Continue Phase 7 tests around retrieval, evidence, faithfulness, and writer workflow.

Do not do now:

- Do not add DB migrations for `workId` yet.
- Do not redesign all memory chunks yet.
- Do not expand to a full canon-layer engine before Phase 7 rehearsal is stable.
- Do not use shadow beta to finalize real beta thresholds.

## Recommended Next Expansion

After Phase 7 shadow rehearsal is stable:

1. Add `workId` to shadow beta import metadata.
2. Add `canonLayer` to chunk metadata.
3. Add `chapterOrder` filtering to retrieval.
4. Re-run existing 220-case eval with:
   - no scope
   - genre scope
   - work scope
   - work + chapter scope
   - work + chapter + canonLayer scope
5. Promote only the smallest scope model that improves recall without hiding valid evidence.

## External Reference: Microsoft Memora

Memora should be tracked as a design reference, not adopted as a dependency.

Reference:

- `https://github.com/microsoft/Memora`
- `https://arxiv.org/abs/2602.03315`

Useful idea for Luie:

- Keep the original manuscript or writer note as the memory value.
- Add a short chapter-scoped abstraction for retrieval.
- Add cue anchors so writer questions can find the right evidence without scanning every future note.

Possible Luie mapping:

```text
manuscript chunk
  value: original scene text
  primary abstraction: chapter-safe summary
  cue anchors:
    - character + knowledge state
    - relationship + direction
    - foreshadowing + status
    - canon/draft/discarded conflict
    - allowedUntilChapter
```

Why not import Memora directly:

- Luie is Electron/TypeScript/SQLite; Memora is Python-first.
- Memora dependencies are too heavy for the current desktop memory path.
- Luie needs strict writer provenance, canon-layer control, and chapter leakage guards.

Small future experiment:

1. Generate chapter-scoped cue cards for the 4 shadow beta works.
2. Run cue-first retrieval on the existing 220 eval cases.
3. Compare against current genre + chapter scope recall.
4. Keep `P0 = 0`; reject the idea if cue cards improve recall by leaking future facts.

## Working Summary

Current genre scope is a Phase 7 test harness.

Future Memory Engine scope should be:

```text
workId + canonLayer + allowedUntilChapter
```

not:

```text
genre
https://github.com/microsoft/Memora
```
