import { useMemo } from "react";

type OAuthResultStatus = "success" | "error";
type OAuthSuccessReason = "STALE_CONNECTED";
type OAuthFailureReason = "NO_PENDING" | "EXPIRED" | "STATE_MISMATCH" | "UNKNOWN";

const KNOWN_SUCCESS_REASONS = new Set<OAuthSuccessReason>([
  "STALE_CONNECTED",
]);
const KNOWN_FAILURE_REASONS = new Set<OAuthFailureReason>([
  "NO_PENDING",
  "EXPIRED",
  "STATE_MISMATCH",
  "UNKNOWN",
]);

const splitDetail = <TReason extends string>(detail: string | undefined, knownReasons: Set<TReason>): {
  reason?: TReason;
  message?: string;
} => {
  if (!detail) return {};
  const colonIndex = detail.indexOf(":");
  const reasonCandidate = (colonIndex >= 0 ? detail.slice(0, colonIndex) : detail).trim() as TReason;
  if (!knownReasons.has(reasonCandidate)) {
    return { message: detail };
  }
  const reason = reasonCandidate;
  const message = colonIndex >= 0 ? detail.slice(colonIndex + 1).trim() : undefined;
  return { reason, message };
};

const parseOAuthResult = (): {
  status: OAuthResultStatus;
  detail?: string;
  successReason?: OAuthSuccessReason;
  reason?: OAuthFailureReason;
  detailMessage?: string;
} => {
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  const hashQueryStart = hash.indexOf("?");
  const hashQuery = hashQueryStart >= 0 ? hash.slice(hashQueryStart + 1) : "";
  const hashParams = new URLSearchParams(hashQuery);
  const statusParam = searchParams.get("status") ?? hashParams.get("status");
  const detailParam = searchParams.get("detail") ?? hashParams.get("detail");
  const status = statusParam === "success" ? "success" : "error";

  if (status === "success") {
    const parsedSuccessDetail = splitDetail(detailParam ?? undefined, KNOWN_SUCCESS_REASONS);
    const detailMessage =
      parsedSuccessDetail.reason === "STALE_CONNECTED"
        ? "앱이 이미 연결된 상태여서 이전 로그인 콜백을 안전하게 무시했습니다."
        : undefined;

    return {
      status,
      detail: parsedSuccessDetail.message ?? detailParam ?? undefined,
      successReason: parsedSuccessDetail.reason,
      detailMessage,
    };
  }

  const parsedFailureDetail = splitDetail(detailParam ?? undefined, KNOWN_FAILURE_REASONS);
  const detailMessage =
    parsedFailureDetail.reason === "NO_PENDING"
      ? "앱에 대기 중인 로그인 요청이 없습니다. 로그인 버튼을 다시 눌러 주세요."
      : parsedFailureDetail.reason === "EXPIRED"
        ? "로그인 요청이 만료되었습니다. 앱에서 다시 로그인해 주세요."
        : parsedFailureDetail.reason === "STATE_MISMATCH"
          ? "로그인 보안 검증(state)이 일치하지 않았습니다. 앱에서 다시 로그인해 주세요."
          : parsedFailureDetail.reason === "UNKNOWN"
            ? "알 수 없는 이유로 로그인 콜백 처리에 실패했습니다."
            : undefined;

  return {
    status,
    detail: parsedFailureDetail.message ?? detailParam ?? undefined,
    reason: parsedFailureDetail.reason,
    detailMessage,
  };
};

export default function OAuthResultPage() {
  const result = useMemo(() => parseOAuthResult(), []);
  const isSuccess = result.status === "success";

  return (
    <div className="min-h-screen bg-app text-fg flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-panel p-8 shadow-lg">
        <h1 className="text-3xl font-semibold tracking-tight">
          {isSuccess ? "연결되었습니다!" : "연결에 실패했습니다"}
        </h1>
        <p className="mt-3 text-sm text-muted leading-6">
          {isSuccess
            ? "Google 계정 연결이 완료되었습니다. 아래 버튼을 눌러 Luie 앱으로 돌아가세요."
            : "로그인 처리가 완료되지 않았습니다. 앱으로 돌아가 다시 시도해 주세요."}
        </p>

        {result.detailMessage && (
          <p className="mt-4 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg">
            {result.detailMessage}
          </p>
        )}

        {result.detail && !isSuccess && (
          <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-surface p-3 text-xs text-muted">
            {result.detail}
          </pre>
        )}

        <a
          href="luie://auth/return"
          className="mt-6 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          앱으로 돌아가기
        </a>
        <p className="mt-3 text-xs text-muted">
          버튼이 동작하지 않으면 Luie 앱을 직접 열어 주세요.
        </p>
      </div>
    </div>
  );
}
