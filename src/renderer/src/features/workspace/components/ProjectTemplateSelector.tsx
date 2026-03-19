import { useCallback, useEffect, useState } from "react";
import WindowBar from "@renderer/features/workspace/components/WindowBar";
import type { Project, SnapshotRestoreCandidate } from "@shared/types";
import { api } from "@shared/api";
import { useTranslation } from "react-i18next";
import { useToast } from "@shared/ui/ToastContext";
import { useProjectSelector } from "../hooks/useProjectSelector";
import { ProjectCategorySidebar } from "./project-selector/ProjectCategorySidebar";
import { RecentProjectsSection } from "./project-selector/RecentProjectsSection";
import { ProjectContextMenu } from "./project-selector/ProjectContextMenu";
import { TemplateGrid } from "./project-selector/TemplateGrid";
import { ProjectActionDialogs } from "./project-selector/ProjectActionDialogs";
import { RestoreBackupDialog } from "./project-selector/RestoreBackupDialog";
import { ArrowLeft } from "lucide-react";

interface ProjectTemplateSelectorProps {
  onSelectProject: (templateId: string, projectPath: string) => void;
  projects?: Project[];
  onOpenProject?: (project: Project) => void;
  onOpenLuieFile?: () => void;
  onRestoreBackup?: (filePath: string) => Promise<boolean> | boolean;
}

export default function ProjectTemplateSelector({
  onSelectProject,
  projects = [],
  onOpenProject,
  onOpenLuieFile,
  onRestoreBackup,
}: ProjectTemplateSelectorProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [restoreCandidates, setRestoreCandidates] = useState<
    SnapshotRestoreCandidate[]
  >([]);
  const [restoreCandidatesError, setRestoreCandidatesError] = useState<
    string | null
  >(null);
  const [isRestoreCandidatesLoading, setIsRestoreCandidatesLoading] =
    useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const selectorState = useProjectSelector(projects);
  const {
    activeCategory,
    setActiveCategory,
    localProjects,
    menuOpenId,
    menuPosition,
    menuRef,
    closeMenu,
    toggleMenuByElement,
    setRenameDialog,
    setDeleteDialog,
  } = selectorState;

  const loadRestoreCandidates = useCallback(async () => {
    setIsRestoreCandidatesLoading(true);
    setRestoreCandidatesError(null);
    try {
      const response = await api.snapshot.listRestoreCandidates();
      if (!response.success || !response.data) {
        setRestoreCandidates([]);
        setRestoreCandidatesError(
          response.error?.message ??
            t("settings.projectTemplate.restoreDialog.errorDescription"),
        );
        return;
      }
      setRestoreCandidates(response.data);
    } catch (error) {
      api.logger.error("Failed to load restore candidates", error);
      setRestoreCandidates([]);
      setRestoreCandidatesError(
        t("settings.projectTemplate.restoreDialog.errorDescription"),
      );
    } finally {
      setIsRestoreCandidatesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isRestoreDialogOpen) {
      return;
    }
    void loadRestoreCandidates();
  }, [isRestoreDialogOpen, loadRestoreCandidates]);

  const handleRestoreCandidate = useCallback(
    async (candidate: SnapshotRestoreCandidate) => {
      if (!onRestoreBackup) {
        return;
      }
      setIsRestoringBackup(true);
      try {
        const restored = await Promise.resolve(
          onRestoreBackup(candidate.filePath),
        );
        if (restored) {
          setIsRestoreDialogOpen(false);
        }
      } finally {
        setIsRestoringBackup(false);
      }
    },
    [onRestoreBackup],
  );

  return (
    <div
      className="flex flex-col w-screen h-screen bg-app text-fg font-sans overflow-hidden"
      data-testid="template-selector"
    >
      <WindowBar />

      {menuOpenId && (
        <div
          className="fixed inset-0 z-dropdown bg-transparent"
          onPointerDown={closeMenu}
        />
      )}

      {/* Context Menu rendered at root level */}
      {menuOpenId &&
        (() => {
          const p = localProjects.find((proj) => proj.id === menuOpenId);
          if (!p) return null;

          return (
            <ProjectContextMenu
              project={p}
              menuRef={menuRef}
              menuPosition={menuPosition}
              closeMenu={closeMenu}
              onOpenProject={onOpenProject}
              onRepairPath={selectorState.handleRepairProjectPath}
              onAttachLuie={selectorState.handleAttachProjectPackage}
              onMaterializeLuie={selectorState.handleMaterializeProjectPackage}
              onRenameRequest={(project) =>
                setRenameDialog({
                  isOpen: true,
                  projectId: project.id,
                  currentTitle: project.title,
                })
              }
              onDeleteRequest={(project) =>
                setDeleteDialog({
                  isOpen: true,
                  projectId: project.id,
                  projectTitle: project.title,
                  mode:
                    project.attachmentStatus === "missing-attachment" ||
                    project.attachmentStatus === "invalid-attachment" ||
                    project.attachmentStatus === "unsupported-legacy-container"
                      ? "removeMissing"
                      : "delete",
                  deleteFile: false,
                })
              }
            />
          );
        })()}

      {/* Custom Dialogs */}
      <ProjectActionDialogs state={selectorState} actions={selectorState} />
      <RestoreBackupDialog
        isOpen={isRestoreDialogOpen}
        candidates={restoreCandidates}
        isLoading={isRestoreCandidatesLoading}
        isRestoring={isRestoringBackup}
        error={restoreCandidatesError}
        onClose={() => setIsRestoreDialogOpen(false)}
        onRefresh={() => {
          void loadRestoreCandidates();
        }}
        onRestore={handleRestoreCandidate}
      />

      <div className="flex-1 flex h-[calc(100vh-32px)]">
        <ProjectCategorySidebar
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />

        <div className="flex-1 p-12 overflow-y-auto bg-app min-w-0">
          <RecentProjectsSection
            localProjects={localProjects}
            syncStatus={selectorState.syncStatus}
            getProjectSyncBadge={selectorState.getProjectSyncBadge}
            onOpenProject={onOpenProject}
            onOpenLuieFile={onOpenLuieFile}
            onOpenRestoreDialog={() => {
              setIsRestoreDialogOpen(true);
            }}
            toggleMenuByElement={toggleMenuByElement}
            onConnectGoogle={async () => {
              try {
                // api.sync.connectGoogle handles creating the browser intent
                // We show a toast directly like useSettingsManager does to give visual feedback
                const response = await api.sync.connectGoogle();
                if (response.success && response.data) {
                  selectorState.setSyncStatus(response.data);
                  showToast(
                    t(
                      "settings.sync.toast.connected",
                      "Google 계정 연결이 완료되었습니다.",
                    ),
                    "success",
                  );
                } else {
                  api.logger.error("Failed to connect google", response.error);
                  showToast(
                    t("settings.sync.toast.connectFailed", "연결 실패: ") +
                      " " +
                      String(response.error),
                    "error",
                  );
                }
              } catch (error: unknown) {
                const msg =
                  error instanceof Error ? error.message : String(error);
                api.logger.error("Error during connect google", error);
                showToast(
                  t("settings.sync.toast.connectFailed", "연결 실패: ") +
                    " " +
                    msg,
                  "error",
                );
              }
            }}
            onDisconnectGoogle={async () => {
              try {
                const response = await api.sync.disconnect();
                if (response.success && response.data) {
                  selectorState.setSyncStatus(response.data);
                }
              } catch (error) {
                api.logger.error("Failed to disconnect google", error);
              }
            }}
          />
          <TemplateGrid
            activeCategory={activeCategory}
            onSelectTemplate={(tid) =>
              selectorState.handleSelectTemplate(tid, onSelectProject)
            }
          />

          {activeCategory !== "all" && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("back", "Back")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
