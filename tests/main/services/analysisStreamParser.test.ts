import { describe, expect, it, vi } from "vitest";
import { parseLooseJsonStream } from "../../../src/main/services/features/analysis/streamRunner/index.js";

describe("parseLooseJsonStream", () => {
  it("emits JSON objects and arrays from noisy fenced text", () => {
    const emitted: unknown[] = [];
    const logger = { warn: vi.fn() };

    parseLooseJsonStream({
      responseText: [
        "preface text",
        "```json",
        '{"type":"intro","content":"hello"}',
        "```",
        '[{"type":"reaction","content":"wow"},{"type":"outro","content":"bye"}]',
      ].join("\n"),
      phase: "primary",
      logger,
      throwIfCancelled: vi.fn(),
      shouldRethrowError: () => false,
      emitValue: (value) => emitted.push(value),
    });

    expect(emitted).toEqual([
      { type: "intro", content: "hello" },
      { type: "reaction", content: "wow" },
      { type: "outro", content: "bye" },
    ]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("preserves braces inside strings while finding JSON boundaries", () => {
    const emitted: unknown[] = [];

    parseLooseJsonStream({
      responseText:
        '{"type":"intro","content":"literal } brace and \\"quote\\" \\\\ slash"}{"type":"outro","content":"done"}',
      phase: "primary",
      logger: { warn: vi.fn() },
      throwIfCancelled: vi.fn(),
      shouldRethrowError: () => false,
      emitValue: (value) => emitted.push(value),
    });

    expect(emitted).toEqual([
      { type: "intro", content: 'literal } brace and "quote" \\ slash' },
      { type: "outro", content: "done" },
    ]);
  });

  it("warns when the remaining buffer is malformed JSON", () => {
    const logger = { warn: vi.fn() };

    parseLooseJsonStream({
      responseText: '{"type":"intro","content":"ok"}{malformed',
      phase: "followup",
      logger,
      throwIfCancelled: vi.fn(),
      shouldRethrowError: () => false,
      emitValue: vi.fn(),
    });

    expect(logger.warn).toHaveBeenCalledWith(
      "Failed to parse remaining buffer",
      expect.objectContaining({
        phase: "followup",
      }),
    );
  });

  it("rethrows parse failures when the caller reports cancellation", () => {
    expect(() =>
      parseLooseJsonStream({
        responseText: "{malformed",
        phase: "primary",
        logger: { warn: vi.fn() },
        throwIfCancelled: vi.fn(),
        shouldRethrowError: () => true,
        emitValue: vi.fn(),
      }),
    ).toThrow(SyntaxError);
  });
});
