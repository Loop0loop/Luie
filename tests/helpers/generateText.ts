export function generateText(length: number, char = "가"): string {
  if (length <= 0) return "";
  return char.repeat(length);
}
