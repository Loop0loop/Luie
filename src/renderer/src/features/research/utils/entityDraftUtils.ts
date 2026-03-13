export function parseEntityDraftText(text: string): {
  name: string;
  description?: string;
} {
  const normalized = text.trim();
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const name = lines[0] ?? normalized ?? "Untitled";
  const description =
    lines.length > 1 ? lines.slice(1).join("\n").trim() || undefined : undefined;

  return {
    name,
    description,
  };
}
