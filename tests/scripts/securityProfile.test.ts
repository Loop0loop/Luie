import { describe, expect, it } from "vitest";
import {
  applySecurityExceptions,
  collectSecurityFindingsFromSource,
} from "../../scripts/check-security-profile.mjs";

describe("check-security-profile helpers", () => {
  it("detects unsafe patterns from source", () => {
    const source = `
      const x = eval("1+1");
      const y = new Function("a", "return a")();
      db.$queryRawUnsafe("select * from users");
      const API_KEY = "super-secret-key";
    `;

    const findings = collectSecurityFindingsFromSource(
      source,
      "src/main/services/example.ts",
    );

    expect(findings.some((item) => item.type === "eval-call")).toBe(true);
    expect(findings.some((item) => item.type === "new-function")).toBe(true);
    expect(findings.some((item) => item.type === "prisma-unsafe-raw")).toBe(true);
    expect(findings.some((item) => item.type === "hardcoded-secret")).toBe(true);
  });

  it("filters findings via non-expired exceptions and flags expired exceptions", () => {
    const findings = [
      {
        type: "eval-call",
        severity: "error",
        message: "eval() usage is forbidden.",
        file: "src/main/services/example.ts",
        line: 10,
        text: 'const x = eval("1+1");',
      },
    ];

    const result = applySecurityExceptions(
      findings,
      [
        {
          id: "sec-1",
          type: "eval-call",
          file: "src/main/services/example.ts",
          pattern: "eval",
          expiresAt: "2027-01-01T00:00:00.000Z",
        },
        {
          id: "sec-2",
          type: "new-function",
          expiresAt: "2020-01-01T00:00:00.000Z",
        },
      ],
      new Date("2026-01-01T00:00:00.000Z"),
    );

    expect(result.findings).toHaveLength(0);
    expect(result.expiredExceptions).toHaveLength(1);
    expect(result.expiredExceptions[0].id).toBe("sec-2");
  });
});
