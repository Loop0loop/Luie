import path from "node:path";

const EN_SENTENCE =
  "This is a stable manuscript sentence for repeated persistence checks, with digits 0123456789 and normal punctuation. ";
const KO_SENTENCE = "한글 문장도 자연스럽게 섞습니다. ";
const JA_SENTENCE = "日本語の文も自然に混ぜます。 ";
const ASCII_PADDING = "abcdefghijklmnopqrstuvwxyz0123456789 ";

const repeatText = (text: string, count: number): string => {
  if (count <= 0) return "";
  return new Array(count).fill(text).join("");
};

export const makeMixedNarrativeText = (length: number, variant = 0): string => {
  const unit =
    repeatText(EN_SENTENCE, 18 + (variant % 3)) +
    KO_SENTENCE +
    repeatText(EN_SENTENCE, 18 + ((variant + 1) % 3)) +
    JA_SENTENCE +
    repeatText(ASCII_PADDING, 6) +
    (variant % 2 === 0
      ? "The chapter stays readable across repeated reloads. "
      : "The export remains stable across repeated reloads. ") +
    repeatText(ASCII_PADDING, 6);

  if (length <= 0) return "";
  const repeatCount = Math.max(1, Math.ceil(length / unit.length));
  return repeatText(unit, repeatCount).slice(0, length);
};

export const makeExactMixedByteText = (byteLength: number): string => {
  const prefix =
    "한국어 문장과 日本語の文と English prose 0123456789 를 함께 담는 경계값 테스트 문자열. ";
  const prefixBytes = Buffer.byteLength(prefix, "utf8");
  if (prefixBytes >= byteLength) {
    return prefix.slice(0, byteLength);
  }
  return `${prefix}${"a".repeat(byteLength - prefixBytes)}`;
};

export const makeDeepPath = (depth: number, leafName: string): string => {
  const segments = Array.from({ length: depth }, (_value, index) => `level-${index + 1}`);
  return path.posix.join(...segments, leafName);
};

export const makeLongPath = (length: number, leafName: string): string => {
  const prefix = "world/";
  const suffix = `/${leafName}`;
  const fillerLength = Math.max(0, length - prefix.length - suffix.length);
  return `${prefix}${"a".repeat(fillerLength)}${suffix}`;
};

export const makeManyChapters = (
  count: number,
  variant = 0,
  contentLength = 240,
) =>
  Array.from({ length: count }, (_value, index) => ({
    id: `chapter-${index + 1}`,
    content: makeMixedNarrativeText(contentLength + ((index + variant) % 5) * 13, variant + index),
  }));
