import { afterEach, describe, expect, it, vi } from "vitest";
import { configureLogger, createLogger, LogLevel } from "../../src/shared/logger/index.js";

describe("logger redaction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("masks token-like fields, bearer headers, jwt strings, and absolute paths", () => {
    configureLogger({ minLevel: LogLevel.DEBUG, logToFile: false });
    const logger = createLogger("RedactionTest");
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    logger.info("security check", {
      accessTokenCipher: "secret-access-token",
      authorization: "Bearer abc.def.ghi",
      projectPath: "/Users/user/Luie/private/test.luie",
      content: "private manuscript body",
      nested: {
        refresh_token: "secret-refresh-token",
        rawJwt: "aaa.bbb.ccc",
        synopsis: "private synopsis payload",
      },
      ok: "safe-value",
    });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const payload = infoSpy.mock.calls[0]?.[1] as Record<string, unknown>;

    expect(payload.accessTokenCipher).toBe("[REDACTED]");
    expect(payload.authorization).toBe("[REDACTED]");
    expect(payload.projectPath).toBe("[REDACTED_PATH]");
    expect(payload.content).toBe("[REDACTED_TEXT]");
    expect((payload.nested as Record<string, unknown>).refresh_token).toBe("[REDACTED]");
    expect((payload.nested as Record<string, unknown>).rawJwt).toBe("[REDACTED]");
    expect((payload.nested as Record<string, unknown>).synopsis).toBe("[REDACTED_TEXT]");
    expect(payload.ok).toBe("safe-value");
  });
});
