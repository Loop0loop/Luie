import { ErrorCode } from "@shared/constants/errorCode";

/**
 * RAG QA 에러 코드를 사용자 친화 메시지로 정규화합니다.
 * raw 영어/스택 메시지를 그대로 노출하지 않습니다.
 */
export const normalizeChatError = (code: string | undefined): string => {
  switch (code) {
    case ErrorCode.RAG_QA_ABORTED:
      return "요청이 중단되었습니다.";
    case ErrorCode.RAG_QA_FAILED:
      return "분석 엔진을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    default:
      return "응답을 가져오지 못했습니다. 다시 시도해 주세요.";
  }
};
