import path from "node:path";
import { describe, expect, it } from "vitest";
import { ensureSafeAbsolutePath } from "../../../src/main/utils/pathValidation.js";
import { ErrorCode } from "../../../src/shared/constants/errorCode.js";

const expectThrowsWithCode = (fn: () => unknown, code: string) => {
  try {
    fn();
  } catch (error) {
    expect(error).toMatchObject({ code });
    return;
  }
  throw new Error(`Expected error with code ${code}`);
};

describe("pathValidation", () => {
  it("accepts absolute paths", () => {
    const input = path.join(process.cwd(), "tmp", "file.txt");
    const result = ensureSafeAbsolutePath(input, "filePath");
    expect(result).toBe(path.resolve(input));
  });

  it("rejects relative paths", () => {
    expectThrowsWithCode(
      () => ensureSafeAbsolutePath("tmp/file.txt", "filePath"),
      ErrorCode.INVALID_INPUT,
    );
  });

  it("rejects null byte injection", () => {
    const input = `${path.join(process.cwd(), "tmp")}\0attack`;
    expectThrowsWithCode(
      () => ensureSafeAbsolutePath(input, "filePath"),
      ErrorCode.INVALID_INPUT,
    );
  });

  it("rejects empty paths", () => {
    expectThrowsWithCode(
      () => ensureSafeAbsolutePath("   ", "filePath"),
      ErrorCode.REQUIRED_FIELD_MISSING,
    );
  });

  it("rejects restricted system paths", () => {
    const restrictedPath =
      process.platform === "win32"
        ? path.join(process.env.WINDIR ?? "C:\\Windows", "System32", "drivers", "etc", "hosts")
        : "/etc/hosts";

    expectThrowsWithCode(
      () => ensureSafeAbsolutePath(restrictedPath, "filePath"),
      ErrorCode.FS_PERMISSION_DENIED,
    );
  });
});
