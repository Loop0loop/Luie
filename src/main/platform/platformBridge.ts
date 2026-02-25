import { app, BrowserWindow, ipcMain } from "electron";
import type { IpcMainInvokeEvent } from "electron";

type IpcInvokeHandler = (
  event: IpcMainInvokeEvent,
  ...args: unknown[]
) => unknown;

export interface PlatformBridge {
  runtime: "electron" | "electrobun";
  app: typeof app;
  BrowserWindow: typeof BrowserWindow;
  ipcMain: {
    handle: (channel: string, handler: IpcInvokeHandler) => void;
  };
}

export const platformBridge: PlatformBridge = {
  runtime: "electron",
  app,
  BrowserWindow,
  ipcMain: {
    handle: (channel, handler) => ipcMain.handle(channel, handler),
  },
};
