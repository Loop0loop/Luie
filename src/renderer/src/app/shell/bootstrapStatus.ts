import { appBootstrapStatusSchema } from "@shared/schemas/index.js";
import type { AppBootstrapStatus } from "@shared/types/index.js";

export const parseBootstrapStatus = (value: unknown): AppBootstrapStatus | null => {
  const parsed = appBootstrapStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};
