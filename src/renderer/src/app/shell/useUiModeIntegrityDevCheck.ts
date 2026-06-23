import { useEffect, useRef } from "react";

import { api } from "@shared/api";
import { useEditorStore } from "@renderer/domains/editor";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import {
  captureUiModeIntegritySnapshot,
  getUiModeIntegrityViolations,
  type UiModeIntegritySnapshot,
  type UiModeIntegrityUiState,
} from "@renderer/features/workspace/services/uiModeIntegrity";

export function useUiModeIntegrityDevCheck() {
  const uiModeIntegrityRef = useRef<UiModeIntegritySnapshot | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const uiState = useUIStore.getState();
    if (
      !uiState ||
      !uiState.regions ||
      !uiState.regions.leftSidebar ||
      !uiState.regions.rightPanel ||
      !uiState.regions.rightRail
    ) {
      return;
    }
    const integrityUiState: UiModeIntegrityUiState = {
      view: uiState.view,
      contextTab: uiState.contextTab,
      worldTab: uiState.worldTab,
      isSplitView: false,
      splitRatio: 0.5,
      splitSide: "right",
      leftSidebarOpen: uiState.regions.leftSidebar.open,
      rightPanelOpen: uiState.regions.rightPanel.open,
      isManuscriptMenuOpen: uiState.isManuscriptMenuOpen,
      rightPanelActiveTab: uiState.regions.rightPanel.activeTab,
      rightRailOpen: uiState.regions.rightRail.open,
    };
    const snapshot = captureUiModeIntegritySnapshot({
      editor: useEditorStore.getState(),
      ui: integrityUiState,
    });
    const previous = uiModeIntegrityRef.current;
    if (previous) {
      const violations = getUiModeIntegrityViolations(previous, snapshot);
      if (violations.length > 0) {
        void api.logger.warn("uiMode integrity violation detected", {
          from: previous.uiMode,
          to: snapshot.uiMode,
          violations,
        });
      }
    }

    uiModeIntegrityRef.current = snapshot;
  });
}
