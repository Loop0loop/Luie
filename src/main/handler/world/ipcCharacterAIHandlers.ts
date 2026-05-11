import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import {
  generateCharacterImage,
  generateCharacterQuote,
  generateCharacterStats,
  type CharacterAIInput,
  type CharacterStatsInput,
} from "../../services/features/characterAI/characterAIService.js";
import { z } from "zod";
import type { LoggerLike } from "../core/types.js";

// ── Shared schemas ────────────────────────────────────────────────────────

const characterAIInputSchema = z.object({
  name:        z.string().min(1),
  tagline:     z.string().optional(),
  roles:       z.array(z.string()).optional(),
  keywords:    z.array(z.string()).optional(),
  overview:    z.string().optional(),
  personality: z.string().optional(),
  background:  z.string().optional(),
  appearance:  z.string().optional(),
  relations:   z.string().optional(),
  notes:       z.string().optional(),
});

const radarAxisSchema = z.object({
  label: z.string().min(1),
  value: z.number().min(0).max(10),
});

const characterStatsInputSchema = characterAIInputSchema.extend({
  axes: z.array(radarAxisSchema).min(1).max(8),
});

// ── Registration ──────────────────────────────────────────────────────────

export function registerCharacterAIIPCHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
    {
      channel:     IPC_CHANNELS.CHARACTER_GENERATE_IMAGE,
      logTag:      "CHARACTER_GENERATE_IMAGE",
      failMessage: "Failed to generate character image",
      argsSchema:  z.tuple([characterAIInputSchema]),
      handler:     (input: CharacterAIInput) => generateCharacterImage(input),
    },
    {
      channel:     IPC_CHANNELS.CHARACTER_GENERATE_QUOTE,
      logTag:      "CHARACTER_GENERATE_QUOTE",
      failMessage: "Failed to generate character quote",
      argsSchema:  z.tuple([characterAIInputSchema]),
      handler:     (input: CharacterAIInput) => generateCharacterQuote(input),
    },
    {
      channel:     IPC_CHANNELS.CHARACTER_GENERATE_STATS,
      logTag:      "CHARACTER_GENERATE_STATS",
      failMessage: "Failed to generate character stats",
      argsSchema:  z.tuple([characterStatsInputSchema]),
      handler:     (input: CharacterStatsInput) => generateCharacterStats(input),
    },
  ]);
}
