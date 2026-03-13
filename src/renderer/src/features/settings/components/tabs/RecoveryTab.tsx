import { memo } from "react";
import type { TFunction } from "i18next";
import {
  AlertTriangle,
  Database,
  HardDriveDownload,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import type {
  DbRecoveryFileStatus,
  DbRecoveryResult,
  DbRecoveryStatus,
} from "@shared/types/index.js";

interface RecoveryTabProps {
  t: TFunction;
  isRecovering: boolean;
  isRecoveryStatusLoading: boolean;
  recoveryResult: DbRecoveryResult | null;
  recoveryStatus: DbRecoveryStatus | null;
  recoveryStatusError: string | null;
  onRefreshRecoveryStatus: () => void;
  onRunRecovery: (dryRun: boolean) => void;
}

interface RecoveryFileCardProps {
  t: TFunction;
  title: string;
  file: DbRecoveryFileStatus;
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

function RecoveryFileCard({ t, title, file }: RecoveryFileCardProps) {
  return (
    <div className="rounded-xl border border-border bg-app/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
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
          className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
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

      <div className="space-y-2 text-xs text-muted">
        <div>
          <div className="mb-1 uppercase tracking-[0.12em] text-subtle">
            {t("settings.recovery.fields.path")}
          </div>
          <div className="break-all rounded-lg bg-panel px-3 py-2 font-mono text-[11px] text-fg">
            {file.path}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
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

export const RecoveryTab = memo(function RecoveryTab({
  t,
  isRecovering,
  isRecoveryStatusLoading,
  recoveryResult,
  recoveryStatus,
  recoveryStatusError,
  onRefreshRecoveryStatus,
  onRunRecovery,
}: RecoveryTabProps) {
  const recoveryAvailable = Boolean(recoveryStatus?.available);
  const disableActions =
    isRecovering || isRecoveryStatusLoading || !recoveryAvailable;
  const statusLabel = recoveryAvailable
    ? t("settings.recovery.statusAvailable")
    : t("settings.recovery.statusUnavailable");
  const statusDescription = !recoveryStatus
    ? isRecoveryStatusLoading
      ? t("loading")
      : t("settings.recovery.messages.statusLoadFailed")
    : recoveryStatus.reason === "db-missing"
      ? t("settings.recovery.statusReasonDbMissing")
      : recoveryStatus.reason === "wal-missing"
        ? t("settings.recovery.statusReasonWalMissing")
        : t("settings.recovery.statusReasonReady");

  return (
    <div className="max-w-4xl space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h3 className="text-base font-semibold text-fg">
              {t("settings.recovery.title")}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {t("settings.recovery.description")}
            </p>
            <p className="mt-3 text-xs text-subtle">
              {t("settings.recovery.targetHint")}
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

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
              recoveryAvailable
                ? "border-success/30 bg-success/10 text-success"
                : "border-warning/30 bg-warning/10 text-warning-fg"
            }`}
          >
            {recoveryAvailable ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            {statusLabel}
          </div>
          <div className="text-sm text-fg">{statusDescription}</div>
          {recoveryStatus?.checkedAt && (
            <div className="text-xs text-subtle">
              {t("settings.recovery.lastChecked")}:{" "}
              {formatDateTime(recoveryStatus.checkedAt)}
            </div>
          )}
        </div>

        {recoveryStatusError && (
          <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
            {recoveryStatusError}
          </div>
        )}

        {recoveryStatus && (
          <>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <RecoveryFileCard
                t={t}
                title={t("settings.recovery.file.database")}
                file={recoveryStatus.database}
              />
              <RecoveryFileCard
                t={t}
                title={t("settings.recovery.file.wal")}
                file={recoveryStatus.wal}
              />
              <RecoveryFileCard
                t={t}
                title={t("settings.recovery.file.shm")}
                file={recoveryStatus.shm}
              />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-app/60 p-4 text-sm">
                <div className="mb-2 flex items-center gap-2 text-fg">
                  <Database className="h-4 w-4 text-accent" />
                  <span className="font-medium">
                    {t("settings.recovery.backupRoot")}
                  </span>
                </div>
                <div className="break-all rounded-lg bg-panel px-3 py-2 font-mono text-xs text-fg">
                  {recoveryStatus.backupRootDir}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-app/60 p-4 text-sm">
                <div className="mb-2 flex items-center gap-2 text-fg">
                  <HardDriveDownload className="h-4 w-4 text-accent" />
                  <span className="font-medium">
                    {t("settings.recovery.latestBackup")}
                  </span>
                </div>
                <div className="break-all rounded-lg bg-panel px-3 py-2 font-mono text-xs text-fg">
                  {recoveryStatus.latestBackupDir ?? "-"}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-subtle">
          {t("settings.recovery.howItWorks")}
        </h4>
        <ol className="mt-4 space-y-3 text-sm text-muted">
          <li>1. {t("settings.recovery.steps.backup")}</li>
          <li>2. {t("settings.recovery.steps.applyWal")}</li>
          <li>3. {t("settings.recovery.steps.verify")}</li>
        </ol>

        {!recoveryAvailable && !isRecoveryStatusLoading && (
          <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-fg">
            {t("settings.recovery.unavailableHint")}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => onRunRecovery(true)}
            disabled={disableActions}
            className="rounded-lg border border-border bg-element px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-element-hover disabled:opacity-50"
          >
            {t("settings.recovery.dryRun")}
          </button>
          <button
            onClick={() => onRunRecovery(false)}
            disabled={disableActions}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {isRecovering
              ? t("settings.recovery.running")
              : t("settings.recovery.run")}
          </button>
        </div>
      </section>

      {recoveryResult && (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                recoveryResult.success
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-danger/30 bg-danger/10 text-danger-fg"
              }`}
            >
              {recoveryResult.success ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {recoveryResult.dryRun
                ? t("settings.recovery.resultBackupOnly")
                : t("settings.recovery.resultApplied")}
            </div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-subtle">
              {t("settings.recovery.resultTitle")}
            </h4>
          </div>

          <p className="mt-4 text-sm text-fg">{recoveryResult.message}</p>

          {recoveryResult.backupDir && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                {t("settings.recovery.fields.backupDir")}
              </div>
              <div className="break-all rounded-lg bg-app px-3 py-2 font-mono text-xs text-fg">
                {recoveryResult.backupDir}
              </div>
            </div>
          )}

          {recoveryResult.checkpoint &&
            recoveryResult.checkpoint.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                  {t("settings.recovery.fields.checkpoint")}
                </div>
                <div className="space-y-2">
                  {recoveryResult.checkpoint.map((row, index) => (
                    <div
                      key={`${row.busy}-${row.log}-${row.checkpointed}-${index}`}
                      className="grid gap-2 rounded-lg border border-border bg-app px-3 py-3 text-sm text-fg md:grid-cols-3"
                    >
                      <div>busy: {row.busy}</div>
                      <div>log: {row.log}</div>
                      <div>checkpointed: {row.checkpointed}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {recoveryResult.integrity && recoveryResult.integrity.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-subtle">
                {t("settings.recovery.fields.integrity")}
              </div>
              <div className="space-y-2">
                {recoveryResult.integrity.map((row, index) => (
                  <div
                    key={`${row}-${index}`}
                    className="rounded-lg border border-border bg-app px-3 py-3 text-sm text-fg"
                  >
                    {row}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
});
