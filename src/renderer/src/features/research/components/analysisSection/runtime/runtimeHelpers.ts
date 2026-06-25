import { i18n } from "@renderer/i18n";
import type { UtilitySidecarStatus } from "@shared/types";
import type { RagQaSafetyLabel } from "@shared/types";

const translateRuntimeLabel = (key: string, fallback: string): string => {
  const translated = i18n.t(key, { defaultValue: fallback });
  return typeof translated === "string" && translated.length > 0 && translated !== key
    ? translated
    : fallback;
};

export const runtimeLabel = (value: string | null | undefined): string => {
  if (!value) return "none";
  if (value === "sidecar") return "Sidecar";
  if (value === "openai") return "OpenAI";
  if (value === "gemini") return "Gemini";
  if (value === "ollama") return "Ollama";
  if (value === "deterministic") return "Deterministic";
  if (value === "unavailable") return "Unavailable";
  return value;
};

export const safetyLabel = (label: RagQaSafetyLabel | "unknown"): string => {
  if (label === "confirmed") return translateRuntimeLabel("analysis.runtime.labels.confirmed", "확정");
  if (label === "inferred") return translateRuntimeLabel("analysis.runtime.labels.inferred", "추정");
  if (label === "insufficient_evidence") return translateRuntimeLabel("analysis.runtime.labels.insufficient_evidence", "근거 부족");
  if (label === "conflicting") return translateRuntimeLabel("analysis.runtime.labels.conflicting", "충돌");
  if (label === "temporal_blocked") return translateRuntimeLabel("analysis.runtime.labels.temporal_blocked", "회차 기준 불가");
  if (label === "non_canonical_source") return translateRuntimeLabel("analysis.runtime.labels.non_canonical_source", "정사 아님");
  if (label === "blocked_p0") return translateRuntimeLabel("analysis.runtime.labels.blocked_p0", "차단");
  return translateRuntimeLabel("analysis.runtime.labels.unknown", "알 수 없음");
};

export const safetyTone = (label: RagQaSafetyLabel | "unknown"): string => {
  if (label === "confirmed")
    return "border-success/30 bg-success/10 text-success";
  if (label === "inferred")
    return "border-warning/30 bg-warning/10 text-warning";
  if (
    label === "blocked_p0" ||
    label === "temporal_blocked" ||
    label === "non_canonical_source" ||
    label === "conflicting"
  )
    return "border-danger/30 bg-danger/10 text-danger";
  return "border-border bg-surface text-muted";
};

export const sidecarStatusTone = (
  status: UtilitySidecarStatus["status"],
): string => {
  if (status === "running") return "text-success";
  if (status === "crashed" || status === "cooldown") return "text-danger";
  if (status === "starting" || status === "stopping") return "text-warning";
  return "text-muted";
};

export const sidecarStatusSummary = (status: UtilitySidecarStatus): string => {
  if (status.status === "running")
    return `Sidecar: running / ${status.baseUrl}`;
  if (status.status === "starting") return "Sidecar: starting";
  if (status.status === "stopping") return "Sidecar: stopping";
  if (status.status === "crashed") return "Sidecar: crashed";
  if (status.status === "cooldown") return "Sidecar: cooldown";
  return status.lastError ? "Sidecar: stopped with error" : "Sidecar: stopped";
};
