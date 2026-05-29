/**
 * llmfitService — 하드웨어 맞춤 모델 추천 (llmfit 바이너리 1-shot 실행).
 *
 * 사용 방식(사용자 결정):
 *   바이너리를 실행해 JSON 을 받아 main 에서 파싱 → renderer 로 상위 ~10개만 전달.
 *
 * 격리 원칙(P6/R3.5):
 *   llmfit 의 부재/실패/타임아웃/깨진 출력 어떤 경우에도 throw 하지 않고
 *   `{ available: false, reason }` 을 반환한다. 추천 조회 외 앱 기능에 영향 0.
 *
 * 바이너리 해석 순서:
 *   1) env LUIE_LLMFIT_PATH
 *   2) 동봉 리소스(<resourcesPath>/bin/llmfit)
 *   3) PATH 상의 `llmfit`
 */

import { execFile } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";
import { z } from "zod";
import { createLogger } from "../../../shared/logger/index.js";
import type {
  LlmfitRecommendation,
  LlmfitResult,
} from "../../../shared/types/index.js";

const logger = createLogger("LlmfitService");

const EXEC_TIMEOUT_MS = 15_000;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024; // 4MB stdout 상한
const DEFAULT_LIMIT = 10;

/** llmfit recommend --json 의 단일 모델 행(필요 필드만, 나머지는 무시). */
const LlmfitModelSchema = z
  .object({
    name: z.string(),
    provider: z.string().optional(),
    params_b: z.number().optional(),
    parameter_count: z.string().optional(),
    fit_level: z.string().optional(),
    fit_label: z.string().optional(),
    run_mode: z.string().optional(),
    run_mode_label: z.string().optional(),
    score: z.number().optional(),
    estimated_tps: z.number().nullable().optional(),
    memory_required_gb: z.number().nullable().optional(),
    best_quant: z.string().nullable().optional(),
  })
  .passthrough();

/**
 * llmfit 출력 envelope 은 버전/명령에 따라
 *   { models: [...] }  또는  { data: { models: [...] } }  또는  바로 배열
 * 일 수 있어 관대하게 받는다.
 */
const LlmfitEnvelopeSchema = z.union([
  z.object({ models: z.array(LlmfitModelSchema) }).passthrough(),
  z.object({ data: z.object({ models: z.array(LlmfitModelSchema) }).passthrough() }).passthrough(),
  z.array(LlmfitModelSchema),
]);

export type LlmfitRecommendOptions = {
  limit?: number;
  /** llmfit use-case 필터: general|coding|reasoning|chat|multimodal|embedding */
  useCase?: string;
  /** 최소 적합도: perfect|good|marginal|too_tight */
  minFit?: string;
};

function normalizeFitLevel(value: string | undefined): LlmfitRecommendation["fitLevel"] {
  switch (value) {
    case "perfect":
    case "good":
    case "marginal":
    case "too_tight":
      return value;
    default:
      return "unknown";
  }
}

type LlmfitModelRow = z.infer<typeof LlmfitModelSchema>;

function toModelArray(parsed: z.infer<typeof LlmfitEnvelopeSchema>): LlmfitModelRow[] {
  if (Array.isArray(parsed)) return parsed;
  const record = parsed as {
    models?: LlmfitModelRow[];
    data?: { models?: LlmfitModelRow[] };
  };
  if (Array.isArray(record.models)) return record.models;
  if (record.data && Array.isArray(record.data.models)) return record.data.models;
  return [];
}

function normalize(row: LlmfitModelRow): LlmfitRecommendation {
  const paramsB =
    typeof row.params_b === "number"
      ? row.params_b
      : null;
  return {
    name: row.name,
    provider: row.provider ?? "",
    paramsB,
    fitLevel: normalizeFitLevel(row.fit_level),
    fitLabel: row.fit_label ?? row.fit_level ?? "",
    runMode: row.run_mode_label ?? row.run_mode ?? "",
    estimatedTps: row.estimated_tps ?? null,
    memoryRequiredGb: row.memory_required_gb ?? null,
    bestQuant: row.best_quant ?? null,
    score: typeof row.score === "number" ? row.score : null,
  };
}

class LlmfitService {
  /** 바이너리 경로를 해석한다(없으면 null). */
  private resolveBinaryPath(): string | null {
    const envPath = process.env.LUIE_LLMFIT_PATH?.trim();
    if (envPath && fs.existsSync(envPath)) return envPath;

    const exeName = process.platform === "win32" ? "llmfit.exe" : "llmfit";
    const bundled =
      typeof process.resourcesPath === "string" && process.resourcesPath.length > 0
        ? path.join(process.resourcesPath, "bin", exeName)
        : null;
    if (bundled && fs.existsSync(bundled)) return bundled;

    // PATH 상의 llmfit 은 execFile 이 직접 해석하도록 이름만 반환.
    return exeName;
  }

  /**
   * llmfit JSON 출력을 파싱한다. 순수 함수로 테스트 가능.
   * 파싱 실패 시 null 반환(throw 금지).
   */
  parseOutput(stdout: string, limit: number): LlmfitRecommendation[] | null {
    const trimmed = stdout.trim();
    if (trimmed.length === 0) return null;
    let json: unknown;
    try {
      json = JSON.parse(trimmed);
    } catch {
      return null;
    }
    const parsed = LlmfitEnvelopeSchema.safeParse(json);
    if (!parsed.success) return null;
    return toModelArray(parsed.data).slice(0, limit).map(normalize);
  }

  private execLlmfit(binaryPath: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(
        binaryPath,
        args,
        { timeout: EXEC_TIMEOUT_MS, maxBuffer: MAX_OUTPUT_BYTES, windowsHide: true },
        (error, stdout) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(stdout);
        },
      );
    });
  }

  async recommend(options: LlmfitRecommendOptions = {}): Promise<LlmfitResult> {
    const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_LIMIT, 50));
    const binaryPath = this.resolveBinaryPath();
    if (!binaryPath) {
      return { available: false, reason: "LLMFIT_NOT_FOUND" };
    }

    const args = ["recommend", "--json", "--limit", String(limit)];
    if (options.useCase) args.push("--use-case", options.useCase);
    if (options.minFit) args.push("--min-fit", options.minFit);

    try {
      const stdout = await this.execLlmfit(binaryPath, args);
      const recommendations = this.parseOutput(stdout, limit);
      if (recommendations === null) {
        logger.warn("llmfit output parse failed", {
          binaryPath,
          preview: stdout.slice(0, 200),
        });
        return { available: false, reason: "LLMFIT_PARSE_FAILED" };
      }
      logger.info("llmfit recommendations resolved", {
        count: recommendations.length,
      });
      return { available: true, recommendations };
    } catch (error) {
      const reason =
        (error as NodeJS.ErrnoException)?.code === "ENOENT"
          ? "LLMFIT_NOT_FOUND"
          : "LLMFIT_EXEC_FAILED";
      logger.warn("llmfit execution failed", {
        binaryPath,
        reason,
        error: error instanceof Error ? error.message : String(error),
      });
      return { available: false, reason };
    }
  }
}

export const llmfitService = new LlmfitService();
export { LlmfitService };
