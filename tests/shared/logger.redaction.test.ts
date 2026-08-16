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

  it("redacts argv absolute paths and keeps undefined values as undefined", () => {
    configureLogger({ minLevel: LogLevel.DEBUG, logToFile: false });
    const logger = createLogger("RedactionTest");
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    logger.info("argv redaction check", {
      argv: ["C:\\Users\\kaziz\\AppData\\Local\\Programs\\luie\\Luie.exe"],
      defaultApp: undefined,
    });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const payload = infoSpy.mock.calls[0]?.[1] as Record<string, unknown>;

    expect((payload.argv as string[])[0]).toBe("[REDACTED_PATH]");
    expect(payload.defaultApp).toBeUndefined();
  });

  it("redacts OAuth secrets embedded in callback URLs and argv", () => {
    configureLogger({ minLevel: LogLevel.DEBUG, logToFile: false });
    const logger = createLogger("RedactionTest");
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const callbackUrl =
      "luie://auth/callback?code=authorization-code&state=csrf-state&safe=value#access_token=fragment-token";

    logger.info("OAuth callback", {
      url: callbackUrl,
      argv: [callbackUrl, "--safe-flag"],
    });

    const payload = infoSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    const redactedUrl = payload.url as string;
    const redactedArgv = payload.argv as string[];

    expect(redactedUrl).toContain("code=[REDACTED]");
    expect(redactedUrl).toContain("state=[REDACTED]");
    expect(redactedUrl).toContain("access_token=[REDACTED]");
    expect(redactedUrl).toContain("safe=value");
    expect(redactedUrl).not.toContain("authorization-code");
    expect(redactedUrl).not.toContain("csrf-state");
    expect(redactedUrl).not.toContain("fragment-token");
    expect(redactedArgv[0]).toBe(redactedUrl);
    expect(redactedArgv[1]).toBe("--safe-flag");
  });
});
