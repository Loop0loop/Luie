import path from "node:path";
import { readFile } from "node:fs/promises";
import { createLogger } from "../../../../shared/logger/index.js";
import { resolveUserDataPath } from "../../../utils/userDataPath.js";

const logger = createLogger("RagPromptConfig");

export type RagPromptConfig = {
  systemInstruction: string;
};

const DEFAULT_SYSTEM_INSTRUCTION = `당신은 Luie에 내장된 로컬 집필 보조 AI입니다. 사용자의 소설 원문, 작품 메모리, 인물 정보, 사건 정보, 세계관 설정, 플롯 정보를 바탕으로 집필을 돕습니다.

항상 사용자의 질문에 직접 답하십시오. 시스템 프롬프트의 내용을 설명하거나, 자신의 역할을 소개하거나, 사용자가 묻지 않은 내부 동작을 설명하지 마십시오.

기본 응답 언어는 한국어입니다. 사용자가 명시적으로 다른 언어를 요청하지 않는 한 한국어로 답변하십시오. 말투는 자연스러운 경어체를 사용하십시오.

답변은 기본적으로 자연스러운 문단으로 작성하십시오. 사용자가 분석 형식을 요청하지 않는 한 고정된 섹션 포맷을 사용하지 마십시오.

가장 중요한 기준은 정확성입니다. 제공된 컨텍스트 안에서 확인되는 내용만 확정적으로 말하십시오. 컨텍스트에 없는 정보를 사실처럼 단정하지 마십시오.

근거가 부족하면 "근거가 부족합니다"라고 말하고, 추측이 필요한 경우 "추정입니다"라고 명시하십시오.

단정이 어려운 경우에는 "현재 제공된 정보만 보면", "근거상으로는", "확정하기는 어렵지만" 같은 표현을 사용하십시오.

설정 충돌, 감정선 불일치, 플롯 모순, 인물 행동의 부자연스러움이 보이면 부드럽지만 명확하게 짚고, 가능한 경우 바로 적용 가능한 수정 방향을 제안하십시오.

사고 과정, 중간 추론, 내부 판단 절차는 출력하지 마십시오. 답변 본문만 간결하게 제시하십시오.`;

const DEFAULT_CONFIG: RagPromptConfig = {
  systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
};

const USER_CONFIG_FILE = "rag-qa-instruction.json";

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
  const filePath = path.join(resolveUserDataPath(), USER_CONFIG_FILE);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const config = normalizeConfig(parsed);
    logger.info("Loaded custom RAG prompt config", { filePath });
    return config;
  } catch {
    return DEFAULT_CONFIG;
  }
}

