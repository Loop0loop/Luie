import { memo, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import {
  AlertTriangle,
  ChevronDown,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import type {
  DbRecoveryResult,
  DbRecoveryStatus,
} from "@shared/types/index.js";

interface RecoveryScopeSummary {
  currentProjectTitle: string | null;
  localProjectCount: number;
  previewTitles: string[];
  remainingProjectCount: number;
}

interface RecoveryTabProps {
  t: TFunction;
  isRecovering: boolean;
  isRecoveryStatusLoading: boolean;
  recoveryResult: DbRecoveryResult | null;
  recoveryScope: RecoveryScopeSummary;
  recoveryStatus: DbRecoveryStatus | null;
  recoveryStatusError: string | null;
  onDismiss: () => void;
  onRefreshRecoveryStatus: () => void;
  onRunRecovery: (dryRun: boolean) => void;
}

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString() : "-";

const getCurrentManuscriptLabel = (
  recoveryStatus: DbRecoveryStatus | null,
  recoveryScope: RecoveryScopeSummary,
  t: TFunction,
) =>
  recoveryStatus?.preview?.projectTitle ??
  recoveryScope.currentProjectTitle ??
  t("settings.recovery.scope.noOpenProject");

const getRecoverableLabel = (
  recoveryStatus: DbRecoveryStatus | null,
  t: TFunction,
) => {
  const projectTitle = recoveryStatus?.preview?.projectTitle;
  const chapterTitle = recoveryStatus?.preview?.chapterTitle;

  if (projectTitle && chapterTitle) {
    return t("settings.recovery.summary.projectChapter", {
      projectTitle,
      chapterTitle,
    });
  }

  if (projectTitle) {
    return projectTitle;
  }

  return t("settings.recovery.summary.unknownBackup");
};

export const RecoveryTab = memo(function RecoveryTab({
  t,
  isRecovering,
  isRecoveryStatusLoading,
  recoveryResult,
  recoveryScope,
  recoveryStatus,
  recoveryStatusError,
  onDismiss,
  onRefreshRecoveryStatus,
  onRunRecovery,
}: RecoveryTabProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const recoveryAvailable = Boolean(recoveryStatus?.available);
  const currentManuscriptLabel = getCurrentManuscriptLabel(
    recoveryStatus,
    recoveryScope,
    t,
  );
  const recoverableLabel = getRecoverableLabel(recoveryStatus, t);

  const heroCopy = useMemo(() => {
    if (isRecoveryStatusLoading) {
      return {
        badge: t("settings.recovery.hero.checkingBadge"),
        title: t("settings.recovery.dialog.checkingTitle"),
        description: t("settings.recovery.dialog.checkingDescription"),
      };
    }

    if (recoveryStatus?.reason === "db-missing") {
      return {
        badge: t("settings.recovery.hero.blockedBadge"),
        title: t("settings.recovery.dialog.blockedTitle"),
        description: t("settings.recovery.dialog.blockedDescription"),
      };
    }

    if (recoveryAvailable) {
      return {
        badge: t("settings.recovery.hero.readyBadge"),
        title: t("settings.recovery.dialog.readyTitle"),
        description: t("settings.recovery.dialog.readyDescription"),
      };
    }

    return {
      badge: t("settings.recovery.hero.emptyBadge"),
      title: t("settings.recovery.dialog.emptyTitle"),
      description: t("settings.recovery.dialog.emptyDescription"),
    };
  }, [isRecoveryStatusLoading, recoveryAvailable, recoveryStatus?.reason, t]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl items-start justify-center py-8">
      <section className="w-full rounded-[28px] border border-border bg-surface px-8 py-7 shadow-full">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-fg">
              {recoveryAvailable ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {heroCopy.badge}
            </div>
            <h3 className="mt-5 text-[2rem] font-semibold tracking-[-0.03em] text-fg">
              {heroCopy.title}
            </h3>
            <p className="mt-4 max-w-2xl text-[15px] leading-8 text-muted">
              {heroCopy.description}
            </p>
          </div>

          <button
            onClick={onRefreshRecoveryStatus}
            disabled={isRecovering || isRecoveryStatusLoading}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-element disabled:opacity-50"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isRecoveryStatusLoading ? "animate-spin" : ""}`}
            />
            {t("settings.recovery.refresh")}
          </button>
        </div>

        <div className="mt-8 space-y-5">
          <div>
            <div className="text-sm font-medium text-subtle">
              {t("settings.recovery.summary.current")}
            </div>
            <div className="mt-1 text-xl font-semibold text-fg">
              {currentManuscriptLabel}
            </div>
            <div className="mt-2 text-sm text-muted">
              {t("settings.recovery.summary.currentSavedAt")}{" "}
              {formatDateTime(recoveryStatus?.database.modifiedAt)}
            </div>
          </div>

          <div className="h-px bg-border" />

          <div>
            <div className="text-sm font-medium text-subtle">
              {t("settings.recovery.summary.recoverable")}
            </div>
            <div className="mt-1 text-xl font-semibold text-fg">
              {recoverableLabel}
            </div>
            <div className="mt-2 text-sm text-muted">
              {t("settings.recovery.summary.backupSavedAt")}{" "}
              {formatDateTime(
                recoveryStatus?.preview?.chapterUpdatedAt ??
                  recoveryStatus?.wal.modifiedAt,
              )}
            </div>
            {recoveryStatus?.preview?.excerpt && (
              <div className="mt-4 rounded-2xl bg-app px-4 py-4 text-sm leading-7 text-fg">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                  {t("settings.recovery.summary.preview")}
                </div>
                <p>{recoveryStatus.preview.excerpt}</p>
              </div>
            )}
          </div>
        </div>

        {recoveryResult && (
          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm leading-7 ${
              recoveryResult.success
                ? "border-success/30 bg-success/10 text-fg"
                : "border-danger/30 bg-danger/10 text-danger-fg"
            }`}
          >
            {recoveryResult.message}
          </div>
        )}

        {recoveryStatusError && (
          <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-7 text-danger-fg">
            {recoveryStatusError}
          </div>
        )}

        <div className="mt-8 h-px bg-border" />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onDismiss}
            className="rounded-xl px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-element hover:text-fg"
          >
            {t("settings.recovery.actions.ignore")}
          </button>

          <button
            onClick={() => onRunRecovery(false)}
            disabled={
              !recoveryAvailable || isRecovering || isRecoveryStatusLoading
            }
            className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {isRecovering
              ? t("settings.recovery.running")
              : t("settings.recovery.actions.restore")}
          </button>
        </div>

        <div className="mt-6">
          <button
            onClick={() => setShowTechnicalDetails((current) => !current)}
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <div>
              <div className="text-sm font-medium text-fg">
                {t("settings.recovery.technicalTitle")}
              </div>
              <p className="mt-1 text-sm text-muted">
                {t("settings.recovery.technicalDescription")}
              </p>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-subtle transition-transform ${
                showTechnicalDetails ? "rotate-180" : ""
              }`}
            />
          </button>

          {showTechnicalDetails && (
            <div className="mt-4 space-y-4 rounded-2xl border border-border bg-app/60 p-4">
              <div className="text-sm text-muted">
                {t("settings.recovery.scope.libraryDescription")}
              </div>

              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                    {t("settings.recovery.fields.path")}
                  </div>
                  <div className="mt-2 break-all rounded-xl bg-panel px-3 py-2 font-mono text-xs text-fg">
                    {recoveryStatus?.database.path ?? "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                    {t("settings.recovery.fields.backupRootDir")}
                  </div>
                  <div className="mt-2 break-all rounded-xl bg-panel px-3 py-2 font-mono text-xs text-fg">
                    {recoveryStatus?.backupRootDir ?? "-"}
                  </div>
                </div>
              </div>

              {recoveryResult?.backupDir && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                    {t("settings.recovery.fields.backupDir")}
                  </div>
                  <div className="mt-2 break-all rounded-xl bg-panel px-3 py-2 font-mono text-xs text-fg">
                    {recoveryResult.backupDir}
                  </div>
                </div>
              )}

              <button
                onClick={() => onRunRecovery(true)}
                disabled={
                  !recoveryAvailable || isRecovering || isRecoveryStatusLoading
                }
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-element disabled:opacity-50"
              >
                {t("settings.recovery.dryRun")}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
});
