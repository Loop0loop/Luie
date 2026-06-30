/**
 * llmfitService.parseOutput 단위 테스트.
 *
 * llmfit JSON 출력의 다양한 envelope/결손/오류 케이스에서
 * 파서가 throw 없이 안전하게 동작하는지 검증한다(P6).
 */
import { describe, expect, it } from "vitest";
import { LlmfitService } from "../../../src/main/infra/llm/llmfitService.js";

const svc = new LlmfitService();

describe("llmfitService.parseOutput", () => {
  it("parses { models: [...] } envelope and normalizes fields", () => {
    const stdout = JSON.stringify({
      models: [
        {
          name: "Qwen/Qwen2.5-7B-Instruct",
          provider: "Qwen",
          params_b: 7.0,
          fit_level: "good",
          fit_label: "Good",
          run_mode: "gpu",
          run_mode_label: "GPU",
          score: 86.5,
          estimated_tps: 42.5,
          memory_required_gb: 5.8,
          best_quant: "Q5_K_M",
        },
      ],
    });
    const result = svc.parseOutput(stdout, 10);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    const row = result![0];
    expect(row.name).toBe("Qwen/Qwen2.5-7B-Instruct");
    expect(row.paramsB).toBe(7.0);
    expect(row.fitLevel).toBe("good");
    expect(row.runMode).toBe("GPU");
    expect(row.estimatedTps).toBe(42.5);
    expect(row.memoryRequiredGb).toBe(5.8);
    expect(row.bestQuant).toBe("Q5_K_M");
    expect(row.score).toBe(86.5);
  });

  it("parses bare array envelope", () => {
    const stdout = JSON.stringify([{ name: "modelA" }, { name: "modelB" }]);
    const result = svc.parseOutput(stdout, 10);
    expect(result).toHaveLength(2);
    expect(result![0].name).toBe("modelA");
  });

  it("parses nested { data: { models } } envelope", () => {
    const stdout = JSON.stringify({ data: { models: [{ name: "nested" }] } });
    const result = svc.parseOutput(stdout, 10);
    expect(result).toHaveLength(1);
    expect(result![0].name).toBe("nested");
  });

  it("respects the limit", () => {
    const stdout = JSON.stringify({
      models: Array.from({ length: 20 }, (_, i) => ({ name: `m${i}` })),
    });
    const result = svc.parseOutput(stdout, 5);
    expect(result).toHaveLength(5);
  });

  it("fills defaults for missing optional fields", () => {
    const stdout = JSON.stringify({ models: [{ name: "minimal" }] });
    const result = svc.parseOutput(stdout, 10);
    expect(result).toHaveLength(1);
    const row = result![0];
    expect(row.provider).toBe("");
    expect(row.paramsB).toBeNull();
    expect(row.fitLevel).toBe("unknown");
    expect(row.estimatedTps).toBeNull();
    expect(row.memoryRequiredGb).toBeNull();
    expect(row.bestQuant).toBeNull();
    expect(row.score).toBeNull();
  });

  it("returns null for broken JSON", () => {
    expect(svc.parseOutput("{ not valid json", 10)).toBeNull();
  });

  it("returns null for empty output", () => {
    expect(svc.parseOutput("", 10)).toBeNull();
    expect(svc.parseOutput("   \n  ", 10)).toBeNull();
  });

  it("returns null for JSON that does not match the schema", () => {
    expect(svc.parseOutput(JSON.stringify({ foo: "bar" }), 10)).toBeNull();
    // models 항목에 name(string) 누락
    expect(
      svc.parseOutput(JSON.stringify({ models: [{ provider: "x" }] }), 10),
    ).toBeNull();
  });

  it("ignores unknown fields (forward-compatible)", () => {
    const stdout = JSON.stringify({
      models: [{ name: "fwd", brand_new_field: 123, nested: { a: 1 } }],
      extra_top_level: true,
    });
    const result = svc.parseOutput(stdout, 10);
    expect(result).toHaveLength(1);
    expect(result![0].name).toBe("fwd");
  });
});
