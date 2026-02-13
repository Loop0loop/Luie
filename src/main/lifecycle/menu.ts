import { Menu } from "electron";
import type { MenuItemConstructorOptions } from "electron";
import type { WindowMenuBarMode } from "../../shared/types/index.js";

const createMenuTemplate = (): MenuItemConstructorOptions[] => {
  const fileMenu: MenuItemConstructorOptions = {
    label: "File",
    submenu:
      process.platform === "darwin"
        ? [{ role: "close" }]
        : [{ role: "close" }, { role: "quit" }],
  };

  return process.platform === "darwin"
    ? [
        { role: "appMenu" },
        fileMenu,
        { role: "editMenu" },
        { role: "viewMenu" },
        { role: "windowMenu" },
      ]
    : [fileMenu, { role: "editMenu" }, { role: "viewMenu" }, { role: "windowMenu" }, { role: "help" }];
};

export const applyApplicationMenu = (mode: WindowMenuBarMode): void => {
  if (mode === "hidden") {
    Menu.setApplicationMenu(null);
    return;
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(createMenuTemplate()));
};
