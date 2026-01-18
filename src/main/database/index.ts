/**
 * Database service using Prisma Client
 */

import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { createLogger } from '../../shared/logger/index.js'

const logger = createLogger('DatabaseService')

class DatabaseService {
  private static instance: DatabaseService
  private prisma: PrismaClient

  private constructor() {
    const url = process.env.DATABASE_URL ?? 'file:./prisma/luie.db'
    const adapter = new PrismaBetterSqlite3({ url })

    this.prisma = new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    })
    logger.info('Database service initialized')
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  getClient(): PrismaClient {
    return this.prisma
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
    logger.info('Database disconnected')
  }
}

export const db = DatabaseService.getInstance()
