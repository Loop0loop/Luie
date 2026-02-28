import { memo } from "react";
import { useTranslation } from "react-i18next";
import { X, FileText, StickyNote, ChevronRight, CheckCircle } from "lucide-react";
import type { SyncConflictSummary } from "@shared/types";
import { useSyncConflictManager, type ConflictItem } from "@renderer/features/settings/hooks/useSyncConflictManager";

interface SyncConflictResolverModalProps {
    summary: SyncConflictSummary;
    onClose: () => void;
}

function ConflictListItem({
    item,
    isSelected,
    isResolved,
    onSelect,
}: {
    item: ConflictItem;
    isSelected: boolean;
    isResolved: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            onClick={onSelect}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${isResolved
                    ? "opacity-40 cursor-default"
                    : isSelected
                        ? "bg-accent/10 border border-accent/30"
                        : "hover:bg-surface-hover border border-transparent"
                }`}
            disabled={isResolved}
        >
            {item.type === "chapter" ? (
                <FileText className="w-4 h-4 text-muted shrink-0" />
            ) : (
                <StickyNote className="w-4 h-4 text-muted shrink-0" />
            )}
            <span className="flex-1 text-sm font-medium text-fg truncate">{item.title}</span>
            {isResolved ? (
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
            )}
        </button>
    );
}

const ContentPanel = memo(function ContentPanel({
    label,
    content,
    accent,
}: {
    label: string;
    content: string;
    accent: string;
}) {
    return (
        <div className="flex flex-col flex-1 min-w-0 gap-2">
            <div className={`px-2 py-0.5 rounded text-[11px] font-semibold ${accent} self-start`}>
                {label}
            </div>
            <div className="flex-1 bg-sidebar border border-border rounded-lg p-3 overflow-y-auto custom-scrollbar">
                <pre className="text-xs text-fg font-mono whitespace-pre-wrap break-words leading-relaxed m-0">
                    {content}
                </pre>
            </div>
        </div>
    );
});

export const SyncConflictResolverModal = memo(function SyncConflictResolverModal({
    summary,
    onClose,
}: SyncConflictResolverModalProps) {
    const { t } = useTranslation();
    const {
        conflictItems,
        pendingItems,
        selectedItem,
        setSelectedId,
        resolveItem,
        state,
    } = useSyncConflictManager(summary);

    const resolvedCount = conflictItems.length - pendingItems.length;
    const allDone = resolvedCount === conflictItems.length;

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl h-[600px] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                    <div>
                        <h2 className="text-base font-semibold text-fg m-0">
                            {t("settings.sync.conflict.resolverTitle", "동기화 충돌 해결")}
                        </h2>
                        <p className="text-xs text-muted mt-0.5">
                            {t("settings.sync.conflict.resolverSubtitle", "각 충돌 항목에 대해 보존할 버전을 선택하세요.")}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-muted bg-surface-hover px-2 py-1 rounded">
                            {t("settings.sync.conflict.progress", { resolved: resolvedCount, total: conflictItems.length })}
                        </span>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-md text-muted hover:text-fg hover:bg-surface-hover transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {allDone ? (
                    /* All resolved state */
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                        </div>
                        <p className="text-sm font-semibold text-fg">
                            {t("settings.sync.conflict.allResolved", "모든 충돌이 해결되었습니다!")}
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
                        >
                            {t("common.close")}
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-1 min-h-0">
                        {/* Left: Conflict List */}
                        <div className="w-56 shrink-0 border-r border-border bg-panel flex flex-col">
                            <div className="px-3 pt-3 pb-1.5">
                                <p className="text-[10px] font-semibold text-muted uppercase tracking-wide">
                                    {t("settings.sync.conflict.listHeader", "충돌 항목")}
                                </p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar">
                                {conflictItems.map((item) => (
                                    <ConflictListItem
                                        key={item.id}
                                        item={item}
                                        isSelected={selectedItem?.id === item.id}
                                        isResolved={!pendingItems.some((p) => p.id === item.id)}
                                        onSelect={() => setSelectedId(item.id)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Right: Detail Panel */}
                        <div className="flex-1 flex flex-col min-w-0">
                            {selectedItem ? (
                                <>
                                    {/* Preview area */}
                                    <div className="flex-1 flex gap-3 p-4 min-h-0">
                                        <ContentPanel
                                            label={t("settings.sync.conflict.local", "내 기기 (로컬)")}
                                            content={selectedItem.localContent}
                                            accent="bg-blue-500/10 text-blue-400"
                                        />
                                        <ContentPanel
                                            label={t("settings.sync.conflict.remote", "클라우드 (원격)")}
                                            content={selectedItem.remoteContent}
                                            accent="bg-purple-500/10 text-purple-400"
                                        />
                                    </div>

                                    {/* Warning */}
                                    <div className="px-4 pb-2 text-[11px] text-muted">
                                        {t("settings.sync.conflict.snapshotWarning", "⚠ 선택 전 현재 상태가 스냅샷으로 보존됩니다.")}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="px-4 pb-4 flex gap-2 shrink-0 border-t border-border pt-3">
                                        <button
                                            onClick={() => void resolveItem(selectedItem.id, "local")}
                                            disabled={state.phase === "resolving"}
                                            className="flex-1 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {t("settings.sync.conflict.acceptLocal", "로컬 채택")}
                                        </button>
                                        <button
                                            onClick={() => void resolveItem(selectedItem.id, "remote")}
                                            disabled={state.phase === "resolving"}
                                            className="flex-1 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {t("settings.sync.conflict.acceptRemote", "원격 채택")}
                                        </button>
                                        <button
                                            onClick={() => void resolveItem(selectedItem.id, "deferred")}
                                            disabled={state.phase === "resolving"}
                                            className="px-4 py-2 rounded-lg bg-surface-hover text-muted hover:text-fg text-sm font-medium transition-colors disabled:opacity-50"
                                        >
                                            {t("settings.sync.conflict.defer", "나중에")}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-sm text-muted">
                                    {t("settings.sync.conflict.selectItem", "왼쪽에서 충돌 항목을 선택하세요.")}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
