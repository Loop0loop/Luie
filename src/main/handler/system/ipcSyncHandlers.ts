import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import type * as SettingsManagerModule from "../../manager/settingsManager.js";
import type * as SupabaseEnvModule from "../../services/features/sync/supabaseEnv.js";
import {
  syncRuntimeConfigSetArgsSchema,
  syncRuntimeConfigValidateArgsSchema,
  syncResolveConflictArgsSchema,
  syncSetAutoArgsSchema,
} from "../../../shared/schemas/index.js";
import type { RuntimeSupabaseConfig } from "../../../shared/types/index.js";
import { syncService } from "../../services/features/sync/syncService.js";

const loadSettingsManager = (() => {
  let cached: Promise<typeof SettingsManagerModule> | null = null;
  return async () => {
    if (!cached) {
      cached = import("../../manager/settingsManager.js");
    }
    return cached;
  };
})();

const loadSupabaseEnvModule = (() => {
  let cached: Promise<typeof SupabaseEnvModule> | null = null;
  return async () => {
    if (!cached) {
      cached = import("../../services/features/sync/supabaseEnv.js");
    }
    return cached;
  };
})();

export function registerSyncIPCHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.SYNC_GET_STATUS,
      logTag: "SYNC_GET_STATUS",
      failMessage: "Failed to get sync status",
      handler: async () => syncService.getStatus(),
    },
    {
      channel: IPC_CHANNELS.SYNC_CONNECT_GOOGLE,
      logTag: "SYNC_CONNECT_GOOGLE",
      failMessage: "Failed to start Google sync connect",
      handler: async () => syncService.connectGoogle(),
    },
    {
      channel: IPC_CHANNELS.SYNC_DISCONNECT,
      logTag: "SYNC_DISCONNECT",
      failMessage: "Failed to disconnect sync account",
      handler: async () => syncService.disconnect(),
    },
    {
      channel: IPC_CHANNELS.SYNC_RUN_NOW,
      logTag: "SYNC_RUN_NOW",
      failMessage: "Failed to run sync",
      handler: async () => syncService.runNow(),
    },
    {
      channel: IPC_CHANNELS.SYNC_SET_AUTO,
      logTag: "SYNC_SET_AUTO",
      failMessage: "Failed to update auto sync setting",
      argsSchema: syncSetAutoArgsSchema,
      handler: async (settings: { enabled: boolean }) =>
        syncService.setAutoSync(settings.enabled),
    },
    {
      channel: IPC_CHANNELS.SYNC_RESOLVE_CONFLICT,
      logTag: "SYNC_RESOLVE_CONFLICT",
      failMessage: "Failed to resolve sync conflict",
      argsSchema: syncResolveConflictArgsSchema,
      handler: async (resolution: {
        type: "chapter" | "memo";
        id: string;
        resolution: "local" | "remote";
      }) => syncService.resolveConflict(resolution),
    },
    {
      channel: IPC_CHANNELS.SYNC_GET_RUNTIME_CONFIG,
      logTag: "SYNC_GET_RUNTIME_CONFIG",
      failMessage: "Failed to get runtime Supabase config",
      handler: async () => {
        const [{ settingsManager }, supabaseEnv] = await Promise.all([
          loadSettingsManager(),
          loadSupabaseEnvModule(),
        ]);
        return settingsManager.getRuntimeSupabaseConfigView({
          source: supabaseEnv.getSupabaseConfigSource() ?? undefined,
        });
      },
    },
    {
      channel: IPC_CHANNELS.SYNC_SET_RUNTIME_CONFIG,
      logTag: "SYNC_SET_RUNTIME_CONFIG",
      failMessage: "Failed to set runtime Supabase config",
      argsSchema: syncRuntimeConfigSetArgsSchema,
      handler: async (config: RuntimeSupabaseConfig) => {
        const [{ settingsManager }, supabaseEnv] = await Promise.all([
          loadSettingsManager(),
          loadSupabaseEnvModule(),
        ]);
        const validation = supabaseEnv.setRuntimeSupabaseConfig(config);
        if (!validation.valid) {
          return {
            url: null,
            hasAnonKey: false,
            source: "runtime" as const,
          };
        }
        return settingsManager.getRuntimeSupabaseConfigView({
          source: "runtime",
        });
      },
    },
    {
      channel: IPC_CHANNELS.SYNC_VALIDATE_RUNTIME_CONFIG,
      logTag: "SYNC_VALIDATE_RUNTIME_CONFIG",
      failMessage: "Failed to validate runtime Supabase config",
      argsSchema: syncRuntimeConfigValidateArgsSchema,
      handler: async (config: Partial<RuntimeSupabaseConfig>) =>
        (await loadSupabaseEnvModule()).validateRuntimeSupabaseConfig(config),
    },
  ]);
}
