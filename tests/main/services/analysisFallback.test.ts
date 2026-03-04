import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  supabaseConfig: {
    current: {
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    } as { url: string; anonKey: string } | null,
  },
  edgeTokenError: {
    current: new Error("SYNC_AUTH_REQUIRED_FOR_EDGE") as Error | null,
  },
  edgeToken: {
    current: "edge-token",
  },
}));

vi.mock("../../../src/main/services/features/sync/supabaseEnv.js", () => ({
  getSupabaseConfig: () => mocked.supabaseConfig.current,
}));

vi.mock("../../../src/main/services/features/sync/syncService.js", () => ({
  syncService: {
    getEdgeAccessToken: async () => {
      if (mocked.edgeTokenError.current) {
        throw mocked.edgeTokenError.current;
      }
      return mocked.edgeToken.current;
    },
  },
}));

describe("Gemini fallback paths", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocked.supabaseConfig.current = {
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    };
    mocked.edgeTokenError.current = new Error("SYNC_AUTH_REQUIRED_FOR_EDGE");
    mocked.edgeToken.current = "edge-token";
    process.env.GEMINI_API_KEY = "local-gemini-key";
    delete process.env.GOOGLE_GCP_API;
    delete process.env.GOOGLE_API_KEY;
  });

  it("falls back to local Gemini API when edge auth is unavailable", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: "local fallback response" }],
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const { invokeGeminiProxy } = await import(
      "../../../src/main/services/features/analysis/geminiApiKeyResolver.js"
    );

    const text = await invokeGeminiProxy({
      model: "gemini-2.5-flash-lite",
      prompt: "hello",
      responseMimeType: "text/plain",
    });

    expect(text).toBe("local fallback response");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("generativelanguage.googleapis.com");
  });

  it("throws when both edge and local paths are unavailable", async () => {
    mocked.supabaseConfig.current = null;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_GCP_API;
    delete process.env.GOOGLE_API_KEY;

    const { invokeGeminiProxy } = await import(
      "../../../src/main/services/features/analysis/geminiApiKeyResolver.js"
    );

    await expect(
      invokeGeminiProxy({
        model: "gemini-2.5-flash-lite",
        prompt: "hello",
        responseMimeType: "text/plain",
      }),
    ).rejects.toThrow("GEMINI_ALL_PATHS_FAILED");
  });
});

describe("Deterministic local fallback", () => {
  it("builds complete analysis fallback items", async () => {
    const { buildDeterministicAnalysisItems } = await import(
      "../../../src/main/services/features/analysis/localFallbackAnalyzer.js"
    );

    const items = buildDeterministicAnalysisItems({
      characters: [],
      terms: [],
      manuscript: {
        title: "chapter",
        content: "첫 번째 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.",
        nounPhrases: [],
      },
    });

    const intro = items.find((item) => item.type === "intro");
    const outro = items.find((item) => item.type === "outro");
    const reaction = items.find((item) => item.type === "reaction");
    const suggestions = items.filter((item) => item.type === "suggestion");

    expect(intro).toBeDefined();
    expect(outro).toBeDefined();
    expect(reaction?.quote).toBeTruthy();
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
  });

  it("builds deterministic entity classification", async () => {
    const { buildDeterministicGeminiResult } = await import(
      "../../../src/main/services/features/analysis/localFallbackAnalyzer.js"
    );

    const result = buildDeterministicGeminiResult("검은달 조직", [
      "검은달 조직은 비밀결사다.",
      "조직의 목표는 세계 장악이다.",
    ]);

    expect(result.entityType).toBe("organization");
    expect(result.name).toBe("검은달 조직");
    expect(result.summary.length).toBeGreaterThan(0);
  });
});
