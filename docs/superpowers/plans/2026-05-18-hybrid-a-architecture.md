# Hybrid-A Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** llama.cpp 추론을 Electron Main Process 밖으로 완전히 분리하여 Main RAM을 6GB → ~380MB로 줄이고, GPU offload(Metal)를 활성화한다.

**Architecture:** Generation(Qwen3-4B)은 llama-server sidecar(독립 OS 프로세스, HTTP SSE)로, Embedding은 Utility Process 내 경량 LlamaCppProvider로, DB/RAG/Memory는 Utility Process에 집중한다. Main Process는 IPC 라우터와 Window 관리만 담당한다.

**Tech Stack:** `node-llama-cpp 3.18.1` (LlamaServer + LlamaCppProvider), `better-sqlite3 12.6.2`, `sqlite-vec 0.1.9`, `Electron 40` (utilityProcess.fork), `electron-vite 5`

---

## File Structure

### 새로 생성 (4개)
| 파일 | 역할 |
|------|------|
| `src/main/services/llm/providers/llamaServerProvider.ts` | HTTP SSE로 sidecar에서 토큰 스트리밍, `ModelRuntimeClient` 구현 |
| `src/main/services/llm/sidecarManager.ts` | llama-server 프로세스 spawn/kill/idle-unload, Utility Process 내에서 실행 |
| `src/main/services/llm/splitRuntimeProvider.ts` | generation → LlamaServerProvider, embed → LlamaCppProvider 분기 |
| `src/main/utility/utilityProcessMain.ts` | Utility Process 진입점: DB init, DerivedJobWorker, RagQaService, MessagePort 핸들러 |

### 수정 (7개)
| 파일 | 변경 내용 |
|------|-----------|
| `src/main/services/llm/modelRuntimeFactory.ts` | `llamaserver` hint → SplitRuntimeProvider 반환 |
| `src/main/services/llm/providers/llamaCppProvider.ts` | `generate`/`generateStream` 제거, `embed`만 유지 |
| `src/main/services/features/rag/ragQaService.ts` | BrowserWindow 의존 제거, `process.parentPort`로 토큰 전송 |
| `src/main/handler/index.ts` | ragQaService/embeddingProjector/chapterSummaryProjector import 제거, utility로 위임 |
| `src/main/index.ts` | `app.disableHardwareAcceleration()` 제거, utilityProcessBridge 시작 |
| `electron.vite.config.ts` | utility entry point 추가 |
| `electron-builder.json` | 이미 asarUnpack 있음 — 확인만 |

---

## Task 1: LlamaServerProvider — HTTP 기반 생성 클라이언트

**Files:**
- Create: `src/main/services/llm/providers/llamaServerProvider.ts`

- [ ] **Step 1: 파일 생성**

```typescript
// src/main/services/llm/providers/llamaServerProvider.ts
import { createLogger } from "../../../../shared/logger/index.js";
import type { GenerateOptions, ModelRuntimeClient } from "../modelRuntimeClient.js";

const logger = createLogger("LlamaServerProvider");

export class LlamaServerProvider implements ModelRuntimeClient {
  readonly providerName = "llamaserver";

  constructor(private readonly getPort: () => number | null) {}

  async isAvailable(): Promise<boolean> {
    const port = this.getPort();
    if (!port) return false;
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  isModelLoaded(): boolean {
    return this.getPort() !== null;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const chunks: string[] = [];
    for await (const token of this.generateStream(prompt, options)) {
      chunks.push(token);
    }
    return chunks.join("");
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const port = this.getPort();
    if (!port) {
      logger.warn("LlamaServer not ready, skipping generation");
      return;
    }

    const resp = await fetch(`http://127.0.0.1:${port}/v1/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        stream: true,
        max_tokens: options?.maxTokens ?? 256,
        temperature: options?.temperature ?? 0.2,
      }),
    });

    if (!resp.ok || !resp.body) {
      throw new Error(`LlamaServer HTTP ${resp.status}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data) as { choices: Array<{ text: string }> };
            const token = parsed.choices[0]?.text;
            if (token) yield token;
          } catch {
            // 잘못된 SSE 청크는 건너뜀
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // embed는 Utility Process 내 LlamaCppProvider가 담당
  async embed(_texts: string[]): Promise<Float32Array[] | null> {
    return null;
  }
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
cd /Users/user/Luie && bun run typecheck 2>&1 | grep llamaServerProvider
```

오류 없으면 다음 step.

- [ ] **Step 3: 커밋**

```bash
git add src/main/services/llm/providers/llamaServerProvider.ts
git commit -m "feat(llm): add LlamaServerProvider for HTTP sidecar generation"
```

---

## Task 2: SidecarManager — llama-server 생명주기

**Files:**
- Create: `src/main/services/llm/sidecarManager.ts`

- [ ] **Step 1: 파일 생성**

```typescript
// src/main/services/llm/sidecarManager.ts
import { createLogger } from "../../../shared/logger/index.js";

const logger = createLogger("SidecarManager");

// llama.cpp GPU_LAYERS_MAX: 모든 레이어를 GPU로 오프로드
const GPU_LAYERS_ALL = 999;

type SidecarState =
  | { status: "stopped" }
  | { status: "starting"; promise: Promise<number> }
  | { status: "running"; port: number; server: { dispose: () => Promise<void> } };

export class SidecarManager {
  private state: SidecarState = { status: "stopped" };
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly idleTimeoutMs: number;

  constructor(idleTimeoutMs = 5 * 60 * 1000) {
    this.idleTimeoutMs = idleTimeoutMs;
  }

  /**
   * llama-server를 시작하고 포트를 반환한다.
   * 이미 running 상태면 즉시 포트를 반환한다.
   * GPU layers: 999 = 모든 레이어를 Metal/CUDA로 오프로드.
   */
  async start(modelPath: string, gpuLayers = GPU_LAYERS_ALL): Promise<number> {
    if (this.state.status === "running") return this.state.port;
    if (this.state.status === "starting") return this.state.promise;

    const startPromise = this._doStart(modelPath, gpuLayers);
    this.state = { status: "starting", promise: startPromise };

    try {
      const port = await startPromise;
      return port;
    } catch (error) {
      this.state = { status: "stopped" };
      throw error;
    }
  }

  private async _doStart(modelPath: string, gpuLayers: number): Promise<number> {
    // node-llama-cpp의 LlamaServer: llama-server 바이너리를 별도 OS 프로세스로 spawn
    const { getLlama, LlamaServer } = await import("node-llama-cpp") as {
      getLlama: (opts?: { gpu?: string }) => Promise<unknown>;
      LlamaServer: new (opts: {
        llama: unknown;
        modelPath: string;
        port?: number;
        gpuLayers?: number;
        contextSize?: number;
      }) => { port: number; start: () => Promise<void>; dispose: () => Promise<void> };
    };

    const llama = await getLlama({ gpu: "auto" }); // Metal(macOS) / CUDA / CPU 자동 감지
    const server = new LlamaServer({
      llama,
      modelPath,
      port: 0,           // OS가 빈 포트 자동 배정
      gpuLayers,         // 999 = 전체 레이어 GPU 오프로드
      contextSize: 4096, // KV cache RAM hard cap
    });

    await server.start();
    const { port } = server;

    this.state = { status: "running", port, server };
    logger.info("Sidecar started", { port, gpuLayers, modelPath });
    return port;
  }

  async stop(): Promise<void> {
    this.clearIdleTimer();
    if (this.state.status !== "running") return;
    const { server } = this.state;
    this.state = { status: "stopped" };
    await server.dispose();
    logger.info("Sidecar stopped");
  }

  /** 생성 요청이 완료될 때마다 호출. idle 타이머를 리셋한다. */
  resetIdleTimer(): void {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      logger.info("Sidecar idle timeout reached, stopping to free RAM");
      void this.stop();
    }, this.idleTimeoutMs);
  }

  getPort(): number | null {
    return this.state.status === "running" ? this.state.port : null;
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

> **주의:** `LlamaServer`의 exact API는 node-llama-cpp 3.18.1 기준이다. 빌드 오류가 나면
> `node_modules/node-llama-cpp/dist/index.d.ts`에서 `LlamaServer` export를 확인하라.
> 없으면 `getLlama()` 반환값의 `.createServer()` 메서드를 사용한다:
> ```typescript
> const server = await (llama as { createServer: (o: object) => Promise<{ port: number; dispose: () => Promise<void> }> })
>   .createServer({ modelPath, port: 0, gpuLayers, contextSize: 4096 });
> ```

- [ ] **Step 2: 컴파일 확인**

```bash
cd /Users/user/Luie && bun run typecheck 2>&1 | grep sidecarManager
```

- [ ] **Step 3: 커밋**

```bash
git add src/main/services/llm/sidecarManager.ts
git commit -m "feat(llm): add SidecarManager for llama-server process lifecycle"
```

---

## Task 3: SplitRuntimeProvider — generation/embed 분기

**Files:**
- Create: `src/main/services/llm/splitRuntimeProvider.ts`

- [ ] **Step 1: 파일 생성**

```typescript
// src/main/services/llm/splitRuntimeProvider.ts
import type { GenerateOptions, ModelRuntimeClient } from "./modelRuntimeClient.js";

/**
 * generation 요청은 LlamaServerProvider(sidecar)로,
 * embed 요청은 LlamaCppProvider(embed-only, Utility 내)로 분기한다.
 */
export class SplitRuntimeProvider implements ModelRuntimeClient {
  readonly providerName = "split";

  constructor(
    private readonly generationProvider: ModelRuntimeClient,
    private readonly embeddingProvider: ModelRuntimeClient,
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.generationProvider.isAvailable();
  }

  isModelLoaded(): boolean {
    return this.generationProvider.isModelLoaded();
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    return this.generationProvider.generate(prompt, options);
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    yield* this.generationProvider.generateStream(prompt, options);
  }

  async embed(texts: string[]): Promise<Float32Array[] | null> {
    return this.embeddingProvider.embed(texts);
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/main/services/llm/splitRuntimeProvider.ts
git commit -m "feat(llm): add SplitRuntimeProvider to route generation vs embed"
```

---

## Task 4: modelRuntimeFactory — llamaserver 라우팅 추가

**Files:**
- Modify: `src/main/services/llm/modelRuntimeFactory.ts`

- [ ] **Step 1: 파일 읽기 (현재 내용 확인)**

`src/main/services/llm/modelRuntimeFactory.ts` 전체를 읽는다.

- [ ] **Step 2: `resolveModelRuntimeClient` 수정**

기존 파일에서 import 섹션 끝에 추가:
```typescript
import { LlamaServerProvider } from "./providers/llamaServerProvider.js";
import { SplitRuntimeProvider } from "./splitRuntimeProvider.js";
import { sidecarManager } from "./sidecarManager.js";
```

`resolveModelRuntimeClient` 함수 내에서 `providerHint === "none"` 블록 바로 아래에 추가:

```typescript
  // Hybrid-A: llama-server sidecar for generation + LlamaCppProvider for embed
  if (providerHint === "llamaserver" && effectiveModelPath) {
    // sidecar를 lazy start (이미 running이면 기존 포트 반환)
    void sidecarManager.start(
      effectiveModelPath,
      configuredGpuLayers ?? 999,
    );

    const generationProvider = new LlamaServerProvider(() => sidecarManager.getPort());
    const embeddingProvider = getOrCreateLlamaProvider(
      embeddingConfiguredPath ?? effectiveModelPath,
      null,           // embed-only: embeddingModelPath를 첫 번째 인수로
      undefined,
      undefined,
    );
    return new SplitRuntimeProvider(generationProvider, embeddingProvider);
  }
```

- [ ] **Step 3: 컴파일 확인**

```bash
cd /Users/user/Luie && bun run typecheck 2>&1 | grep modelRuntimeFactory
```

- [ ] **Step 4: 커밋**

```bash
git add src/main/services/llm/modelRuntimeFactory.ts
git commit -m "feat(llm): route llamaserver hint to SplitRuntimeProvider"
```

---

## Task 5: LlamaCppProvider — embed-only로 슬림화

**Files:**
- Modify: `src/main/services/llm/providers/llamaCppProvider.ts`

현재 `LlamaCppProvider`는 generation + embedding 둘 다 한다.
`SplitRuntimeProvider.embeddingProvider`로 사용될 때는 embed만 필요하다.
`generate`/`generateStream`은 그대로 두되, `SplitRuntimeProvider`에서 이 provider로 오는 호출은 embed뿐이므로 코드 변경 없음.

단, **GPU Offload를 Main Process에서 막고 있는 코드를 제거한다.**

- [ ] **Step 1: `src/main/index.ts` 확인**

`src/main/index.ts`를 열어 아래 줄을 찾는다:
```typescript
app.disableHardwareAcceleration();
```

- [ ] **Step 2: `app.disableHardwareAcceleration()` 제거 또는 조건부 처리**

이 줄을 제거한다. (sidecar는 별도 OS 프로세스라 이 호출의 영향을 받지 않지만,
Utility Process에서 LlamaCppProvider가 Metal을 쓰려면 이 주석이 없어야 한다.)

```typescript
// 제거: app.disableHardwareAcceleration();
// 이유: Utility Process의 embed 모델과 sidecar의 Metal GPU offload를 막지 않기 위해
```

> **주의:** 이 줄이 존재했던 이유를 먼저 git blame으로 확인하라.
> ```bash
> git log -S "disableHardwareAcceleration" --oneline src/main/index.ts
> ```
> 특정 렌더링 버그 때문에 추가됐다면 제거 후 렌더러 동작을 수동 테스트한다.

- [ ] **Step 3: 커밋**

```bash
git add src/main/index.ts
git commit -m "feat(gpu): remove disableHardwareAcceleration to enable Metal GPU offload"
```

---

## Task 6: Utility Process Entry — 모든 무거운 서비스의 집결지

**Files:**
- Create: `src/main/utility/utilityProcessMain.ts`

- [ ] **Step 1: utility 디렉토리 생성**

```bash
mkdir -p /Users/user/Luie/src/main/utility
```

- [ ] **Step 2: 파일 생성**

```typescript
// src/main/utility/utilityProcessMain.ts
// Electron Utility Process 진입점.
// Main Process와 MessagePort로 통신한다. BrowserWindow 없음.

import { createLogger } from "../../shared/logger/index.js";

const logger = createLogger("UtilityProcess");

// ──── MessagePort 타입 정의 ────
type MainToUtility =
  | { type: "rag-qa-ask"; request: import("../../shared/types/index.js").RagQaRequest }
  | { type: "rag-qa-stop"; runId?: string };

type UtilityToMain =
  | { type: "ready" }
  | { type: "rag-qa-stream"; runId: string; token: string }
  | { type: "rag-qa-result"; runId: string; result: import("../../shared/types/index.js").RagQaResult }
  | { type: "rag-qa-error"; runId: string; code: string; message: string };

// ──── 초기화 ────
async function bootstrap(): Promise<void> {
  logger.info("Utility process bootstrap started");

  // 1. DB 초기화 (LUIE_RUNTIME_DATABASE_URL은 Main이 env로 전달)
  const { db } = await import("../database/index.js");
  await db.initialize();
  logger.info("Utility DB initialized");

  // 2. DerivedJobWorker 시작 (chunking + summary + embedding 백그라운드 잡)
  const { derivedJobWorker } = await import("../services/features/derivedJobWorker.js");
  derivedJobWorker.start();
  logger.info("DerivedJobWorker started");

  // 3. Main으로부터 MessagePort 수신 후 핸들러 등록
  process.parentPort.on("message", async (event) => {
    // 첫 번째 메시지: Main이 보내는 init + port
    const ports = event.ports;
    if (ports && ports.length > 0) {
      setupMessagePort(ports[0]);
    }
  });

  process.parentPort.postMessage({ type: "ready" } satisfies UtilityToMain);
  logger.info("Utility process ready");
}

function setupMessagePort(port: Electron.MessagePortMain): void {
  port.on("message", async (event) => {
    const msg = event.data as MainToUtility;

    if (msg.type === "rag-qa-ask") {
      await handleRagQaAsk(port, msg.request);
    } else if (msg.type === "rag-qa-stop") {
      await handleRagQaStop(msg.runId);
    }
  });
  port.start();
}

async function handleRagQaAsk(
  port: Electron.MessagePortMain,
  request: import("../../shared/types/index.js").RagQaRequest,
): Promise<void> {
  const { ragQaService } = await import("../services/features/rag/ragQaService.js");
  
  await ragQaService.askViaPort(request, {
    onStream: (runId, token) => {
      port.postMessage({ type: "rag-qa-stream", runId, token } satisfies UtilityToMain);
    },
    onResult: (runId, result) => {
      port.postMessage({ type: "rag-qa-result", runId, result } satisfies UtilityToMain);
    },
    onError: (runId, code, message) => {
      port.postMessage({ type: "rag-qa-error", runId, code, message } satisfies UtilityToMain);
    },
  });
}

async function handleRagQaStop(runId?: string): Promise<void> {
  const { ragQaService } = await import("../services/features/rag/ragQaService.js");
  await ragQaService.stop(runId);
}

bootstrap().catch((error) => {
  logger.error("Utility process bootstrap failed", { error });
  process.exit(1);
});
```

- [ ] **Step 3: 커밋**

```bash
git add src/main/utility/utilityProcessMain.ts
git commit -m "feat(utility): add Utility Process entry point for heavy services"
```

---

## Task 7: RagQaService — BrowserWindow 의존 제거

**Files:**
- Modify: `src/main/services/features/rag/ragQaService.ts`

현재 `RagQaService`는 `BrowserWindow`를 직접 참조해서 `webContents.send()`를 호출한다.
Utility Process에서는 BrowserWindow가 없다. 콜백 기반으로 바꾼다.

- [ ] **Step 1: 현재 파일 읽기**

`src/main/services/features/rag/ragQaService.ts` 전체를 읽는다.

- [ ] **Step 2: `askViaPort` 메서드 추가**

기존 `ask(input, window)` 메서드는 **그대로 유지** (Main Process에서 직접 호출하는 경로가 남아있을 수 있음).
새 메서드 `askViaPort`를 추가한다:

```typescript
// RagQaService 클래스 내부에 추가

type PortCallbacks = {
  onStream: (runId: string, token: string) => void;
  onResult: (runId: string, result: RagQaResult) => void;
  onError: (runId: string, code: string, message: string) => void;
};

async askViaPort(input: RagQaRequest, callbacks: PortCallbacks): Promise<RagQaRunHandle> {
  const runId = this.buildRunId();
  // aborted 상태를 위한 별도 추적
  const run = { runId, request: input, aborted: false };
  this.activeRuns.set(runId, run as unknown as ActiveRun);

  void this._executeViaPort(run, callbacks);
  return { runId };
}

private async _executeViaPort(
  run: { runId: string; request: RagQaRequest; aborted: boolean },
  callbacks: PortCallbacks,
): Promise<void> {
  try {
    const { projectId, question, chapterId } = run.request;
    const { assembledPrompt, evidence } = await assembleRagContext({
      projectId,
      question,
      chapterId,
    });

    const runtime = await resolveModelRuntimeClient(projectId);

    let fullText = "";
    for await (const token of runtime.generateStream(assembledPrompt, {
      maxTokens: 512,
      temperature: 0.3,
    })) {
      if (run.aborted) break;
      fullText += token;
      callbacks.onStream(run.runId, token);
    }

    this.activeRuns.delete(run.runId);
    // sidecar idle 타이머 리셋 (5분 후 자동 unload)
    const { sidecarManager } = await import("../../llm/sidecarManager.js");
    sidecarManager.resetIdleTimer();

    callbacks.onResult(run.runId, {
      runId: run.runId,
      projectId,
      answer: fullText,
      evidence,
    });
  } catch (error) {
    this.activeRuns.delete(run.runId);
    const message = error instanceof Error ? error.message : "RAG QA failed";
    callbacks.onError(run.runId, "RAG_QA_FAILED", message);
  }
}
```

- [ ] **Step 3: 컴파일 확인**

```bash
cd /Users/user/Luie && bun run typecheck 2>&1 | grep ragQaService
```

- [ ] **Step 4: 커밋**

```bash
git add src/main/services/features/rag/ragQaService.ts
git commit -m "feat(rag): add askViaPort for Utility Process streaming without BrowserWindow"
```

---

## Task 8: Main Process — Utility Fork + IPC 브리지

**Files:**
- Create: `src/main/lifecycle/utilityBridge.ts`
- Modify: `src/main/handler/index.ts`

### Step 8-A: utilityBridge.ts 생성

- [ ] **Step 1: 파일 생성**

```typescript
// src/main/lifecycle/utilityBridge.ts
import path from "node:path";
import { utilityProcess, MessageChannelMain, BrowserWindow } from "electron";
import { createLogger } from "../../shared/logger/index.js";
import { IPC_CHANNELS } from "../../shared/ipc/channels.js";
import type { RagQaRequest } from "../../shared/types/index.js";

const logger = createLogger("UtilityBridge");

type UtilityToMain =
  | { type: "ready" }
  | { type: "rag-qa-stream"; runId: string; token: string }
  | { type: "rag-qa-result"; runId: string; result: unknown }
  | { type: "rag-qa-error"; runId: string; code: string; message: string };

class UtilityBridge {
  private child: Electron.UtilityProcess | null = null;
  private port: Electron.MessagePortMain | null = null;

  start(utilityEntryPath: string): void {
    if (this.child) return;

    this.child = utilityProcess.fork(utilityEntryPath, [], {
      serviceName: "LuieUtility",
      // DB URL, LLM 설정 등을 env로 전달 (process.env에서 자동 상속)
    });

    const { port1, port2 } = new MessageChannelMain();
    this.port = port1;

    // port2를 utility에 전달
    this.child.postMessage({ type: "init" }, [port2]);

    port1.on("message", (event) => {
      this.handleUtilityMessage(event.data as UtilityToMain);
    });
    port1.start();

    this.child.on("exit", (code) => {
      logger.warn("Utility process exited", { code });
      this.child = null;
      this.port = null;
    });

    logger.info("Utility process forked", { path: utilityEntryPath });
  }

  private handleUtilityMessage(msg: UtilityToMain): void {
    if (msg.type === "ready") {
      logger.info("Utility process ready");
      return;
    }

    // 스트리밍 토큰 → 활성 BrowserWindow로 전달
    const window = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
    if (!window) return;

    if (msg.type === "rag-qa-stream") {
      window.webContents.send(IPC_CHANNELS.RAG_QA_STREAM, {
        runId: msg.runId,
        token: msg.token,
      });
    } else if (msg.type === "rag-qa-result") {
      window.webContents.send(IPC_CHANNELS.RAG_QA_STREAM, {
        runId: msg.runId,
        done: true,
        result: msg.result,
      });
    } else if (msg.type === "rag-qa-error") {
      window.webContents.send(IPC_CHANNELS.RAG_QA_ERROR, {
        runId: msg.runId,
        code: msg.code,
        message: msg.message,
      });
    }
  }

  sendRagQaAsk(request: RagQaRequest): void {
    this.port?.postMessage({ type: "rag-qa-ask", request });
  }

  sendRagQaStop(runId?: string): void {
    this.port?.postMessage({ type: "rag-qa-stop", runId });
  }

  async stop(): Promise<void> {
    this.port?.close();
    this.child?.kill();
    this.child = null;
    this.port = null;
  }
}

export const utilityBridge = new UtilityBridge();
```

- [ ] **Step 2: main/index.ts에 utilityBridge.start() 추가**

`src/main/index.ts`를 열어, `registerAppReady(...)` 호출 바로 위에 추가:

```typescript
import { utilityBridge } from "./lifecycle/utilityBridge.js";

// app.whenReady 이후 (registerAppReady 내부 혹은 직후):
const utilityEntry = path.join(
  app.getAppPath(),
  "out/main/utilityProcessMain.js", // electron-vite 빌드 출력
);
utilityBridge.start(utilityEntry);
```

> **dev 환경 경로:** electron-vite dev 모드에서는 빌드된 파일이 없으므로
> 아래처럼 분기한다:
> ```typescript
> const utilityEntry = app.isPackaged
>   ? path.join(process.resourcesPath, "app.asar/out/main/utilityProcessMain.js")
>   : path.join(app.getAppPath(), "out/main/utilityProcessMain.js");
> ```

### Step 8-B: handler/index.ts에서 RAG QA를 Utility로 위임

- [ ] **Step 3: handler/index.ts 수정**

`registerAnalysisHandlers`에서 `ragQaService`를 직접 쓰는 부분을:

```typescript
// 기존: ragQaService 직접 import
// 변경: utilityBridge로 위임하는 어댑터 객체 생성

import { utilityBridge } from "../lifecycle/utilityBridge.js";

const ragServiceAdapter = {
  ask: (input: RagQaRequest, _window: BrowserWindow) => {
    utilityBridge.sendRagQaAsk(input);
    const runId = `${Date.now()}-bridge`;
    return Promise.resolve({ runId });
  },
  stop: (runId?: string) => {
    utilityBridge.sendRagQaStop(runId);
  },
};
```

그리고 `registerAnalysisHandlers({ ragQaService })` → `registerAnalysisHandlers({ ragQaService: ragServiceAdapter })` 로 바꾼다.

`services/index.ts`에서 `ragQaService`, `embeddingProjector`, `chapterSummaryProjector` import도 제거한다.

- [ ] **Step 4: 컴파일 확인**

```bash
cd /Users/user/Luie && bun run typecheck 2>&1 | grep -E "utilityBridge|handler/index"
```

- [ ] **Step 5: 커밋**

```bash
git add src/main/lifecycle/utilityBridge.ts src/main/index.ts src/main/handler/index.ts
git commit -m "feat(main): add UtilityBridge and delegate RAG QA to Utility Process"
```

---

## Task 9: electron-vite — Utility Process 빌드 엔트리 추가

**Files:**
- Modify: `electron.vite.config.ts`

현재 `main` 빌드는 단일 진입점(`src/main/index.ts` 기본값). Utility 진입점을 추가한다.

- [ ] **Step 1: electron.vite.config.ts 수정**

`main.build.rollupOptions` 섹션을 수정:

```typescript
// 기존
rollupOptions: {
  external: mainExternal,
  output: {
    format: "es",
  },
},

// 변경 후
rollupOptions: {
  input: {
    index: resolve("src/main/index.ts"),
    utilityProcessMain: resolve("src/main/utility/utilityProcessMain.ts"),
  },
  external: [
    ...mainExternal,
    /^node-llama-cpp(?:\/.*)?$/,  // utility에서 dynamic import 사용
  ],
  output: {
    format: "es",
    entryFileNames: "[name].js",
  },
},
```

- [ ] **Step 2: 개발 빌드 테스트**

```bash
cd /Users/user/Luie && bun run build:main 2>&1 | tail -20
# out/main/utilityProcessMain.js 파일이 생성되는지 확인
ls -la out/main/
```

- [ ] **Step 3: 커밋**

```bash
git add electron.vite.config.ts
git commit -m "build: add utilityProcessMain entry to electron-vite config"
```

---

## Task 10: electron-builder.json — 패키징 검증

**Files:**
- Modify: `electron-builder.json` (최소 변경)

- [ ] **Step 1: 현재 asarUnpack 확인**

이미 `electron-builder.json`에 있음:
```json
"asarUnpack": [
  "node_modules/node-llama-cpp/**",
  "node_modules/sqlite-vec/**"
]
```

llama-server 바이너리가 `node-llama-cpp` 안에 있으므로 이미 포함됨. 추가 변경 불필요.

- [ ] **Step 2: rebuild 스크립트 확인**

```bash
grep "rebuild" /Users/user/Luie/package.json
```

현재 `electron-rebuild --force --module-dir . -w better-sqlite3`만 있다.
Utility Process는 같은 Electron ABI를 사용하므로 추가 rebuild 불필요.

- [ ] **Step 3: node-llama-cpp 바이너리 경로 검증**

```bash
ls node_modules/node-llama-cpp/bins/ 2>/dev/null || \
  find node_modules/node-llama-cpp -name "llama-server*" -type f 2>/dev/null | head -5
```

바이너리 경로를 확인하고 `asarUnpack`에 포함되어 있는지 검증한다.

- [ ] **Step 4: 커밋**

```bash
# 변경 없으면 스킵. 변경이 필요했다면:
git add electron-builder.json
git commit -m "build: verify llama-server binary is included in asarUnpack"
```

---

## Task 11: Idle Unload — Embed 모델 자동 해제

**Files:**
- Modify: `src/main/services/llm/providers/llamaCppProvider.ts`

Sidecar는 Task 2에서 이미 5분 idle 후 자동 stop. Embed 모델도 같은 정책 적용.

- [ ] **Step 1: LlamaCppProvider에 idle unload 추가**

`src/main/services/llm/providers/llamaCppProvider.ts`를 열어 클래스 내부에 추가:

```typescript
private idleTimer: ReturnType<typeof setTimeout> | null = null;
private readonly EMBED_IDLE_MS = 60_000; // 60초 idle 후 embed 모델 해제

/** embed 요청 완료 시 호출. 60초 후 embeddingContext를 해제한다. */
resetEmbedIdleTimer(): void {
  if (this.idleTimer) clearTimeout(this.idleTimer);
  this.idleTimer = setTimeout(() => {
    this.unloadEmbedding();
  }, this.EMBED_IDLE_MS);
}

private unloadEmbedding(): void {
  if (!this.context.embeddingContext) return;
  // embeddingContext dispose (node-llama-cpp 3.x API)
  (this.context.embeddingContext as { dispose?: () => void }).dispose?.();
  this.context.embeddingContext = undefined;
  this.context.embeddingModel = undefined;
  this.embeddingPromise = null; // 다음 embed 요청 시 재로드 허용
}
```

`embed()` 메서드 성공 반환 직전에 호출:
```typescript
// embed() 메서드 마지막 return 전에:
this.resetEmbedIdleTimer();
return vectors;
```

- [ ] **Step 2: 컴파일 확인**

```bash
cd /Users/user/Luie && bun run typecheck 2>&1 | grep llamaCppProvider
```

- [ ] **Step 3: 커밋**

```bash
git add src/main/services/llm/providers/llamaCppProvider.ts
git commit -m "feat(llm): add embed model idle unload after 60s"
```

---

## Task 12: GPU Config — providerHint 환경변수 + 설정 연결

**Files:**
- Modify: `src/main/services/llm/modelRuntimeFactory.ts`

현재 `LUIE_LLM_GPU_LAYERS` env var가 있지만 `llamaserver` 경로에서는 `sidecarManager.start()`에 전달되지 않는다.

- [ ] **Step 1: Task 4에서 추가한 llamaserver 블록 수정**

```typescript
if (providerHint === "llamaserver" && effectiveModelPath) {
  const gpuLayers = configuredGpuLayers ?? 999; // 기본값: 전체 GPU 오프로드
  void sidecarManager.start(effectiveModelPath, gpuLayers);
  // ... 나머지 동일
}
```

`LUIE_LLM_GPU_LAYERS` 환경 변수로 레이어 수 제어 가능:
- `LUIE_LLM_GPU_LAYERS=0` → CPU only
- `LUIE_LLM_GPU_LAYERS=999` (기본) → 전체 Metal/CUDA 오프로드

- [ ] **Step 2: `.env.example` 업데이트 (있다면)**

```bash
# 있으면 추가
echo "LUIE_LLM_PROVIDER_HINT=llamaserver" >> .env.example
echo "LUIE_LLM_GPU_LAYERS=999" >> .env.example
```

- [ ] **Step 3: 커밋**

```bash
git add src/main/services/llm/modelRuntimeFactory.ts
git commit -m "feat(gpu): wire GPU_LAYERS env to sidecar start, default 999 (full offload)"
```

---

## Task 13: 통합 검증

- [ ] **Step 1: 개발 모드 실행**

```bash
cd /Users/user/Luie && bun run dev
```

- [ ] **Step 2: Utility Process 시작 확인**

개발자 도구(Cmd+Option+I) 또는 로그 파일에서:
```
[UtilityProcess] Utility process bootstrap started
[UtilityProcess] Utility DB initialized
[UtilityProcess] DerivedJobWorker started
[UtilityProcess] Utility process ready
[UtilityBridge] Utility process forked
[UtilityBridge] Utility process ready
```

- [ ] **Step 3: RAM 측정 (Before/After)**

```bash
# 앱 실행 후 5초 대기
ps aux | grep -E "Luie|llama-server" | grep -v grep | awk '{print $2, $4, $11}'
# PID, %MEM, 프로세스명 출력
```

Main Process 메모리가 이전 대비 대폭 감소했는지 확인한다.

- [ ] **Step 4: RAG QA 스트리밍 테스트**

1. 프로젝트를 열고 RAG QA 패널에서 질문 입력
2. sidecar 시작 로그 확인: `[SidecarManager] Sidecar started { port: ... }`
3. 토큰 스트리밍 확인
4. 5분 대기 후 idle unload 로그 확인: `[SidecarManager] Sidecar idle timeout reached`

- [ ] **Step 5: 최종 커밋**

```bash
git add -A
git commit -m "feat: Hybrid-A architecture — Utility Process + llama-server sidecar"
```

---

## 예상 메모리 결과

| 상태 | Main Process | Utility Process | Sidecar |
|------|-------------|----------------|---------|
| 앱 시작 직후 | ~380MB | ~300MB | 0 (미시작) |
| RAG QA 요청 시 | ~380MB | ~380MB | ~2,900MB |
| 5분 idle 후 | ~380MB | ~300MB | 0 (자동 unload) |
| **이전 (Main 단독)** | **~6,000MB** | — | — |

---

## 알려진 주의사항

1. **LlamaServer API 검증**: `node-llama-cpp 3.18.1`에서 `LlamaServer` export 이름이 다를 수 있다.
   `node_modules/node-llama-cpp/dist/index.d.ts`에서 실제 이름 확인 후 Task 2 코드 수정.

2. **dev 환경 utility 경로**: `out/main/utilityProcessMain.js`는 빌드 후에만 존재한다.
   개발 중 `bun run build:main`을 먼저 실행하거나, electron-vite dev 설정에서 utility watch 추가.

3. **`process.parentPort` 타입**: Electron 40에서 utility process의 `process.parentPort`는
   `Electron.ParentPort` 타입. TypeScript에서 오류나면 `electron` 타입 버전 확인.

4. **sqlite-vec 활성화**: `src/main/database/index.ts`에서 이미 `tryLoadSqliteVecExtension()`을 호출하지만
   실제 벡터 검색(`vec_distance_cosine`)은 아직 `contextAssembler.ts`에 미구현.
   이는 별도 플랜(`2026-05-18-sqlite-vec-search.md`)으로 분리 권장.
