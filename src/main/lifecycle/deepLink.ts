import { shell } from "electron";
import { createLogger } from "../../shared/logger/index.js";
import { windowManager } from "../manager/index.js";
import { syncService } from "../services/features/syncService.js";

const logger = createLogger("DeepLink");

const OAUTH_CALLBACK_PREFIX = "luie://auth/callback";
const OAUTH_RETURN_PREFIX = "luie://auth/return";
const OAUTH_AUTH_PREFIX = "luie://auth/";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const focusMainWindow = (): void => {
  const mainWindow = windowManager.getMainWindow();
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
};

const buildAuthResultPageUrl = (status: "success" | "error", detail?: string): string => {
  const title = status === "success" ? "Luie 연결 완료" : "Luie 연결 오류";
  const heading = status === "success" ? "연결되었습니다!" : "연결에 실패했습니다";
  const message =
    status === "success"
      ? "Google 계정 연결이 완료되었습니다. 아래 버튼으로 앱으로 돌아가세요."
      : "로그인 처리가 완료되지 않았습니다. 앱으로 돌아가 다시 시도해 주세요.";
  const errorBlock =
    status === "error" && detail
      ? `<pre style="margin:12px 0 0;padding:10px;border-radius:10px;background:#f5f5f5;color:#4a4a4a;white-space:pre-wrap;word-break:break-word;">${escapeHtml(detail)}</pre>`
      : "";

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light; }
    body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:#f3f6fb; color:#101828; }
    .wrap { min-height:100vh; display:grid; place-items:center; padding:24px; }
    .card { width:min(560px,100%); background:#fff; border:1px solid #e7eaf0; border-radius:16px; padding:24px; box-shadow:0 10px 32px rgba(16,24,40,.08); }
    h1 { margin:0 0 8px; font-size:28px; line-height:1.2; }
    p { margin:0; color:#344054; line-height:1.5; }
    .btn { display:inline-block; margin-top:18px; padding:10px 16px; border-radius:10px; background:#2563eb; color:#fff; text-decoration:none; font-weight:600; }
    .help { margin-top:10px; font-size:13px; color:#667085; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>${heading}</h1>
      <p>${message}</p>
      <a class="btn" href="${OAUTH_RETURN_PREFIX}">앱으로 돌아가기</a>
      <div class="help">버튼이 동작하지 않으면 Luie 앱을 직접 열어주세요.</div>
      ${errorBlock}
    </div>
  </div>
</body>
</html>`;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
};

const openAuthResultPage = async (status: "success" | "error", detail?: string): Promise<void> => {
  try {
    await shell.openExternal(buildAuthResultPageUrl(status, detail));
  } catch (error) {
    logger.warn("Failed to open auth result page", { error, status });
  }
};

const classifyCallbackFailure = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("SYNC_AUTH_NO_PENDING_SESSION")) return "NO_PENDING";
  if (message.includes("SYNC_AUTH_REQUEST_EXPIRED")) return "EXPIRED";
  if (message.includes("SYNC_AUTH_STATE_MISMATCH")) return "STATE_MISMATCH";
  if (message.includes("bad_oauth_state")) return "STATE_MISMATCH";
  if (message.includes("OAuth callback with invalid state")) return "STATE_MISMATCH";
  return "UNKNOWN";
};

export const extractAuthCallbackUrl = (argv: string[]): string | null => {
  for (const arg of argv) {
    if (typeof arg !== "string") continue;
    if (arg.startsWith(OAUTH_AUTH_PREFIX)) {
      return arg;
    }
  }
  return null;
};

export const handleDeepLinkUrl = async (url: string): Promise<boolean> => {
  if (url.startsWith(OAUTH_RETURN_PREFIX)) {
    focusMainWindow();
    logger.info("OAuth return deep link handled", { url });
    return true;
  }

  if (!url.startsWith(OAUTH_CALLBACK_PREFIX)) {
    return false;
  }

  try {
    await syncService.handleOAuthCallback(url);
    focusMainWindow();
    void openAuthResultPage("success");
    logger.info("OAuth callback processed", { url });
    return true;
  } catch (error) {
    focusMainWindow();
    const message = error instanceof Error ? error.message : String(error);
    void openAuthResultPage("error", message);
    logger.error("Failed to process OAuth callback", {
      url,
      reason: classifyCallbackFailure(error),
      error,
    });
    return false;
  }
};
