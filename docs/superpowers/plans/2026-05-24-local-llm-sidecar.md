# Local LLM Sidecar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** llama-server를 완전히 분리된 OS 프로세스로 spawn하여 Electron 메모리에 영향 없이 로컬 LLM을 서빙한다.

**Architecture:** `child_process.spawn()`으로 llama-server 바이너리를 별도 OS 프로세스로 실행 → OpenAI 호환 HTTP API → 기존 `ExternalApiProvider` 재사용. 바이너리와 모델 파일은 앱 번들이 아닌 `userData` 디렉토리에 최초 1회 다운로드. `modelRuntimeFactory`에 `sidecar` kind를 0순위로 추가하여 API보다 우선 사용 (설정 시).

**Tech Stack:** TypeScript, `child_process` (Node built-in), `fs/promises`, `net` (포트 탐지), llama.cpp prebuilt binaries (GitHub Releases), HuggingFace Hub REST API, React + existing UI components

---

## 2026-05-24 재정립: 현재 기준 실행 TODO

> 이 섹션이 현재 기준의 권위 있는 TODO다. 아래 Task 1-9는 원안의 세부 코드 스케치로 유지하되, 실행 순서는 이 섹션을 따른다.

### 현재 확인된 사실

- 현재 실제 LLM 런타임은 `gemini → openai → ollama → deterministic` 순서다.
- 현재 `src/main/services/llm/sidecarManager.ts`, `modelDownloader.ts`, `sidecarConstants.ts`는 없다.
- 현재 `AppSettings.llm`에는 `ollama`, `ragTemperature`, `ragMaxTokens`만 있고 `localLlm`은 없다.
- 현재 `docs/llm/ollama-migration.md`는 “로컬 LLM 실행 코드 제거 → Ollama HTTP API만 사용” 방향을 설명한다.
- 현재 `tests/main/services/modelRuntimeFactory.llamaserver.test.ts`는 과거 `llamaserver` 전제를 갖고 있으며, `SKIP_DB_TEST_SETUP=1 bun vitest tests/main/services/modelRuntimeFactory.llamaserver.test.ts --run` 실행 시 `llamaserver` 기대값과 현재 `deterministic` 결과가 충돌한다.
- GitHub release API 기준 `b5620`에는 `llama-b5620-bin-win-avx2-x64.zip`가 없다. Windows x64 CPU asset은 `llama-b5620-bin-win-cpu-x64.zip`다.
- HuggingFace 파일 목록 기준 `qwen2.5-1.5b-instruct-q8_0.gguf`는 존재하며, HEAD 응답의 `x-linked-size`는 `1894532128` bytes다.

### 방향 결정

- 이 계획은 Ollama-only 단순화 방향을 되돌리는 작업이다.
- sidecar를 도입하되 기본값은 안전하게 둔다: 사용자가 설정에서 로컬 LLM 다운로드 및 활성화를 완료한 경우에만 `sidecar`가 0순위로 동작한다.
- Gemini/OpenAI/Ollama fallback은 유지한다. sidecar 시작 실패가 앱 전체 LLM 기능 실패로 번지면 안 된다.

### 반드시 반영할 보강 사항

- 다운로드한 `llama-server` zip은 실행 전에 SHA256 검증을 통과해야 한다.
- SHA256 값은 `sidecarConstants.ts`에 플랫폼별 URL과 함께 고정한다.
- SHA256 미일치 시 zip과 임시 파일을 삭제하고 설정을 변경하지 않는다.
- 앱 종료 정리는 `src/main/index.ts`에 별도 `before-quit` 핸들러를 추가하지 말고, 기존 중앙 종료 흐름인 `src/main/lifecycle/shutdown.ts`에 통합한다.
- `MODEL_DOWNLOAD_PROGRESS`는 renderer push 이벤트이므로 `core/ipcHandler.ts` allowlist가 막는지 확인하고, 막히면 명시적으로 허용한다.
- 기존 `tests/main/services/modelRuntimeFactory.llamaserver.test.ts`는 현재 코드와 맞지 않으므로 sidecar 기준 테스트로 교체한다.
- 계획 안의 release URL과 모델 파일명은 구현 전에 네트워크로 검증해야 한다. 검증 전에는 “확정된 사실”로 취급하지 않는다.

### 재정립된 실행 순서

- [x] **R0: 외부 아티팩트 검증**
  - GitHub release API로 llama.cpp release `b5620`의 플랫폼별 zip URL과 digest를 확인했다.
  - HuggingFace 모델 `Qwen/Qwen2.5-1.5B-Instruct-GGUF`의 `qwen2.5-1.5b-instruct-q8_0.gguf` 파일이 실제 존재하는지 확인했다.
  - 아래 SHA256 값을 `sidecarConstants.ts`에 넣는다.
    ```text
    darwin-arm64: aaaddc5f4a7ecf66ccb7501ed3a1980223c5bb72c17c9c2ffc3d8cdaff44699c
    darwin-x64:   2b5fef6b6120abea3eb11919e20eccd2c53670d39672e2ed3fc5aee78429c3d5
    win32-x64:    8075e4758bd45119a1cba9eb897d73c33206185c29f10e61ba100468be5ac64a
    linux-x64:    9adfe0dad79bc55812a936f9075666e162e571fa011f8416f24ab3212d7e7d46
    ```
  - 네트워크 확인 명령 예:
    ```bash
    curl -s https://api.github.com/repos/ggml-org/llama.cpp/releases/tags/b5620
    curl -I https://github.com/ggml-org/llama.cpp/releases/download/b5620/llama-b5620-bin-macos-arm64.zip
    curl -I https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q8_0.gguf
    ```

- [ ] **R1: 타입과 설정의 최소 기반 추가**
  - `src/shared/types/index.ts`에 `AppSettings.llm.localLlm`과 `LlmRuntimeInfo.provider: "sidecar"`를 추가한다.
  - `src/main/manager/settingsManager.ts`에 `getLocalLlmSettings()`와 `setLocalLlmSettings()`를 추가한다.
  - `migrateLegacyLlmSettings()`가 `ollama`만 보고 조기 반환하는 현재 동작과 충돌하지 않는지 확인한다.
  - 검증:
    ```bash
    bun run typecheck
    ```
  - 진행 기록:
    - `tests/main/manager/settingsManager.localLlm.test.ts` 추가 완료
    - `SKIP_DB_TEST_SETUP=1 bun vitest tests/main/manager/settingsManager.localLlm.test.ts --run` 통과
    - `src/shared/types/index.ts`에 `localLlm`과 `provider: "sidecar"` 추가 완료
    - `src/main/manager/settingsManager.ts`에 `getLocalLlmSettings()` / `setLocalLlmSettings()` 추가 완료
    - `bun run typecheck`는 `src/renderer/src/features/workspace/components/layout/EditorRoot.tsx:493`의 기존 타입 오류로 실패. 이 오류는 local LLM 변경 파일 밖이다.

- [ ] **R2: 상수와 다운로드 계층 추가**
  - `src/main/services/llm/sidecarConstants.ts`를 만든다.
  - `LLAMA_BINARY_URLS`와 함께 `LLAMA_BINARY_SHA256S`를 추가한다.
  - `src/main/services/llm/modelDownloader.ts`를 만든다.
  - `downloadLlamaServerBinary()`는 zip 다운로드 후 SHA256 검증을 먼저 하고, 검증 성공 후에만 추출한다.
  - 검증 실패 시 `*.tmp`, zip 파일, 부분 추출 파일을 삭제한다.
  - 테스트 추가:
    - `tests/main/services/modelDownloader.test.ts`
    - SHA256 불일치 시 에러 발생 및 파일 정리 확인
    - 이미 바이너리가 있으면 재다운로드 생략 확인
  - 검증:
    ```bash
    SKIP_DB_TEST_SETUP=1 bun vitest tests/main/services/modelDownloader.test.ts --run
    ```
  - 진행 기록:
    - `src/main/services/llm/sidecarConstants.ts` 추가 완료
    - `src/main/services/llm/modelDownloader.ts` 추가 완료
    - `tests/main/services/modelDownloader.test.ts` 추가 완료
    - SHA256 불일치 시 zip/tmp/부분 바이너리 정리 테스트 통과
    - 기존 바이너리가 있으면 fetch 없이 경로 반환 테스트 통과
    - macOS arm64 zip은 `build/bin/llama-server`와 `build/bin/*.dylib` 구조임을 실제 zip 목록으로 확인
    - 단일 바이너리만 추출하면 `libmtmd.dylib` 누락으로 실행 실패함을 확인
    - `build/bin/*` 런타임 파일을 `destDir`로 함께 추출하도록 수정 완료
    - sibling runtime library 추출 테스트 통과
    - `extractRuntimeFilesFromZip()` 종료 후 `binaryPath` null 가드 추가로 `Promise<string>` 타입 보장
    - `DEFAULT_MODEL.sha256` 추가 및 `downloadGguf()` SHA256 검증(불일치 시 파일 삭제) 구현 완료
    - GGUF 캐시 히트 시에도 SHA256 재검증 후 불일치 시 파일 삭제 + 재다운로드하도록 보강 완료
    - `sha256File()` chunk 캐스팅을 `Uint8Array`로 정정 완료
    - `MODEL_DOWNLOAD_START` 경로에서 `downloadGguf(expectedSha256)`로 무결성 검증 연결 완료
    - `downloadToFile()`/`waitForHealth()`의 의도적 순차 루프에 `no-await-in-loop` 예외 주석 반영 완료
    - `tests/main/services/modelDownloader.test.ts`에 "캐시 손상 시 재다운로드" 테스트 추가 및 통과
    - `SKIP_DB_TEST_SETUP=1 bun vitest tests/main/services/modelDownloader.test.ts --run` 통과
    - `bun run typecheck`는 `src/renderer/src/features/workspace/components/layout/EditorRoot.tsx:493`의 기존 타입 오류로 실패. 이 오류는 local LLM 변경 파일 밖이다.

- [ ] **R3: sidecar 프로세스 관리자 추가**
  - `src/main/services/llm/sidecarManager.ts`를 만든다.
  - `ensureStarted()` 동시 호출은 하나의 promise로 합류시킨다.
  - 같은 모델이 이미 실행 중이면 기존 baseUrl을 재사용한다.
  - 다른 모델 요청 시 기존 프로세스를 종료한 뒤 새로 시작한다.
  - health check 실패 시 프로세스를 종료하고 fallback 가능하도록 에러를 던진다.
  - 테스트 추가:
    - `tests/main/services/sidecarManager.test.ts`
    - spawn 인자 검증
    - 중복 start 방지
    - stop 시 SIGTERM 후 필요하면 SIGKILL
  - 검증:
    ```bash
    SKIP_DB_TEST_SETUP=1 bun vitest tests/main/services/sidecarManager.test.ts --run
    ```
  - 진행 기록:
    - `src/main/services/llm/sidecarManager.ts` 추가 완료
    - `tests/main/services/sidecarManager.test.ts` 추가 완료
    - spawn stdio를 `["ignore", "ignore", "pipe"]`로 변경해 stdout backpressure 교착 가능성 제거
    - spawn 인자 검증 테스트 통과
    - 중복 `ensureStarted()` 호출이 하나의 spawn으로 합류하는 테스트 통과
    - `SKIP_DB_TEST_SETUP=1 bun vitest tests/main/services/sidecarManager.test.ts --run` 통과

- [ ] **R4: modelRuntimeFactory 통합**
  - `src/main/services/llm/modelRuntimeFactory.ts`에 `sidecar` kind를 추가한다.
  - `resolveRuntime()`에서 `localLlm.enabled && modelPath && binaryPath`일 때 sidecar를 0순위로 시도한다.
  - sidecar 시작 실패 시 warn 로그 후 기존 Gemini/OpenAI/Ollama/deterministic 경로로 fallback한다.
  - sidecar provider cache는 Ollama용 `externalApiProviderSingle`과 분리한다.
  - 기존 `tests/main/services/modelRuntimeFactory.llamaserver.test.ts`는 `modelRuntimeFactory.sidecar.test.ts`로 교체한다.
  - 테스트 케이스:
    - localLlm 활성화 시 sidecar provider 반환
    - sidecar 시작 실패 시 Ollama 설정으로 fallback
    - sidecar cache와 Ollama cache가 서로 오염되지 않음
  - 검증:
    ```bash
    SKIP_DB_TEST_SETUP=1 bun vitest tests/main/services/modelRuntimeFactory.sidecar.test.ts --run
    ```
  - 진행 기록:
    - 기존 `tests/main/services/modelRuntimeFactory.llamaserver.test.ts` 삭제 완료
    - `tests/main/services/modelRuntimeFactory.sidecar.test.ts` 추가 완료
    - `src/main/services/llm/modelRuntimeFactory.ts`에 `sidecar` runtime kind 추가 완료
    - sidecar provider cache를 Ollama/OpenAI/Gemini cache와 분리 완료
    - localLlm 활성화 시 sidecar가 Ollama보다 먼저 사용되는 테스트 통과
    - sidecar 시작 실패 시 Ollama로 fallback하는 테스트 통과
    - `SKIP_DB_TEST_SETUP=1 bun vitest tests/main/services/modelRuntimeFactory.sidecar.test.ts --run` 통과

- [ ] **R5: IPC와 preload API 추가**
  - `src/shared/ipc/channels.ts`에 `SIDECAR_STATUS`, `SIDECAR_STOP`, `MODEL_DOWNLOAD_START`, `MODEL_DOWNLOAD_CANCEL`, `MODEL_DOWNLOAD_PROGRESS`, `SETTINGS_SET_LOCAL_LLM`, `SETTINGS_GET_LOCAL_LLM`을 추가한다.
  - `src/shared/schemas/index.ts`에 `settingsLocalLlmSchema`를 추가한다.
  - `src/main/handler/system/ipcSettingsHandlers.ts`에 local LLM 설정, 다운로드, sidecar status/stop 핸들러를 추가한다.
  - `src/shared/api/index.ts`와 `src/preload/api/systemApi.ts`에 renderer API를 노출한다.
  - `onModelDownloadProgress()`는 `removeAllListeners`가 아니라 `removeListener(channel, listener)`로 해제한다.
  - 검증:
    ```bash
    bun run typecheck
    ```
  - 진행 기록:
    - `src/shared/ipc/channels.ts`에 sidecar/model download/local LLM 채널 추가 완료
    - `src/shared/schemas/index.ts`에 `settingsLocalLlmSchema` 추가 완료
    - `src/main/handler/system/ipcSettingsHandlers.ts`에 local LLM 설정, sidecar status/stop, 모델 다운로드 start/cancel 핸들러 추가 완료
    - `MODEL_DOWNLOAD_START`의 `type: "model" | "binary"` 분기를 실제 로직에 반영(요청 타입만 다운로드) 완료
    - `src/shared/api/index.ts`에 renderer settings API 타입 추가 완료
    - `src/preload/api/systemApi.ts`에 `safeInvoke` 기반 API와 `removeListener` 기반 progress unsubscribe 추가 완료
    - `SKIP_DB_TEST_SETUP=1 bun vitest tests/main/manager/settingsManager.localLlm.test.ts tests/main/services/modelDownloader.test.ts tests/main/services/sidecarManager.test.ts tests/main/services/modelRuntimeFactory.sidecar.test.ts --run` 통과
    - `bun run typecheck`는 `src/renderer/src/features/workspace/components/layout/EditorRoot.tsx:493`의 기존 타입 오류로 실패. 이 오류는 local LLM 변경 파일 밖이다.

- [ ] **R6: 설정 UI 추가**
  - `src/renderer/src/features/settings/hooks/useSettingsModel.ts`에 local LLM 상태와 다운로드 진행 상태를 추가한다.
  - `src/renderer/src/features/settings/components/tabs/ModelTab.tsx`에 Ollama 섹션 아래 local LLM 섹션을 추가한다.
  - `src/renderer/src/features/settings/components/SettingsModal.tsx`에서 새 props를 전달한다.
  - `src/renderer/src/i18n/locales/ko/base.ts`, `en/base.ts`, `ja/base.ts`에 `settings.localLlm.*` 키를 추가한다.
  - 검증:
    ```bash
    bun run typecheck
    ```
  - 진행 기록:
    - `src/renderer/src/i18n/locales/ko/base.ts`, `en/base.ts`, `ja/base.ts`에 `settings.localLlm.*` 키 추가 완료
    - `src/renderer/src/features/settings/hooks/useSettingsModel.ts`에 local LLM 상태, 다운로드 진행 구독, 다운로드 시작, 토글 저장 핸들러 추가 완료
    - `src/renderer/src/features/settings/components/tabs/ModelTab.tsx`에 local LLM 섹션 추가 완료
    - `src/renderer/src/features/settings/components/SettingsModal.tsx`에서 새 props 전달 완료
    - `bun run typecheck`는 `src/renderer/src/features/workspace/components/layout/EditorRoot.tsx:491`의 기존 타입 오류로 실패. 이 오류는 local LLM 변경 파일 밖이다.

- [ ] **R7: 앱 종료 정리 통합**
  - `src/main/lifecycle/shutdown.ts`의 기존 quit cleanup 흐름에 sidecar stop을 추가한다.
  - `src/main/index.ts`에는 별도의 sidecar용 `before-quit` 핸들러를 추가하지 않는다.
  - sidecar stop 실패는 로그만 남기고 앱 종료를 막지 않는다.
  - 검증:
    ```bash
    bun run typecheck
    ```
  - 진행 기록:
    - `src/main/lifecycle/shutdown.ts`의 기존 quit finalize 흐름에 sidecar stop 추가 완료
    - `src/main/index.ts`에는 sidecar용 별도 `before-quit` 핸들러를 추가하지 않음
    - sidecar stop 실패 시 warn 로그만 남기고 종료 흐름을 계속하도록 구현
    - `SKIP_DB_TEST_SETUP=1 bun vitest tests/main/manager/settingsManager.localLlm.test.ts tests/main/services/modelDownloader.test.ts tests/main/services/sidecarManager.test.ts tests/main/services/modelRuntimeFactory.sidecar.test.ts --run` 통과
    - `bun run typecheck`는 `src/renderer/src/features/workspace/components/layout/EditorRoot.tsx:491`의 기존 타입 오류로 실패. 이 오류는 local LLM 변경 파일 밖이다.

- [ ] **R8: 수동 통합 검증**
  - macOS arm64에서 바이너리 다운로드 성공 확인
  - 설정 탭에서 다운로드 진행바 확인
  - 다운로드 완료 후 local LLM 토글 활성화 확인
  - RAG QA 실행 시 `resolveRuntimeModelInfo()`가 `sidecar / llama-server`를 반환하는지 확인
  - Activity Monitor 또는 `ps`로 `llama-server`가 Luie와 별도 PID인지 확인
  - 앱 종료 시 `llama-server`가 종료되는지 확인
  - sidecar 바이너리 경로를 잘못 설정했을 때 Ollama 또는 deterministic fallback이 동작하는지 확인
  - 진행 기록:
    - macOS arm64 `llama-b5620-bin-macos-arm64.zip` 다운로드, SHA256 검증, 추출 성공
    - 처음에는 `llama-server` 단일 파일만 추출해 `libmtmd.dylib` 누락 실행 실패를 확인
    - `build/bin/*` 전체 추출로 수정 후 `/tmp/.../llama-server --help` 실행 성공
    - 1.9GB GGUF 모델 다운로드와 실제 RAG QA 실행은 아직 수행하지 않음

### 보류하거나 재검토할 사항

- `HIGH_PERF_MODEL`은 이번 범위에서 UI에 노출하지 않는다. 기본 모델 다운로드/실행이 안정화된 뒤 별도 작업으로 다룬다.
- embedding endpoint는 이번 계획에서 강제하지 않는다. `resolveRuntimeModelConfig()`는 sidecar일 때 `embeddingModel: null`로 두어 기존 embedding graceful skip 흐름을 유지한다.
- Windows/Linux 실행 검증은 URL/SHA256 상수는 넣되, 실제 수동 검증은 별도 환경에서 진행한다.

---

## File Map

| 파일 | 역할 | 상태 |
|------|------|------|
| `src/main/services/llm/sidecarManager.ts` | llama-server 프로세스 spawn/kill/health | 신규 |
| `src/main/services/llm/modelDownloader.ts` | 바이너리 + GGUF 다운로드, 진행률 emit | 신규 |
| `src/main/services/llm/sidecarConstants.ts` | 플랫폼 바이너리 URL, 기본 모델 상수 | 신규 |
| `src/main/services/llm/modelRuntimeFactory.ts` | `sidecar` kind 추가, 우선순위 0번, 캐시 분리 | 수정 |
| `src/main/manager/settingsManager.ts` | `localLlm` 설정 추가 | 수정 |
| `src/shared/types/index.ts` | `AppSettings.localLlm` + `LlmRuntimeInfo.provider` 확장 | 수정 |
| `src/shared/api/index.ts` | `RendererApi.settings` 새 메서드 타입 추가 | 수정 |
| `src/shared/ipc/channels.ts` | `SIDECAR_*`, `MODEL_DOWNLOAD_*` 채널 | 수정 |
| `src/main/handler/system/ipcSettingsHandlers.ts` | 새 IPC 핸들러 등록 | 수정 |
| `src/preload/api/systemApi.ts` | `safeInvoke` 패턴으로 새 API 추가 | 수정 |
| `src/renderer/src/i18n/locales/ko/base.ts` | `settings.localLlm.*` 번역 키 추가 | 수정 |
| `src/renderer/src/i18n/locales/en/base.ts` | `settings.localLlm.*` 번역 키 추가 | 수정 |
| `src/renderer/src/i18n/locales/ja/base.ts` | `settings.localLlm.*` 번역 키 추가 | 수정 |
| `src/renderer/src/features/settings/components/tabs/ModelTab.tsx` | 로컬 LLM 섹션 추가 | 수정 |
| `src/renderer/src/features/settings/hooks/useSettingsModel.ts` | 로컬 LLM 상태/핸들러 | 수정 |
| `electron-builder.json` | 변경 없음 (바이너리는 userData에) | 확인만 |

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
  // CPU-only Windows x64 build (CUDA 없이도 동작)
  "win32-x64":    `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_BUILD}/llama-${LLAMA_CPP_BUILD}-bin-win-cpu-x64.zip`,
  "linux-x64":    `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_BUILD}/llama-${LLAMA_CPP_BUILD}-bin-ubuntu-x64.zip`,
};

/** 플랫폼별 llama.cpp release asset SHA256. GitHub release API의 digest 값 기준. */
export const LLAMA_BINARY_SHA256S: Record<string, string> = {
  "darwin-arm64": "aaaddc5f4a7ecf66ccb7501ed3a1980223c5bb72c17c9c2ffc3d8cdaff44699c",
  "darwin-x64": "2b5fef6b6120abea3eb11919e20eccd2c53670d39672e2ed3fc5aee78429c3d5",
  "win32-x64": "8075e4758bd45119a1cba9eb897d73c33206185c29f10e61ba100468be5ac64a",
  "linux-x64": "9adfe0dad79bc55812a936f9075666e162e571fa011f8416f24ab3212d7e7d46",
};

/** zip 안에서 실제 실행 바이너리 이름 */
export const LLAMA_SERVER_BINARY_IN_ZIP = "llama-server";

/** 기본 모델: Qwen2.5 1.5B Q8_0 (~1.9GB, Korean 준수) */
export const DEFAULT_MODEL = {
  repo: "Qwen/Qwen2.5-1.5B-Instruct-GGUF",
  filename: "qwen2.5-1.5b-instruct-q8_0.gguf",
  sizeBytes: 1_894_532_128,
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

- [ ] **Step 1: `AppSettings` + `LlmRuntimeInfo` 타입 수정**

`src/shared/types/index.ts`에서 두 곳 수정:

```typescript
// 1) AppSettings.llm 안에 localLlm 추가
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

// 2) LlmRuntimeInfo.provider에 "sidecar" 추가
// 기존: provider: "gemini" | "openai" | "ollama" | "deterministic";
// 변경:
export interface LlmRuntimeInfo {
  provider: "gemini" | "openai" | "ollama" | "sidecar" | "deterministic";
  model: string;
  alternativeModel?: string | null;
}
```

- [ ] **Step 2: `settingsManager.ts` — `getLocalLlmSettings` / `setLocalLlmSettings` 추가**

기존 `getLlmSettings()` 바로 아래에 추가:

```typescript
// 인라인 타입 사용 — getLlmSettings() 패턴과 동일
getLocalLlmSettings(): {
  enabled: boolean;
  modelPath?: string;
  binaryPath?: string;
  gpuLayers?: number;
  contextSize?: number;
} | undefined {
  const llm = this.store.get("llm") ?? {};
  return (llm as { localLlm?: { enabled: boolean; modelPath?: string; binaryPath?: string; gpuLayers?: number; contextSize?: number } }).localLlm;
}

setLocalLlmSettings(settings: {
  enabled: boolean;
  modelPath?: string;
  binaryPath?: string;
  gpuLayers?: number;
  contextSize?: number;
}): void {
  const current = this.store.get("llm") ?? {};
  const next = { ...current, localLlm: settings };
  this.store.set("llm", next);
  // this.logger 아님 — 기존 파일은 모듈 레벨 logger 변수 사용
  logger.info("Local LLM settings updated", {
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

> **Note:** `yauzl` (v3.2.0)은 이미 `package.json`에 있음 — `bun add` 불필요.
> 다운로드 패턴은 기존 `appUpdateDownload.ts`의 `fsp.open` → `reader.read()` 루프 → `fsp.rename` 방식과 동일.

- [ ] **Step 1: 파일 생성**

```typescript
// src/main/services/llm/modelDownloader.ts
import * as fsp from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import yauzl from "yauzl";
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
 * fetch → fsp.open → reader.read() 루프 → fsp.rename 패턴.
 * appUpdateDownload.ts와 동일한 방식.
 */
async function downloadToFile(
  url: string,
  destPath: string,
  signal: AbortSignal | undefined,
  onProgress: (received: number, total: number) => void,
): Promise<void> {
  const tmpPath = `${destPath}.tmp`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  if (!res.body) throw new Error("Response body missing");

  const totalBytes = Number(res.headers.get("content-length") ?? "0");
  let receivedBytes = 0;

  const reader = res.body.getReader();
  let fileHandle: Awaited<ReturnType<typeof fsp.open>> | null = null;
  try {
    fileHandle = await fsp.open(tmpPath, "w");
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const chunk = Buffer.from(value);
      receivedBytes += chunk.length;
      await fileHandle.write(chunk);
      onProgress(receivedBytes, totalBytes);
    }
    await fileHandle.close();
    fileHandle = null;
    await fsp.rename(tmpPath, destPath);
  } catch (err) {
    if (fileHandle) await fileHandle.close().catch(() => {});
    await fsp.rm(tmpPath, { force: true }).catch(() => {});
    throw err;
  }
}

/**
 * yauzl로 zip에서 파일 하나 추출.
 * entryMatch: entry.fileName이 이 문자열로 끝나는 첫 항목 추출.
 */
async function extractOneFromZip(
  zipPath: string,
  entryMatch: string,
  destPath: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (openErr, zipfile) => {
      if (openErr) return reject(openErr);
      let found = false;

      zipfile.readEntry();

      zipfile.on("entry", (entry: yauzl.Entry) => {
        if (!found && (entry.fileName.endsWith(entryMatch) || entry.fileName === entryMatch)) {
          found = true;
          zipfile.openReadStream(entry, (streamErr, readStream) => {
            if (streamErr) return reject(streamErr);
            const writeStream = createWriteStream(destPath, { mode: 0o755 });
            readStream.on("error", reject);
            writeStream.on("error", reject);
            writeStream.on("finish", () => {
              zipfile.close();
              resolve();
            });
            readStream.pipe(writeStream);
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on("end", () => {
        if (!found) reject(new Error(`Entry matching '${entryMatch}' not found in zip`));
      });
      zipfile.on("error", reject);
    });
  });
}

/**
 * HuggingFace Hub에서 GGUF 파일 다운로드.
 * 이미 존재하면 건너뜀.
 */
export async function downloadGguf(input: {
  repo: string;       // e.g. "Qwen/Qwen2.5-1.5B-Instruct-GGUF"
  filename: string;   // e.g. "qwen2.5-1.5b-instruct-q8_0.gguf"
  destDir: string;    // 절대경로 디렉토리
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
}): Promise<string> {
  await fsp.mkdir(input.destDir, { recursive: true });

  const destPath = path.join(input.destDir, input.filename);
  try {
    await fsp.access(destPath);
    logger.info("Model already exists, skipping download", { destPath });
    input.onProgress?.({ phase: "done", pct: 100, receivedBytes: 0, totalBytes: 0 });
    return destPath;
  } catch { /* 없음 → 다운로드 */ }

  const url = `https://huggingface.co/${input.repo}/resolve/main/${input.filename}`;
  logger.info("Downloading model", { url });

  await downloadToFile(url, destPath, input.signal, (received, total) => {
    const pct = total > 0 ? Math.floor((received / total) * 100) : 0;
    input.onProgress?.({ phase: "downloading", pct, receivedBytes: received, totalBytes: total });
  });

  input.onProgress?.({ phase: "done", pct: 100, receivedBytes: 0, totalBytes: 0 });
  logger.info("Model download complete", { destPath });
  return destPath;
}

/**
 * llama.cpp GitHub Releases zip 다운로드 후 llama-server 바이너리 추출.
 * 이미 존재하면 건너뜀.
 */
export async function downloadLlamaServerBinary(input: {
  zipUrl: string;
  destDir: string;
  binaryNameInZip: string; // 확장자 없음 (e.g. "llama-server")
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
}): Promise<string> {
  await fsp.mkdir(input.destDir, { recursive: true });

  const binaryName = process.platform === "win32"
    ? `${input.binaryNameInZip}.exe`
    : input.binaryNameInZip;
  const destBinaryPath = path.join(input.destDir, binaryName);

  try {
    await fsp.access(destBinaryPath);
    logger.info("Binary already exists, skipping download", { destBinaryPath });
    input.onProgress?.({ phase: "done", pct: 100, receivedBytes: 0, totalBytes: 0 });
    return destBinaryPath;
  } catch { /* 없음 → 다운로드 */ }

  const zipPath = path.join(input.destDir, "llama-server.zip");
  logger.info("Downloading llama-server zip", { url: input.zipUrl });

  try {
    await downloadToFile(input.zipUrl, zipPath, input.signal, (received, total) => {
      const pct = total > 0 ? Math.floor((received / total) * 100) : 0;
      input.onProgress?.({ phase: "downloading", pct, receivedBytes: received, totalBytes: total });
    });

    input.onProgress?.({ phase: "extracting", pct: 0, receivedBytes: 0, totalBytes: 0 });
    await extractOneFromZip(zipPath, binaryName, destBinaryPath);
    await fsp.rm(zipPath, { force: true }).catch(() => {});

    input.onProgress?.({ phase: "done", pct: 100, receivedBytes: 0, totalBytes: 0 });
    logger.info("Binary extraction complete", { destBinaryPath });
    return destBinaryPath;
  } catch (err) {
    await fsp.rm(zipPath, { force: true }).catch(() => {});
    throw err;
  }
}
```

- [ ] **Step 2: 커밋**

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
  // 동시 ensureStarted 호출 보호 — 이미 시작 중이면 같은 Promise 반환
  private startingPromise: Promise<string> | null = null;

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

  /** llama-server 시작. 이미 실행 중이면 baseUrl 반환. 동시 호출 시 하나의 Promise로 합류. */
  async ensureStarted(binaryPath: string, modelPath: string, options?: {
    gpuLayers?: number;
    contextSize?: number;
    signal?: AbortSignal;
  }): Promise<string> {
    if (this.state.status === "running" && this.state.modelPath === modelPath) {
      this.resetIdleTimer();
      return `http://127.0.0.1:${this.state.port}`;
    }
    // 이미 시작 중이면 그 Promise 반환 (중복 spawn 방지)
    if (this.startingPromise) return this.startingPromise;

    this.startingPromise = this._doStart(binaryPath, modelPath, options).finally(() => {
      this.startingPromise = null;
    });
    return this.startingPromise;
  }

  private async _doStart(binaryPath: string, modelPath: string, options?: {
    gpuLayers?: number;
    contextSize?: number;
    signal?: AbortSignal;
  }): Promise<string> {
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

    // 헬스체크 폴링 — 실패 시 프로세스 강제 종료
    try {
      await this.waitForHealth(port, options?.signal);
    } catch (err) {
      await this.stop();  // state = stopped, proc killed
      throw err;
    }

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

- [ ] **Step 1: `ResolvedRuntime`에 `sidecar` kind 추가 + 캐시 변수 추가**

파일 상단 import 추가:
```typescript
import { sidecarManager } from "./sidecarManager.js";
```

> **주의:** 기존 파일은 `settingsManager`를 `loadSettingsManager()` lazy dynamic import로 사용.
> 정적 import 추가하지 말 것. `resolveRuntime()` 안에서 `await loadSettingsManager()`로 호출.

기존 캐시 변수들 아래에 sidecar 전용 캐시 추가:
```typescript
// 기존
let externalApiProviderSingle: { key: string; provider: ExternalApiProvider } | null = null;
// 추가 — Ollama 캐시와 분리 (baseUrl이 동적이므로 key 충돌 방지)
let sidecarProviderSingle: { key: string; provider: ExternalApiProvider } | null = null;
```

`invalidateModelRuntimeCache()` 수정:
```typescript
export function invalidateModelRuntimeCache(): void {
  externalApiProviderSingle = null;
  openAiProviderSingle = null;
  geminiProviderSingle = null;
  sidecarProviderSingle = null;  // 추가
}
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
  // 0순위: 로컬 LLM sidecar — 기존 loadSettingsManager() 패턴 사용
  const settingsManager = await loadSettingsManager();
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

  // 기존 로직 유지 (아래는 기존 코드 그대로)
  const geminiConfig = loadEnvGeminiConfig();
  if (geminiConfig) {
    return { kind: "gemini", config: geminiConfig };
  }
  const openAiConfig = loadEnvOpenAiConfig();
  if (openAiConfig) {
    return { kind: "openai", config: openAiConfig };
  }
  const ollamaConfig = await loadOllamaConfig();
  if (ollamaConfig) {
    return { kind: "ollama", config: ollamaConfig };
  }
  return { kind: "deterministic" };
}
```

- [ ] **Step 3: `resolveModelRuntimeClient()`에 sidecar 처리 추가**

```typescript
export async function resolveModelRuntimeClient(
  projectId: string,
): Promise<ModelRuntimeClient> {
  const resolved = await resolveRuntime();

  // 추가 — sidecarProviderSingle 사용 (externalApiProviderSingle와 분리)
  if (resolved.kind === "sidecar") {
    logger.info("Using local LLM sidecar", { projectId, baseUrl: resolved.config.baseUrl });
    const key = resolved.config.baseUrl;
    if (sidecarProviderSingle?.key === key) return sidecarProviderSingle.provider;
    const provider = new ExternalApiProvider({
      baseUrl: resolved.config.baseUrl,
      chatModel: "local",  // llama-server는 모델 이름 무관
      apiKey: "no-key",
    });
    sidecarProviderSingle = { key, provider };
    return provider;
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
  return { provider: "sidecar", model: "llama-server", alternativeModel: null };
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
// SIDECAR_START 없음 — sidecar는 resolveRuntime()에서 자동 시작됨
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
// 파일 상단 import 추가
import { BrowserWindow } from "electron";  // BrowserWindow.getAllWindows() 용
import { sidecarManager } from "../../services/llm/sidecarManager.js";
import {
  downloadGguf,
  downloadLlamaServerBinary,
} from "../../services/llm/modelDownloader.js";
import {
  LLAMA_BINARY_URLS,
  LLAMA_SERVER_BINARY_IN_ZIP,
  DEFAULT_MODEL,
} from "../../services/llm/sidecarConstants.js";

// src/shared/schemas/index.ts에 추가할 Zod 스키마:
// export const settingsLocalLlmSchema = z.tuple([z.object({
//   enabled: z.boolean(),
//   modelPath: z.string().optional(),
//   binaryPath: z.string().optional(),
//   gpuLayers: z.number().int().optional(),
//   contextSize: z.number().int().positive().optional(),
// })]);

// 진행 중인 다운로드 AbortController (모듈 레벨)
let activeDownloadAbort: AbortController | null = null;

// 기존 registerIpcHandlers 배열에 추가:
{
  channel: IPC_CHANNELS.SETTINGS_GET_LOCAL_LLM,
  logTag: "SETTINGS_GET_LOCAL_LLM",
  failMessage: "Failed to get local LLM settings",
  handler: async () => {
    const sm = await loadSettingsManager();  // 기존 lazy loader 사용
    const s = sm.getLocalLlmSettings();
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
  argsSchema: z.tuple([z.object({
    enabled: z.boolean(),
    modelPath: z.string().optional(),
    binaryPath: z.string().optional(),
    gpuLayers: z.number().int().optional(),
    contextSize: z.number().int().positive().optional(),
  })]),
  handler: async (input: {
    enabled: boolean;
    modelPath?: string;
    binaryPath?: string;
    gpuLayers?: number;
    contextSize?: number;
  }) => {
    const sm = await loadSettingsManager();
    sm.setLocalLlmSettings(input);
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
  handler: async () => {
    if (activeDownloadAbort) activeDownloadAbort.abort();
    activeDownloadAbort = new AbortController();
    const { signal } = activeDownloadAbort;

    const platform = `${process.platform}-${process.arch}`;
    const binUrl = LLAMA_BINARY_URLS[platform];
    if (!binUrl) throw new Error(`지원하지 않는 플랫폼: ${platform}`);

    /**
     * stage: "binary" | "model" | "complete" | "error"
     * DownloadProgress.phase와 분리 — stage 필드를 별도로 유지해서 충돌 방지.
     * (spread로 덮어쓰지 않도록 stage를 마지막에 배치)
     */
    const emitProgress = (
      stage: "binary" | "model" | "complete" | "error",
      pct: number,
      error?: string,
    ) => {
      const wins = BrowserWindow.getAllWindows();
      wins.forEach((w) => {
        if (!w.isDestroyed()) {
          w.webContents.send(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, { stage, pct, error });
        }
      });
    };

    void (async () => {
      try {
        const sm = await loadSettingsManager();

        // 반환값(절대경로) 직접 사용 — 수동 경로 조합 불필요
        const binPath = await downloadLlamaServerBinary({
          zipUrl: binUrl,
          destDir: sidecarManager.getBinDir(),
          binaryNameInZip: LLAMA_SERVER_BINARY_IN_ZIP,
          signal,
          onProgress: (p) => emitProgress("binary", p.pct),
        });

        const modelPath = await downloadGguf({
          repo: DEFAULT_MODEL.repo,
          filename: DEFAULT_MODEL.filename,
          destDir: sidecarManager.getModelsDir(),
          signal,
          onProgress: (p) => emitProgress("model", p.pct),
        });

        sm.setLocalLlmSettings({ enabled: true, binaryPath: binPath, modelPath });
        invalidateModelRuntimeCache();
        emitProgress("complete", 100);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        emitProgress("error", 0, msg);
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

## Task 7: Preload API 노출 + RendererApi 타입

**Files:**
- Modify: `src/shared/api/index.ts` (RendererApi.settings 타입 확장)
- Modify: `src/preload/api/systemApi.ts` (safeInvoke 패턴으로 구현)

> **중요:** 기존 코드는 `ipcRenderer.invoke` 직접 사용 안 함.
> 항상 `safeInvoke(channel, arg?)` 또는 `safeInvokeCore("log.label", channel, arg?)` 사용.
> 이벤트 해제는 `removeAllListeners` 아님 — `removeListener(channel, listener)`.

- [ ] **Step 1: `src/shared/api/index.ts` — RendererApi settings 타입에 추가**

`RendererApi` 타입의 `settings` 객체에 아래 메서드 추가:

```typescript
// 기존 reset: () => ... 아래에 추가
getLocalLlmSettings: () => Promise<IPCResponse<{
  enabled?: boolean;
  modelPath?: string;
  binaryPath?: string;
  gpuLayers?: number;
  contextSize?: number;
  sidecarRunning: boolean;
  sidecarBaseUrl: string | null;
}>>;
setLocalLlmSettings: (input: {
  enabled: boolean;
  modelPath?: string;
  binaryPath?: string;
  gpuLayers?: number;
  contextSize?: number;
}) => Promise<IPCResponse<{ ok: boolean }>>;
getSidecarStatus: () => Promise<IPCResponse<{ running: boolean; baseUrl: string | null }>>;
stopSidecar: () => Promise<IPCResponse<{ ok: boolean }>>;
startModelDownload: (input: { type: "model" | "binary" }) => Promise<IPCResponse<{ ok: boolean }>>;
cancelModelDownload: () => Promise<IPCResponse<{ ok: boolean }>>;
onModelDownloadProgress: (callback: (progress: {
  stage: "binary" | "model" | "complete" | "error";  // Task 6 emitProgress의 stage 필드
  pct: number;
  error?: string;
}) => void) => () => void;
```

- [ ] **Step 2: `src/preload/api/systemApi.ts` — settings 객체에 추가**

기존 `settings` 객체의 `reset: () => safeInvoke(...)` 줄 바로 뒤에 추가:

```typescript
getLocalLlmSettings: () =>
  safeInvoke(IPC_CHANNELS.SETTINGS_GET_LOCAL_LLM),
setLocalLlmSettings: (input) =>
  safeInvoke(IPC_CHANNELS.SETTINGS_SET_LOCAL_LLM, input),
getSidecarStatus: () =>
  safeInvoke(IPC_CHANNELS.SIDECAR_STATUS),
stopSidecar: () =>
  safeInvoke(IPC_CHANNELS.SIDECAR_STOP),
startModelDownload: (input) =>
  safeInvoke(IPC_CHANNELS.MODEL_DOWNLOAD_START, input),
cancelModelDownload: () =>
  safeInvoke(IPC_CHANNELS.MODEL_DOWNLOAD_CANCEL),
onModelDownloadProgress: (callback) => {
  const listener = (_event: unknown, data: {
    stage: "binary" | "model" | "complete" | "error"; pct: number; error?: string;
  }) => callback(data);
  ipcRenderer.on(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, listener);
  return () => ipcRenderer.removeListener(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, listener);
},
```

- [ ] **Step 3: 커밋**

```bash
git add src/shared/api/index.ts src/preload/api/systemApi.ts
git commit -m "feat(preload): expose sidecar and model download APIs to renderer"
```

---

## Task 8: ModelTab UI — 로컬 LLM 섹션

**Files:**
- Modify: `src/renderer/src/i18n/locales/ko/base.ts`
- Modify: `src/renderer/src/i18n/locales/en/base.ts`
- Modify: `src/renderer/src/i18n/locales/ja/base.ts`
- Modify: `src/renderer/src/features/settings/components/tabs/ModelTab.tsx`
- Modify: `src/renderer/src/features/settings/hooks/useSettingsModel.ts`

> **i18n 패턴 주의:** 기존 `ModelTab`은 `t: _t` (미사용)로 받음. 올바른 방법은
> locale 파일에 키 추가 후 컴포넌트에서 `t("settings.localLlm.title")` 형태로 사용.
> `t("key", "fallback")` 인라인 fallback 쓰지 말 것.

- [ ] **Step 1: 번역 키 추가 — ko/base.ts**

`settings` 객체 안에 (기존 `sync:` 섹션 등 아래) 추가:

```typescript
// src/renderer/src/i18n/locales/ko/base.ts
// settings 객체 안에 추가
localLlm: {
  title: "로컬 AI (오프라인)",
  desc: "인터넷 없이 AI를 사용합니다. 최초 1회 모델 다운로드 필요 (~1.6GB).",
  modelReady: "모델 준비됨",
  noModel: "Qwen2.5 1.5B 모델이 없습니다. 아래 버튼으로 다운로드하세요.",
  download: "AI 모델 다운로드 (~1.6GB)",
  downloading: "다운로드 중...",
  downloadingBinary: "바이너리 다운로드 중",
  downloadingModel: "모델 다운로드 중",
},
```

- [ ] **Step 2: 번역 키 추가 — en/base.ts**

```typescript
// src/renderer/src/i18n/locales/en/base.ts
localLlm: {
  title: "Local AI (Offline)",
  desc: "Use AI without internet. Requires one-time model download (~1.6GB).",
  modelReady: "Model ready",
  noModel: "Qwen2.5 1.5B model not found. Download it below.",
  download: "Download AI model (~1.6GB)",
  downloading: "Downloading...",
  downloadingBinary: "Downloading binary",
  downloadingModel: "Downloading model",
},
```

- [ ] **Step 3: 번역 키 추가 — ja/base.ts**

```typescript
// src/renderer/src/i18n/locales/ja/base.ts
localLlm: {
  title: "ローカルAI（オフライン）",
  desc: "インターネットなしでAIを使用します。初回のみモデルのダウンロードが必要（約1.6GB）。",
  modelReady: "モデル準備完了",
  noModel: "Qwen2.5 1.5Bモデルが見つかりません。以下からダウンロードしてください。",
  download: "AIモデルをダウンロード（約1.6GB）",
  downloading: "ダウンロード中...",
  downloadingBinary: "バイナリをダウンロード中",
  downloadingModel: "モデルをダウンロード中",
},
```

- [ ] **Step 4: `useSettingsModel.ts`에 로컬 LLM 상태 추가**

```typescript
// 기존 ollamaBaseUrl 등 아래에 추가
const [localLlmEnabled, setLocalLlmEnabled] = useState(false);
const [localLlmModelPath, setLocalLlmModelPath] = useState<string | undefined>();
const [localLlmBinaryPath, setLocalLlmBinaryPath] = useState<string | undefined>();
const [downloadProgress, setDownloadProgress] = useState<{
  stage: "binary" | "model" | "complete" | "error"; pct: number; error?: string
} | null>(null);
const [isDownloading, setIsDownloading] = useState(false);

// 로드 시 초기화 (기존 loadSettings useEffect 안에 추가)
const local = res.data?.llm?.localLlm;
if (local) {
  setLocalLlmEnabled(local.enabled ?? false);
  setLocalLlmModelPath(local.modelPath);
  setLocalLlmBinaryPath(local.binaryPath);
}

// 다운로드 진행 구독 — api.settings.onModelDownloadProgress 사용
useEffect(() => {
  const unsubscribe = api.settings.onModelDownloadProgress((progress) => {
    setDownloadProgress(progress);
    if (progress.stage === "complete") {
      setIsDownloading(false);
      void api.settings.getLocalLlmSettings().then((res) => {
        if (res.success && res.data) {
          setLocalLlmEnabled(res.data.enabled ?? false);
          setLocalLlmModelPath(res.data.modelPath);
          setLocalLlmBinaryPath(res.data.binaryPath);
        }
      });
    }
    if (progress.stage === "error") setIsDownloading(false);
  });
  return unsubscribe;
}, []);

const handleDownloadLocalModel = useCallback(async () => {
  setIsDownloading(true);
  setDownloadProgress(null);
  await api.settings.startModelDownload({ type: "model" });
}, []);

const handleToggleLocalLlm = useCallback(async (enabled: boolean) => {
  setLocalLlmEnabled(enabled);
  await api.settings.setLocalLlmSettings({
    enabled,
    modelPath: localLlmModelPath,
    binaryPath: localLlmBinaryPath,
  });
}, [localLlmModelPath, localLlmBinaryPath]);

// 기존 return { ... } 에 추가:
// localLlmEnabled,
// localLlmModelPath,
// isDownloading,
// downloadProgress,
// handleDownloadLocalModel,
// handleToggleLocalLlm,
```

- [ ] **Step 5: `ModelTab.tsx`에 로컬 LLM 섹션 추가**

`ModelTabProps`에 추가:
```typescript
localLlmEnabled: boolean;
localLlmModelPath?: string;
isDownloading: boolean;
downloadProgress: { stage: "binary" | "model" | "complete" | "error"; pct: number; error?: string } | null;
onDownloadLocalModel: () => Promise<void>;
onToggleLocalLlm: (enabled: boolean) => Promise<void>;
```

함수 시그니처 destructuring에서 `t: _t` → `t` 로 변경 (기존 `_t`는 미사용이었음):
```typescript
// 변경 전
export function ModelTab({ t: _t, isBusy, ...rest }: ModelTabProps) {
// 변경 후
export function ModelTab({ t, isBusy, localLlmEnabled, localLlmModelPath, isDownloading,
  downloadProgress, onDownloadLocalModel, onToggleLocalLlm, ...rest }: ModelTabProps) {
```

`SettingsModal.tsx`에서 `ModelTab` 렌더링 위치에 새 props 전달 (line ~229):
```tsx
<ModelTab
  t={t}
  isBusy={settings.isBusy}
  onSaveOllamaConfig={settings.handleSaveOllamaConfig}
  onListOllamaModels={settings.handleListOllamaModels}
  onTestOllamaConnection={settings.handleTestOllamaConnection}
  onRebuildMemory={settings.handleRebuildMemory}
  initialBaseUrl={settings.ollamaBaseUrl}
  initialChatModel={settings.ollamaChatModel}
  initialEmbeddingModel={settings.ollamaEmbeddingModel}
  initialApiKey={settings.ollamaApiKey}
  {/* 추가 */}
  localLlmEnabled={settings.localLlmEnabled}
  localLlmModelPath={settings.localLlmModelPath}
  isDownloading={settings.isDownloading}
  downloadProgress={settings.downloadProgress}
  onDownloadLocalModel={settings.handleDownloadLocalModel}
  onToggleLocalLlm={settings.handleToggleLocalLlm}
/>
```

기존 Ollama 섹션 아래에 추가 (키 경로: `settings.localLlm.*`):

```tsx
{/* 로컬 LLM 섹션 */}
<div className="rounded-lg border border-border p-4 space-y-4">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-sm font-medium">{t("settings.localLlm.title")}</h3>
      <p className="text-xs text-fg-secondary mt-0.5">
        {t("settings.localLlm.desc")}
      </p>
    </div>
    {/* 토글 — 모델 있을 때만 활성화 */}
    <button
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        localLlmEnabled ? "bg-accent" : "bg-border"
      } ${!localLlmModelPath ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      onClick={() => localLlmModelPath && void onToggleLocalLlm(!localLlmEnabled)}
      disabled={!localLlmModelPath}
      aria-label={t("settings.localLlm.title")}
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
      <span>{t("settings.localLlm.modelReady")}</span>
    </div>
  ) : (
    <div className="space-y-2">
      <p className="text-xs text-fg-secondary">{t("settings.localLlm.noModel")}</p>

      {/* 다운로드 진행 바 */}
      {isDownloading && downloadProgress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-fg-secondary">
            <span>
              {downloadProgress.stage === "binary"
                ? t("settings.localLlm.downloadingBinary")
                : t("settings.localLlm.downloadingModel")}
            </span>
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
        onClick={() => void onDownloadLocalModel()}
        disabled={isDownloading || isBusy}
        className="w-full"
      >
        {isDownloading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />{t("settings.localLlm.downloading")}</>
        ) : (
          t("settings.localLlm.download")
        )}
      </Button>
    </div>
  )}
</div>
```

- [ ] **Step 6: 커밋**

```bash
git add src/renderer/src/i18n/locales/ko/base.ts \
        src/renderer/src/i18n/locales/en/base.ts \
        src/renderer/src/i18n/locales/ja/base.ts \
        src/renderer/src/features/settings/components/tabs/ModelTab.tsx \
        src/renderer/src/features/settings/hooks/useSettingsModel.ts \
        src/renderer/src/features/settings/components/SettingsModal.tsx
git commit -m "feat(ui): add local LLM section to ModelTab with i18n and download progress"
```

---

## Task 9: 앱 종료 시 sidecar 정리

**Files:**
- Modify: `src/main/index.ts` (또는 앱 초기화 파일)

- [ ] **Step 1: 앱 종료 이벤트에 sidecar.stop() 추가**

앱 진입점에서 `app.on('before-quit')` 또는 `app.on('will-quit')` 찾아서:

```typescript
import { sidecarManager } from "./services/llm/sidecarManager.js";

// void 사용 금지 — 앱 종료 전 llama-server 반드시 kill
app.on("before-quit", (event) => {
  if (sidecarManager.isRunning()) {
    event.preventDefault();  // 앱 종료 일시 중단
    void sidecarManager.stop().finally(() => {
      app.quit();  // stop 완료 후 재시도
    });
  }
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
