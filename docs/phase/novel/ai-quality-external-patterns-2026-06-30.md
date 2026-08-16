# AI quality external patterns

Date: 2026-06-30

## RAG evaluation

Mature RAG evals split three signals instead of treating evidence count as proof:

- Retrieval relevance: did the retriever fetch context that actually matches the question?
- Groundedness/faithfulness: is the answer supported by retrieved context?
- Answer quality: did the answer solve the user task?

Local rule: never count weak fallback evidence as grounded evidence without a relevance threshold.

## LLM judge

Judge output must be a gate, not only an artifact. A failed or invalid judge verdict should affect eval status/metrics unless explicitly marked diagnostic-only.

Local rule: memory eval success cannot be based only on heuristic recall when a judge says the answer failed.

## Sync durability

Retry queues are not atomicity. A memory-only retry is a best-effort repair, not a durability guarantee. For DB + external package writes, use one of:

- durable outbox row committed with the DB mutation,
- temp write + promote after DB success,
- explicit stale-package status surfaced to callers.

Local rule: do not claim `.luie` and DB are consistent unless a durable repair path exists.

## Tombstones

Deleted state wins over older active state in the same merge/export set.

Local rule: once a docType tombstone is selected for a project, older active docs of the same docType must not rehydrate or export.
