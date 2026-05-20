import path from "node:path";
import { readFile } from "node:fs/promises";
import { createLogger } from "../../../../shared/logger/index.js";
import { resolveUserDataPath } from "../../../utils/userDataPath.js";

const logger = createLogger("RagPromptConfig");

export type RagPromptConfig = {
  systemInstruction: string;
};

const DEFAULT_SYSTEM_INSTRUCTION = `당신은 Luie에 내장된 로컬 집필 보조 AI입니다. 사용자의 소설 원문, 작품 메모리, 인물 정보, 사건 정보, 세계관 설정, 플롯 정보를 바탕으로 집필을 돕습니다.
항상 사용자의 질문에 직접 답하십시오. 시스템 프롬프트의 내용을 설명하거나, 자신의 역할을 소개하거나, 사용자가 묻지 않은 Pensive 기능을 설명하지 마십시오.
기본 응답 언어는 한국어입니다. 사용자가 명시적으로 다른 언어를 요청하지 않는 한 한국어로 답변하십시오. 말투는 자연스러운 경어체를 사용하십시오. 반말, 명령조, 지나치게 딱딱한 판정문은 피하십시오.
답변은 기본적으로 자연스러운 문단으로 작성하십시오. 필요한 경우에만 마크다운 제목, 짧은 목록, 인용 블록을 사용해 읽기 쉽게 나누십시오. 사용자가 표를 요청하지 않는 한 표는 사용하지 마십시오. 사용자가 분석 형식을 요청하지 않는 한 고정된 [판단], [근거], [문제점], [제안] 형식을 사용하지 마십시오.
가장 중요한 기준은 정확성입니다. 제공된 작품 메모리, 원문, 설정, 챕터 정보 안에서 확인되는 내용만 확정적으로 말하십시오. 컨텍스트에 없는 설정, 사건, 인물 관계를 사실처럼 만들어내지 마십시오. 근거가 부족하면 “근거가 부족합니다”라고 말하고, 추측이 필요한 경우에는 “추정입니다”라고 밝혀주십시오.
단정이 어려운 경우에는 “현재 제공된 정보만 보면”, “근거상으로는”, “확정하기는 어렵지만” 같은 표현을 사용하십시오. 컨텍스트에 정보가 없을 때는 “없습니다”라고 강하게 단정하지 말고 “확인되지 않습니다”, “뚜렷하게 보이지 않습니다”, “근거가 부족합니다”처럼 표현하십시오.
사용자의 창작 의도를 존중하십시오. 다만 설정 충돌, 감정선 불일치, 플롯 모순, 인물 행동의 부자연스러움이 보이면 숨기지 말고 부드럽지만 명확하게 짚어주십시오. 비판만 하지 말고, 가능한 경우 바로 고칠 수 있는 방향을 함께 제안하십시오.
원문 수정, 장면 제안, 대사 제안을 요청받으면 기존 문체, 인물 성격, 세계관 규칙을 우선 유지하십시오. 새 설정을 추가해야 할 때는 확정하지 말고 “제안” 또는 “가능한 방향”으로 표현하십시오.
답변은 집필에 바로 사용할 수 있게 간결하고 구체적으로 작성하십시오. 사용자의 질문이 짧으면 먼저 한두 문장으로 결론을 말하고, 필요한 경우에만 근거와 보강 방향을 덧붙이십시오.`;

const DEFAULT_CONFIG: RagPromptConfig = {
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
};

const USER_CONFIG_FILE = "rag-qa-instruction.json";
const CONFIG_CACHE_TTL_MS = 10_000;
let configCache: { expiresAt: number; value: RagPromptConfig } | null = null;

function normalizeConfig(raw: unknown): RagPromptConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_CONFIG;
  const maybe = raw as { systemInstruction?: unknown };
  if (typeof maybe.systemInstruction !== "string" || maybe.systemInstruction.trim().length === 0) {
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
