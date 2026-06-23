export const sanitizeName = (input: string, fallback = "") => {
  const trimmed = input.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
};
