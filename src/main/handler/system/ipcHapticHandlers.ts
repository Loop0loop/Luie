import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import { macosHapticsService } from "../../services/features/macosHapticsService.js";

export function registerHapticIPCHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.WORLD_GRAPH_HAPTIC_FEEDBACK,
      logTag: "WORLD_GRAPH_HAPTIC_FEEDBACK",
      failMessage: "Failed to trigger haptic feedback",
      handler: () => macosHapticsService.performAlignmentFeedback(),
    },
  ]);
}
