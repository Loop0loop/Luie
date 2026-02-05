import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import path from 'node:path'

const resolveDefaultDbPath = (): string => {
  return path.join(process.cwd(), 'prisma', 'dev.db')
}

const datasourceUrl = process.env.DATABASE_URL ?? `file:${resolveDefaultDbPath()}`
process.env.DATABASE_URL = datasourceUrl

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: datasourceUrl,
  },
})