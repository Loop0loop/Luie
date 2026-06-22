import type {
  NarrativeMemorySource,
  NarrativeMemoryQueryIntent,
} from "../../../../../../shared/types/search.js";

import {
  CAUSALITY_KEYWORDS,
  CONTRADICTION_KEYWORDS,
  EVIDENCE_KEYWORDS,
  PROFILE_KEYWORDS,
  RELATION_KEYWORDS,
  STATE_KEYWORDS,
  SUMMARY_KEYWORDS,
  THREAD_KEYWORDS,
} from "./constants.js";

export type NarrativeMemoryQueryPlan = {
  intent: NarrativeMemoryQueryIntent;
  sources: NarrativeMemorySource[];
  reason: string;
};

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

export function parseChapterOrder(question: string): number | null {
  const match = /(\d+)\s*(?:화|장|chapter|챕터)/i.exec(question);
  if (!match) return null;
  const parsed = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractEntityNamesFromQuestion(question: string): string[] {
  const names: string[] = [];
  const addName = (value: string) => {
    const normalized = value.trim();
    if (normalized.length < 2) return;
    if (names.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
      return;
    }
    names.push(normalized);
  };
  const stripLeadingClause = (value: string) =>
    value.trim().replace(/^.*(?:은|는|이|가)\s+/, "");

  const normalizedQuestion = question
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
  const semanticQuestion = normalizedQuestion
    .replace(/\d+\s*(?:화|장|chapter|챕터)\s*기준\s*/gi, "")
    .replace(/\d+\s*(?:화|장|chapter|챕터)\s*/gi, "")
    .replace(/\b기준\s*/g, "")
    .trim();

  const quotePatterns = [/"([^"]{2,})"/g, /'([^']{2,})'/g];

  for (const pattern of quotePatterns) {
    const matches = [...normalizedQuestion.matchAll(pattern)];
    for (const match of matches) {
      const matched = match[1]?.trim();
      if (!matched) continue;
      addName(matched);
    }
  }

  const pairPattern =
    /([가-힣A-Za-z0-9_]{2,})\s*(?:와|과)\s*([가-힣A-Za-z0-9_]{2,})/g;
  for (const match of [...semanticQuestion.matchAll(pairPattern)]) {
    const first = match[1]?.trim();
    const second = match[2]?.trim();
    if (first) addName(first);
    if (second) addName(second);
  }

  const subjectPattern =
    /(^|[,])\s*([가-힣A-Za-z][가-힣A-Za-z0-9_ ]{1,20}?)(?:은|는|이|가)\s/g;
  for (const match of [...semanticQuestion.matchAll(subjectPattern)]) {
    const subject = match[2]?.trim();
    if (subject) addName(subject);
  }

  const possessivePattern =
    /([가-힣A-Za-z][가-힣A-Za-z0-9_ ]{1,20}?)(?:의)\s*(?:정체|비밀|목적|관계|상태)/g;
  for (const match of [...semanticQuestion.matchAll(possessivePattern)]) {
    const owner = match[1]?.trim();
    if (owner) addName(stripLeadingClause(owner));
  }

  return names.slice(0, 4);
}

export function buildNarrativeMemoryQueryPlan(
  question: string,
): NarrativeMemoryQueryPlan {
  const normalized = question.trim().toLowerCase();
  const hasChapterBoundary =
    parseChapterOrder(question) !== null || normalized.includes("기준");

  if (includesAny(normalized, CONTRADICTION_KEYWORDS)) {
    return {
      intent: "contradiction-check",
      sources: ["memory_fact_invalidation", "memory_fact"],
      reason: "question asks for conflicts or contradictions",
    };
  }

  if (includesAny(normalized, EVIDENCE_KEYWORDS)) {
    return {
      intent: "evidence-trace",
      sources: ["memory_chunk_evidence"],
      reason: "question asks for source evidence",
    };
  }

  if (includesAny(normalized, RELATION_KEYWORDS)) {
    return {
      intent: "relationship-at-chapter",
      sources: ["memory_relation_state", "memory_fact_evidence"],
      reason: hasChapterBoundary
        ? "question asks for a relationship at a bounded chapter"
        : "question asks for a relationship state",
    };
  }

  if (includesAny(normalized, STATE_KEYWORDS)) {
    return {
      intent: "entity-state-at-chapter",
      sources: [
        "memory_character_state",
        "memory_knowledge_state",
        "memory_fact_evidence",
      ],
      reason: hasChapterBoundary
        ? "question asks for entity state at a bounded chapter"
        : "question asks for entity or knowledge state",
    };
  }

  if (includesAny(normalized, CAUSALITY_KEYWORDS)) {
    return {
      intent: "event-causality",
      sources: ["memory_episode", "memory_state_change_candidate"],
      reason: "question asks for event cause or consequence",
    };
  }

  if (includesAny(normalized, THREAD_KEYWORDS)) {
    return {
      intent: "unresolved-thread-check",
      sources: ["memory_episode", "memory_fact"],
      reason: "question asks for unresolved narrative threads",
    };
  }

  if (includesAny(normalized, SUMMARY_KEYWORDS)) {
    return {
      intent: "global-summary",
      sources: ["chapter_summary", "world_document"],
      reason: "question asks for global narrative summary",
    };
  }

  if (includesAny(normalized, PROFILE_KEYWORDS)) {
    return {
      intent: "entity-profile",
      sources: [
        "memory_entity",
        "memory_entity_mention",
        "memory_fact_evidence",
      ],
      reason: "question asks for entity profile or identity",
    };
  }

  return {
    intent: "evidence-trace",
    sources: ["memory_chunk_evidence"],
    reason: "fallback to raw evidence trace",
  };
}
