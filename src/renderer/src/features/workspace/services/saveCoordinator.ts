import { api } from "@shared/api";
import { flushSaveBuffers } from "@shared/ui/saveBufferRegistry";
import { flushWorldEntityMutations } from "@renderer/shared/store/worldEntityMutationQueue";

export const PROJECT_SAVE_PERFORMANCE_MEASURE = "luie:project-save";
export const PROJECT_SAVE_FAILURE_PERFORMANCE_MEASURE =
  "luie:project-save:error";
export const PROJECT_SAVE_START_PERFORMANCE_MEASURE =
  "luie:project-save:start";

export async function saveProjectNow(projectId: string): Promise<void> {
  let startedAt: number | null;
  try {
    startedAt = performance.now();
    performance.measure(PROJECT_SAVE_START_PERFORMANCE_MEASURE, {
      start: startedAt,
      end: startedAt,
    });
  } catch {
    startedAt = null;
    // Performance measurement must never change save behavior.
  }
  let measureName = PROJECT_SAVE_FAILURE_PERFORMANCE_MEASURE;
  try {
    await flushSaveBuffers();
    await flushWorldEntityMutations();
    const response = await api.app.manualSave(projectId);
    if (!response.success) {
      throw new Error(response.error?.message ?? "Failed to save project");
    }
    measureName = PROJECT_SAVE_PERFORMANCE_MEASURE;
  } finally {
    if (startedAt !== null) {
      try {
        performance.measure(measureName, {
          start: startedAt,
          end: performance.now(),
        });
      } catch {
        // Performance measurement must never change save behavior.
      }
    }
  }
}
