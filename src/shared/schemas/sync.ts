import { z } from "zod";

export const syncConflictSummarySchema = z.object({
  chapters: z.number().int().nonnegative(),
  memos: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  items: z
    .array(
      z.object({
        type: z.enum(["chapter", "memo"]),
        id: z.string().min(1),
        projectId: z.string().min(1),
        title: z.string(),
        localUpdatedAt: z.string(),
        remoteUpdatedAt: z.string(),
        localPreview: z.string(),
        remotePreview: z.string(),
      }),
    )
    .optional(),
});

export const syncStatusSchema = z.object({
  connected: z.boolean(),
  provider: z.enum(["google"]).optional(),
  email: z.string().email().optional(),
  userId: z.string().uuid().optional(),
  expiresAt: z.string().optional(),
  autoSync: z.boolean(),
  lastSyncedAt: z.string().optional(),
  lastError: z.string().optional(),
  mode: z.enum(["idle", "connecting", "syncing", "error"]),
  health: z.enum(["connected", "degraded", "disconnected"]),
  degradedReason: z.string().optional(),
  inFlight: z.boolean(),
  queued: z.boolean(),
  conflicts: syncConflictSummarySchema,
  projectLastSyncedAtByProjectId: z.record(z.string(), z.string()).optional(),
  projectStateById: z
    .record(
      z.string(),
      z.object({
        state: z.enum(["synced", "pending", "error"]),
        lastSyncedAt: z.string().optional(),
        reason: z.string().optional(),
      }),
    )
    .optional(),
  lastRun: z
    .object({
      at: z.string(),
      pulled: z.number().int().nonnegative(),
      pushed: z.number().int().nonnegative(),
      conflicts: z.number().int().nonnegative(),
      success: z.boolean(),
      message: z.string(),
    })
    .optional(),
});

export const syncRunResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  pulled: z.number().int().nonnegative(),
  pushed: z.number().int().nonnegative(),
  conflicts: syncConflictSummarySchema,
  syncedAt: z.string().optional(),
});

export const syncSetAutoSchema = z.strictObject({
  enabled: z.boolean(),
});

export const syncSetAutoArgsSchema = z.tuple([syncSetAutoSchema]);

export const runtimeSupabaseConfigSchema = z.strictObject({
  url: z
    .string()
    .min(1)
    .max(1024)
    .refine((value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    }, "Supabase URL must be a valid http(s) URL"),
  anonKey: z.string().min(16).max(8096),
});

export const runtimeSupabaseConfigInputSchema = z.strictObject({
  url: z.string().max(1024).optional(),
  anonKey: z.string().max(8096).optional(),
});

export const runtimeSupabaseConfigViewSchema = z.object({
  url: z.string().nullable(),
  hasAnonKey: z.boolean(),
  source: z.enum(["env", "runtime", "legacy"]).optional(),
});

export const runtimeSupabaseConfigValidationSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.string()),
  normalized: runtimeSupabaseConfigSchema.optional(),
});

export const syncRuntimeConfigSetArgsSchema = z.tuple([
  runtimeSupabaseConfigSchema,
]);
export const syncRuntimeConfigValidateArgsSchema = z.tuple([
  runtimeSupabaseConfigInputSchema,
]);

export const syncResolveConflictSchema = z.strictObject({
  type: z.enum(["chapter", "memo"]),
  id: z.string().min(1),
  resolution: z.enum(["local", "remote"]),
});

export const syncResolveConflictArgsSchema = z.tuple([
  syncResolveConflictSchema,
]);
