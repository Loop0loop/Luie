import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  start: vi.fn(),
  resetIdleTimer: vi.fn(),
  getPort: vi.fn(),
}));

vi.mock("../../../src/main/services/llm/sidecarManager.js", () => ({
  sidecarManager: mocked,
}));

import { LlamaServerProvider } from "../../../src/main/services/llm/providers/llamaServerProvider.js";

function createSseResponse(lines: string[], status = 200): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(new TextEncoder().encode(line));
      }
      controller.close();
    },
  });
  return new Response(body, { status });
}

describe("LlamaServerProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.start.mockResolvedValue(18080);
    mocked.getPort.mockReturnValue(18080);
    mocked.resetIdleTimer.mockReturnValue(undefined);
  });

  it("SSE 스트림에서 텍스트 델타를 파싱한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createSseResponse([
          'data: {"choices":[{"text":"안"}]}\n',
          'data: {"choices":[{"text":"녕"}]}\n',
          "data: [DONE]\n",
        ]),
      ),
    );

    const provider = new LlamaServerProvider({ modelPath: "/tmp/model.gguf" });
    const chunks: string[] = [];
    for await (const chunk of provider.generateStream("hello")) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["안", "녕"]);
    expect(mocked.start).toHaveBeenCalledWith("/tmp/model.gguf");
    expect(mocked.resetIdleTimer).toHaveBeenCalled();
  });

  it("HTTP 에러면 예외를 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createSseResponse([], 500)));

    const provider = new LlamaServerProvider({ modelPath: "/tmp/model.gguf" });
    await expect(provider.generate("hello")).rejects.toThrow(
      "Llama sidecar completion failed: HTTP 500",
    );
  });
});
