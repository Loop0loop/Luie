import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DB_NAME } from "../../src/shared/constants/index.js";

const mocked = vi.hoisted(() => ({
  isPackaged: false,
  userDataPath: "/tmp/luie-user-data",
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => mocked.userDataPath),
    get isPackaged() {
      return mocked.isPackaged;
    },
  },
}));

describe("initDatabaseEnv", () => {
  let originalDatabaseUrl: string | undefined;
  let originalNodeEnv: string | undefined;
  let originalVitest: string | undefined;

  beforeEach(() => {
    vi.resetModules();
    originalDatabaseUrl = process.env.DATABASE_URL;
    originalNodeEnv = process.env.NODE_ENV;
    originalVitest = process.env.VITEST;
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalVitest === undefined) {
      delete process.env.VITEST;
    } else {
      process.env.VITEST = originalVitest;
    }
  });

  it("keeps existing DATABASE_URL unchanged", async () => {
    process.env.DATABASE_URL = "file:/already-set.db";
    process.env.NODE_ENV = "development";
    process.env.VITEST = "false";
    mocked.isPackaged = false;

    const { initDatabaseEnv } = await import("../../src/main/prismaEnv.js");
    initDatabaseEnv();

    expect(process.env.DATABASE_URL).toBe("file:/already-set.db");
  });

  it("uses test db path when test environment is detected", async () => {
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = "test";
    process.env.VITEST = "false";
    mocked.isPackaged = false;

    const { initDatabaseEnv } = await import("../../src/main/prismaEnv.js");
    initDatabaseEnv();

    expect(process.env.DATABASE_URL).toBe(`file:${path.join(process.cwd(), "prisma", ".tmp", "test.db")}`);
  });

  it("uses development db path when not packaged and not test", async () => {
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = "development";
    process.env.VITEST = "false";
    mocked.isPackaged = false;

    const { initDatabaseEnv } = await import("../../src/main/prismaEnv.js");
    initDatabaseEnv();

    expect(process.env.DATABASE_URL).toBe(`file:${path.join(process.cwd(), "prisma", "dev.db")}`);
  });

  it("uses userData db path when packaged", async () => {
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = "production";
    process.env.VITEST = "false";
    mocked.isPackaged = true;
    mocked.userDataPath = "/tmp/prod-user-data";

    const { initDatabaseEnv } = await import("../../src/main/prismaEnv.js");
    initDatabaseEnv();

    expect(process.env.DATABASE_URL).toBe(`file:${path.join("/tmp/prod-user-data", DB_NAME)}`);
  });
});
