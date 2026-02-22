import { useMemo } from "react";

type OAuthResultStatus = "success" | "error";

const parseOAuthResult = (): { status: OAuthResultStatus; detail?: string } => {
  const hash = window.location.hash;
  const queryStart = hash.indexOf("?");
  const query = queryStart >= 0 ? hash.slice(queryStart + 1) : "";
  const params = new URLSearchParams(query);
  const status = params.get("status") === "success" ? "success" : "error";
  const detail = params.get("detail") ?? undefined;
  return { status, detail };
};

export default function OAuthResultPage() {
  const result = useMemo(parseOAuthResult, []);
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
