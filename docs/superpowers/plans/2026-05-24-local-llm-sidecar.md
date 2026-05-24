# Local LLM Sidecar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** llama-server를 완전히 분리된 OS 프로세스로 spawn하여 Electron 메모리에 영향 없이 로컬 LLM을 서빙한다.

**Architecture:** `child_process.spawn()`으로 llama-server 바이너리를 별도 OS 프로세스로 실행 → OpenAI 호환 HTTP API → 기존 `ExternalApiProvider` 재사용. 바이너리와 모델 파일은 앱 번들이 아닌 `userData` 디렉토리에 최초 1회 다운로드. `modelRuntimeFactory`에 `sidecar` kind를 0순위로 추가하여 API보다 우선 사용 (설정 시).

**Tech Stack:** TypeScript, `child_process` (Node built-in), `fs/promises`, `net` (포트 탐지), llama.cpp prebuilt binaries (GitHub Releases), HuggingFace Hub REST API, React + existing UI components

---

## File Map

| 파일 | 역할 | 상태 |
|------|------|------|
| `src/main/services/llm/sidecarManager.ts` | llama-server 프로세스 spawn/kill/health | 신규 |
| `src/main/services/llm/modelDownloader.ts` | 바이너리 + GGUF 다운로드, 진행률 emit | 신규 |
| `src/main/services/llm/sidecarConstants.ts` | 플랫폼 바이너리 URL, 기본 모델 상수 | 신규 |
| `src/main/services/llm/modelRuntimeFactory.ts` | `sidecar` kind 추가, 우선순위 0번 | 수정 |
| `src/main/manager/settingsManager.ts` | `localLlm` 설정 추가 | 수정 |
| `src/shared/types/index.ts` | `AppSettings.localLlm` 타입 | 수정 |
| `src/shared/ipc/channels.ts` | `SIDECAR_*`, `MODEL_DOWNLOAD_*` 채널 | 수정 |
| `src/main/handler/system/ipcSettingsHandlers.ts` | 새 IPC 핸들러 등록 | 수정 |
| `src/renderer/src/features/settings/components/tabs/ModelTab.tsx` | 로컬 LLM 섹션 추가 | 수정 |
| `src/renderer/src/features/settings/hooks/useSettingsModel.ts` | 로컬 LLM 상태/핸들러 | 수정 |
| `electron-builder.json` | `extraResources` 제거 불필요 (바이너리는 userData에) | 확인만 |

---

## Task 1: 상수 파일 — 플랫폼 바이너리 URL, 기본 모델

**Files:**
- Create: `src/main/services/llm/sidecarConstants.ts`

- [ ] **Step 1: 파일 생성**

```typescript
// src/main/services/llm/sidecarConstants.ts

/**
 * llama.cpp GitHub Releases 빌드 번호. 업그레이드 시 여기만 수정.
 * https://github.com/ggml-org/llama.cpp/releases
 */
export const LLAMA_CPP_BUILD = "b5620";

/**
 * 플랫폼별 바이너리 zip URL.
 * key: `${process.platform}-${process.arch}`
 */
export const LLAMA_BINARY_URLS: Record<string, string> = {
  "darwin-arm64": `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_BUILD}/llama-${LLAMA_CPP_BUILD}-bin-macos-arm64.zip`,
  "darwin-x64":   `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_BUILD}/llama-${LLAMA_CPP_BUILD}-bin-macos-x64.zip`,
  "win32-x64":    `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_BUILD}/llama-${LLAMA_CPP_BUILD}-bin-win-cuda-cu12.4-x64.zip`,
  "linux-x64":    `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_BUILD}/llama-${LLAMA_CPP_BUILD}-bin-ubuntu-x64.zip`,
};

/** zip 안에서 실제 실행 바이너리 이름 */
export const LLAMA_SERVER_BINARY_IN_ZIP = "llama-server";

/** 기본 모델: Qwen2.5 1.5B Q8_0 (~1.6GB, Korean 준수) */
export const DEFAULT_MODEL = {
  repo: "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
  filename: "qwen2.5-1.5b-instruct-q8_0.gguf",
  sizeBytes: 1_620_000_000,
  displayName: "Qwen2.5 1.5B (기본)",
} as const;

/** 고성능 모델: Qwen3 4B Q4_K_M (~2.7GB, GPU 필요) */
export const HIGH_PERF_MODEL = {
  repo: "Qwen/Qwen3-4B-Instruct-GGUF",
  filename: "qwen3-4b-instruct-q4_k_m.gguf",
  sizeBytes: 2_700_000_000,
  displayName: "Qwen3 4B (고성능, GPU 권장)",
} as const;

/** llama-server 기본 실행 파라미터 */
export const LLAMA_SERVER_DEFAULTS = {
  contextSize: 4096,
  gpuLayers: -1,      // -1 = 자동 (GPU 있으면 전부 오프로드)
  threads: 4,
  parallel: 1,
  flashAttention: true,
  cacheTypeK: "q8_0", // KV 캐시 양자화 → 메모리 절감
  cacheTypeV: "q8_0",
} as const;
```

- [ ] **Step 2: 커밋**

```bash
git add src/main/services/llm/sidecarConstants.ts
git commit -m "feat(llm): add sidecar constants — llama-server URLs and model defaults"
```

---

## Task 2: AppSettings 타입 확장

**Files:**
- Modify: `src/shared/types/index.ts` (AppSettings.llm 섹션)
- Modify: `src/main/manager/settingsManager.ts`

- [ ] **Step 1: `AppSettings` 타입 수정**

`src/shared/types/index.ts`에서 `AppSettings.llm` 찾아서 `localLlm` 추가:

```typescript
// 기존 llm 타입 안에 localLlm 추가
llm?: {
  ollama?: { baseUrl?: string; chatModel?: string; embeddingModel?: string; apiKey?: string };
  ragTemperature?: number;
  ragMaxTokens?: number;
  // --- 추가 ---
  localLlm?: {
    enabled: boolean;
    modelPath?: string;       // userData 내 GGUF 경로 (절대경로)
    binaryPath?: string;      // userData 내 llama-server 바이너리 경로
    gpuLayers?: number;       // undefined → 기본값 -1 (자동)
    contextSize?: number;     // undefined → 기본값 4096
  };
};
```

- [ ] **Step 2: `settingsManager.ts` — `getLocalLlmSettings` / `setLocalLlmSettings` 추가**

기존 `getLlmSettings()` 바로 아래에 추가:

```typescript
getLocalLlmSettings(): AppSettings["llm"] extends undefined ? never : NonNullable<NonNullable<AppSettings["llm"]>["localLlm"]> | undefined {
  const llm = this.store.get("llm") ?? {};
  return (llm as { localLlm?: NonNullable<NonNullable<AppSettings["llm"]>["localLlm"]> }).localLlm;
}

setLocalLlmSettings(settings: NonNullable<NonNullable<AppSettings["llm"]>["localLlm"]>): void {
  const current = this.store.get("llm") ?? {};
  const next = { ...current, localLlm: settings };
  this.store.set("llm", next);
  this.logger.info("Local LLM settings updated", {
    enabled: settings.enabled,
    hasModel: Boolean(settings.modelPath),
    hasBinary: Boolean(settings.binaryPath),
  });
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/shared/types/index.ts src/main/manager/settingsManager.ts
git commit -m "feat(settings): add localLlm config to AppSettings and SettingsManager"
```

---

## Task 3: modelDownloader.ts — 바이너리 + 모델 파일 다운로드

**Files:**
- Create: `src/main/services/llm/modelDownloader.ts`

```typescript
// src/main/services/llm/modelDownloader.ts
import fs from "node:fs/promises";
import path from "node:path";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createLogger } from "../../../shared/logger/index.js";

const logger = createLogger("ModelDownloader");

export type DownloadProgress = {
  phase: "downloading" | "extracting" | "done" | "error";
  pct: number;           // 0-100
  receivedBytes: number;
  totalBytes: number;
  error?: string;
};

export type ProgressCallback = (progress: DownloadProgress) => void;

/**
 * HuggingFace Hub에서 GGUF 파일 다운로드.
 * destPath 디렉토리가 없으면 자동 생성.
 */
export async function downloadGguf(input: {
  repo: string;       // e.g. "Qwen/Qwen2.5-1.5B-Instruct-GGUF"
  filename: string;   // e.g. "qwen2.5-1.5b-instruct-q8_0.gguf"
  destDir: string;    // 절대경로 디렉토리
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
}): Promise<string> {
  await fs.mkdir(input.destDir, { recursive: true });

  const destPath = path.join(input.destDir, input.filename);

  // 이미 존재하면 건너뜀
  try {
    await fs.access(destPath);
    logger.info("Model already downloaded", { destPath });
    input.onProgress?.({ phase: "done", pct: 100, receivedBytes: 0, totalBytes: 0 });
    return destPath;
  } catch {
    // 없음 → 다운로드
  }

  const url = `https://huggingface.co/${input.repo}/resolve/main/${input.filename}`;
  logger.info("Downloading model", { url, destPath });

  const tmpPath = `${destPath}.tmp`;

  try {
    const res = await fetch(url, { signal: input.signal });
    if (!res.ok) {
      throw new Error(`HuggingFace download failed: HTTP ${res.status}`);
    }

    const totalBytes = Number(res.headers.get("content-length") ?? "0");
    let receivedBytes = 0;

    const fileStream = createWriteStream(tmpPath);
    const nodeStream = Readable.fromWeb(res.body as import("stream/web").ReadableStream);

    nodeStream.on("data", (chunk: Buffer) => {
      receivedBytes += chunk.length;
      const pct = totalBytes > 0 ? Math.floor((receivedBytes / totalBytes) * 100) : 0;
      input.onProgress?.({ phase: "downloading", pct, receivedBytes, totalBytes });
    });

    await pipeline(nodeStream, fileStream);
    await fs.rename(tmpPath, destPath);

    input.onProgress?.({ phase: "done", pct: 100, receivedBytes, totalBytes });
    logger.info("Model download complete", { destPath, receivedBytes });
    return destPath;
  } catch (error) {
    // 실패 시 임시 파일 정리
    await fs.unlink(tmpPath).catch(() => {});
    throw error;
  }
}

/**
 * llama.cpp GitHub Releases에서 zip 다운로드 후 llama-server 바이너리 추출.
 */
export async function downloadLlamaServerBinary(input: {
  zipUrl: string;
  destDir: string;       // 절대경로
  binaryNameInZip: string; // zip 안 바이너리 이름 (확장자 없음)
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
}): Promise<string> {
  await fs.mkdir(input.destDir, { recursive: true });

  const platform = process.platform;
  const binaryName = platform === "win32"
    ? `${input.binaryNameInZip}.exe`
    : input.binaryNameInZip;
  const destBinaryPath = path.join(input.destDir, binaryName);

  // 이미 존재하면 건너뜀
  try {
    await fs.access(destBinaryPath);
    logger.info("Binary already downloaded", { destBinaryPath });
    input.onProgress?.({ phase: "done", pct: 100, receivedBytes: 0, totalBytes: 0 });
    return destBinaryPath;
  } catch {
    // 없음 → 다운로드
  }

  const zipPath = path.join(input.destDir, "llama-server.zip");

  logger.info("Downloading llama-server binary", { url: input.zipUrl });

  const res = await fetch(input.zipUrl, { signal: input.signal });
  if (!res.ok) {
    throw new Error(`Binary download failed: HTTP ${res.status}`);
  }

  const totalBytes = Number(res.headers.get("content-length") ?? "0");
  let receivedBytes = 0;

  const fileStream = createWriteStream(zipPath);
  const nodeStream = Readable.fromWeb(res.body as import("stream/web").ReadableStream);
  nodeStream.on("data", (chunk: Buffer) => {
    receivedBytes += chunk.length;
    const pct = totalBytes > 0 ? Math.floor((receivedBytes / totalBytes) * 100) : 0;
    input.onProgress?.({ phase: "downloading", pct, receivedBytes, totalBytes });
  });
  await pipeline(nodeStream, fileStream);

  // zip 압축 해제
  input.onProgress?.({ phase: "extracting", pct: 0, receivedBytes, totalBytes });
  const { default: unzipper } = await import("unzipper");
  const directory = await unzipper.Open.file(zipPath);
  const binaryEntry = directory.files.find(
    (f) => f.path.endsWith(binaryName) || f.path.endsWith(input.binaryNameInZip),
  );
  if (!binaryEntry) {
    throw new Error(`Binary '${binaryName}' not found in zip`);
  }
  const binaryBuffer = await binaryEntry.buffer();
  await fs.writeFile(destBinaryPath, binaryBuffer, { mode: 0o755 });
  await fs.unlink(zipPath).catch(() => {});

  input.onProgress?.({ phase: "done", pct: 100, receivedBytes, totalBytes });
  logger.info("Binary extraction complete", { destBinaryPath });
  return destBinaryPath;
}
```

- [ ] **Step 1: `unzipper` 패키지 설치**

```bash
bun add unzipper
bun add -d @types/unzipper
```

- [ ] **Step 2: 파일 저장** (위 코드 그대로)

- [ ] **Step 3: 커밋**

```bash
git add src/main/services/llm/modelDownloader.ts
git commit -m "feat(llm): add modelDownloader — HuggingFace GGUF and llama-server binary download"
```

---

## Task 4: sidecarManager.ts — llama-server 프로세스 관리

**Files:**
- Create: `src/main/services/llm/sidecarManager.ts`

- [ ] **Step 1: 파일 생성**

```typescript
// src/main/services/llm/sidecarManager.ts
import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { app } from "electron";
import { createLogger } from "../../../shared/logger/index.js";
import { LLAMA_SERVER_DEFAULTS } from "./sidecarConstants.js";

const logger = createLogger("SidecarManager");

const HEALTH_POLL_INTERVAL_MS = 500;
const HEALTH_POLL_TIMEOUT_MS = 30_000;
const IDLE_SHUTDOWN_MS = 3 * 60_000; // 3분 유휴 시 자동 종료

type SidecarState =
  | { status: "stopped" }
  | { status: "starting"; modelPath: string }
  | { status: "running"; modelPath: string; port: number; proc: ChildProcess };

export class SidecarManager {
  private state: SidecarState = { status: "stopped" };
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  /** 사용자 데이터 내 bin 디렉토리 */
  getBinDir(): string {
    return path.join(app.getPath("userData"), "llm-bin");
  }

  /** 사용자 데이터 내 models 디렉토리 */
  getModelsDir(): string {
    return path.join(app.getPath("userData"), "llm-models");
  }

  isRunning(): boolean {
    return this.state.status === "running";
  }

  /** 현재 실행 중인 서버의 baseUrl. running 상태가 아니면 null. */
  getBaseUrl(): string | null {
    if (this.state.status !== "running") return null;
    return `http://127.0.0.1:${this.state.port}`;
  }

  /** llama-server 시작. 이미 실행 중이면 baseUrl 반환. */
  async ensureStarted(binaryPath: string, modelPath: string, options?: {
    gpuLayers?: number;
    contextSize?: number;
    signal?: AbortSignal;
  }): Promise<string> {
    if (this.state.status === "running" && this.state.modelPath === modelPath) {
      this.resetIdleTimer();
      return `http://127.0.0.1:${this.state.port}`;
    }

    // 다른 모델로 실행 중이면 먼저 종료
    if (this.state.status === "running") {
      await this.stop();
    }

    this.state = { status: "starting", modelPath };
    const port = await this.findFreePort();

    const args = [
      "--model", modelPath,
      "--port", String(port),
      "--host", "127.0.0.1",
      "--ctx-size", String(options?.contextSize ?? LLAMA_SERVER_DEFAULTS.contextSize),
      "--n-gpu-layers", String(options?.gpuLayers ?? LLAMA_SERVER_DEFAULTS.gpuLayers),
      "--threads", String(LLAMA_SERVER_DEFAULTS.threads),
      "--parallel", String(LLAMA_SERVER_DEFAULTS.parallel),
      ...(LLAMA_SERVER_DEFAULTS.flashAttention ? ["--flash-attn"] : []),
      "--cache-type-k", LLAMA_SERVER_DEFAULTS.cacheTypeK,
      "--cache-type-v", LLAMA_SERVER_DEFAULTS.cacheTypeV,
      "--log-disable",  // 로그 끔 (stdout 오염 방지)
    ];

    logger.info("Spawning llama-server", { binaryPath, port, modelPath });

    const proc = spawn(binaryPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    proc.on("error", (err) => {
      logger.error("llama-server spawn error", { err });
      this.state = { status: "stopped" };
    });

    proc.on("exit", (code) => {
      logger.info("llama-server exited", { code });
      this.state = { status: "stopped" };
      this.clearIdleTimer();
    });

    // stderr 로그 (디버그용)
    proc.stderr?.on("data", (data: Buffer) => {
      logger.debug("llama-server stderr", { msg: data.toString().slice(0, 200) });
    });

    this.state = { status: "running", modelPath, port, proc };

    // 헬스체크 폴링
    await this.waitForHealth(port, options?.signal);

    this.resetIdleTimer();
    logger.info("llama-server ready", { port });
    return `http://127.0.0.1:${port}`;
  }

  async stop(): Promise<void> {
    this.clearIdleTimer();
    if (this.state.status !== "running") return;
    const { proc } = this.state;
    this.state = { status: "stopped" };
    proc.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => { proc.kill("SIGKILL"); resolve(); }, 3_000);
      proc.on("exit", () => { clearTimeout(t); resolve(); });
    });
    logger.info("llama-server stopped");
  }

  private async waitForHealth(port: number, signal?: AbortSignal): Promise<void> {
    const deadline = Date.now() + HEALTH_POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (signal?.aborted) throw new Error("SidecarManager: start aborted");
      try {
        const res = await fetch(`http://127.0.0.1:${port}/health`, {
          signal: AbortSignal.timeout(2_000),
        });
        if (res.ok) return;
      } catch {
        // 아직 안 뜸
      }
      await new Promise((r) => setTimeout(r, HEALTH_POLL_INTERVAL_MS));
    }
    throw new Error("llama-server health check timed out");
  }

  private async findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const srv = net.createServer();
      srv.listen(0, "127.0.0.1", () => {
        const addr = srv.address();
        srv.close(() => {
          if (addr && typeof addr === "object") resolve(addr.port);
          else reject(new Error("Failed to find free port"));
        });
      });
    });
  }

  private resetIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      logger.info("llama-server idle timeout, stopping");
      void this.stop();
    }, IDLE_SHUTDOWN_MS);
  }

  private clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}

export const sidecarManager = new SidecarManager();
```

- [ ] **Step 2: 커밋**

```bash
git add src/main/services/llm/sidecarManager.ts
git commit -m "feat(llm): add SidecarManager — llama-server child_process spawn with health check and idle timeout"
```

---

## Task 5: modelRuntimeFactory 통합

**Files:**
- Modify: `src/main/services/llm/modelRuntimeFactory.ts`

- [ ] **Step 1: `ResolvedRuntime`에 `sidecar` kind 추가**

파일 상단 import 추가:
```typescript
import { sidecarManager } from "./sidecarManager.js";
import { settingsManager } from "../../manager/settingsManager.js";
```

`ResolvedRuntime` 타입 수정:
```typescript
type ResolvedRuntime =
  | { kind: "sidecar"; config: { baseUrl: string } }  // 추가
  | { kind: "gemini"; config: EnvGeminiConfig }
  | { kind: "openai"; config: EnvOpenAiConfig }
  | { kind: "ollama"; config: OllamaConfig }
  | { kind: "deterministic" };
```

- [ ] **Step 2: `resolveRuntime()` 상단에 sidecar 체크 추가**

```typescript
async function resolveRuntime(): Promise<ResolvedRuntime> {
  // 0순위: 로컬 LLM sidecar (설정 + 실행 중)
  const localLlm = settingsManager.getLocalLlmSettings();
  if (localLlm?.enabled && localLlm.modelPath && localLlm.binaryPath) {
    try {
      const baseUrl = await sidecarManager.ensureStarted(
        localLlm.binaryPath,
        localLlm.modelPath,
        {
          gpuLayers: localLlm.gpuLayers,
          contextSize: localLlm.contextSize,
        },
      );
      return { kind: "sidecar", config: { baseUrl } };
    } catch (error) {
      logger.warn("Sidecar start failed, falling through", { error });
      // 실패 시 API fallback
    }
  }

  // 기존 로직 유지
  const geminiConfig = loadEnvGeminiConfig();
  // ... 이하 기존 코드 그대로
```

- [ ] **Step 3: `resolveModelRuntimeClient()`에 sidecar 처리 추가**

```typescript
export async function resolveModelRuntimeClient(
  projectId: string,
): Promise<ModelRuntimeClient> {
  const resolved = await resolveRuntime();

  // 추가
  if (resolved.kind === "sidecar") {
    logger.info("Using local LLM sidecar", { projectId, baseUrl: resolved.config.baseUrl });
    return getOrCreateExternalApiProvider({
      baseUrl: resolved.config.baseUrl,
      chatModel: "local",  // llama-server는 모델 이름 무관
      apiKey: "no-key",
    });
  }

  // 기존 코드 이어서...
```

- [ ] **Step 4: `resolveRuntimeModelConfig()`, `resolveRuntimeModelInfo()`에도 sidecar case 추가**

```typescript
// resolveRuntimeModelConfig
if (resolved.kind === "sidecar") {
  return { providerHint: "externalapi", embeddingModel: null };
}

// resolveRuntimeModelInfo
if (resolved.kind === "sidecar") {
  return { provider: "local", model: "llama-server", alternativeModel: null };
}
```

- [ ] **Step 5: 커밋**

```bash
git add src/main/services/llm/modelRuntimeFactory.ts
git commit -m "feat(llm): integrate sidecar as priority-0 runtime in modelRuntimeFactory"
```

---

## Task 6: IPC 채널 + 핸들러

**Files:**
- Modify: `src/shared/ipc/channels.ts`
- Modify: `src/main/handler/system/ipcSettingsHandlers.ts`

- [ ] **Step 1: 채널 추가**

`src/shared/ipc/channels.ts`에 추가:
```typescript
// 기존 SETTINGS_RESET 아래에 추가
SIDECAR_START: "sidecar:start",
SIDECAR_STOP: "sidecar:stop",
SIDECAR_STATUS: "sidecar:status",
MODEL_DOWNLOAD_START: "model:download-start",
MODEL_DOWNLOAD_CANCEL: "model:download-cancel",
MODEL_DOWNLOAD_PROGRESS: "model:download-progress",  // renderer → IPC event (push)
SETTINGS_SET_LOCAL_LLM: "settings:set-local-llm",
SETTINGS_GET_LOCAL_LLM: "settings:get-local-llm",
```

- [ ] **Step 2: 핸들러 추가**

`src/main/handler/system/ipcSettingsHandlers.ts`에 추가:

```typescript
import { sidecarManager } from "../../services/llm/sidecarManager.js";
import {
  downloadGguf,
  downloadLlamaServerBinary,
  type DownloadProgress,
} from "../../services/llm/modelDownloader.js";
import {
  LLAMA_BINARY_URLS,
  LLAMA_SERVER_BINARY_IN_ZIP,
  DEFAULT_MODEL,
} from "../../services/llm/sidecarConstants.js";

// 진행 중인 다운로드 AbortController
let activeDownloadAbort: AbortController | null = null;

// 기존 registerIpcHandlers 배열에 추가:
{
  channel: IPC_CHANNELS.SETTINGS_GET_LOCAL_LLM,
  logTag: "SETTINGS_GET_LOCAL_LLM",
  failMessage: "Failed to get local LLM settings",
  handler: async () => {
    const s = settingsManager.getLocalLlmSettings();
    return {
      ...s,
      sidecarRunning: sidecarManager.isRunning(),
      sidecarBaseUrl: sidecarManager.getBaseUrl(),
    };
  },
},
{
  channel: IPC_CHANNELS.SETTINGS_SET_LOCAL_LLM,
  logTag: "SETTINGS_SET_LOCAL_LLM",
  failMessage: "Failed to save local LLM settings",
  handler: async (input: {
    enabled: boolean;
    modelPath?: string;
    binaryPath?: string;
    gpuLayers?: number;
    contextSize?: number;
  }) => {
    settingsManager.setLocalLlmSettings(input);
    invalidateModelRuntimeCache();
    return { ok: true };
  },
},
{
  channel: IPC_CHANNELS.SIDECAR_STATUS,
  logTag: "SIDECAR_STATUS",
  failMessage: "Failed to get sidecar status",
  handler: async () => ({
    running: sidecarManager.isRunning(),
    baseUrl: sidecarManager.getBaseUrl(),
  }),
},
{
  channel: IPC_CHANNELS.SIDECAR_STOP,
  logTag: "SIDECAR_STOP",
  failMessage: "Failed to stop sidecar",
  handler: async () => {
    await sidecarManager.stop();
    return { ok: true };
  },
},
{
  channel: IPC_CHANNELS.MODEL_DOWNLOAD_START,
  logTag: "MODEL_DOWNLOAD_START",
  failMessage: "Failed to start download",
  handler: async (_input: { type: "model" | "binary"; targetWindow?: number }) => {
    if (activeDownloadAbort) {
      activeDownloadAbort.abort();
    }
    activeDownloadAbort = new AbortController();
    const { signal } = activeDownloadAbort;

    const platform = `${process.platform}-${process.arch}`;
    const binUrl = LLAMA_BINARY_URLS[platform];
    if (!binUrl) throw new Error(`지원하지 않는 플랫폼: ${platform}`);

    const emitProgress = (phase: string, payload: DownloadProgress) => {
      const wins = BrowserWindow.getAllWindows();
      wins.forEach((w) => {
        if (!w.isDestroyed()) {
          w.webContents.send(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, { phase, ...payload });
        }
      });
    };

    // 비동기로 실행 (IPC는 즉시 return)
    void (async () => {
      try {
        const binPath = await downloadLlamaServerBinary({
          zipUrl: binUrl,
          destDir: sidecarManager.getBinDir(),
          binaryNameInZip: LLAMA_SERVER_BINARY_IN_ZIP,
          signal,
          onProgress: (p) => emitProgress("binary", p),
        });

        const modelPath = await downloadGguf({
          repo: DEFAULT_MODEL.repo,
          filename: DEFAULT_MODEL.filename,
          destDir: sidecarManager.getModelsDir(),
          signal,
          onProgress: (p) => emitProgress("model", p),
        });

        settingsManager.setLocalLlmSettings({
          enabled: true,
          binaryPath: binPath,
          modelPath,
        });
        invalidateModelRuntimeCache();
        emitProgress("complete", { phase: "done", pct: 100, receivedBytes: 0, totalBytes: 0 });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        emitProgress("error", { phase: "error", pct: 0, receivedBytes: 0, totalBytes: 0, error: msg });
      }
    })();

    return { ok: true };
  },
},
{
  channel: IPC_CHANNELS.MODEL_DOWNLOAD_CANCEL,
  logTag: "MODEL_DOWNLOAD_CANCEL",
  failMessage: "Failed to cancel download",
  handler: async () => {
    activeDownloadAbort?.abort();
    activeDownloadAbort = null;
    return { ok: true };
  },
},
```

- [ ] **Step 3: 커밋**

```bash
git add src/shared/ipc/channels.ts src/main/handler/system/ipcSettingsHandlers.ts
git commit -m "feat(ipc): add sidecar and model download IPC channels and handlers"
```

---

## Task 7: Preload API 노출

**Files:**
- Modify: `src/preload/api/systemApi.ts`

- [ ] **Step 1: 새 채널들 preload에 추가**

`systemApi.ts`에서 기존 `getLlmRuntime` 아래에 추가:

```typescript
getLocalLlmSettings: () =>
  ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_LOCAL_LLM),

setLocalLlmSettings: (input: {
  enabled: boolean;
  modelPath?: string;
  binaryPath?: string;
  gpuLayers?: number;
  contextSize?: number;
}) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_LOCAL_LLM, input),

getSidecarStatus: () =>
  ipcRenderer.invoke(IPC_CHANNELS.SIDECAR_STATUS),

stopSidecar: () =>
  ipcRenderer.invoke(IPC_CHANNELS.SIDECAR_STOP),

startModelDownload: (input: { type: "model" | "binary" }) =>
  ipcRenderer.invoke(IPC_CHANNELS.MODEL_DOWNLOAD_START, input),

cancelModelDownload: () =>
  ipcRenderer.invoke(IPC_CHANNELS.MODEL_DOWNLOAD_CANCEL),

onModelDownloadProgress: (
  callback: (progress: {
    phase: string;
    pct: number;
    receivedBytes: number;
    totalBytes: number;
    error?: string;
  }) => void,
) => {
  ipcRenderer.on(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, (_event, data) => callback(data));
  return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS);
},
```

- [ ] **Step 2: 커밋**

```bash
git add src/preload/api/systemApi.ts
git commit -m "feat(preload): expose sidecar and model download APIs to renderer"
```

---

## Task 8: ModelTab UI — 로컬 LLM 섹션

**Files:**
- Modify: `src/renderer/src/features/settings/components/tabs/ModelTab.tsx`
- Modify: `src/renderer/src/features/settings/hooks/useSettingsModel.ts`

- [ ] **Step 1: `useSettingsModel.ts`에 로컬 LLM 상태 추가**

```typescript
// 기존 ollamaBaseUrl 등 아래에 추가
const [localLlmEnabled, setLocalLlmEnabled] = useState(false);
const [localLlmModelPath, setLocalLlmModelPath] = useState<string | undefined>();
const [localLlmBinaryPath, setLocalLlmBinaryPath] = useState<string | undefined>();
const [downloadProgress, setDownloadProgress] = useState<{
  phase: string; pct: number; error?: string
} | null>(null);
const [isDownloading, setIsDownloading] = useState(false);

// 로드 시 초기화 (기존 loadSettings useEffect 안에 추가)
const local = res.data?.llm?.localLlm;
if (local) {
  setLocalLlmEnabled(local.enabled ?? false);
  setLocalLlmModelPath(local.modelPath);
  setLocalLlmBinaryPath(local.binaryPath);
}

// 다운로드 진행 구독
useEffect(() => {
  const unsubscribe = window.api.system.onModelDownloadProgress((progress) => {
    setDownloadProgress(progress);
    if (progress.phase === "complete" || progress.phase === "done") {
      setIsDownloading(false);
      void window.api.system.getLocalLlmSettings().then((res) => {
        if (res.success && res.data) {
          setLocalLlmEnabled(res.data.enabled ?? false);
          setLocalLlmModelPath(res.data.modelPath);
          setLocalLlmBinaryPath(res.data.binaryPath);
        }
      });
    }
    if (progress.phase === "error") setIsDownloading(false);
  });
  return unsubscribe;
}, []);

const handleDownloadLocalModel = useCallback(async () => {
  setIsDownloading(true);
  setDownloadProgress(null);
  await window.api.system.startModelDownload({ type: "model" });
}, []);

const handleToggleLocalLlm = useCallback(async (enabled: boolean) => {
  setLocalLlmEnabled(enabled);
  await window.api.system.setLocalLlmSettings({
    enabled,
    modelPath: localLlmModelPath,
    binaryPath: localLlmBinaryPath,
  });
}, [localLlmModelPath, localLlmBinaryPath]);
```

- [ ] **Step 2: `ModelTab.tsx`에 로컬 LLM 섹션 추가**

기존 Ollama 섹션 아래에 추가:

```tsx
{/* 로컬 LLM 섹션 */}
<div className="rounded-lg border border-border p-4 space-y-4">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-sm font-medium">{t("settings.model.localLlm.title", "로컬 AI (오프라인)")}</h3>
      <p className="text-xs text-fg-secondary mt-0.5">
        {t("settings.model.localLlm.desc", "인터넷 연결 없이 AI를 사용합니다. 최초 1회 모델 다운로드 필요 (~1.6GB).")}
      </p>
    </div>
    {/* 토글 — 모델 있을 때만 활성화 */}
    <button
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        localLlmEnabled ? "bg-accent" : "bg-border"
      } ${!localLlmModelPath ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      onClick={() => localLlmModelPath && handleToggleLocalLlm(!localLlmEnabled)}
      disabled={!localLlmModelPath}
      aria-label="로컬 LLM 토글"
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        localLlmEnabled ? "translate-x-4" : "translate-x-0.5"
      }`} />
    </button>
  </div>

  {/* 모델 상태 */}
  {localLlmModelPath ? (
    <div className="flex items-center gap-2 text-xs text-fg-secondary">
      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
      <span>{t("settings.model.localLlm.modelReady", "모델 준비됨")}</span>
    </div>
  ) : (
    <div className="space-y-2">
      <p className="text-xs text-fg-secondary">
        {t("settings.model.localLlm.noModel", "Qwen2.5 1.5B 모델이 없습니다. 아래 버튼으로 다운로드하세요.")}
      </p>

      {/* 다운로드 진행 바 */}
      {isDownloading && downloadProgress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-fg-secondary">
            <span>{downloadProgress.phase === "binary" ? "바이너리 다운로드" : "모델 다운로드"}</span>
            <span>{downloadProgress.pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${downloadProgress.pct}%` }}
            />
          </div>
        </div>
      )}

      {downloadProgress?.error && (
        <p className="text-xs text-red-500">{downloadProgress.error}</p>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadLocalModel}
        disabled={isDownloading || isBusy}
        className="w-full"
      >
        {isDownloading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />{t("settings.model.localLlm.downloading", "다운로드 중...")}</>
        ) : (
          t("settings.model.localLlm.download", "AI 모델 다운로드 (~1.6GB)")
        )}
      </Button>
    </div>
  )}
</div>
```

- [ ] **Step 3: 커밋**

```bash
git add src/renderer/src/features/settings/components/tabs/ModelTab.tsx \
        src/renderer/src/features/settings/hooks/useSettingsModel.ts
git commit -m "feat(ui): add local LLM section to ModelTab with download progress"
```

---

## Task 9: 앱 종료 시 sidecar 정리

**Files:**
- Modify: `src/main/index.ts` (또는 앱 초기화 파일)

- [ ] **Step 1: 앱 종료 이벤트에 sidecar.stop() 추가**

앱 진입점에서 `app.on('before-quit')` 또는 `app.on('will-quit')` 찾아서:

```typescript
import { sidecarManager } from "./services/llm/sidecarManager.js";

app.on("before-quit", () => {
  void sidecarManager.stop();
});
```

- [ ] **Step 2: 커밋**

```bash
git add src/main/index.ts
git commit -m "fix(sidecar): stop llama-server on app quit to prevent orphan processes"
```

---

## 검증 체크리스트

- [ ] macOS arm64에서 바이너리 다운로드 → llama-server 실행 확인
- [ ] 설정 탭 > 로컬 LLM > 다운로드 버튼 → 진행바 표시
- [ ] 다운로드 완료 → 토글 활성화 → RAG QA 실행
- [ ] Activity Monitor: `llama-server` 별도 PID, Electron 메모리 영향 없음 확인
- [ ] Luie 종료 → llama-server 프로세스도 종료 확인
- [ ] 3분 유휴 → llama-server 자동 종료 확인
- [ ] API 키 + 로컬 LLM 둘 다 있을 때: 로컬이 우선 사용되는지 확인
- [ ] llama-server 시작 실패 시: Gemini API fallback 동작 확인

---

## 참고: 플랫폼별 예상 메모리

| 환경 | 모델 | 예상 메모리 |
|------|------|-----------|
| macOS arm64 M2+ | Qwen2.5 1.5B Q8_0 | ~1.6GB (unified) |
| Windows NVIDIA 6GB VRAM | Qwen2.5 1.5B Q8_0 | VRAM ~1.6GB, RAM ~200MB |
| Windows CPU only | Qwen2.5 1.5B Q8_0 | RAM ~1.8GB |

Electron (Luie) 자체 메모리: 영향 없음 (별도 OS 프로세스).
