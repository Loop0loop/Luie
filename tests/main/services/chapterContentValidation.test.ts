// TEST_LEVEL: UNIT
// PROVES: applyChapterContentUpdate의 대량 삭제 보호 결정표와 경계값
// DOES_NOT_PROVE: 실제 DB/snapshot artifact 저장 (snapshotResilience.test.ts 참조)

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocked = vi.hoisted(() => ({
  createSnapshot: vi.fn(async () => undefined),
  broadcast: vi.fn(),
  trackKeywordAppearances: vi.fn(),
  // NOTE: 기본 true(테스트 환경) — large-deletion 분기 검증 시 false로 전환한다.
  isTestEnv: vi.fn(() => true),
}));

vi.mock("electron", () => ({
  app: { isPackaged: false, getPath: () => "/tmp" },
  nativeTheme: { shouldUseDarkColors: false },
  BrowserWindow: {
    getAllWindows: () => [
      { isDestroyed: () => false, webContents: { send: mocked.broadcast } },
    ],
  },
}));

vi.mock("../../../src/main/utils/env/index.js", async (importOriginal) => {
  const actual = await importOriginal<
    Record<string, unknown>
  >();
  return { ...actual, isTestEnv: mocked.isTestEnv };
});

vi.mock("../../../src/main/domains/recovery/index.js", () => ({
  snapshotService: { createSnapshot: mocked.createSnapshot },
}));

vi.mock("../../../src/main/services/features/manuscript/chapterKeywords.js", () => ({
  trackKeywordAppearances: mocked.trackKeywordAppearances,
}));

vi.mock("../../../src/main/services/core/chapter/chapterRuntime.js", () => ({
  chapterLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  fireAndForget: vi.fn(),
  SKIP_NONCRITICAL_DERIVED_ON_STRESS: false,
  SKIP_DERIVED_ENQUEUE_ON_STRESS: false,
  SUPPRESS_HOT_PATH_INFO_LOGS: true,
}));

const { applyChapterContentUpdate } = await import(
  "../../../src/main/services/core/chapter/chapterContentValidation.js"
);

const SAVE_PROTECTED_CHANNEL = "chapter:save-protected";

// NOTE: projectId에 undefined를 쓰면 JS 기본 매개변수가 적용되므로 null로 구분한다.
const current = (content: string, projectId: string | null) => ({
  content,
  ...(projectId ? { projectId } : {}),
});

const run = async (
  oldContent: string,
  newContent: string,
  projectId: string | null = "project-1",
) => {
  const updateData: Record<string, unknown> = {};
  await applyChapterContentUpdate(
    { id: "chapter-1", content: newContent },
    current(oldContent, projectId),
    updateData,
  );
  return updateData;
};

const waitForBroadcast = async () => {
  await vi.waitFor(() => expect(mocked.broadcast).toHaveBeenCalled());
};

describe("applyChapterContentUpdate 대량 삭제 보호 (결정표/BVA)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.isTestEnv.mockReturnValue(true);
  });

  it("일반 편집(500→400)은 보호 없이 저장만 진행한다", async () => {
    const updateData = await run("x".repeat(500), "y".repeat(400));
    expect(mocked.createSnapshot).not.toHaveBeenCalled();
    expect(updateData.content).toBe("y".repeat(400));
    expect(updateData.wordCount).toBe(400);
  });

  it("전체 삭제(500→0)는 삭제 직전 스냅샷 + 알림 후 저장을 진행한다", async () => {
    const updateData = await run("x".repeat(500), "");
    expect(mocked.createSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        chapterId: "chapter-1",
        content: "x".repeat(500),
      }),
    );
    await waitForBroadcast();
    expect(mocked.broadcast).toHaveBeenCalledWith(
      SAVE_PROTECTED_CHANNEL,
      expect.objectContaining({
        reason: "empty-wipe",
        oldLength: 500,
        newLength: 0,
      }),
    );
    expect(updateData.content).toBe("");
    expect(updateData.wordCount).toBe(0);
  });

  it("대량 삭제(5000→100, prod)는 스냅샷 + 알림을 발동한다", async () => {
    mocked.isTestEnv.mockReturnValue(false);
    await run("x".repeat(5000), "y".repeat(100));
    expect(mocked.createSnapshot).toHaveBeenCalledTimes(1);
    await waitForBroadcast();
    expect(mocked.broadcast).toHaveBeenCalledWith(
      SAVE_PROTECTED_CHANNEL,
      expect.objectContaining({ reason: "large-deletion" }),
    );
  });

  it.each([
    { oldLen: 1000, newLen: 50, triggers: false, why: "oldLen 경계: 1000 이하는 대량삭제 규칙 미적용" },
    { oldLen: 1001, newLen: 101, triggers: false, why: "newLen 101 >= 100.1 (10% 초과 보존)" },
    { oldLen: 2000, newLen: 200, triggers: false, why: "정확히 10% 보존은 미발동 (< 기준)" },
  ])(
    "경계값 미발동: oldLen=$oldLen → newLen=$newLen ($why)",
    async ({ oldLen, newLen, triggers }) => {
      mocked.isTestEnv.mockReturnValue(false);
      await run("x".repeat(oldLen), "y".repeat(newLen));
      expect(mocked.createSnapshot).not.toHaveBeenCalled();
      expect(triggers).toBe(false);
    },
  );

  it.each([
    { oldLen: 1001, newLen: 100, why: "100 < 100.1: 최소 대량삭제 발동 케이스" },
    { oldLen: 2000, newLen: 199, why: "199 < 200: 10% 미만 보존" },
  ])(
    "경계값 발동: oldLen=$oldLen → newLen=$newLen ($why)",
    async ({ oldLen, newLen }) => {
      mocked.isTestEnv.mockReturnValue(false);
      await run("x".repeat(oldLen), "y".repeat(newLen));
      expect(mocked.createSnapshot).toHaveBeenCalledTimes(1);
      await waitForBroadcast();
      expect(mocked.broadcast).toHaveBeenCalledWith(
        SAVE_PROTECTED_CHANNEL,
        expect.objectContaining({
          reason: "large-deletion",
          oldLength: oldLen,
          newLength: newLen,
        }),
      );
    },
  );

  it("projectId를 알 수 없으면 보호 없이 저장만 진행한다", async () => {
    const updateData = await run("x".repeat(500), "", null);
    expect(mocked.createSnapshot).not.toHaveBeenCalled();
    expect(updateData.content).toBe("");
  });

  it("삭제 전 스냅샷 실패가 저장을 막지 않는다", async () => {
    mocked.createSnapshot.mockRejectedValueOnce(new Error("disk full"));
    const updateData = await run("x".repeat(500), "");
    expect(updateData.content).toBe("");
    await waitForBroadcast();
  });

  it("이미 빈 챕터(0→0)는 보호를 발동하지 않는다", async () => {
    await run("", "");
    expect(mocked.createSnapshot).not.toHaveBeenCalled();
    expect(mocked.broadcast).not.toHaveBeenCalled();
  });
});