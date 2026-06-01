# Implementation Plan

## Overview

전용 로컬 임베딩 모델 + llmfit 하드웨어 추천을 도입해 RAG 의미 검색을 로컬에서 동작시킨다.
기존 sidecar/utility-process 인프라를 재사용하고, 메모리 분리·프로세스 격리·일반 사용자 UX를 보장한다.
작업은 백엔드 토대(임베딩 sidecar) → llmfit → UI 순으로 진행한다.

## Tasks

- [x] 1. 임베딩 모델 카탈로그 + 다운로드 배선
- [x] 1.1 임베딩 모델 정의 추가 (`embeddingModelConstants.ts`)
  - bge-m3 GGUF repo/filename/sha256/dimension/displayName 확정 및 상수화
  - node-llama-server `--embeddings` 호환 모델인지 사전 확인 메모
  - _Requirements: 1.1, 5.3_
- [x] 1.2 임베딩 모델 다운로드 경로 (modelDownloader 재사용)
  - `downloadGguf` 재사용 + 동봉 경로 해석(`embeddingModelService.ensureModel/getStatus`)
  - _Requirements: 4.1_
- [x] 1.3 settingsManager 임베딩 경로 필드 배선
  - `getLlmSettings`/`setLlmSettings`에 `defaultEmbeddingModelPath`/`defaultEmbeddingModelId` 추가
  - _Requirements: 4.1, 4.2_

- [x] 2. 임베딩 전용 sidecar (메모리 분리 + 격리)
- [x] 2.1 `embeddingSidecarManager.ts` 작성
  - 독립 포트/프로세스/idle 타이머, `--embeddings --pooling mean` 기동
  - 스폰 실패/크래시 시 throw 금지(상태만 stopped) — P1/R2.1
  - _Requirements: 2.1, 5.1, 5.2_
- [x] 2.2 `resolveEmbeddingRuntimeClient(projectId)` 추가 (modelRuntimeFactory)
  - 클라우드 임베딩 우선 → 로컬 임베딩 sidecar → deterministic(null) 폴백
  - sidecar 임베딩 signature 반영(`resolveRuntimeModelConfig`)
  - _Requirements: 1.1, 1.3_
- [x] 2.3 utility `embedTexts` + searchService 쿼리 임베딩을 임베딩 런타임으로 전환
  - `embedTexts`/`searchByVector` → `resolveEmbeddingRuntimeClient`, 미가용 시 null
  - _Requirements: 1.2, 2.3_

- [x] 3. 자동 재시작 + 폴백 견고화 (R2)
- [x] 3.1 임베딩 sidecar lazy 재기동 + 백오프
  - `ensureStarted` 재기동, 연속 실패 백오프(1s→5s→30s)+최대횟수 쿨다운(embeddingSidecarManager)
  - _Requirements: 2.4_
- [x] 3.2 검색 폴백 불변식 테스트
  - 임베딩 null/예외 시 `searchChunks`가 FTS(+LIKE)만으로 결과 반환·무throw (P2)
  - _Requirements: 2.3_

- [x] 4. llmfit 통합 (하드웨어 맞춤 추천 + 런타임 설치)
- [x] 4.1 `llmfitService.ts` (1-shot CLI 실행 + JSON 파싱)
  - 바이너리 해석(env→userData/bin→PATH), `recommend --json --limit 10` 실행, 타임아웃/격리
  - zod 스키마 검증, 상위 ~10 정규화, 바이너리 없음/실패 시 `{available:false}` (P6/R3.4/3.5)
  - _Requirements: 3.1, 3.2, 3.4, 3.5_
- [x] 4.2 llmfit JSON 파서 단위 테스트
  - 정상/누락필드/깨진 JSON/빈 출력/바이너리 없음 케이스
  - _Requirements: 3.1, 3.2_
- [x] 4.3 IPC 채널 등록 (`LLMFIT_GET_RECOMMENDATIONS`)
  - channels.ts + preload + handler + shared 타입 동시 등록, zod argsSchema
  - _Requirements: 3.1, 3.2_
- [x] 4.4 `llmfitInstaller.ts` — GitHub releases 런타임 설치
  - `/releases/latest` 자산 조회, 플랫폼 매핑, tar.gz/zip 추출 → `<userData>/bin/llmfit[.exe]`
  - SHA256 검증(.sha256 또는 asset digest), POSIX chmod 0o755, 멱등(버전/해시 일치 skip)
  - 실패 시 throw 금지 `{installed:false,reason}` (P6/P7/R6)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
- [x] 4.5 llmfitInstaller 단위 테스트 (자산 선택/플랫폼 매핑/sha 파싱)
  - 플랫폼→자산 매핑, .sha256 파싱, digest 파싱, 미지원 플랫폼 처리
  - _Requirements: 6.1, 6.3_
- [x] 4.6 llmfit 설치 IPC (`LLMFIT_INSTALL`, `LLMFIT_STATUS`)
  - channels + preload + handler + shared 타입, 상태 노출
  - _Requirements: 6.1, 6.4_

- [x] 5. 모델 다운로드/상태 IPC (UX 백엔드)
- [x] 5.0 앱 동봉 배선 (사용자 결정: 설치 시 동봉)
  - electron-builder `resources/models` → `models` extraResources, `stage-embedding-model.mjs` prebuild, .gitignore
  - 상수↔스크립트↔빌더 정합성 테스트(embeddingModelConstants.test)
  - _Requirements: 4.1_
- [x] 5.1 `EMBEDDING_MODEL_DOWNLOAD` / `EMBEDDING_MODEL_STATUS` 채널
  - modelDownloader 진행률 스트리밍 재사용, 상태(없음/다운로드중/설치됨)
  - _Requirements: 4.1, 4.2, 4.4_
- [x] 5.2 모델 전환 시 sidecar 안전 재시작
  - 전환 시 진행 중 작업 중단→재시작→재개, 무한 루프 방지
  - _Requirements: 4.3_

- [x] 6. 렌더러 설정 UI
- [x] 6.1 하드웨어 추천 모델 섹션(카드 ~10)
  - 적합도 배지(완벽/좋음/빠듯)·예상 속도·필요 메모리, 일반 사용자 친화 표현
  - _Requirements: 3.3, 4.1_
- [x] 6.2 생성/임베딩 모델 상태 카드 + 의미 검색 게이트
  - 설치됨/다운로드중/없음, "의미 검색 준비됨/준비중/비활성" 인디케이터
  - _Requirements: 4.2, 4.4_

- [x] 8. 부트스트랩 + 온보딩 (llmfit 설치 → 소개 → 모델 설치 → Main)
- [x] 8.1 부트스트랩에서 llmfit 설치 트리거 (비차단)
  - 앱 최초 실행 부트스트랩 단계에서 `llmfitInstaller.ensureInstalled()` 호출, 실패해도 진행
  - _Requirements: 6.5, 7.1_
- [x] 8.2 온보딩 wizard 단계 UI (Luie 소개 → Local LLM/임베딩 설치 → 완료)
  - 기존 startup wizard window/route 재사용, 6.x 컴포넌트 재사용, 건너뛰기 허용
  - _Requirements: 7.2, 7.3, 7.4_
- [x] 8.3 온보딩 완료 → Main Window 전환 + 완료 상태 영속화
  - `STARTUP_COMPLETE_WIZARD` 연동, completedAt 기록 후 Main 진입
  - _Requirements: 7.5_

- [x] 7. 통합 검증
- [x] 7.1 격리/폴백 수동 검증 시나리오 문서화 + 자동화 가능분 테스트
  - AI 프로세스 강제 종료 → 앱 생존 + FTS 폴백(P1/P2)
  - 임베딩 모델 설치 → 청크 임베딩 → 의미 검색 결과 반환(P4)
  - _Requirements: 1.1, 1.2, 2.1, 2.3_
- [x] 7.2 typecheck + lint + 관련 테스트 그린
  - typecheck/lint 클린, 임베딩 폴백·IPC 계약 테스트 그린. 챕터 FTS 캐시 테스트 2건은
    이 스펙 범위 밖 선재 결함(searchService `search` 경로, 변경 없음·단독 실행도 실패).
  - _Requirements: 전체_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1.1", "4.1"] },
    { "wave": 2, "tasks": ["1.2", "1.3", "4.2", "4.3", "5.0"] },
    { "wave": 3, "tasks": ["2.1", "2.2", "4.4"] },
    { "wave": 4, "tasks": ["2.3", "3.1", "4.5", "4.6", "5.1"] },
    { "wave": 5, "tasks": ["3.2", "5.2", "6.1", "6.2"] },
    { "wave": 6, "tasks": ["8.1", "8.2", "8.3"] },
    { "wave": 7, "tasks": ["7.1", "7.2"] }
  ]
}
```

```text
1.1 ─▶ 1.2 ─▶ 1.3 ─▶ 2.1 ─▶ 2.2 ─▶ 2.3 ─▶ 3.1 ─▶ 3.2
                                    │
                                    └─▶ 5.1 ─▶ 5.2
4.1 ─▶ 4.2 / 4.3 ─▶ 4.4 ─▶ 4.5 / 4.6
6.1, 6.2            (4.6, 5.1 이후)
8.1 (4.4 이후) ─▶ 8.2 (6.x 이후) ─▶ 8.3
7.1, 7.2            (전 작업 이후, 마지막)
```

- 1.x는 모델 정의/설정 토대 → 2.x(임베딩 sidecar)의 선행.
- 4.1~4.3(llmfit 추천)은 완료. 4.4(설치기)는 부트스트랩(8.1)의 선행.
- 6.x UI는 4.6/5.1 IPC 완료 후. 8.x 온보딩은 6.x 컴포넌트 재사용.
- 7.x는 최종 검증.

## Notes

- 기존 인프라 재사용: `modelDownloader.downloadGguf`, `utilityProcessBridge.embed`, `embeddingProjector`의 signature 기반 재임베딩, `MEMORY_GET_EMBEDDING_STATUS`, startup wizard window/`startupReadinessService`.
- 프로세스 격리(R2) 토대는 이미 존재(`utilityProcess.fork` + crash 전파). 임베딩 sidecar에도 동일 원칙 적용.
- 임베딩 모델(bge-m3 Q4_K_M, dim 1024)은 **앱 설치 시 동봉**(Task 5.0 완료): `resources/models` extraResources + `stage-embedding-model.mjs` prebuild.
- llmfit 바이너리는 **동봉하지 않고 GitHub releases 최신에서 런타임 설치**(사용자 결정):
  - 자산 패턴: `llmfit-v{ver}-{arch}-{os}.{tar.gz|zip}` + 동반 `.sha256`. GitHub asset 메타에 `digest: "sha256:..."`도 존재.
  - 플랫폼 매핑: darwin-arm64=aarch64-apple-darwin, darwin-x64=x86_64-apple-darwin, win32-x64=x86_64-pc-windows-msvc(zip), linux-x64=x86_64-unknown-linux-gnu, linux-arm64=aarch64-unknown-linux-gnu.
  - `/repos/AlexsJones/llmfit/releases/latest`로 버전 동적 해석(하드코딩 금지). 최초 bootstrap에서 설치(8.1).
- llama-server `--embeddings` 단일 인스턴스가 chat과 충돌할 수 있어 임베딩 전용 인스턴스로 분리(설계 C2).
- 온보딩 순서: 부트스트랩(llmfit 설치) → Luie 소개 → Local LLM/임베딩 설치 → Main Window.
