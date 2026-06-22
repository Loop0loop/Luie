# Superseded: Ollama 마이그레이션 플랜

## 현재 상태

사실: 이 문서는 로컬 LLM 실행 코드를 제거하고 Ollama HTTP API만 남기는 방향으로 작성된 과거 계획입니다.

사실: 현재 기준 아키텍처는 [Utility Process and LLM Runtime Architecture](../architecture/utility-process-llm-runtime.md)를 우선합니다.

사실: 현재 제품 정책은 앱이 관리하는 `sidecar`를 기본 로컬 런타임으로 두고, Ollama는 외부 설치/실행/모델 pull을 사용자가 이미 관리하는 경우에만 쓰는 advanced provider로 둡니다.

## 폐기된 결정

아래 과거 결정은 현재 아키텍처와 충돌하므로 실행 지침으로 사용하면 안 됩니다.

- 로컬 LLM 실행 코드를 전부 제거하고 Ollama HTTP API만 사용한다.
- `sidecarManager.ts`를 삭제한다.
- GGUF 모델/`llama-server` 경로 설정을 제거한다.
- 일반 사용자 기본 로컬 런타임을 Ollama로 둔다.

## 현재 결정

- Ollama는 계속 remote HTTP provider 후보로 남긴다.
- Ollama는 일반 사용자 기본 로컬 런타임이 아니다.
- local sidecar는 제거하지 않는다.
- sidecar 구현체가 현재 `llama-server`일 수는 있지만 UI/route/provider 명명에서는 `llama`가 아니라 `sidecar`로 다룬다.
- LLM 실행과 sidecar process ownership 검증은 utility process 아키텍처 문서를 따른다.
