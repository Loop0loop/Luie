import { i18n } from "@renderer/i18n";
import type { LlmRuntimeInfo, UtilitySidecarStatus } from "@shared/types";
import type { RagQaSafetyLabel } from "@shared/types";

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

export const groundingLabel = (status: "confirmed" | "inferred" | "conflicting" | "insufficient_evidence" | "unknown"): string => {
  if (status === "confirmed") return i18n.t("analysis.runtime.labels.confirmed");
  if (status === "inferred") return i18n.t("analysis.runtime.labels.inferred");
  if (status === "conflicting") return i18n.t("analysis.runtime.labels.conflicting");
  return i18n.t("analysis.runtime.labels.insufficient_evidence");
};

export const groundingTone = (status: "confirmed" | "inferred" | "conflicting" | "insufficient_evidence" | "unknown"): string => {
  if (status === "confirmed")
    return "border-success/30 bg-success/10 text-success";
  if (status === "inferred")
    return "border-warning/30 bg-warning/10 text-warning";
  if (status === "conflicting")
    return "border-danger/30 bg-danger/10 text-danger";
  return "border-border bg-surface text-muted";
};

export const safetyLabel = (label: RagQaSafetyLabel | "unknown"): string => {
  if (label === "confirmed") return i18n.t("analysis.runtime.labels.confirmed");
  if (label === "inferred") return i18n.t("analysis.runtime.labels.inferred");
  if (label === "insufficient_evidence") return i18n.t("analysis.runtime.labels.insufficient_evidence");
  if (label === "conflicting") return i18n.t("analysis.runtime.labels.conflicting");
  if (label === "temporal_blocked") return i18n.t("analysis.runtime.labels.temporal_blocked");
  if (label === "non_canonical_source") return i18n.t("analysis.runtime.labels.non_canonical_source");
  if (label === "blocked_p0") return i18n.t("analysis.runtime.labels.blocked_p0");
  return i18n.t("analysis.runtime.labels.unknown");
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

export const formatRuntimeInfo = (runtime: LlmRuntimeInfo | null): string => {
  if (!runtime) return "";
  return [
    runtimeLabel(runtime.requestedProvider ?? runtime.provider),
    runtimeLabel(runtime.resolvedProvider ?? runtime.provider),
  ].join("/");
};
