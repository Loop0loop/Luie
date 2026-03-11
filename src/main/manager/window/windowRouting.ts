import type { BrowserWindow } from "electron"
import { app } from "electron"
import { join } from "path"

type LoggerLike = {
  info: (message: string, meta?: unknown) => void
  error: (message: string, meta?: unknown) => void
}

export type RendererRouteTarget = {
  hash?: string
  search?: string
}

export const getRendererEnvironment = () => {
  const isPackaged = app.isPackaged
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173"
  const useDevServer = !isPackaged && process.env.NODE_ENV !== "production"

  return {
    isPackaged,
    devServerUrl,
    useDevServer,
  }
}

const buildDevRendererUrl = (
  devServerUrl: string,
  route: RendererRouteTarget,
): string => {
  const url = new URL(devServerUrl.endsWith("/") ? devServerUrl : `${devServerUrl}/`)
  if (route.search) {
    url.search = route.search.startsWith("?")
      ? route.search.slice(1)
      : route.search
  }
  if (route.hash) {
    url.hash = route.hash.startsWith("#") ? route.hash : `#${route.hash}`
  }
  return url.toString()
}

export const loadRendererRoute = async (input: {
  baseDir: string
  label: string
  logger: LoggerLike
  route?: RendererRouteTarget
  window: BrowserWindow
}): Promise<{
  isPackaged: boolean
  useDevServer: boolean
}> => {
  const environment = getRendererEnvironment()
  const route = input.route ?? {}

  if (environment.useDevServer) {
    const url = buildDevRendererUrl(environment.devServerUrl, route)
    input.logger.info(`Loading ${input.label} (dev)`, { url })
    await input.window.loadURL(url)
    return environment
  }

  const indexPath = join(input.baseDir, "../renderer/index.html")
  input.logger.info(`Loading ${input.label} (prod)`, { path: indexPath })
  await input.window.loadFile(indexPath, {
    hash: route.hash?.startsWith("#") ? route.hash.slice(1) : route.hash,
    search: route.search,
  })
  return environment
}
