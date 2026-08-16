# AI quality risk priorities

Date: 2026-06-30

## P0

- Prevent stale `.luie` resurrection when a newer world-document tombstone and older active document exist in the same sync bundle.
- Stop treating weak RAG fallback evidence as sufficient grounding.
- Make live memory eval failures reflect judge failures, not only stored artifacts.

## P1

- Move memory/RAG eval tests from string/source assertions to executable behavior gates.
- Add real FTS/retrieval-path coverage for chapter-scoped Shadow Beta tests.
- Surface generic world replica `packageExportError` in renderer helpers, not only scrap/graph paths.

## P2

- Report dropped canonical-memory import rows by table/reason instead of silently filtering them.
- Define a practical sync durability model: outbox, retry ledger, or explicit stale-package state.
- Separate retrieval success, evidence relevance, and answer grounding in metrics and UI contracts.

## External research questions

- How do mature RAG systems evaluate retrieval without answer leakage?
- How do eval systems combine heuristic scoring with LLM judge verdicts?
- How do local-first/sync systems avoid tombstone resurrection and DB/file divergence?
