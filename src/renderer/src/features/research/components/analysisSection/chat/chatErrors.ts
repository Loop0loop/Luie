import { ErrorCode } from "@shared/constants/errors";
import { i18n } from "@renderer/i18n";

/**
 * RAG QA 에러 코드를 사용자 친화 메시지로 정규화합니다.
 * raw 영어/스택 메시지를 그대로 노출하지 않습니다.
 */
export const normalizeChatError = (code: string | undefined): string => {
  switch (code) {
    case ErrorCode.RAG_QA_ABORTED:
      return i18n.t("analysis.chat.error.aborted");
    case ErrorCode.RAG_QA_FAILED:
      return i18n.t("analysis.chat.error.failed");
    default:
      return i18n.t("analysis.chat.error.default");
  }
};
