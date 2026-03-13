import { memo, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import {
  AlertTriangle,
  BookOpenText,
  ChevronDown,
  HardDriveDownload,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import type {
  DbRecoveryFileStatus,
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
  onRefreshRecoveryStatus: () => void;
  onRunRecovery: (dryRun: boolean) => void;
}

interface RecoveryFileRowProps {
  t: TFunction;
  title: string;
  file: DbRecoveryFileStatus;
}

interface RecoveryStepCardProps {
  title: string;
  description: string;
  stepNumber: string;
}

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString() : "-";

const formatBytes = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";

  const units = ["B", "KB", "MB", "GB"];
  let nextValue = value;
  let unitIndex = 0;

  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }

  const precision = nextValue >= 10 || unitIndex === 0 ? 0 : 1;
  return `${nextValue.toFixed(precision)} ${units[unitIndex]}`;
};

function RecoveryFileRow({ t, title, file }: RecoveryFileRowProps) {
  return (
    <div className="rounded-xl border border-border bg-app/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
            {title}
          </div>
          <div className="mt-1 text-sm font-medium text-fg">
            {file.exists
              ? t("settings.recovery.file.present")
              : t("settings.recovery.file.missing")}
          </div>
        </div>
        <div
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            file.exists
              ? "border-success/30 bg-success/10 text-success"
              : "border-warning/30 bg-warning/10 text-warning-fg"
          }`}
        >
          {file.exists
            ? t("settings.recovery.file.present")
            : t("settings.recovery.file.missing")}
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs text-muted">
        <div className="rounded-lg bg-panel px-3 py-2">
          <div className="uppercase tracking-[0.12em] text-subtle">
            {t("settings.recovery.fields.path")}
          </div>
          <div className="mt-1 break-all font-mono text-[11px] text-fg">
            {file.path}
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-lg bg-panel px-3 py-2">
            <div className="uppercase tracking-[0.12em] text-subtle">
              {t("settings.recovery.fields.size")}
            </div>
            <div className="mt-1 text-fg">
              {file.exists ? formatBytes(file.sizeBytes) : "-"}
            </div>
          </div>
          <div className="rounded-lg bg-panel px-3 py-2">
            <div className="uppercase tracking-[0.12em] text-subtle">
              {t("settings.recovery.fields.updatedAt")}
            </div>
            <div className="mt-1 text-fg">
              {file.exists
                ? formatDateTime(file.modifiedAt)
                : t("settings.recovery.fields.notFound")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecoveryStepCard({
  title,
  description,
  stepNumber,
}: RecoveryStepCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-app/70 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
          {stepNumber}
        </div>
        <div>
          <div className="text-sm font-semibold text-fg">{title}</div>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}

export const RecoveryTab = memo(function RecoveryTab({
  t,
  isRecovering,
  isRecoveryStatusLoading,
  recoveryResult,
  recoveryScope,
  recoveryStatus,
  recoveryStatusError,
  onRefreshRecoveryStatus,
  onRunRecovery,
}: RecoveryTabProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const recoveryAvailable = Boolean(recoveryStatus?.available);
  const disableActions =
    isRecovering || isRecoveryStatusLoading || !recoveryAvailable;

  const statusCopy = useMemo(() => {
    if (isRecoveryStatusLoading) {
      return {
        badge: t("settings.recovery.hero.checkingBadge"),
        title: t("settings.recovery.hero.checkingTitle"),
        description: t("settings.recovery.hero.checkingDescription"),
        toneClass: "border-border bg-app/80 text-fg",
      };
    }

    if (recoveryStatus?.reason === "db-missing") {
      return {
        badge: t("settings.recovery.hero.blockedBadge"),
        title: t("settings.recovery.hero.dbMissingTitle"),
        description: t("settings.recovery.hero.dbMissingDescription"),
        toneClass: "border-danger/30 bg-danger/10 text-danger-fg",
      };
    }

    if (recoveryAvailable) {
      return {
        badge: t("settings.recovery.hero.readyBadge"),
        title: t("settings.recovery.hero.readyTitle"),
        description: t("settings.recovery.hero.readyDescription"),
        toneClass: "border-success/30 bg-success/10 text-fg",
      };
    }

    return {
      badge: t("settings.recovery.hero.emptyBadge"),
      title: t("settings.recovery.hero.emptyTitle"),
      description: t("settings.recovery.hero.emptyDescription"),
      toneClass: "border-warning/30 bg-warning/10 text-fg",
    };
  }, [isRecoveryStatusLoading, recoveryAvailable, recoveryStatus?.reason, t]);

  const resultToneClass = recoveryResult?.success
    ? "border-success/30 bg-success/10"
    : "border-danger/30 bg-danger/10";

  return (
    <div className="max-w-4xl space-y-6">
      <section className={`rounded-3xl border p-6 ${statusCopy.toneClass}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-current/20 bg-black/10 px-3 py-1 text-xs font-semibold">
              {recoveryAvailable ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {statusCopy.badge}
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-fg">
              {statusCopy.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              {statusCopy.description}
            </p>
          </div>

          <button
            onClick={onRefreshRecoveryStatus}
            disabled={isRecovering || isRecoveryStatusLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-element px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-element-hover disabled:opacity-50"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isRecoveryStatusLoading ? "animate-spin" : ""}`}
            />
            {t("settings.recovery.refresh")}
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-panel/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
              {t("settings.recovery.scope.currentProject")}
            </div>
            <div className="mt-2 text-base font-semibold text-fg">
              {recoveryScope.currentProjectTitle ??
                t("settings.recovery.scope.noOpenProject")}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-panel/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
              {t("settings.recovery.scope.library")}
            </div>
            <div className="mt-2 text-base font-semibold text-fg">
              {t("settings.recovery.scope.projectCount", {
                count: recoveryScope.localProjectCount,
              })}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              {t("settings.recovery.scope.libraryDescription")}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-panel/70 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
              <BookOpenText className="h-3.5 w-3.5" />
              {t("settings.recovery.scope.preview")}
            </div>
            {recoveryScope.previewTitles.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {recoveryScope.previewTitles.map((title) => (
                  <span
                    key={title}
                    className="rounded-full border border-border bg-app px-3 py-1 text-sm text-fg"
                  >
                    {title}
                  </span>
                ))}
                {recoveryScope.remainingProjectCount > 0 && (
                  <span className="rounded-full border border-border bg-app px-3 py-1 text-sm text-muted">
                    {t("settings.recovery.scope.moreProjects", {
                      count: recoveryScope.remainingProjectCount,
                    })}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-muted">
                {t("settings.recovery.scope.noProjects")}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface p-6">
        <h4 className="text-lg font-semibold text-fg">
          {t("settings.recovery.actionTitle")}
        </h4>
        <p className="mt-2 text-sm leading-7 text-muted">
          {t("settings.recovery.actionDescription")}
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <RecoveryStepCard
            stepNumber="1"
            title={t("settings.recovery.steps.safeTitle")}
            description={t("settings.recovery.steps.safeDescription")}
          />
          <RecoveryStepCard
            stepNumber="2"
            title={t("settings.recovery.steps.restoreTitle")}
            description={t("settings.recovery.steps.restoreDescription")}
          />
          <RecoveryStepCard
            stepNumber="3"
            title={t("settings.recovery.steps.rollbackTitle")}
            description={t("settings.recovery.steps.rollbackDescription")}
          />
        </div>

        {!recoveryAvailable && !isRecoveryStatusLoading && (
          <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm leading-6 text-warning-fg">
            {t("settings.recovery.unavailableHint")}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => onRunRecovery(true)}
            disabled={disableActions}
            className="rounded-xl border border-border bg-element px-4 py-3 text-sm font-medium text-fg transition-colors hover:bg-element-hover disabled:opacity-50"
          >
            {t("settings.recovery.dryRun")}
          </button>
          <button
            onClick={() => onRunRecovery(false)}
            disabled={disableActions}
            className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {isRecovering
              ? t("settings.recovery.running")
              : t("settings.recovery.run")}
          </button>
        </div>
      </section>

      {recoveryResult && (
        <section className={`rounded-3xl border p-6 ${resultToneClass}`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-current/20 bg-black/10 px-3 py-1 text-xs font-semibold">
              {recoveryResult.success ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {recoveryResult.dryRun
                ? t("settings.recovery.resultBackupOnly")
                : t("settings.recovery.resultApplied")}
            </div>
            <h4 className="text-lg font-semibold text-fg">
              {t("settings.recovery.resultTitle")}
            </h4>
          </div>
          <p className="mt-3 text-sm leading-7 text-fg">
            {recoveryResult.message}
          </p>
        </section>
      )}

      <section className="rounded-3xl border border-border bg-surface p-6">
        <button
          onClick={() => setShowTechnicalDetails((current) => !current)}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <div>
            <div className="text-sm font-semibold text-fg">
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
          <div className="mt-5 space-y-5">
            {recoveryStatusError && (
              <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
                {recoveryStatusError}
              </div>
            )}

            {recoveryStatus && (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <RecoveryFileRow
                    t={t}
                    title={t("settings.recovery.file.database")}
                    file={recoveryStatus.database}
                  />
                  <RecoveryFileRow
                    t={t}
                    title={t("settings.recovery.file.wal")}
                    file={recoveryStatus.wal}
                  />
                  <RecoveryFileRow
                    t={t}
                    title={t("settings.recovery.file.shm")}
                    file={recoveryStatus.shm}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-app/70 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                      <HardDriveDownload className="h-3.5 w-3.5" />
                      {t("settings.recovery.fields.backupRootDir")}
                    </div>
                    <div className="mt-2 break-all rounded-lg bg-panel px-3 py-2 font-mono text-xs text-fg">
                      {recoveryStatus.backupRootDir}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-app/70 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                      <HardDriveDownload className="h-3.5 w-3.5" />
                      {t("settings.recovery.fields.latestBackupDir")}
                    </div>
                    <div className="mt-2 break-all rounded-lg bg-panel px-3 py-2 font-mono text-xs text-fg">
                      {recoveryStatus.latestBackupDir ?? "-"}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-app/70 p-4 text-sm text-muted">
                  <span className="font-medium text-fg">
                    {t("settings.recovery.lastChecked")}
                  </span>{" "}
                  {formatDateTime(recoveryStatus.checkedAt)}
                </div>
              </>
            )}

            {recoveryResult?.backupDir && (
              <div className="rounded-2xl border border-border bg-app/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                  {t("settings.recovery.fields.backupDir")}
                </div>
                <div className="mt-2 break-all rounded-lg bg-panel px-3 py-2 font-mono text-xs text-fg">
                  {recoveryResult.backupDir}
                </div>
              </div>
            )}

            {recoveryResult?.checkpoint &&
              recoveryResult.checkpoint.length > 0 && (
                <div className="rounded-2xl border border-border bg-app/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                    {t("settings.recovery.fields.checkpoint")}
                  </div>
                  <div className="mt-3 space-y-2">
                    {recoveryResult.checkpoint.map((row, index) => (
                      <div
                        key={`${row.busy}-${row.log}-${row.checkpointed}-${index}`}
                        className="grid gap-2 rounded-xl bg-panel px-3 py-3 text-sm text-fg md:grid-cols-3"
                      >
                        <div>busy: {row.busy}</div>
                        <div>log: {row.log}</div>
                        <div>checkpointed: {row.checkpointed}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {recoveryResult?.integrity &&
              recoveryResult.integrity.length > 0 && (
                <div className="rounded-2xl border border-border bg-app/70 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-subtle">
                    {t("settings.recovery.fields.integrity")}
                  </div>
                  <div className="mt-3 space-y-2">
                    {recoveryResult.integrity.map((row, index) => (
                      <div
                        key={`${row}-${index}`}
                        className="rounded-xl bg-panel px-3 py-3 text-sm text-fg"
                      >
                        {row}
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </section>
    </div>
  );
});
