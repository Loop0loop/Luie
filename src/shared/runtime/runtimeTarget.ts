export type RuntimeTarget = "electron" | "electrobun";

const normalizeRuntimeTarget = (value: string | undefined): string =>
  (value ?? "").trim().toLowerCase();

export const resolveRuntimeTarget = (input?: string): RuntimeTarget => {
  const normalized = normalizeRuntimeTarget(input);
  if (normalized === "electrobun") {
    return "electrobun";
  }
  return "electron";
};
