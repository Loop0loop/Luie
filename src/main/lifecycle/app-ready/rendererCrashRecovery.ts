import { app, dialog } from "electron";
import type { WebContents } from "electron";
import type { createLogger } from "../../../shared/logger/index.js";
import { windowManager } from "../../app/windows/index.js";

type Logger = ReturnType<typeof createLogger>;

export const handleRendererCrash = async (
  logger: Logger,
  webContents: WebContents,
  killed: boolean,
): Promise<void> => {
  logger.error("Renderer process crashed", {
    killed,
    webContentsId: webContents.id,
  });
  if (!windowManager.isMainWindowWebContentsId(webContents.id)) return;

  try {
    const { autoSaveManager } =
      await import("../../domains/manuscript/index.js");
    await autoSaveManager.flushCritical();
    logger.info("Emergency save completed after crash");
  } catch (error) {
    logger.error("Failed to save during crash recovery", error);
  }

  const mainWindow = windowManager.getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const response = await dialog.showMessageBox(mainWindow, {
    type: "error",
    title: "앱이 예기치 않게 종료되었습니다",
    message: "렌더러 프로세스가 충돌했습니다. 앱을 다시 시작하시겠습니까?",
    buttons: ["다시 시작", "종료"],
    defaultId: 0,
    cancelId: 1,
  });

  if (response.response === 0) mainWindow.reload();
  else app.quit();
};
