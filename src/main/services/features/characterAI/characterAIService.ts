import { createLogger } from "../../../../shared/logger/index.js";

const logger = createLogger("CharacterAIService");

// ── Types ─────────────────────────────────────────────────────────────────

export type CharacterAIInput = {
  name: string;
  tagline?: string;
  roles?: string[];
  keywords?: string[];
  // Core wiki sections
  overview?: string;
  personality?: string;
  background?: string;
  appearance?: string;
  relations?: string;
  notes?: string;
};

export type RadarAxis = {
  label: string;
  value: number; // 0–10
};

export type CharacterStatsInput = CharacterAIInput & {
  /** Axes to evaluate. Labels are preserved; only values are updated. */
  axes: RadarAxis[];
};

// ── Error helpers ─────────────────────────────────────────────────────────

function httpError(prefix: string, status: number): Error {
  if (status === 429) return new Error(`${prefix}_RATE_LIMIT`);
  if (status === 401) return new Error(`${prefix}_UNAUTHORIZED`);
  if (status >= 500) return new Error(`${prefix}_SERVER_ERROR:${status}`);
  return new Error(`${prefix}_FAILED:${status}`);
}

// ── Prompt builders ───────────────────────────────────────────────────────

function buildImagePrompt(input: CharacterAIInput): string {
  const parts: string[] = [];
  if (input.tagline)          parts.push(input.tagline);
  if (input.keywords?.length) parts.push(input.keywords.join(", "));
  if (input.appearance)       parts.push(input.appearance.slice(0, 300));
  if (input.personality)      parts.push(input.personality.slice(0, 200));
  parts.push(
    "anime style character portrait, detailed illustration, dramatic lighting, high quality",
  );
  return parts.join(". ");
}

function buildQuoteContext(input: CharacterAIInput): string {
  const lines: string[] = [];
  lines.push(`이름: ${input.name}`);
  if (input.tagline)          lines.push(`소개: ${input.tagline}`);
  if (input.roles?.length)    lines.push(`역할: ${input.roles.join(", ")}`);
  if (input.keywords?.length) lines.push(`키워드: ${input.keywords.join(", ")}`);
  if (input.personality)      lines.push(`성격: ${input.personality.slice(0, 300)}`);
  if (input.background)       lines.push(`배경: ${input.background.slice(0, 200)}`);
  return lines.join("\n");
}

/**
 * Builds the character context string used for RAG-based stats generation.
 * All written wiki sections are collected and passed as retrieval context.
 */
function buildStatsContext(input: CharacterAIInput): string {
  const lines: string[] = [`캐릭터명: ${input.name}`];
  if (input.tagline)          lines.push(`한 줄 소개: ${input.tagline}`);
  if (input.roles?.length)    lines.push(`역할: ${input.roles.join(", ")}`);
  if (input.keywords?.length) lines.push(`키워드: ${input.keywords.join(", ")}`);
  if (input.overview)         lines.push(`\n[개요]\n${input.overview.slice(0, 400)}`);
  if (input.personality)      lines.push(`\n[성격/동기]\n${input.personality.slice(0, 500)}`);
  if (input.background)       lines.push(`\n[배경/역사]\n${input.background.slice(0, 500)}`);
  if (input.appearance)       lines.push(`\n[외모/인상]\n${input.appearance.slice(0, 300)}`);
  if (input.relations)        lines.push(`\n[관계]\n${input.relations.slice(0, 300)}`);
  if (input.notes)            lines.push(`\n[메모]\n${input.notes.slice(0, 200)}`);
  return lines.join("\n");
}

// ── Generate Image ────────────────────────────────────────────────────────

export const generateCharacterImage = async (
  input: CharacterAIInput,
): Promise<string> => {
  const apiKey = process.env.NANOBANANA_API_KEY;
  if (!apiKey) throw new Error("NANOBANANA_API_KEY not configured");

  const prompt = buildImagePrompt(input);
  logger.info("Generating character image", { name: input.name });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1",
          safetyFilterLevel: "block_only_high",
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    logger.error("Image generation failed", { status: response.status, text });
    throw httpError("IMAGE_GENERATION", response.status);
  }

  const data = (await response.json()) as {
    predictions?: Array<{ bytesBase64Encoded: string; mimeType?: string }>;
  };

  const prediction = data.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) {
    throw new Error("IMAGE_GENERATION_EMPTY_RESPONSE");
  }

  logger.info("Character image generated", { name: input.name });
  return `data:${prediction.mimeType ?? "image/png"};base64,${prediction.bytesBase64Encoded}`;
};

// ── Generate Quote ────────────────────────────────────────────────────────

export const generateCharacterQuote = async (
  input: CharacterAIInput,
): Promise<string> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  logger.info("Generating character quote", { name: input.name });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "당신은 웹소설 작가를 돕는 캐릭터 전문가입니다. 주어진 캐릭터 정보를 바탕으로, 그 캐릭터가 작중에서 실제로 할 법한 인상적이고 특징적인 대사 한 줄을 한국어로 생성해주세요. 대사 본문만 출력하세요. 따옴표나 설명 없이.",
        },
        { role: "user", content: buildQuoteContext(input) },
      ],
      max_tokens: 150,
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error("Quote generation failed", { status: response.status, text });
    throw httpError("QUOTE_GENERATION", response.status);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const quote = data.choices?.[0]?.message?.content?.trim();
  if (!quote) throw new Error("QUOTE_GENERATION_EMPTY_RESPONSE");

  logger.info("Character quote generated", { name: input.name });
  return quote;
};

// ── Generate Stats (RAG) ──────────────────────────────────────────────────

/**
 * RAG-based character stats generation.
 *
 * Retrieval  — all written wiki sections for the character are collected
 *              and passed as context (no vector store needed at this scale).
 * Generation — GPT-4o-mini reads the context and scores each radar axis.
 *
 * The axes array is mutated only on value; labels and order are preserved.
 */
export const generateCharacterStats = async (
  input: CharacterStatsInput,
): Promise<RadarAxis[]> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const { axes, ...characterInput } = input;
  const axisLabels = axes.map((a) => a.label).join(", ");
  const context = buildStatsContext(characterInput);

  logger.info("Generating character stats", { name: input.name, axes: axisLabels });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: [
            "당신은 웹소설 캐릭터 분석 전문가입니다.",
            "주어진 캐릭터 위키 정보를 읽고, 각 평가 항목에 대해 0~10 사이의 정수 값을 매겨주세요.",
            "내용이 없는 항목은 5로 기본 설정하세요.",
            '반드시 JSON 형식으로만 응답하세요: {"axes": [{"label": "항목명", "value": 숫자}]}',
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `평가 항목: ${axisLabels}`,
            "",
            context,
          ].join("\n"),
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error("Stats generation failed", { status: response.status, text });
    throw httpError("STATS_GENERATION", response.status);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("STATS_GENERATION_EMPTY_RESPONSE");

  const parsed = JSON.parse(content) as { axes?: RadarAxis[] };
  if (!Array.isArray(parsed.axes)) throw new Error("STATS_GENERATION_INVALID_FORMAT");

  // Merge: preserve original axis order/labels, clamp values to 0–10
  const result = axes.map((axis) => {
    const scored = parsed.axes!.find((s) => s.label === axis.label);
    if (!scored) return axis;
    return { ...axis, value: Math.min(10, Math.max(0, Math.round(scored.value))) };
  });

  logger.info("Character stats generated", { name: input.name });
  return result;
};
