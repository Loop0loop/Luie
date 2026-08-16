import { createRequire } from "node:module";

const requireFn = createRequire(import.meta.url);

/** utilityProcess에는 `app` 객체가 없으므로 부모가 전달한 환경 변수로 packaged 상태를 판별한다. */
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
