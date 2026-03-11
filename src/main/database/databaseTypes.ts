import type { PrismaClient as GeneratedPrismaClient } from "@prisma/client";

export interface PreparedDatabaseContext {
  dbPath: string;
  datasourceUrl: string;
  isPackaged: boolean;
  isTest: boolean;
}

export type PrismaRecord = Record<string, unknown>;

export type PrismaClient = GeneratedPrismaClient;
