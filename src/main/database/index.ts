/**
 * Database service using Prisma Client
 */

import { PrismaClient } from '@prisma/client'
import { createLogger } from '../../shared/logger/index.js'

const logger = createLogger('DatabaseService')

class DatabaseService {
  private static instance: DatabaseService
  private prisma: PrismaClient

  private constructor() {
    this.prisma = new PrismaClient({
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
