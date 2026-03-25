import { api } from "@shared/api";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";

export async function refreshWorldGraph(
  projectId: string | null | undefined,
): Promise<void> {
  if (!projectId) {
    return;
  }

  try {
    await useWorldBuildingStore.getState().loadGraph(projectId);
  } catch (error) {
    await api.logger.warn("Failed to refresh world graph after mutation", {
      projectId,
      error,
    });
  }
}
