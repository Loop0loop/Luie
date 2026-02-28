import { useState, lazy, Suspense, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import ProjectTemplateSelector from "@renderer/features/workspace/components/ProjectTemplateSelector";
import EditorRoot from "@renderer/features/workspace/components/EditorRoot";
import OAuthResultPage from "@renderer/features/auth/components/OAuthResultPage";
import WorldSection from "@renderer/features/research/components/WorldSection";

import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useProjectInit } from "@renderer/features/project/hooks/useProjectInit";
import { useDataRecoveryStore } from "@renderer/features/workspace/stores/useDataRecoveryStore";
import { useProjectTemplate } from "@renderer/features/project/hooks/useProjectTemplate";
import { useShortcutStore } from "@renderer/features/workspace/stores/shortcutStore";
import { useToast } from "@shared/ui/ToastContext";
import { appBootstrapStatusSchema } from "@shared/schemas/index.js";
import type { AppBootstrapStatus, AppQuitPhasePayload } from "@shared/types/index.js";
import { api } from "@shared/api";
import {
  captureUiModeIntegritySnapshot,
  getUiModeIntegrityViolations,
  type UiModeIntegrityUiState,
  type UiModeIntegritySnapshot,
} from "@renderer/features/workspace/services/uiModeIntegrity";
import {
  LUIE_PACKAGE_EXTENSION_NO_DOT,
  LUIE_PACKAGE_FILTER_NAME,
} from "@shared/constants/paths";

const ExportWindow = lazy(() => import("@renderer/features/export/components/ExportWindow"));

const parseBootstrapStatus = (value: unknown): AppBootstrapStatus | null => {
  const parsed = appBootstrapStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

type WindowMode = "app" | "export" | "oauth-result" | "world-graph";

const getWindowMode = (): WindowMode => {
  if (window.location.hash === "#export") return "export";
  if (window.location.hash === "#world-graph") return "world-graph";
  if (window.location.hash.startsWith("#auth-result")) return "oauth-result";
  return "app";
};

export default function App() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [bootstrapStatus, setBootstrapStatus] = useState<AppBootstrapStatus>({
    isReady: false,
  });
  const [isBootstrapLoading, setIsBootstrapLoading] = useState(true);
  const uiModeIntegrityRef = useRef<UiModeIntegritySnapshot | null>(null);
  const [windowMode, setWindowMode] = useState<WindowMode>(getWindowMode());
  const [quitPhase, setQuitPhase] = useState<AppQuitPhasePayload | null>(null);

  useEffect(() => {
    const checkHash = () => {
      setWindowMode(getWindowMode());
    };
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  const view = useUIStore((state) => state.view);
  const loadShortcuts = useShortcutStore((state) => state.loadShortcuts);
  const projects = useProjectStore((state) => state.items);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);
  const updateProject = useProjectStore((state) => state.updateProject);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const theme = useEditorStore((state) => state.theme);
  const themeTemp = useEditorStore((state) => state.themeTemp);
  const themeContrast = useEditorStore((state) => state.themeContrast);
  const themeAccent = useEditorStore((state) => state.themeAccent);
  const themeTexture = useEditorStore((state) => state.themeTexture);

  const refreshBootstrapStatus = useCallback(async () => {
    setIsBootstrapLoading(true);
    try {
      const response = await api.app.getBootstrapStatus();
      const parsed = parseBootstrapStatus(response.data);
      if (response.success && parsed) {
        setBootstrapStatus(parsed);
        return;
      }

      setBootstrapStatus({
        isReady: false,
        error: t("bootstrap.fetchFailed"),
      });
    } catch {
      setBootstrapStatus({
        isReady: false,
        error: t("bootstrap.fetchFailed"),
      });
    } finally {
      setIsBootstrapLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refreshBootstrapStatus();
    const unsubscribe = api.app.onBootstrapStatus((status) => {
      const parsed = parseBootstrapStatus(status);
      if (!parsed) return;
      setBootstrapStatus(parsed);
      setIsBootstrapLoading(false);
    });
    return unsubscribe;
  }, [refreshBootstrapStatus]);

  const { currentProject } = useProjectInit(bootstrapStatus.isReady);

  useEffect(() => {
    const unsubscribe = api.lifecycle.onQuitPhase((payload) => {
      if (!payload || typeof payload !== "object") return;
      const next = payload as Partial<AppQuitPhasePayload>;
      if (typeof next.phase !== "string") return;
      setQuitPhase({
        phase: next.phase as AppQuitPhasePayload["phase"],
        message: typeof next.message === "string" ? next.message : undefined,
      });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeTemp) document.documentElement.setAttribute("data-temp", themeTemp);
    if (themeContrast) document.documentElement.setAttribute("data-contrast", themeContrast);
    if (themeAccent) document.documentElement.setAttribute("data-accent", themeAccent);
    document.documentElement.setAttribute("data-texture", String(themeTexture));
  }, [theme, themeTemp, themeContrast, themeAccent, themeTexture]);

  useEffect(() => {
    if (!bootstrapStatus.isReady) return;
    void loadShortcuts();
  }, [bootstrapStatus.isReady, loadShortcuts]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const uiState = useUIStore.getState();
    const integrityUiState: UiModeIntegrityUiState = {
      view: uiState.view,
      contextTab: uiState.contextTab,
      worldTab: uiState.worldTab,
      isSplitView: false,
      splitRatio: 0.5,
      splitSide: "right",
      isSidebarOpen: uiState.isSidebarOpen,
      isContextOpen: uiState.isContextOpen,
      isManuscriptMenuOpen: uiState.isManuscriptMenuOpen,
      docsRightTab: uiState.docsRightTab,
      isBinderBarOpen: uiState.isBinderBarOpen,
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

  const { setView } = useUIStore();

  const { handleSelectProject } = useProjectTemplate((_id: string) => { });

  const handleOpenExistingProject = useCallback(
    async (project: (typeof projects)[number]) => {
      if (project.pathMissing) {
        showToast(t("settings.projectTemplate.pathMissingDescription"), "info");
        return;
      }
      try {
        let nextProject = project;
        const projectPath = project.projectPath ?? "";
        if (projectPath.toLowerCase().endsWith(".luie")) {
          const approved = await api.fs.approveProjectPath(projectPath);
          if (approved.success && approved.data?.normalizedPath) {
            const normalizedPath = approved.data.normalizedPath;
            if (normalizedPath !== projectPath) {
              await updateProject(project.id, undefined, undefined, normalizedPath);
              nextProject = { ...project, projectPath: normalizedPath };
            }
          }
        }
        setCurrentProject(nextProject);
        setView("editor");
      } catch (error) {
        api.logger.error("Failed to open existing project", {
          projectId: project.id,
          error,
        });
        showToast(t("settings.projectTemplate.toast.pathRepairFailed"), "error");
      }
    },
    [setCurrentProject, setView, showToast, t, updateProject],
  );

  useEffect(() => {
    if (!currentProject?.pathMissing) return;
    showToast(t("settings.projectTemplate.pathMissingDescription"), "info");
    setCurrentProject(null);
    setView("template");
  }, [currentProject, setCurrentProject, setView, showToast, t]);

  const handleOpenLuieFile = useCallback(async () => {
    try {
      const response = await api.fs.selectFile({
        title: t("home.projectTemplate.actions.openLuie"),
        filters: [{ name: LUIE_PACKAGE_FILTER_NAME, extensions: [LUIE_PACKAGE_EXTENSION_NO_DOT] }],
      });

      if (!response.success || !response.data) {
        return;
      }

      const selectedPath = response.data;
      const imported = await api.project.openLuie(selectedPath);
      if (imported.success && imported.data) {
        const approved = await api.fs.approveProjectPath(
          imported.data.project.projectPath ?? selectedPath,
        );
        const normalizedPath =
          approved.success && approved.data?.normalizedPath
            ? approved.data.normalizedPath
            : imported.data.project.projectPath ?? selectedPath;
        if (normalizedPath !== imported.data.project.projectPath) {
          await updateProject(imported.data.project.id, undefined, undefined, normalizedPath);
        }
        setCurrentProject({
          ...imported.data.project,
          projectPath: normalizedPath,
        });
        setView("editor");
        if (imported.data.recovery) {
          useDataRecoveryStore.getState().setRecoveryState(true, imported.data.recoveryReason, imported.data.recoveryPath);
        }
      }
    } catch (error) {
      api.logger.error("Failed to open luie file", error);
    }
  }, [setCurrentProject, setView, t, updateProject]);

  const handleOpenSnapshotBackup = useCallback(async () => {
    try {
      const response = await api.fs.selectSnapshotBackup();
      if (!response.success || !response.data) {
        return;
      }

      const importResult = await api.snapshot.importFromFile(response.data);
      if (importResult.success && importResult.data) {
        await loadProjects();
        setCurrentProject(importResult.data);
        setView("editor");
      }
    } catch (error) {
      api.logger.error("Failed to import snapshot backup", error);
    }
  }, [loadProjects, setCurrentProject, setView]);

  const shouldBlockUiForQuit =
    quitPhase !== null &&
    quitPhase.phase !== "idle" &&
    quitPhase.phase !== "aborted" &&
    quitPhase.phase !== "completed";

  const quitOverlayMessage =
    quitPhase?.message ??
    t("bootstrap.initializing");

  const quitOverlay = shouldBlockUiForQuit ? (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-panel p-6 shadow-lg">
        <p className="text-base font-semibold text-fg">
          {t("bootstrap.quit")}
        </p>
        <p className="mt-2 text-sm text-muted">
          {quitOverlayMessage}
        </p>
      </div>
    </div>
  ) : null;

  if (windowMode === "export") {
    return (
      <>
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#333] text-white">{t("loading")}</div>}>
          <ExportWindow />
        </Suspense>
        {quitOverlay}
      </>
    );
  }

  if (windowMode === "oauth-result") {
    return (
      <>
        <OAuthResultPage />
        {quitOverlay}
      </>
    );
  }

  if (windowMode === "world-graph") {
    return (
      <>
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-app text-fg">{t("loading")}</div>}>
          <div className="w-screen h-screen bg-app overflow-hidden">
            <WorldSection
              worldId={currentProject?.id || ""}
              projectTitle={currentProject?.title}
              graphOnly
              onBackToEditor={() => {
                window.location.hash = "";
              }}
              onOpenSettings={() => {
                window.dispatchEvent(new Event("luie:open-settings"));
                window.location.hash = "";
              }}
            />
          </div>
        </Suspense>
        {quitOverlay}
      </>
    );
  }

  if (!bootstrapStatus.isReady) {
    const showError = Boolean(bootstrapStatus.error) && !isBootstrapLoading;

    return (
      <>
        <div className="min-h-screen bg-app text-fg flex items-center justify-center px-6">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-panel p-8 shadow-lg">
            <div className="space-y-4">
              <div className="h-6 w-52 rounded-md bg-surface animate-pulse" />
              <div className="h-4 w-full rounded-md bg-surface animate-pulse" />
              <div className="h-4 w-[82%] rounded-md bg-surface animate-pulse" />
              <div className="h-4 w-[68%] rounded-md bg-surface animate-pulse" />
            </div>

            {!showError && (
              <p className="mt-6 text-sm text-muted">
                {t("bootstrap.initializing")}
              </p>
            )}

            {showError && (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-danger-fg">
                  {bootstrapStatus.error}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      void refreshBootstrapStatus();
                    }}
                    className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
                  >
                    {t("bootstrap.retry")}
                  </button>
                  <button
                    onClick={() => {
                      void api.app.quit();
                    }}
                    className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-fg hover:bg-surface-hover transition-colors"
                  >
                    {t("bootstrap.quit")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {quitOverlay}
      </>
    );
  }

  if (view === "template" || !currentProject) {
    return (
      <>
        <ProjectTemplateSelector
          onSelectProject={handleSelectProject}
          projects={projects}
          onOpenProject={(project) => {
            void handleOpenExistingProject(project);
          }}
          onOpenLuieFile={handleOpenLuieFile}
          onOpenSnapshotBackup={handleOpenSnapshotBackup}
        />
        {quitOverlay}
      </>
    );
  }

  return (
    <>
      <EditorRoot />
      {quitOverlay}
    </>
  );
}
