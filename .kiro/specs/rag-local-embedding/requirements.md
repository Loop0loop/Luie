# Requirements Document

## Introduction

RAG(Memory Engine)의 의미 검색 토대를 완성하기 위해 전용 로컬 임베딩 모델을 도입한다.
동시에 일반 사용자가 자신의 PC에 맞는 Local LLM을 쉽게 고르고 설치할 수 있도록
`llmfit` 바이너리를 통합한다. 현재 아키텍처는 llama-server sidecar(`ExternalApiProvider` over HTTP)이며,
임베딩 경로가 비어 있어 로컬 사용자는 의미 검색이 동작하지 않는다(FTS만). 이 스펙은 그 단절을
해소하고, 메모리 최적화·프로세스 격리·일반 사용자 UX를 함께 보장한다.

핵심 제약(사용자 요구):
1. 메모리 최적화 — 임베딩이 생성용 LLM을 핀(pin)하지 않게 분리.
2. 일반 사용자 전환성 — 비전문가도 명확한 UI/UX로 모델 선택/설치/전환 가능.
3. 프로세스 격리(SAP) — AI(node/sidecar) 프로세스가 죽어도 Electron 앱은 생존.
4. 하드웨어 맞춤 추천 — llmfit으로 사용자 PC에 맞는 모델 ~10개 추천.

## Glossary

- **임베딩 모델**: 텍스트 → 벡터 변환 전용 소형 GGUF (예: bge-m3, multilingual-e5).
- **생성 모델**: 채팅/요약용 LLM (현재 Qwen 계열, llama-server sidecar).
- **llmfit**: 하드웨어 감지 후 실행 가능 모델을 점수화하는 외부 Rust CLI/바이너리.
- **sidecar**: llama-server 자식 프로세스(현 아키텍처).
- **SAP**: AI 프로세스와 Electron 프로세스의 장애 격리(Separation of Availability/Process).
- **FTS**: SQLite FTS5 키워드 검색(현재 trigram 토크나이저).

## Requirements

### Requirement 1: 전용 로컬 임베딩 모델 도입

**User Story:** 작가로서, 클라우드 키 없이도 내 PC에서 의미 검색이 동작하길 원한다.

#### Acceptance Criteria
1. WHEN 로컬 임베딩 모델이 설치되어 있으면 THE 시스템 SHALL 청크 임베딩을 그 모델로 생성한다.
2. WHEN 임베딩 모델이 없으면 THE 시스템 SHALL 임베딩을 skip 하고 FTS(trigram) 검색으로 graceful degrade 하며 에러를 내지 않는다.
3. THE 임베딩 모델 SHALL 생성 모델과 독립적으로 로드/언로드되어 생성 모델의 메모리 상주를 강제하지 않는다.
4. WHEN 임베딩 모델 차원이 기존 저장 벡터와 다르면 THE 시스템 SHALL stale 벡터를 감지하고 재임베딩을 enqueue 한다.
5. THE 시스템 SHALL `MemoryEmbedding.model`에 임베딩 모델 식별자를 기록한다.

### Requirement 2: 프로세스 격리 및 복원력 (SAP)

**User Story:** 작가로서, AI가 멈춰도 글쓰기 앱은 계속 쓸 수 있길 원한다.

#### Acceptance Criteria
1. WHEN sidecar/임베딩 프로세스가 크래시하면 THE Electron 메인/렌더러 SHALL 영향 없이 계속 동작한다.
2. WHEN AI 프로세스가 죽으면 THE 시스템 SHALL 진행 중 임베딩/QA 잡을 실패 처리하고 안전하게 재시도 큐에 둔다.
3. THE 임베딩/검색 호출 SHALL AI 미가용 시 FTS 폴백으로 즉시 응답한다(블로킹 금지).
4. WHEN AI 프로세스가 비정상 종료하면 THE 시스템 SHALL 자동 재시작을 시도하되 백오프/횟수 제한으로 무한 루프를 방지한다.

### Requirement 3: 하드웨어 맞춤 모델 추천 (llmfit)

**User Story:** 비전문 작가로서, 내 컴퓨터에 맞는 모델을 추천받아 클릭 한 번으로 쓰고 싶다.

#### Acceptance Criteria
1. THE 시스템 SHALL `llmfit` 바이너리를 통해 하드웨어를 감지하고 실행 가능한 모델 추천을 JSON으로 받는다.
2. THE 메인 프로세스 SHALL llmfit JSON을 파싱해 렌더러로 상위 약 10개 추천만 전달한다.
3. THE 추천 UI SHALL 일반 사용자가 이해할 수 있는 표현(적합도/속도/메모리)으로 모델을 보여준다.
4. WHEN llmfit 바이너리가 없으면 THE 시스템 SHALL 명확한 안내와 함께 graceful degrade 한다(앱은 정상 동작).
5. THE 시스템 SHALL llmfit 실행을 격리하여 실패가 앱에 전파되지 않게 한다.

### Requirement 4: 명확한 모델 설치/전환 UX

**User Story:** 작가로서, 추천 목록에서 모델을 골라 설치하고 현재 모델을 전환하고 싶다.

#### Acceptance Criteria
1. WHEN 사용자가 추천 모델을 선택하면 THE 시스템 SHALL 다운로드 진행률을 표시하고 완료 시 설정에 경로를 기록한다.
2. THE 설정 UI SHALL 현재 생성/임베딩 모델 상태(설치됨/다운로드중/없음)를 명확히 표시한다.
3. WHEN 사용자가 모델을 전환하면 THE 시스템 SHALL sidecar를 안전하게 재시작하고 진행 중 작업을 중단/재개한다.
4. THE 임베딩 상태 SHALL 사용자에게 노출되어 "의미 검색 준비됨/준비중/비활성"을 알 수 있다.

### Requirement 5: 메모리 최적화

**User Story:** 작가로서, AI 때문에 앱이 느려지거나 RAM을 과점하지 않길 원한다.

#### Acceptance Criteria
1. WHEN 채팅을 사용하지 않고 백그라운드 임베딩만 도는 동안 THE 시스템 SHALL 생성 모델(대형)을 상주시키지 않는다.
2. THE 임베딩과 생성 모델 SHALL 독립적인 idle unload 타이머를 갖는다.
3. THE 임베딩 모델 SHALL 소형(권장 약 0.3~0.6GB)으로 선정한다.

### Requirement 6: llmfit 런타임 설치 (GitHub releases)

**User Story:** 사용자로서, 내 OS/아키텍처에 맞는 llmfit가 안전하게 설치되어 추천을 받을 수 있길 원한다.

#### Acceptance Criteria
1. THE 시스템 SHALL GitHub releases 의 최신(latest) 릴리스에서 현재 OS/아키텍처에 맞는 llmfit 자산을 선택한다.
2. THE 시스템 SHALL 다운로드한 아카이브(tar.gz/zip)를 추출하고 바이너리에 실행 권한(예: chmod 755)을 부여한다.
3. THE 시스템 SHALL 릴리스가 제공하는 SHA256(.sha256 자산 또는 asset digest)으로 무결성을 검증하고, 불일치 시 설치를 중단·정리한다.
4. THE llmfit 바이너리 SHALL userData 하위의 전용 경로에 설치되어 앱 권한 내에서 실행된다.
5. WHEN llmfit 설치가 실패하면 THE 시스템 SHALL graceful degrade 하며(추천 비활성) 앱 부팅을 막지 않는다.

### Requirement 7: 최초 부트스트랩 + 온보딩 흐름

**User Story:** 새 사용자로서, 첫 실행 시 Luie 가 무엇인지 이해하고 Local LLM/임베딩을 설치한 뒤 본 화면으로 진입하고 싶다.

#### Acceptance Criteria
1. WHEN 앱이 최초 실행(미완료 wizard)될 때 THE 시스템 SHALL 부트스트랩 단계에서 llmfit 설치를 시도한다.
2. THE 온보딩 SHALL 순서대로 (a) Luie 소개, (b) Local LLM/임베딩 모델 설치, (c) 완료 후 Main Window 진입을 제공한다.
3. THE 온보딩 SHALL 기존 startup wizard 인프라(`STARTUP_GET_READINESS`/`STARTUP_COMPLETE_WIZARD`, startup wizard window)를 재사용한다.
4. WHEN 사용자가 모델 설치를 건너뛰면 THE 시스템 SHALL FTS-only 로 동작하며 나중에 설정에서 설치할 수 있게 한다(비차단).
5. WHEN 온보딩이 완료되면 THE 시스템 SHALL Main Window 로 전환하고 완료 상태를 영속화한다.

## Out of Scope (후속 Phase)
- 인물관계/사건/복선 구조적 추출(P2-C).
- Graph 모드 실데이터 연결(Phase 3).
- 클러스터/원격 노드 추천(llmfit serve 분산).
