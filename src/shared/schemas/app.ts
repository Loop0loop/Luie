import { z } from "zod";
import { LARGE_TEXT_MAX_LENGTH, chapterIdSchema, projectIdSchema } from "./common";

const loggerLogEntrySchema = z.strictObject({
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string().min(1).max(LARGE_TEXT_MAX_LENGTH),
  data: z.unknown().optional(),
});
export const loggerLogArgsSchema = z.tuple([loggerLogEntrySchema]);
export const loggerLogBatchArgsSchema = z.tuple([
  z.array(loggerLogEntrySchema).max(1000),
]);
export const analysisStartArgsSchema = z.tuple([
  z.object({
    chapterId: chapterIdSchema,
    projectId: projectIdSchema,
  }),
]);
export const recoveryRunDbArgsSchema = z.tuple([
  z
    .strictObject({
      dryRun: z.boolean().optional(),
    })
    .optional(),
]);

export const dbRecoveryCheckpointSchema = z.object({
  busy: z.number(),
  log: z.number(),
  checkpointed: z.number(),
});

export const dbRecoveryFileStatusSchema = z.object({
  path: z.string(),
  exists: z.boolean(),
  sizeBytes: z.number().optional(),
  modifiedAt: z.string().optional(),
});

export const dbRecoveryStatusSchema = z.object({
  available: z.boolean(),
  reason: z.enum(["ready", "wal-missing", "db-missing"]),
  checkedAt: z.string(),
  backupRootDir: z.string(),
  latestBackupDir: z.string().optional(),
  database: dbRecoveryFileStatusSchema,
  wal: dbRecoveryFileStatusSchema,
  shm: dbRecoveryFileStatusSchema,
  preview: z
    .object({
      projectTitle: z.string().optional(),
      chapterTitle: z.string().optional(),
      chapterUpdatedAt: z.string().optional(),
      excerpt: z.string().optional(),
    })
    .optional(),
});

export const dbRecoveryResultSchema = z.object({
  success: z.boolean(),
  dryRun: z.boolean(),
  message: z.string(),
  backupDir: z.string().optional(),
  checkpoint: z.array(dbRecoveryCheckpointSchema).optional(),
  integrity: z.array(z.string()).optional(),
});

export const appBootstrapStatusSchema = z.object({
  isReady: z.boolean(),
  error: z.string().optional(),
});

const startupCheckKeySchema = z.enum([
  "osPermission",
  "dataDirRW",
  "defaultLuiePath",
  "sqliteConnect",
  "sqliteWal",
  "supabaseRuntimeConfig",
  "supabaseSession",
]);

export const startupCheckSchema = z.object({
  key: startupCheckKeySchema,
  ok: z.boolean(),
  blocking: z.boolean(),
  detail: z.string().optional(),
  checkedAt: z.string(),
});

export const startupReadinessSchema = z.object({
  mustRunWizard: z.boolean(),
  checks: z.array(startupCheckSchema),
  reasons: z.array(startupCheckKeySchema),
  completedAt: z.string().optional(),
});
