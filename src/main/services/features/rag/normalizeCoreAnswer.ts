export function normalizeCoreAnswer(raw: string): string {
  const withoutCodeFence = raw.replace(/```[\s\S]*?```/g, "").trim();
  const lines = withoutCodeFence
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const filtered = lines.filter(
    (line) =>
      !/^okay[,!]?/i.test(line) &&
      !/^let'?s\s+/i.test(line) &&
      !/^starting with/i.test(line) &&
      !/^the user/i.test(line),
  );
  const deduped: string[] = [];
  let repeatCount = 0;
  for (const line of filtered) {
    const last = deduped[deduped.length - 1];
    if (last === line) {
      repeatCount += 1;
      if (repeatCount > 1) continue;
    } else {
      repeatCount = 0;
    }
    deduped.push(line);
  }
  const merged = deduped.join("\n");
  return merged.slice(0, 1800).trim();
}
