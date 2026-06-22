import { createRequire } from "node:module";

const requireFn = createRequire(import.meta.url);

/**
 * Main process 및 utilityProcess 양쪽에서 안전하게 Electron app.isPackaged 여부를 가져옵니다.
 * utilityProcess 내부에서는 app 객체가 직접 로드되지 않으므로, 부모로부터 상속받은 환경 변수 분기를 사용합니다.
 */
export function isAppPackaged(): boolean {
  if (process.env.LUIE_APP_IS_PACKAGED === "1") return true;
  if (process.env.LUIE_APP_IS_PACKAGED === "0") return false;
  if (process.env.LUIE_IS_UTILITY_PROCESS === "1") {
    return false;
  }
  try {
    const electron = requireFn("electron") as {
      app?: { isPackaged?: boolean };
    };
    return electron.app?.isPackaged ?? false;
  } catch {
    return false;
  }
}
