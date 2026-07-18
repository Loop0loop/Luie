import { useEffect } from "react";
import { api } from "@shared/api";
import { flushSaveBuffers } from "@shared/ui/saveBufferRegistry";
import {
  flushWorldEntityMutations,
  getPendingWorldEntityMutationCount,
} from "@renderer/shared/store/worldEntityMutationQueue";

export function useProjectQuitFlush(): void {
  useEffect(
    () =>
      api.lifecycle.onBeforeQuit(({ requestId }) => {
        if (getPendingWorldEntityMutationCount() > 0) {
          api.lifecycle.setDirty(true);
        }
        void (async () => {
          await flushSaveBuffers();
          await flushWorldEntityMutations();
          api.lifecycle.setDirty(false);
          await api.lifecycle.completeFlush(requestId);
        })().catch((error) => {
          api.lifecycle.setDirty(true);
          void api.logger.error("Failed to flush renderer saves", { error });
        });
      }),
    [],
  );
}
