const SAFE_DATA_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const hasControlCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });

const normalizeDataImageUrl = (value: string): string | null => {
  const commaIndex = value.indexOf(",");
  if (commaIndex <= 0) return null;

  const metadata = value.slice(5, commaIndex).toLowerCase();
  const metadataParts = metadata.split(";").filter(Boolean);
  const mimeType = metadataParts[0] ?? "";
  const isBase64 = metadataParts.includes("base64");

  if (!SAFE_DATA_IMAGE_MIME_TYPES.has(mimeType) || !isBase64) {
    return null;
  }

  return value;
};

export const normalizeSafeMindMapImageUrl = (input: string): string | null => {
  const value = input.trim();
  if (!value || hasControlCharacter(value)) return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol === "https:" || parsed.protocol === "http:") {
    return value;
  }

  if (parsed.protocol === "data:") {
    return normalizeDataImageUrl(value);
  }

  return null;
};
