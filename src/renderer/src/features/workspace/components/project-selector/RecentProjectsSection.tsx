import { useTranslation } from "react-i18next";
import { MoreVertical, LogOut, CheckCircle2 } from "lucide-react";
import type { Project, SyncStatus } from "@shared/types";
import { api } from "@shared/api";
import { useToast } from "@shared/ui/ToastContext";

interface RecentProjectsSectionProps {
    localProjects: Project[];
    syncStatus: SyncStatus;
    getProjectSyncBadge: (project: Project) => "synced" | "pending" | "localOnly" | "syncError";
    onOpenProject?: (project: Project) => void;
    onOpenLuieFile?: () => void;
    onOpenSnapshotBackup?: () => void;
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
    onOpenSnapshotBackup,
    toggleMenuByElement,
    onConnectGoogle,
    onDisconnectGoogle,
}: RecentProjectsSectionProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();

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
                        onClick={() => onOpenSnapshotBackup?.()}
                    >
                        {t("settings.projectTemplate.actions.restoreSnapshot")}
                    </button>

                    <div className="w-px h-4 bg-border mx-2"></div>

                    {syncStatus.connected ? (
                        <div className="flex items-center gap-3 pl-1">
                            <div className="flex items-center gap-1.5 opacity-80">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-xs font-medium text-fg truncate max-w-[120px]" title={syncStatus.email}>
                                    {syncStatus.email}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="px-3 py-1.5 text-xs rounded-md bg-surface border border-border text-fg hover:bg-red-500/10 hover:text-red-400 transition-colors flex items-center gap-1.5 leading-none"
                                onClick={() => onDisconnectGoogle?.()}
                            >
                                <LogOut className="w-3 h-3" />
                                {t("settings.sync.actions.disconnectGoogle", "로그아웃")}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="px-4 py-1.5 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
                            onClick={() => onConnectGoogle?.()}
                        >
                            {t("settings.sync.actions.connectGoogle", "Google 연동")}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                {localProjects.slice(0, 4).map((p) => {
                    const syncBadge = getProjectSyncBadge(p);
                    return (
                        <div
                            key={p.id}
                            className="bg-surface border border-border rounded-lg p-5 w-full text-left cursor-pointer transition-all duration-200 relative flex justify-between items-start hover:bg-surface-hover hover:border-border-active hover:-translate-y-0.5 hover:shadow-md group"
                            onClick={() => {
                                if (p.pathMissing) {
                                    showToast(t("settings.projectTemplate.toast.pathMissingBlocked"), "info");
                                    return;
                                }
                                onOpenProject?.(p);
                            }}
                        >
                            <div className="flex-1 overflow-hidden">
                                <div className="mb-1 flex items-center gap-2">
                                    <div className="text-[15px] font-semibold text-fg truncate">{p.title}</div>
                                    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${syncBadge === "synced"
                                        ? "bg-emerald-500/15 text-emerald-300"
                                        : syncBadge === "pending"
                                            ? "bg-amber-500/15 text-amber-300"
                                            : syncBadge === "syncError"
                                                ? "bg-red-500/15 text-red-300"
                                                : "bg-zinc-500/15 text-zinc-300"
                                        }`}>
                                        {t(`settings.projectTemplate.sync.${syncBadge}`)}
                                    </span>
                                    {p.pathMissing && (
                                        <span className="inline-flex shrink-0 items-center rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-300">
                                            {t("settings.projectTemplate.pathMissingBadge")}
                                        </span>
                                    )}
                                </div>
                                <div
                                    className="text-xs text-muted whitespace-nowrap overflow-hidden text-ellipsis"
                                    title={p.projectPath ?? ""}
                                >
                                    {p.pathMissing
                                        ? t("settings.projectTemplate.pathMissingDescription")
                                        : p.projectPath ?? t("settings.projectTemplate.emptyPath")}
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
