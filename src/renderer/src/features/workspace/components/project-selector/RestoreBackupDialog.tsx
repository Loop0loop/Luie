import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@shared/ui/Modal";
import type { SnapshotRestoreCandidate } from "@shared/types";

interface RestoreBackupDialogProps {
  isOpen: boolean;
  candidates: SnapshotRestoreCandidate[];
  isLoading: boolean;
  isRestoring: boolean;
  error: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onRestore: (candidate: SnapshotRestoreCandidate) => Promise<void> | void;
}

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export function RestoreBackupDialog({
  isOpen,
  candidates,
  isLoading,
  isRestoring,
  error,
  onClose,
  onRefresh,
  onRestore,
}: RestoreBackupDialogProps) {
  const { t } = useTranslation();
  const [userSelectedSnapshotId, setUserSelectedSnapshotId] = useState<
    string | null
  >(null);
  const selectedSnapshotId = useMemo(() => {
    if (!isOpen) {
      return null;
    }
    if (
      userSelectedSnapshotId &&
      candidates.some(
        (candidate) => candidate.snapshotId === userSelectedSnapshotId,
      )
    ) {
      return userSelectedSnapshotId;
    }
    return candidates[0]?.snapshotId ?? null;
  }, [candidates, isOpen, userSelectedSnapshotId]);

  const selectedCandidate = useMemo(
    () =>
      candidates.find(
        (candidate) => candidate.snapshotId === selectedSnapshotId,
      ) ?? null,
    [candidates, selectedSnapshotId],
  );

  const restoreDisabled =
    isLoading || isRestoring || !selectedCandidate || Boolean(error);

  return (
    <Modal
      isOpen={isOpen}
      onClose={isRestoring ? () => undefined : onClose}
      title={t("settings.projectTemplate.restoreDialog.title")}
      width="960px"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <button
            type="button"
            className="px-4 py-2 bg-transparent border border-border rounded-md text-muted text-[13px] cursor-pointer transition-all hover:bg-hover hover:text-fg disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onRefresh}
            disabled={isLoading || isRestoring}
          >
            {t("settings.projectTemplate.restoreDialog.actions.refresh")}
          </button>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 bg-transparent border border-border rounded-md text-muted text-[13px] cursor-pointer transition-all hover:bg-hover hover:text-fg disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={onClose}
              disabled={isRestoring}
            >
              {t("settings.projectTemplate.restoreDialog.actions.close")}
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-accent border-none rounded-md text-white text-[13px] font-medium cursor-pointer transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={() => {
                if (selectedCandidate) {
                  void onRestore(selectedCandidate);
                }
              }}
              disabled={restoreDisabled}
            >
              {isRestoring
                ? t("settings.projectTemplate.restoreDialog.actions.restoring")
                : t("settings.projectTemplate.restoreDialog.actions.restore")}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="m-0 text-sm text-muted">
          {t("settings.projectTemplate.restoreDialog.description")}
        </p>

        {isLoading ? (
          <div className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
            {t("settings.projectTemplate.restoreDialog.loading")}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-4 text-sm text-red-200">
            <div className="font-semibold text-fg">
              {t("settings.projectTemplate.restoreDialog.errorTitle")}
            </div>
            <p className="mt-2 mb-0">{error}</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface px-4 py-10 text-center">
            <div className="text-base font-semibold text-fg">
              {t("settings.projectTemplate.restoreDialog.emptyTitle")}
            </div>
            <p className="mt-2 mb-0 text-sm text-muted">
              {t("settings.projectTemplate.restoreDialog.emptyDescription")}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[320px,1fr]">
            <div className="max-h-[440px] overflow-y-auto pr-1 space-y-2">
              {candidates.map((candidate) => {
                const isSelected =
                  candidate.snapshotId === selectedCandidate?.snapshotId;
                return (
                  <button
                    key={candidate.snapshotId}
                    type="button"
                    data-testid={`restore-candidate-${candidate.snapshotId}`}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-accent bg-accent/10"
                        : "border-border bg-surface hover:bg-surface-hover"
                    }`}
                    onClick={() =>
                      setUserSelectedSnapshotId(candidate.snapshotId)
                    }
                  >
                    <div className="text-sm font-semibold text-fg">
                      {candidate.projectTitle}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {formatDateTime(candidate.savedAt)}
                    </div>
                    {candidate.chapterTitle ? (
                      <div className="mt-2 text-xs text-subtle">
                        {candidate.chapterTitle}
                      </div>
                    ) : null}
                    {candidate.excerpt ? (
                      <p className="mt-2 mb-0 text-xs leading-5 text-muted line-clamp-3">
                        {candidate.excerpt}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              {selectedCandidate ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.12em] text-subtle">
                      {t(
                        "settings.projectTemplate.restoreDialog.selectedLabel",
                      )}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-fg">
                      {selectedCandidate.projectTitle}
                    </div>
                  </div>

                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-canvas px-3 py-3">
                      <dt className="text-xs text-subtle">
                        {t(
                          "settings.projectTemplate.restoreDialog.projectLabel",
                        )}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-fg">
                        {selectedCandidate.projectTitle}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-border bg-canvas px-3 py-3">
                      <dt className="text-xs text-subtle">
                        {t(
                          "settings.projectTemplate.restoreDialog.savedAtLabel",
                        )}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-fg">
                        {formatDateTime(selectedCandidate.savedAt)}
                      </dd>
                    </div>
                    <div className="rounded-lg border border-border bg-canvas px-3 py-3 sm:col-span-2">
                      <dt className="text-xs text-subtle">
                        {t(
                          "settings.projectTemplate.restoreDialog.chapterLabel",
                        )}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-fg">
                        {selectedCandidate.chapterTitle ??
                          t("settings.projectTemplate.restoreDialog.noChapter")}
                      </dd>
                    </div>
                  </dl>

                  <div className="rounded-lg border border-border bg-canvas px-3 py-3">
                    <div className="text-xs text-subtle">
                      {t("settings.projectTemplate.restoreDialog.previewLabel")}
                    </div>
                    <p className="mt-2 mb-0 whitespace-pre-wrap break-words text-sm leading-6 text-fg">
                      {selectedCandidate.excerpt ??
                        t("settings.projectTemplate.restoreDialog.noPreview")}
                    </p>
                  </div>

                  <p className="m-0 text-sm text-muted">
                    {t("settings.projectTemplate.restoreDialog.prompt")}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
