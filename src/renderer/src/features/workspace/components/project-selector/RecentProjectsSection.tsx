import { useTranslation } from "react-i18next";
import { MoreVertical, LogOut } from "lucide-react";
import type {
  Project,
  ProjectAttachmentStatus,
  SyncStatus,
} from "@shared/types";
import { api } from "@shared/api";

interface RecentProjectsSectionProps {
  localProjects: Project[];
  syncStatus: SyncStatus;
  getProjectSyncBadge: (
    project: Project,
  ) => "synced" | "pending" | "localOnly" | "syncError";
  onOpenProject?: (project: Project) => void;
  onOpenLuieFile?: () => void;
  onOpenRestoreDialog?: () => void;
  toggleMenuByElement: (id: string, element: HTMLElement) => void;
  onConnectGoogle?: () => void;
  onDisconnectGoogle?: () => void;
}

export function RecentProjectsSection({
  localProjects,
  syncStatus,
  getProjectSyncBadge,
  onOpenProject,
  onOpenLuieFile,
  onOpenRestoreDialog,
  toggleMenuByElement,
  onConnectGoogle,
  onDisconnectGoogle,
}: RecentProjectsSectionProps) {
  const { t } = useTranslation();
  const getAttachmentBadgeKey = (
    status: ProjectAttachmentStatus | undefined,
  ) => {
    switch (status) {
      case "detached":
        return "detachedBadge";
      case "missing-attachment":
        return "missingAttachmentBadge";
      case "invalid-attachment":
        return "invalidAttachmentBadge";
      case "unsupported-legacy-container":
        return "unsupportedLegacyBadge";
      default:
        return null;
    }
  };
  const getAttachmentDescription = (project: Project) => {
    switch (project.attachmentStatus) {
      case "detached":
        return t("settings.projectTemplate.detachedDescription");
      case "missing-attachment":
        return t("settings.projectTemplate.missingAttachmentDescription");
      case "invalid-attachment":
        return t("settings.projectTemplate.invalidAttachmentDescription");
      case "unsupported-legacy-container":
        return t("settings.projectTemplate.unsupportedLegacyDescription");
      default:
        return project.projectPath ?? t("settings.projectTemplate.emptyPath");
    }
  };

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold tracking-[0.5px] text-subtle uppercase">
          {t("settings.projectTemplate.recentTitle")}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded-md bg-surface border border-border text-fg hover:bg-surface-hover"
            onClick={() => onOpenLuieFile?.()}
          >
            {t("settings.projectTemplate.actions.openLuie")}
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded-md bg-surface border border-border text-fg hover:bg-surface-hover"
            onClick={() => onOpenRestoreDialog?.()}
          >
            {t("settings.projectTemplate.actions.restore")}
          </button>

          <div className="w-px h-4 bg-border mx-2"></div>

          {syncStatus.connected ? (
            <div className="flex items-center gap-3 pl-1">
              <div className="flex items-center gap-1.5 opacity-80">
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm shrink-0">
                  <svg className="w-3 h-3" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                </div>
                <span
                  className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[120px]"
                  title={syncStatus.email}
                >
                  {syncStatus.email}
                </span>
              </div>
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-destructive/10 hover:text-destructive transition-colors flex items-center gap-1.5 leading-none"
                onClick={() => onDisconnectGoogle?.()}
              >
                <LogOut className="w-3 h-3" />
                {t("settings.sync.actions.disconnectGoogle", "로그아웃")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-[var(--accent-bg)] text-[var(--accent-fg)] hover:bg-[var(--accent-bg-hover)] border border-[var(--accent-border)] transition-colors shadow-sm flex items-center gap-2"
              onClick={() => onConnectGoogle?.()}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t("settings.sync.actions.connectGoogle", "Google 연동")}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {localProjects.slice(0, 4).map((p) => {
          const syncBadge = getProjectSyncBadge(p);
          const attachmentBadgeKey = getAttachmentBadgeKey(p.attachmentStatus);
          return (
            <div
              key={p.id}
              className="bg-surface border border-border rounded-lg p-5 w-full text-left cursor-pointer transition-all duration-200 relative flex justify-between items-start hover:bg-surface-hover hover:border-border-active hover:-translate-y-0.5 hover:shadow-md group"
              onClick={() => {
                onOpenProject?.(p);
              }}
            >
              <div className="flex-1 overflow-hidden">
                <div className="mb-1 flex items-center gap-2">
                  <div className="text-[15px] font-semibold text-fg truncate">
                    {p.title}
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      syncBadge === "synced"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : syncBadge === "pending"
                          ? "bg-amber-500/15 text-amber-300"
                          : syncBadge === "syncError"
                            ? "bg-red-500/15 text-red-300"
                            : "bg-zinc-500/15 text-zinc-300"
                    }`}
                  >
                    {t(`settings.projectTemplate.sync.${syncBadge}`)}
                  </span>
                  {attachmentBadgeKey && (
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        p.attachmentStatus === "detached"
                          ? "bg-zinc-500/15 text-zinc-300"
                          : p.attachmentStatus ===
                              "unsupported-legacy-container"
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-red-500/15 text-red-300"
                      }`}
                    >
                      {t(`settings.projectTemplate.${attachmentBadgeKey}`)}
                    </span>
                  )}
                </div>
                <div
                  className="text-xs text-muted whitespace-nowrap overflow-hidden text-ellipsis"
                  title={p.projectPath ?? ""}
                >
                  {getAttachmentDescription(p)}
                </div>
              </div>

              <button
                className="opacity-85 p-1 rounded text-subtle border-none bg-transparent cursor-pointer absolute top-2.5 right-2.5 z-10 transition-all hover:opacity-100 hover:bg-active hover:text-fg group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  toggleMenuByElement(p.id, e.currentTarget);
                  api.logger.info("Project context menu", {
                    id: p.id,
                  });
                }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
