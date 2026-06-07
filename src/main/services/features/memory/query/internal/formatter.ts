import type { NarrativeMemoryQueryResult } from "../../../../../../shared/types/search.js";

function summarizeProfiles(result: NarrativeMemoryQueryResult["profiles"]): string {
  if (!result || result.length === 0) {
    return "(no entity profile rows)";
  }

  return result
    .map((profile) => {
      const aliasText =
        profile.aliases.length > 0 ? `${profile.aliases.join(", ")}` : "(no alias)";
      return [
        `- ${profile.id}: ${profile.canonicalName} [${profile.entityType}]`,
        `  status=${profile.status}`,
        `  aliases=${aliasText}`,
        `  mentions=${profile.mentionCount} (first=${profile.firstMentionChapterOrder ?? "unknown"}, last=${profile.lastMentionChapterOrder ?? "unknown"})`,
      ].join("\n");
    })
    .join("\n");
}

export function formatNarrativeMemoryQueryResult(
  result: NarrativeMemoryQueryResult,
): string {
  const trace = result.trace
    .map((step) => `- ${step.source}: ${step.decision} (${step.reason})`)
    .join("\n");
  const facts =
    result.facts.length > 0
      ? result.facts
          .map((fact) => {
            const object = fact.objectEntityId ?? fact.objectValue ?? "(none)";
            return [
              `- fact=${fact.id}`,
              `${fact.subjectEntityId} ${fact.predicate} ${object}`,
              `related=${fact.relatedEntityName ?? fact.relatedEntityId ?? "unknown"}`,
              `status=${fact.status}`,
              `confidence=${fact.confidence}`,
              `evidence=${fact.evidenceCount}`,
              `valid=${fact.validFromChapterOrder}-${fact.validToChapterOrder ?? "open"}`,
              `observed=${fact.observedAtChapterOrder}`,
            ].join(" | ");
          })
          .join("\n")
    : "- No sufficient narrative memory evidence. Treat this as a valid insufficient-evidence result.";
  const profiles =
    result.profiles && result.profiles.length > 0
      ? summarizeProfiles(result.profiles)
      : "(no profile rows)";
  const evidence =
    result.evidence.length > 0
      ? result.evidence
          .map(
            (item, index) =>
              `[M${index + 1}] chunk=${item.chunkId} chapter=${item.chapterId ?? "null"} offset=${item.offset}\n${item.quote}`,
          )
          .join("\n\n")
      : "(no memory evidence spans)";

  return [
    `intent=${result.intent}`,
    `status=${result.status}`,
    "## Retrieval Trace",
    trace,
    "## Candidate Facts",
    facts,
    "## Entity Profiles",
    profiles,
    "## Memory Evidence",
    evidence,
  ].join("\n");
}
