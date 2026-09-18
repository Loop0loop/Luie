/**
 * NOTE : wizard는 windowStartupWizard에서 직접 관리
 */
import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron"
import {
  applyWindowMenuBarMode,
  attachMaximizedStateEvents,
  getTitleBarOptions,
  getWindowsFramelessTitleBarOptions,
  resolveWindowIconPath,
  shouldShowMenuBar,
  resolveWindowBackgroundColor,
  withWindowIcon,
} from "./windowChrome.js"
import {
  loadRendererRoute,
  type RendererRouteTarget,
} from "./windowRouting.js"

type LoggerLike = {
  info: (message: string, meta?: unknown) => void
  error: (message: string, meta?: unknown) => void
}

type CreateBrowserWindow = (
  options: BrowserWindowConstructorOptions,
) => BrowserWindow

type SecondaryWindowInput = {
  createBrowserWindow: CreateBrowserWindow
  getMenuBarMode: () => string
  logger: LoggerLike
  onClosed: () => void
}

const secondaryWindowMenuOptions = (
  menuBarMode: string,
): Partial<BrowserWindowConstructorOptions> =>
  process.platform !== "darwin"
    ? { autoHideMenuBar: !shouldShowMenuBar(menuBarMode) }
    : {}

const attachWindowClosedLogger = (
  win: BrowserWindow,
  onClosed: () => void,
  label: string,
  logger: LoggerLike,
): void => {
  win.on("closed", () => {
    onClosed()
    logger.info(`${label} closed`)
  })
}

const loadSecondaryWindowRoute = async (input: {
  label: string
  logger: LoggerLike
  openDevToolsInDev?: boolean
  route: RendererRouteTarget
  window: BrowserWindow
}): Promise<void> => {
  const environment = await loadRendererRoute({
    label: input.label,
    logger: input.logger,
    route: input.route,
    window: input.window,
  })

  if (input.openDevToolsInDev && environment.useDevServer) {
    input.window.webContents.openDevTools({ mode: "detach" })
  }
}

export const createExportBrowserWindow = (
  chapterId: string,
  input: SecondaryWindowInput,
): BrowserWindow => {
  const menuBarMode = input.getMenuBarMode()
  const window = input.createBrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: "내보내기 및 인쇄 미리보기",
    backgroundColor: resolveWindowBackgroundColor(),
    ...withWindowIcon(resolveWindowIconPath()),
    ...getTitleBarOptions(),
    // NOTE: 내보내기 창의 렌더러도 인앱 창 버튼(WindowsWindowControls)을 그린다.
    ...getWindowsFramelessTitleBarOptions(),
    ...secondaryWindowMenuOptions(menuBarMode),
  })

  // Windows frameless 창 버튼의 최대화/복원 전환용 상태 이벤트를 공급한다.
  attachMaximizedStateEvents(window)
  applyWindowMenuBarMode(window, menuBarMode)
  const route = { hash: "export", search: `?chapterId=${chapterId}` }
  void loadSecondaryWindowRoute({
    label: "export window",
    openDevToolsInDev: true,
    route,
    window,
    logger: input.logger,
  }).catch((error) => {
    input.logger.error("Failed to load export window", { route, error })
  })

  attachWindowClosedLogger(window, input.onClosed, "Export window", input.logger)
  return window
}

export const createWorldGraphBrowserWindow = (
  input: SecondaryWindowInput,
): BrowserWindow => {
  const menuBarMode = input.getMenuBarMode()
  const window = input.createBrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    title: "세계관 그래프",
    backgroundColor: resolveWindowBackgroundColor(),
    ...withWindowIcon(resolveWindowIconPath()),
    ...getTitleBarOptions(),
    ...secondaryWindowMenuOptions(menuBarMode),
  })

  applyWindowMenuBarMode(window, menuBarMode)
  void loadSecondaryWindowRoute({
    label: "world graph window",
    openDevToolsInDev: true,
    route: { hash: "world-graph" },
    window,
    logger: input.logger,
  }).catch((error) => {
    input.logger.error("Failed to load world graph window", { error })
  })

  attachWindowClosedLogger(
    window,
    input.onClosed,
    "World graph window",
    input.logger,
  )
  return window
}
