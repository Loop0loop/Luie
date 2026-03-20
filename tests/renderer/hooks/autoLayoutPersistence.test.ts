import { describe, expect, it, vi } from "vitest";
import { persistAutoLayoutNodePositions } from "../../../src/renderer/src/features/research/components/world/graph/utils/autoLayoutPersistence";

describe("persistAutoLayoutNodePositions", () => {
  it("routes sync commit throws into onError", async () => {
    const onNodePositionCommit = vi.fn(() => {
      throw new Error("sync failure");
    });
    const onError = vi.fn();

    await persistAutoLayoutNodePositions({
      updates: [{ id: "n-1", x: 10, y: 20 }],
      onNodePositionCommit,
      onError,
    });

    expect(onNodePositionCommit).toHaveBeenCalledWith({
      id: "n-1",
      x: 10,
      y: 20,
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it("commits all updates when no error occurs", async () => {
    const onNodePositionCommit = vi.fn();
    const onError = vi.fn();

    await persistAutoLayoutNodePositions({
      updates: [
        { id: "n-1", x: 10, y: 20 },
        { id: "n-2", x: 30, y: 40 },
      ],
      onNodePositionCommit,
      onError,
    });

    expect(onNodePositionCommit).toHaveBeenCalledTimes(2);
    expect(onError).not.toHaveBeenCalled();
  });
});
