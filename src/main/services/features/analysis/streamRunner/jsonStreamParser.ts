type LoggerLike = {
  warn: (message: string, metadata?: unknown) => void;
};

type LooseJsonStreamParserInput = {
  responseText: string;
  phase: string;
  logger: LoggerLike;
  throwIfCancelled: () => void;
  shouldRethrowError: (error: unknown) => boolean;
  emitValue: (value: unknown) => void;
};

export const parseLooseJsonStream = ({
  responseText,
  phase,
  logger,
  throwIfCancelled,
  shouldRethrowError,
  emitValue,
}: LooseJsonStreamParserInput): void => {
  let buffer = responseText;

  while (buffer.length > 0) {
    throwIfCancelled();
    const trimmed = buffer.trimStart();
    if (!trimmed) {
      buffer = "";
      break;
    }

    if (trimmed.startsWith("```")) {
      const endFence = trimmed.indexOf("\n");
      if (endFence === -1) break;
      buffer = trimmed.slice(endFence + 1);
      continue;
    }

    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      const nextJson = Math.min(
        trimmed.indexOf("{") === -1 ? Number.POSITIVE_INFINITY : trimmed.indexOf("{"),
        trimmed.indexOf("[") === -1 ? Number.POSITIVE_INFINITY : trimmed.indexOf("["),
      );
      if (nextJson === Number.POSITIVE_INFINITY) {
        buffer = "";
        break;
      }
      buffer = trimmed.slice(nextJson);
      continue;
    }

    let braceCount = 0;
    let inString = false;
    let escape = false;
    let jsonEnd = -1;
    const isArray = trimmed[0] === "[";
    const openChar = isArray ? "[" : "{";
    const closeChar = isArray ? "]" : "}";

    for (let i = 0; i < trimmed.length; i += 1) {
      const char = trimmed[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (char === "\\") {
        escape = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (char === openChar) {
        braceCount += 1;
      } else if (char === closeChar) {
        braceCount -= 1;
        if (braceCount === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }

    if (jsonEnd === -1) {
      break;
    }

    const jsonStr = trimmed.slice(0, jsonEnd);
    buffer = trimmed.slice(jsonEnd);

    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => emitValue(item));
      } else {
        emitValue(parsed);
      }
    } catch (error) {
      if (shouldRethrowError(error)) {
        throw error;
      }
      logger.warn("Failed to parse JSON", { error, jsonStr: jsonStr.slice(0, 200), phase });
    }
  }

  if (!buffer.trim()) return;

  throwIfCancelled();
  const trimmed = buffer.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      parsed.forEach((item) => emitValue(item));
    } else {
      emitValue(parsed);
    }
  } catch (error) {
    if (shouldRethrowError(error)) {
      throw error;
    }
    logger.warn("Failed to parse remaining buffer", {
      error,
      buffer: trimmed.slice(0, 200),
      phase,
    });
  }
};
