export const LAYER0_CHAR_LIMIT = 2_000;
export const LAYER2_CHAR_LIMIT = 4_000;
export const EVIDENCE_QUOTE_CHAR_LIMIT = 1_000;

export function trimByChars(input: string, limit: number): string {
  if (input.length <= limit) return input;
  return `${input.slice(0, Math.max(0, limit - 16))}\n...[truncated]`;
}

export function formatLayer(name: string, body: string): string {
  return `## ${name}\n${body.trim()}\n`;
}

export function isMissingTableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /no such table/i.test(error.message);
}
