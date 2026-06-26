import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, Cpu, Loader2, Sparkles } from "lucide-react";
import { api } from "@shared/api";
import type { EmbeddingModelStatusView, LlmfitResult } from "@shared/types";

type WizardStep = "intro" | "setup" | "finalizing" | "error";

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const fitBadgeClass = (
  level: "perfect" | "good" | "marginal" | "too_tight" | "unknown",
): string => {
  switch (level) {
    case "perfect":
      return "bg-success/15 text-success border border-success/30";
    case "good":
      return "bg-accent/15 text-accent border border-accent/30";
    case "marginal":
      return "bg-warning/15 text-warning border border-warning/30";
    case "too_tight":
      return "bg-danger/15 text-danger border border-danger/30";
    default:
      return "bg-surface text-muted border border-border";
  }
};

export default function StartupWizard() {
  const { t } = useTranslation();
  const [step, setStep] = useState<WizardStep>("intro");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [embeddingStatus, setEmbeddingStatus] =
    useState<EmbeddingModelStatusView | null>(null);
  const [embeddingProgress, setEmbeddingProgress] = useState<{
    stage: "downloading" | "complete" | "error";
    pct: number;
    error?: string;
  } | null>(null);
  const [embeddingDownloading, setEmbeddingDownloading] = useState(false);
  const [llmfitResult, setLlmfitResult] = useState<LlmfitResult | null>(null);
  const [llmfitLoading, setLlmfitLoading] = useState(false);

  // 설치 단계 진입 시 임베딩 상태 + 하드웨어 추천을 로드(비차단).
  useEffect(() => {
    if (step !== "setup") return;
    void (async () => {
      const embeddingRes = await api.settings.getEmbeddingModelStatus();
      if (embeddingRes.success && embeddingRes.data) {
        setEmbeddingStatus(embeddingRes.data);
      }
      setLlmfitLoading(true);
      const llmfitRes = await api.settings.getLlmfitRecommendations({ limit: 5 });
      if (llmfitRes.success && llmfitRes.data) {
        setLlmfitResult(llmfitRes.data);
      }
      setLlmfitLoading(false);
    })();
  }, [step]);

  useEffect(() => {
    const unsubscribe = api.settings.onEmbeddingModelDownloadProgress((progress) => {
      setEmbeddingProgress(progress);
      if (progress.stage === "complete") {
        setEmbeddingDownloading(false);
        void api.settings.getEmbeddingModelStatus().then((response) => {
          if (response.success && response.data) {
            setEmbeddingStatus(response.data);
          }
        });
      }
      if (progress.stage === "error") setEmbeddingDownloading(false);
    });
    return unsubscribe;
  }, []);

  const handleDownloadEmbedding = useCallback(async () => {
    setEmbeddingDownloading(true);
    setEmbeddingProgress(null);
    const response = await api.settings.downloadEmbeddingModel();
    if (!response.success) {
      setEmbeddingDownloading(false);
    }
  }, []);

  // 완료: 기존 readiness/completeWizard 흐름으로 Main Window 전환을 트리거(R7.5).
  const finalize = useCallback(async () => {
    setStep("finalizing");
    setErrorMessage(null);
    try {
      const readinessResponse = await api.startup.getReadiness();
      if (!readinessResponse.success || !readinessResponse.data) {
        throw new Error(
          readinessResponse.error?.message ?? "Failed to evaluate startup readiness",
        );
      }
      if (readinessResponse.data.mustRunWizard) {
        const completeResponse = await api.startup.completeWizard();
        if (!completeResponse.success || !completeResponse.data) {
          throw new Error(
            completeResponse.error?.message ?? "Failed to complete startup configuration",
          );
        }
        if (completeResponse.data.mustRunWizard) {
          const unresolved = completeResponse.data.reasons.join(", ");
          throw new Error(`STARTUP_PENDING_CHECKS:${unresolved || "unknown"}`);
        }
      }
      // 성공 시 메인 프로세스가 wizard 완료 이벤트로 Main Window 로 전환한다.
    } catch (error) {
      setStep("error");
      setErrorMessage(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    if (attempt === 0) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void finalize();
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, finalize]);

  const isSpinning = step === "finalizing";

  return (
    <div className="min-h-screen bg-app text-fg flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-panel shadow-xl p-8">
        {step === "intro" && (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-semibold">
              {t("startupWizard.onboarding.introTitle")}
            </h1>
            <p className="text-sm text-muted">
              {t("startupWizard.onboarding.introBody")}
            </p>
            <button
              type="button"
              onClick={() => setStep("setup")}
              className="w-full rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90"
            >
              {t("startupWizard.onboarding.introNext")}
            </button>
          </div>
        )}

        {step === "setup" && (
          <div className="flex flex-col gap-4">
            <div className="space-y-1 text-center">
              <h1 className="text-lg font-semibold">
                {t("startupWizard.onboarding.setupTitle")}
              </h1>
              <p className="text-xs text-muted">
                {t("startupWizard.onboarding.setupBody")}
              </p>
            </div>

            {/* 임베딩 모델 상태 + 설치 */}
            <div className="rounded-control border border-border bg-surface p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-fg-secondary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t("settings.localLlm.embedding.title")}</span>
              </div>
              {embeddingStatus?.installed ? (
                <div className="flex items-center gap-1.5 text-xs text-success">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>
                    {t("settings.localLlm.embedding.installed", {
                      name: embeddingStatus.displayName,
                    })}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-muted">
                  {t("settings.localLlm.embedding.notInstalled")}
                </p>
              )}

              {embeddingDownloading && embeddingProgress?.stage === "downloading" && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{t("settings.localLlm.embedding.downloading")}</span>
                    <span>{embeddingProgress.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${embeddingProgress.pct}%` }}
                    />
                  </div>
                </div>
              )}
              {embeddingProgress?.error && (
                <p className="text-xs text-danger">{embeddingProgress.error}</p>
              )}

              {!embeddingStatus?.installed && (
                <button
                  type="button"
                  onClick={() => void handleDownloadEmbedding()}
                  disabled={embeddingDownloading}
                  className="w-full rounded-lg border border-border bg-bg px-4 py-2 text-xs text-fg hover:bg-surface-hover disabled:opacity-50"
                >
                  {embeddingDownloading
                    ? t("settings.localLlm.embedding.downloading")
                    : t("settings.localLlm.embedding.download")}
                </button>
              )}
            </div>

            {/* 하드웨어 맞춤 추천 */}
            <div className="rounded-control border border-border bg-surface p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-fg-secondary">
                <Cpu className="h-3.5 w-3.5" />
                <span>{t("startupWizard.onboarding.recommendTitle")}</span>
              </div>
              {llmfitLoading ? (
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t("settings.localLlm.llmfit.loading")}</span>
                </div>
              ) : llmfitResult?.available && llmfitResult.recommendations.length > 0 ? (
                <div className="max-h-40 divide-y divide-border overflow-y-auto rounded-control border border-border bg-panel">
                  {llmfitResult.recommendations.map((rec) => (
                    <div key={rec.name} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                      <span className="truncate text-xs text-fg">{rec.name}</span>
                      <span
                        className={`shrink-0 rounded-control px-1.5 py-0.5 text-[10px] ${fitBadgeClass(rec.fitLevel)}`}
                      >
                        {t(`settings.localLlm.llmfit.fit.${rec.fitLevel}`)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">
                  {t("settings.localLlm.llmfit.unavailable")}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void finalize()}
                className="flex-1 rounded-lg border border-border bg-bg px-4 py-2 text-sm text-muted hover:bg-surface-hover"
              >
                {t("startupWizard.onboarding.skip")}
              </button>
              <button
                type="button"
                onClick={() => void finalize()}
                className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90"
              >
                {t("startupWizard.onboarding.next")}
              </button>
            </div>
          </div>
        )}

        {(step === "finalizing" || step === "error") && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border-4 border-border/60" />
              <div
                className={`absolute inset-0 rounded-full border-4 border-transparent border-t-accent ${
                  isSpinning ? "animate-spin" : ""
                }`}
              />
            </div>
            <p className="text-sm text-muted">
              {t("startupWizard.onboarding.finishing")}
            </p>

            {step === "error" && (
              <div className="w-full space-y-3">
                <p className="text-xs text-danger-fg break-all">
                  {errorMessage ?? t("startupWizard.status.failed")}
                </p>
                <button
                  type="button"
                  onClick={() => setAttempt((prev) => prev + 1)}
                  className="w-full rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90"
                >
                  {t("startupWizard.actions.retry")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
