import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import os from 'node:os'
import path from 'node:path'

const resolveDefaultDbPath = (): string => {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library/Application Support/luie/luie.db')
  }

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData/Roaming')
    return path.join(appData, 'luie', 'luie.db')
  }

  const xdgConfig = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config')
  return path.join(xdgConfig, 'luie', 'luie.db')
}

const datasourceUrl = process.env.DATABASE_URL ?? `file:${resolveDefaultDbPath()}`
process.env.DATABASE_URL = datasourceUrl

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: datasourceUrl,
  },
})