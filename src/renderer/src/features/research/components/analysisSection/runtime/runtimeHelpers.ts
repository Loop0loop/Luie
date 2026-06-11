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
  if (status === "confirmed") return "확정";
  if (status === "inferred") return "추정";
  if (status === "conflicting") return "충돌";
  return "근거 부족";
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
  if (label === "confirmed") return "확정";
  if (label === "inferred") return "추정";
  if (label === "insufficient_evidence") return "근거 부족";
  if (label === "conflicting") return "충돌";
  if (label === "temporal_blocked") return "회차 기준 불가";
  if (label === "non_canonical_source") return "정사 아님";
  if (label === "blocked_p0") return "차단";
  return "알 수 없음";
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
