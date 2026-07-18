import { describe, expect, it, vi } from "vitest";
import { resolveProjectExportQuitDecision } from "../../../src/main/lifecycle/shutdown/exportFlushDecision.js";

const result = (failed: number, timedOut = false) => ({
  total: 1,
  flushed: failed > 0 ? 0 : 1,
  failed,
  timedOut,
});

describe("project export quit decision", () => {
  it("cancels quit by default when the soft flush completed with a failure", async () => {
    const flush = vi.fn(async () => result(1));
    const showDialog = vi.fn(async () => ({ response: 1 }));

    await expect(
      resolveProjectExportQuitDecision(flush, showDialog, 1_000, 2_000),
    ).resolves.toBe("cancel");
    expect(flush).toHaveBeenCalledOnce();
    expect(showDialog).toHaveBeenCalledWith(
      expect.objectContaining({ defaultId: 1, cancelId: 1 }),
    );
  });

  it("cancels quit by default when the soft flush times out", async () => {
    const flush = vi.fn(async () => result(0, true));
    const showDialog = vi.fn(async () => ({ response: 1 }));

    await expect(
      resolveProjectExportQuitDecision(flush, showDialog, 1_000, 2_000),
    ).resolves.toBe("cancel");
    expect(showDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "저장 지연 감지",
        defaultId: 1,
        cancelId: 1,
      }),
    );
  });

  it("continues after an explicit retry succeeds", async () => {
    const flush = vi
      .fn()
      .mockResolvedValueOnce(result(1))
      .mockResolvedValueOnce(result(0));
    const showDialog = vi.fn(async () => ({ response: 0 }));

    await expect(
      resolveProjectExportQuitDecision(flush, showDialog, 1_000, 2_000),
    ).resolves.toBe("continue");
    expect(flush).toHaveBeenNthCalledWith(1, 1_000);
    expect(flush).toHaveBeenNthCalledWith(2, 2_000);
    expect(showDialog).toHaveBeenCalledOnce();
  });

  it("continues only after the user explicitly skips a failed export", async () => {
    const flush = vi.fn(async () => result(1));
    const showDialog = vi.fn(async () => ({ response: 2 }));

    await expect(
      resolveProjectExportQuitDecision(flush, showDialog, 1_000, 2_000),
    ).resolves.toBe("continue");
    expect(flush).toHaveBeenCalledOnce();
  });

  it.each([
    ["failure", result(1)],
    ["timeout", result(0, true)],
  ])("cancels when the hard retry ends in %s", async (_label, hardResult) => {
    const flush = vi
      .fn()
      .mockResolvedValueOnce(result(1))
      .mockResolvedValueOnce(hardResult);
    const showDialog = vi
      .fn()
      .mockResolvedValueOnce({ response: 0 })
      .mockResolvedValueOnce({ response: 0 });

    await expect(
      resolveProjectExportQuitDecision(flush, showDialog, 1_000, 2_000),
    ).resolves.toBe("cancel");
    expect(showDialog).toHaveBeenCalledTimes(2);
    expect(showDialog).toHaveBeenLastCalledWith(
      expect.objectContaining({ defaultId: 0, cancelId: 0 }),
    );
  });
});
