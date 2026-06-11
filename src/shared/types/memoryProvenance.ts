export type MemoryProvenanceKind =
  | "canon"
  | "draft"
  | "discarded"
  | "inferred"
  | "user_note"
  | "imported"
  | "unknown";

export type MemoryCanonStatus =
  | "canon"
  | "draft"
  | "discarded"
  | "inferred"
  | "unknown";

export function memoryProvenanceKindLabel(
  value: MemoryProvenanceKind,
): string {
  if (value === "canon") return "원문";
  if (value === "draft") return "초안";
  if (value === "discarded") return "폐기";
  if (value === "inferred") return "추론";
  if (value === "user_note") return "작가 메모";
  if (value === "imported") return "외부 가져오기";
  return "미확인";
}

export function memoryCanonStatusLabel(value: MemoryCanonStatus): string {
  if (value === "canon") return "정사";
  if (value === "draft") return "초안";
  if (value === "discarded") return "폐기";
  if (value === "inferred") return "추론";
  return "미확인";
}
