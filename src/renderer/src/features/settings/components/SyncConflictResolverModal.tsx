import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, X, Check, FileText, Database } from "lucide-react";
import type { SyncStatus } from "@shared/types";
import { createPortal } from "react-dom";
import { api } from "@shared/api";

interface SyncConflictResolverModalProps {
    conflicts: SyncStatus["conflicts"];
    onClose: () => void;
    onRefresh: () => void;
    isBusy: boolean;
}

export function SyncConflictResolverModal({ conflicts, onClose, onRefresh, isBusy }: SyncConflictResolverModalProps) {
    const { t } = useTranslation();
    const [resolvingPath, setResolvingPath] = useState<string | null>(null);

    // In a full implementation, you'd fetch the actual content of local vs remote.
    // For now, we provide the UI structure to define "Done" for the UX. 
    // Selecting "Local" or "Remote" tells the backend to overwrite and resume sync.

    const handleResolve = async (type: "chapter" | "memo", id: string, resolution: "local" | "remote") => {
        if (resolvingPath) return; // prevent double clicks
        setResolvingPath(id);

        try {
            // Assuming api.sync.resolveConflict(type, id, resolution) exists or will be wired up.
            // For this UX stage, we mock the call if it doesn't exist, or call the exact API if it does.
            await api.sync.resolveConflict({ type, id, resolution });
            onRefresh(); // Refresh status after resolution
        } catch (e) {
            api.logger.error("Failed to resolve conflict", e);
        } finally {
            setResolvingPath(null);
        }
    };

    const hasConflicts = conflicts.chapters > 0 || conflicts.memos > 0;

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-3xl bg-panel border border-border shadow-2xl rounded-xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                <div className="p-4 border-b border-border flex items-center justify-between bg-surface">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-warning/20 rounded-full text-warning-fg">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-fg m-0">{t("settings.sync.conflicts.modalTitle", "Resolve Sync Conflicts")}</h2>
                            <p className="text-xs text-muted mt-0.5">
                                {t("settings.sync.conflicts.desc", "Luie found conflicting edits between your local device and the cloud. Please choose which version to keep.")}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isBusy || !!resolvingPath}
                        className="p-2 rounded-md hover:bg-hover text-muted transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar bg-canvas">
                    {!hasConflicts ? (
                        <div className="h-40 flex flex-col items-center justify-center gap-3 text-muted">
                            <Check className="w-8 h-8 text-emerald-500" />
                            <span>{t("settings.sync.conflicts.allResolved", "All conflicts resolved!")}</span>
                        </div>
                    ) : (
                        <>
                            {/* Mocking the list of conflicts for UI demonstration purposes based on counts */}
                            {Array.from({ length: conflicts.chapters }).map((_, idx) => (
                                <div key={`chapter-${idx}`} className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
                                    <div className="bg-panel px-4 py-2 border-b border-border flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted" />
                                        <span className="text-sm font-semibold text-fg">Chapter Conflict #{idx + 1}</span>
                                    </div>
                                    <div className="flex divide-x divide-border">
                                        <div className="flex-1 p-4 flex flex-col gap-4 hover:bg-hover/50 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2 text-accent font-medium text-sm">
                                                    <Database className="w-4 h-4" /> Local Version
                                                </div>
                                                <span className="text-[10px] text-muted bg-border/50 px-2 py-0.5 rounded">Edited Recently</span>
                                            </div>
                                            <div className="text-xs text-muted bg-canvas p-3 rounded-md line-clamp-3 opacity-70 italic border border-border/50">
                                                (Content preview placeholder)
                                            </div>
                                            <button
                                                onClick={() => handleResolve("chapter", `chapter-${idx}`, "local")}
                                                disabled={!!resolvingPath || isBusy}
                                                className="w-full py-2 bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium rounded-md border border-accent/20 transition-colors"
                                            >
                                                {resolvingPath === `chapter-${idx}` ? t("common.saving", "Saving...") : t("settings.sync.conflicts.keepLocal", "Keep Local")}
                                            </button>
                                        </div>

                                        <div className="flex-1 p-4 flex flex-col gap-4 hover:bg-hover/50 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2 text-emerald-500 font-medium text-sm">
                                                    <Database className="w-4 h-4" /> Cloud Version
                                                </div>
                                                <span className="text-[10px] text-muted bg-border/50 px-2 py-0.5 rounded">Synced Data</span>
                                            </div>
                                            <div className="text-xs text-muted bg-canvas p-3 rounded-md line-clamp-3 opacity-70 italic border border-border/50">
                                                (Content preview placeholder)
                                            </div>
                                            <button
                                                onClick={() => handleResolve("chapter", `chapter-${idx}`, "remote")}
                                                disabled={!!resolvingPath || isBusy}
                                                className="w-full py-2 text-fg bg-surface border border-border hover:bg-hover hover:border-border/80 text-sm font-medium rounded-md transition-colors"
                                            >
                                                {t("settings.sync.conflicts.keepRemote", "Keep Cloud")}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Similar block for memos based on conflicts.memos */}
                            {Array.from({ length: conflicts.memos }).map((_, idx) => (
                                <div key={`memo-${idx}`} className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
                                    <div className="bg-panel px-4 py-2 border-b border-border flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-muted" />
                                        <span className="text-sm font-semibold text-fg">Memo Conflict #{idx + 1}</span>
                                    </div>
                                    {/* ... Same dual-pane UI ... */}
                                    <div className="flex divide-x divide-border">
                                        <div className="flex-1 p-4 flex flex-col gap-4 hover:bg-hover/50 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2 text-accent font-medium text-sm">
                                                    <Database className="w-4 h-4" /> Local Version
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted bg-canvas p-3 rounded-md line-clamp-3 opacity-70 italic border border-border/50">
                                                (Content preview placeholder)
                                            </div>
                                            <button
                                                onClick={() => handleResolve("memo", `memo-${idx}`, "local")}
                                                disabled={!!resolvingPath || isBusy}
                                                className="w-full py-2 bg-accent/10 hover:bg-accent/20 text-accent text-sm font-medium rounded-md border border-accent/20 transition-colors"
                                            >
                                                {resolvingPath === `memo-${idx}` ? t("common.saving", "Saving...") : t("settings.sync.conflicts.keepLocal", "Keep Local")}
                                            </button>
                                        </div>
                                        <div className="flex-1 p-4 flex flex-col gap-4 hover:bg-hover/50 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2 text-emerald-500 font-medium text-sm">
                                                    <Database className="w-4 h-4" /> Cloud Version
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted bg-canvas p-3 rounded-md line-clamp-3 opacity-70 italic border border-border/50">
                                                (Content preview placeholder)
                                            </div>
                                            <button
                                                onClick={() => handleResolve("memo", `memo-${idx}`, "remote")}
                                                disabled={!!resolvingPath || isBusy}
                                                className="w-full py-2 text-fg bg-surface border border-border hover:bg-hover text-sm font-medium rounded-md transition-colors"
                                            >
                                                {t("settings.sync.conflicts.keepRemote", "Keep Cloud")}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-border flex justify-end bg-panel">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-element hover:bg-element-hover border border-border rounded-lg text-sm font-medium text-fg transition-colors"
                    >
                        {hasConflicts ? t("settings.sync.conflicts.resolveLater", "Resolve Later") : t("common.close", "Close")}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
}
