import type { z } from "zod";
import type { IPCResponse } from "../../shared/ipc";
import { createErrorResponse } from "../../shared/ipc";
import { createLogger } from "../../shared/logger/index.js";

const logger = createLogger("Validation");

export async function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
): Promise<
  { success: true; data: T } | { success: false; error: IPCResponse<never> }
> {
  const result = schema.safeParse(input);
  if (!result.success) {
    logger.warn("Validation failed", result.error);
    return {
      success: false,
      error: createErrorResponse(
        "VAL_001",
        `Validation failed: ${result.error.issues.map((i) => i.message).join(", ")}`,
      ),
    };
  }
  return { success: true, data: result.data };
}
