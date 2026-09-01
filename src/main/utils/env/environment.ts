import { createRequire } from "node:module";

const requireFn = createRequire(import.meta.url);

const resolveIsPackaged = (): boolean => {
  if (process.env.LUIE_APP_IS_PACKAGED === "1") return true;
  if (process.env.LUIE_APP_IS_PACKAGED === "0") return false;
  if (process.type !== "browser") {
    return process.env.NODE_ENV === "production";
  }
  try {
    const electron = requireFn("electron") as {
      app?: { isPackaged?: boolean };
    };
    return Boolean(electron.app?.isPackaged);
  } catch {
    return process.env.NODE_ENV === "production";
  }
};

export const isTestEnv = () =>
  process.env.VITEST === "true" || process.env.NODE_ENV === "test";

// dev:wizard 스크립트 전용. completedAt 같은 로컬 상태와 무관하게 위저드 창을
// 항상 먼저 띄우고, 완료 처리도 설정을 건드리지 않는다(isStartupWizardForced 참조).
export const isStartupWizardForced = () =>
  process.env.LUIE_FORCE_STARTUP_WIZARD === "1";

export const isDevEnv = () => !resolveIsPackaged() && !isTestEnv();

export const isProdEnv = () => resolveIsPackaged();
