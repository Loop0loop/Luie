import { z } from "zod";
import { utilityProcessBridge } from "../../../utility/utilityProcessBridge.js";
import type {
  NarrativeMemoryQueryIntent,
  NarrativeMemorySource,
} from "../../../../../../shared/types/search.js";
import type { NarrativeMemoryQueryPlan } from "./plan.js";

const IntentSchema = z.enum([
  "evidence-trace",
  "entity-profile",
  "entity-state-at-chapter",
  "relationship-at-chapter",
  "event-causality",
  "contradiction-check",
  "unresolved-thread-check",
  "global-summary",
] satisfies [NarrativeMemoryQueryIntent, ...NarrativeMemoryQueryIntent[]]);

const SourceSchema = z.enum([
  "memory_chunk_evidence",
  "memory_entity",
  "memory_entity_mention",
  "memory_relation_state",
  "memory_character_state",
  "memory_knowledge_state",
  "memory_fact",
  "memory_fact_evidence",
  "memory_fact_invalidation",
  "memory_episode",
  "memory_state_change_candidate",
  "chapter_summary",
  "world_document",
] satisfies [NarrativeMemorySource, ...NarrativeMemorySource[]]);

const LlmIntentResponseSchema = z.object({
  intent: IntentSchema,
  sources: z.array(SourceSchema).min(1),
  reason: z.string().min(1),
});

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function buildPrompt(question: string): string {
  return [
    "너는 Luie narrative memory query intent classifier다.",
    "질문을 하나의 intent와 필요한 memory sources로 분류하라.",
    "응답은 JSON 객체 하나만 출력한다. markdown과 설명은 금지한다.",
    "",
    "Allowed intents:",
    "evidence-trace, entity-profile, entity-state-at-chapter, relationship-at-chapter, event-causality, contradiction-check, unresolved-thread-check, global-summary",
    "",
    "Allowed sources:",
    "memory_chunk_evidence, memory_entity, memory_entity_mention, memory_relation_state, memory_character_state, memory_knowledge_state, memory_fact, memory_fact_evidence, memory_fact_invalidation, memory_episode, memory_state_change_candidate, chapter_summary, world_document",
    "",
    "Required source matrix. Return every source listed for the selected intent:",
    "evidence-trace => memory_chunk_evidence",
    "entity-profile => memory_entity, memory_entity_mention, memory_fact_evidence",
    "entity-state-at-chapter => memory_character_state, memory_knowledge_state, memory_fact_evidence",
    "relationship-at-chapter => memory_relation_state, memory_fact_evidence",
    "event-causality => memory_episode, memory_state_change_candidate",
    "contradiction-check => memory_fact_invalidation, memory_fact",
    "unresolved-thread-check => memory_episode, memory_fact",
    "global-summary => chapter_summary, world_document",
    "",
    "JSON schema:",
    `{"intent":"string","sources":["string"],"reason":"string"}`,
    "",
    `question: ${question}`,
  ].join("\n");
}

export async function classifyNarrativeMemoryQueryPlanWithLlm(input: {
  projectId: string;
  question: string;
}): Promise<NarrativeMemoryQueryPlan> {
  const generated = await utilityProcessBridge.generateText(
    input.projectId,
    buildPrompt(input.question),
    {
      maxTokens: 500,
      temperature: 0,
    },
  );
  let parsed: z.infer<typeof LlmIntentResponseSchema>;
  try {
    parsed = LlmIntentResponseSchema.parse(
      JSON.parse(stripJsonFence(generated.text)),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error("Invalid input: LLM memory intent classifier output");
    }
    throw error;
  }
  return {
    intent: parsed.intent,
    sources: parsed.sources,
    reason: parsed.reason,
  };
}

export function isLlmNarrativeMemoryIntentClassifierEnabled(): boolean {
  return process.env.LUIE_ENABLE_LLM_MEMORY_INTENT_CLASSIFIER === "1";
}
