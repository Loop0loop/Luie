import { ErrorCode } from "@shared/constants/errors";
import { i18n } from "@renderer/i18n";

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
