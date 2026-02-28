import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const mocked = vi.hoisted(() => {
  let appIsPackaged = true;
  const appGetVersion = vi.fn(() => "1.0.0");
  const appRelaunch = vi.fn();
  const appExit = vi.fn();
  const browserGetAllWindows = vi.fn(() => []);
  const userDataPath = `/tmp/luie-update-service-${process.pid}`;

  return {
    appGetVersion,
    appRelaunch,
    appExit,
    browserGetAllWindows,
    userDataPath,
    get appIsPackaged() {
      return appIsPackaged;
    },
    set appIsPackaged(next: boolean) {
      appIsPackaged = next;
    },
  };
});

vi.mock("electron", () => ({
  app: {
    getVersion: (...args: unknown[]) => mocked.appGetVersion(...args),
    getPath: () => mocked.userDataPath,
    relaunch: (...args: unknown[]) => mocked.appRelaunch(...args),
    exit: (...args: unknown[]) => mocked.appExit(...args),
    get isPackaged() {
      return mocked.appIsPackaged;
    },
  },
  BrowserWindow: {
    getAllWindows: (...args: unknown[]) => mocked.browserGetAllWindows(...args),
  },
}));

describe("appUpdateService", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllGlobals();
    mocked.appGetVersion.mockReset();
    mocked.appGetVersion.mockReturnValue("1.0.0");
    mocked.appRelaunch.mockReset();
    mocked.appExit.mockReset();
    mocked.browserGetAllWindows.mockReset();
    mocked.browserGetAllWindows.mockReturnValue([]);
    mocked.appIsPackaged = true;
    delete process.env.LUIE_UPDATE_FEED_URL;
    delete process.env.LUIE_TEST_DISABLE_UPDATE_RELAUNCH;
    await fs.rm(mocked.userDataPath, { recursive: true, force: true });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    delete process.env.LUIE_UPDATE_FEED_URL;
    delete process.env.LUIE_TEST_DISABLE_UPDATE_RELAUNCH;
    await fs.rm(mocked.userDataPath, { recursive: true, force: true });
  });

  it("checks update and downloads verified artifact", async () => {
    const payload = Buffer.from("update-binary-v1");
    const sha256 = createHash("sha256").update(payload).digest("hex");
    process.env.LUIE_UPDATE_FEED_URL = "https://updates.example.com/latest.json";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = typeof input === "string" ? input : String(input);
        if (url.includes("latest.json")) {
          return {
            ok: true,
            status: 200,
            headers: {
              get: (name: string) =>
                name.toLowerCase() === "content-type" ? "application/json" : null,
            },
            text: async () =>
              JSON.stringify({
                version: "1.1.0",
                url: "https://updates.example.com/luie-1.1.0.bin",
                sha256,
                size: payload.length,
              }),
          };
        }
        if (url.includes("luie-1.1.0.bin")) {
          return {
            ok: true,
            status: 200,
            headers: {
              get: (name: string) =>
                name.toLowerCase() === "content-length" ? String(payload.length) : null,
            },
            body: new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(new Uint8Array(payload));
                controller.close();
              },
            }),
          };
        }
        throw new Error(`Unexpected fetch url: ${url}`);
      }),
    );

    const { appUpdateService } = await import(
      "../../../src/main/services/features/appUpdateService.js"
    );
    const check = await appUpdateService.checkForUpdate();
    expect(check.available).toBe(true);
    expect(check.latestVersion).toBe("1.1.0");

    const downloaded = await appUpdateService.downloadUpdate();
    expect(downloaded.success).toBe(true);
    expect(downloaded.artifact?.version).toBe("1.1.0");
    expect(downloaded.artifact?.sha256).toBe(sha256);

    const updateDir = path.join(mocked.userDataPath, "updates");
    const pendingRaw = await fs.readFile(path.join(updateDir, "pending.json"), "utf-8");
    const pending = JSON.parse(pendingRaw) as { filePath: string; sha256: string; size: number };
    expect(pending.sha256).toBe(sha256);
    expect(pending.size).toBe(payload.length);
    const fileData = await fs.readFile(pending.filePath);
    expect(fileData.equals(payload)).toBe(true);
  });

  it("applies pending artifact in test mode without relaunch", async () => {
    process.env.LUIE_TEST_DISABLE_UPDATE_RELAUNCH = "1";
    const payload = Buffer.from("pending-artifact");
    const sha256 = createHash("sha256").update(payload).digest("hex");

    const updateDir = path.join(mocked.userDataPath, "updates");
    await fs.mkdir(updateDir, { recursive: true });
    const artifactPath = path.join(updateDir, "luie-1.2.0.bin");
    await fs.writeFile(artifactPath, payload);
    await fs.writeFile(
      path.join(updateDir, "pending.json"),
      JSON.stringify(
        {
          version: "1.2.0",
          filePath: artifactPath,
          sha256,
          size: payload.length,
          sourceUrl: "https://updates.example.com/luie-1.2.0.bin",
          downloadedAt: "2026-02-28T00:00:00.000Z",
        },
        null,
        2,
      ),
      "utf-8",
    );

    const { appUpdateService } = await import(
      "../../../src/main/services/features/appUpdateService.js"
    );
    const result = await appUpdateService.applyUpdate();

    expect(result.success).toBe(true);
    expect(result.relaunched).toBe(false);
    expect(result.message).toBe("UPDATE_APPLY_OK_TEST_MODE");
    expect(mocked.appRelaunch).not.toHaveBeenCalled();
    expect(mocked.appExit).not.toHaveBeenCalled();

    const currentRaw = await fs.readFile(path.join(updateDir, "current.json"), "utf-8");
    const current = JSON.parse(currentRaw) as { version: string };
    expect(current.version).toBe("1.2.0");
  });

  it("rolls back to rollback metadata when checksum is valid", async () => {
    const payload = Buffer.from("rollback-artifact");
    const sha256 = createHash("sha256").update(payload).digest("hex");
    const updateDir = path.join(mocked.userDataPath, "updates");
    await fs.mkdir(updateDir, { recursive: true });

    const rollbackPath = path.join(updateDir, "luie-1.1.0.bin");
    await fs.writeFile(rollbackPath, payload);
    await fs.writeFile(
      path.join(updateDir, "rollback.json"),
      JSON.stringify(
        {
          version: "1.1.0",
          filePath: rollbackPath,
          sha256,
          size: payload.length,
          sourceUrl: "https://updates.example.com/luie-1.1.0.bin",
          downloadedAt: "2026-02-28T00:00:00.000Z",
        },
        null,
        2,
      ),
      "utf-8",
    );
    await fs.writeFile(
      path.join(updateDir, "current.json"),
      JSON.stringify(
        {
          version: "1.2.0",
          filePath: path.join(updateDir, "luie-1.2.0.bin"),
          sha256: "0".repeat(64),
          size: 0,
          sourceUrl: "https://updates.example.com/luie-1.2.0.bin",
          downloadedAt: "2026-02-28T00:00:00.000Z",
        },
        null,
        2,
      ),
      "utf-8",
    );

    const { appUpdateService } = await import(
      "../../../src/main/services/features/appUpdateService.js"
    );
    const result = await appUpdateService.rollbackUpdate();

    expect(result.success).toBe(true);
    expect(result.restoredVersion).toBe("1.1.0");

    const currentRaw = await fs.readFile(path.join(updateDir, "current.json"), "utf-8");
    const current = JSON.parse(currentRaw) as { version: string };
    expect(current.version).toBe("1.1.0");
  });
});
