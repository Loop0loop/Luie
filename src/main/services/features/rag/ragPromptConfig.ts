import path from "node:path";
import { readFile } from "node:fs/promises";
import { createLogger } from "../../../../shared/logger/index.js";
import { resolveUserDataPath } from "../../../utils/env/index.js";

const logger = createLogger("RagPromptConfig");

export type RagPromptConfig = {
  systemInstruction: string;
};

const DEFAULT_SYSTEM_INSTRUCTION = `당신은 Luie의 소설 집필 보조 AI입니다.
제공된 근거(E1..En)와 작품 컨텍스트 안에서만 답변하세요.
근거가 부족하면 "근거가 부족합니다"라고 명시하세요.
한국어 경어체로 간결하고 바로 활용 가능한 답변을 작성하세요.
컨텍스트에 없는 설정이나 사실을 만들어내지 마세요.`;

const DEFAULT_CONFIG: RagPromptConfig = {
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
};

const USER_CONFIG_FILE = "rag-qa-instruction.json";
const CONFIG_CACHE_TTL_MS = 10_000;
let configCache: { expiresAt: number; value: RagPromptConfig } | null = null;

function normalizeConfig(raw: unknown): RagPromptConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_CONFIG;
  const maybe = raw as { systemInstruction?: unknown };
  if (
    typeof maybe.systemInstruction !== "string" ||
    maybe.systemInstruction.trim().length === 0
  ) {
    return DEFAULT_CONFIG;
  }
  return {
    systemInstruction: maybe.systemInstruction.trim(),
  };
}

export async function loadRagPromptConfig(): Promise<RagPromptConfig> {
  const now = Date.now();
  if (configCache && configCache.expiresAt > now) {
    return configCache.value;
  }
  const filePath = path.join(resolveUserDataPath(), USER_CONFIG_FILE);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const config = normalizeConfig(parsed);
    configCache = {
      expiresAt: now + CONFIG_CACHE_TTL_MS,
      value: config,
    };
    logger.info("Loaded custom RAG prompt config", { filePath });
    return config;
  } catch {
    configCache = {
      expiresAt: now + CONFIG_CACHE_TTL_MS,
      value: DEFAULT_CONFIG,
    };
    return DEFAULT_CONFIG;
  }
}
