import { api } from "@shared/api";
import { flushWorldEntityMutations } from "@renderer/shared/store/worldEntityMutationQueue";

export async function saveProjectNow(projectId: string): Promise<void> {
  await flushWorldEntityMutations();
  const response = await api.app.manualSave(projectId);
  if (!response.success) {
    throw new Error(response.error?.message ?? "Failed to save project");
  }
}
