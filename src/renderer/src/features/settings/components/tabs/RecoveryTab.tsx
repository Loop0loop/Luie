import { memo, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  FileText,
  RefreshCcw,
  ShieldAlert,
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
  t("settings.recovery.scope.noOpenProject", "열려 있는 프로젝트 없음");

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

  return t("settings.recovery.summary.unknownBackup", "확인된 백업 없음");
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
  const isDbMissing = recoveryStatus?.reason === "db-missing";

  const currentManuscriptLabel = getCurrentManuscriptLabel(
    recoveryStatus,
    recoveryScope,
    t,
  );
  const recoverableLabel = getRecoverableLabel(recoveryStatus, t);

  const heroCopy = useMemo(() => {
    if (isRecoveryStatusLoading) {
      return {
        badge: t("settings.recovery.hero.checkingBadge", "확인 중"),
        title: t("settings.recovery.dialog.checkingTitle", "복원할 최근 저장분을 확인하고 있어요"),
        description: t("settings.recovery.dialog.checkingDescription", "종료 직전의 저장 흔적이 남아 있는지 살펴보고 있습니다."),
        tone: "checking" as const,
      };
    }

    if (isDbMissing) {
      return {
        badge: t("settings.recovery.hero.blockedBadge", "복원 차단됨"),
        title: t("settings.recovery.dialog.blockedTitle", "데이터베이스를 찾을 수 없습니다"),
        description: t("settings.recovery.dialog.blockedDescription", "로컬 데이터베이스 파일이 누락되어 복원을 진행할 수 없습니다."),
        tone: "blocked" as const,
      };
    }

    if (recoveryAvailable) {
      return {
        badge: t("settings.recovery.hero.readyBadge", "복원 가능"),
        title: t("settings.recovery.dialog.readyTitle", "복원 가능한 이전 저장분이 있습니다"),
        description: t("settings.recovery.dialog.readyDescription", "미처 저장되지 않은 변경 사항을 백업본에서 안전하게 복구할 수 있습니다."),
        tone: "ready" as const,
      };
    }

    return {
      badge: t("settings.recovery.hero.emptyBadge", "최신 상태"),
      title: t("settings.recovery.dialog.emptyTitle", "복원할 저장분이 없습니다"),
      description: t("settings.recovery.dialog.emptyDescription", "모든 원고 데이터가 정상적으로 저장되어 있으며 최신 상태입니다."),
      tone: "empty" as const,
    };
  }, [isRecoveryStatusLoading, isDbMissing, recoveryAvailable, t]);

  return (
    <div className="max-w-2xl space-y-6 pb-16">
      {/* ---- Hero Status Card ---- */}
      <section className="rounded-panel border border-border/70 bg-surface/60 backdrop-blur-md p-5 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            {/* Status Badge */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-2xs border ${
                heroCopy.tone === "ready"
                  ? "bg-accent/15 border-accent/40 text-accent"
                  : heroCopy.tone === "blocked"
                    ? "bg-danger/15 border-danger/40 text-danger-fg"
                    : "bg-element/80 border-border/60 text-muted"
              }`}
            >
              {heroCopy.tone === "ready" ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : heroCopy.tone === "blocked" ? (
                <ShieldAlert className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {heroCopy.badge}
            </div>

            {/* Title & Description */}
            <h3 className="text-lg font-bold tracking-tight text-fg">
              {heroCopy.title}
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              {heroCopy.description}
            </p>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefreshRecoveryStatus}
            disabled={isRecovering || isRecoveryStatusLoading}
            className="flex shrink-0 items-center gap-1.5 rounded-control border border-border/60 bg-element/70 backdrop-blur-xs px-2.5 py-1.5 text-xs font-medium text-fg shadow-2xs hover:bg-surface hover:border-border transition-all disabled:opacity-40"
          >
            <RefreshCcw
              className={`h-3.5 w-3.5 ${isRecoveryStatusLoading ? "animate-spin text-accent" : ""}`}
            />
            {t("settings.recovery.refresh", "다시 확인")}
          </button>
        </div>
      </section>

      {/* ---- Result & Error Alerts ---- */}
      {recoveryResult ? (
        <div
          className={`rounded-panel border p-4 text-xs leading-relaxed shadow-xs ${
            recoveryResult.success
              ? "border-success-fg/30 bg-success-fg/10 text-fg"
              : "border-danger-fg/30 bg-danger-fg/10 text-danger-fg"
          }`}
        >
          {recoveryResult.message}
        </div>
      ) : null}

      {recoveryStatusError ? (
        <div className="rounded-panel border border-danger-fg/30 bg-danger-fg/10 p-4 text-xs leading-relaxed text-danger-fg shadow-xs">
          {recoveryStatusError}
        </div>
      ) : null}

      {/* ---- Comparison Cards ---- */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Current State Card */}
        <div className="rounded-panel border border-border/70 bg-surface/60 backdrop-blur-md p-4 space-y-2 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-medium text-subtle">
            <FileText className="h-3.5 w-3.5" />
            <span>{t("settings.recovery.summary.current", "현재 로컬 원고")}</span>
          </div>
          <div className="text-sm font-semibold text-fg truncate">
            {currentManuscriptLabel}
          </div>
          <div className="text-xs text-muted">
            <span className="text-subtle">{t("settings.recovery.summary.currentSavedAt", "저장 시각")}:</span>{" "}
            <span className="font-mono">{formatDateTime(recoveryStatus?.database.modifiedAt)}</span>
          </div>
        </div>

        {/* Recoverable State Card */}
        <div className="rounded-panel border border-border/70 bg-surface/60 backdrop-blur-md p-4 space-y-2 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>{t("settings.recovery.summary.recoverable", "복원 가능한 저장분")}</span>
          </div>
          <div className="text-sm font-semibold text-fg truncate">
            {recoverableLabel}
          </div>
          <div className="text-xs text-muted">
            <span className="text-subtle">{t("settings.recovery.summary.backupSavedAt", "백업 시각")}:</span>{" "}
            <span className="font-mono">
              {formatDateTime(
                recoveryStatus?.preview?.chapterUpdatedAt ??
                  recoveryStatus?.wal.modifiedAt,
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Preview Excerpt (If Available) */}
      {recoveryStatus?.preview?.excerpt ? (
        <div className="rounded-panel border border-border/60 bg-surface/40 backdrop-blur-md p-4 space-y-1.5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-subtle">
            {t("settings.recovery.summary.preview", "미리보기")}
          </div>
          <p className="text-xs text-fg leading-relaxed whitespace-pre-wrap">
            {recoveryStatus.preview.excerpt}
          </p>
        </div>
      ) : null}

      {/* ---- Actions Bar ---- */}
      <section className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-control px-3.5 py-2 text-xs font-medium text-muted hover:text-fg hover:bg-surface/80 border border-transparent hover:border-border/60 transition-all shadow-2xs"
        >
          {t("settings.recovery.actions.ignore", "무시하고 닫기")}
        </button>

        <button
          type="button"
          onClick={() => onRunRecovery(false)}
          disabled={!recoveryAvailable || isRecovering || isRecoveryStatusLoading}
          className="flex items-center gap-1.5 rounded-control bg-accent px-4 py-2 text-xs font-semibold text-on-accent shadow-control hover:bg-accent/90 disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          {isRecovering
            ? t("settings.recovery.running", "복원 진행 중...")
            : t("settings.recovery.actions.restore", "백업본으로 복원")}
        </button>
      </section>

      {/* ---- Technical Information Accordion ---- */}
      <div className="rounded-panel border border-border/70 bg-surface/50 backdrop-blur-md overflow-hidden transition-all shadow-xs">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails((current) => !current)}
          className="flex w-full items-center justify-between p-3.5 text-xs font-medium text-muted hover:text-fg hover:bg-surface/60 transition-colors"
        >
          <span className="flex items-center gap-2">
            {showTechnicalDetails ? (
              <ChevronDown className="h-4 w-4 text-accent" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted" />
            )}
            {t("settings.recovery.technicalTitle", "기술 정보 및 안전 백업")}
          </span>
          <span className="text-[11px] text-subtle">
            {showTechnicalDetails ? "접기" : "자세히 보기"}
          </span>
        </button>

        {showTechnicalDetails ? (
          <div className="space-y-3 p-4 pt-1 border-t border-border/60 bg-surface/70 backdrop-blur-md">
            <p className="text-xs text-muted leading-relaxed">
              {t(
                "settings.recovery.scope.libraryDescription",
                "이 기능은 현재 프로젝트 하나가 아니라, 이 기기에 저장된 Luie 로컬 보관함 전체를 대상으로 합니다.",
              )}
            </p>

            <div className="grid gap-2.5 text-xs md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
                  {t("settings.recovery.fields.path", "데이터베이스 경로")}
                </div>
                <div className="break-all rounded-control border border-border/40 bg-element/70 p-2 font-mono text-[11px] text-fg shadow-2xs">
                  {recoveryStatus?.database.path ?? "-"}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
                  {t("settings.recovery.fields.backupRootDir", "백업 보관 디렉토리")}
                </div>
                <div className="break-all rounded-control border border-border/40 bg-element/70 p-2 font-mono text-[11px] text-fg shadow-2xs">
                  {recoveryStatus?.backupRootDir ?? "-"}
                </div>
              </div>
            </div>

            {recoveryResult?.backupDir ? (
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
                  {t("settings.recovery.fields.backupDir", "생성된 백업 경로")}
                </div>
                <div className="break-all rounded-control border border-border/40 bg-element/70 p-2 font-mono text-[11px] text-fg shadow-2xs">
                  {recoveryResult.backupDir}
                </div>
              </div>
            ) : null}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onRunRecovery(true)}
                disabled={!recoveryAvailable || isRecovering || isRecoveryStatusLoading}
                className="rounded-control border border-border/60 bg-element/70 backdrop-blur-xs px-3 py-1.5 text-xs font-medium text-fg shadow-2xs hover:bg-surface hover:border-border transition-all disabled:opacity-40"
              >
                {t("settings.recovery.dryRun", "먼저 안전 백업만 만들기 (Dry Run)")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
});
