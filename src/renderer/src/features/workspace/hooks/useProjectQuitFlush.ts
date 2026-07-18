import { useEffect } from "react";
import { api } from "@shared/api";
import {
  flushWorldEntityMutations,
  getPendingWorldEntityMutationCount,
} from "@renderer/shared/store/worldEntityMutationQueue";

export function useProjectQuitFlush(): void {
  useEffect(
    () =>
      api.lifecycle.onBeforeQuit(() => {
        if (getPendingWorldEntityMutationCount() > 0) {
          api.lifecycle.setDirty(true);
        }
        void flushWorldEntityMutations()
          .catch((error) => {
            void api.logger.error("Failed to flush world entity mutations", {
              error,
            });
          })
          .finally(() => api.lifecycle.completeFlush());
      }),
    [],
  );
}
