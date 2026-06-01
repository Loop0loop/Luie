# Verification Scenarios — rag-local-embedding

격리(SAP)·폴백·임베딩 경로의 Correctness Properties 검증 절차.
자동화 가능한 항목은 테스트로, 프로세스 종료 등 수동 항목은 절차로 문서화한다.

## 자동화된 검증

| Property | 검증 | 테스트 |
|----------|------|--------|
| P2 폴백 가용성 | 임베딩 `embed()` 예외/null 시 `searchChunks` 가 FTS(+LIKE)만으로 결과 반환·무throw | `tests/main/services/searchServiceFallback.test.ts` |
| 회귀: 임베딩 미설정 FTS-only | 청크 생성 후 키워드 검색 정상 | `tests/main/services/memoryProjectionService.test.ts` |
| IPC 계약 | 임베딩/llmfit 채널 ↔ preload ↔ handler 정합 | `tests/scripts/ipcContractMap.test.ts`, `preloadContractRegression.test.ts`, `ipcHandlerSchemas.test.ts` |
| llmfit 파서 | 정상/누락/깨진 JSON/바이너리 없음 | (Task 4.2) llmfit 파서 단위 테스트 |
| llmfit 설치기 | 플랫폼→자산 매핑/sha 파싱 | (Task 4.5) llmfitInstaller 단위 테스트 |

실행:
```bash
npm rebuild better-sqlite3            # node ABI 로 빌드(테스트용)
npx vitest run tests/main/services/searchServiceFallback.test.ts \
               tests/main/services/memoryProjectionService.test.ts
bun run rebuild:electron              # 개발/실행용 electron ABI 복구
```

## 수동 검증 (프로세스 종료 등 자동화 곤란)

### S1. 프로세스 격리 — AI 강제 종료 후 앱 생존 (P1 / R2.1)
1. 앱 실행, 임베딩 sidecar 가 기동된 상태(의미 검색 1회 수행)로 만든다.
2. OS 작업관리자/`kill` 로 `llama-server`(임베딩) 프로세스를 강제 종료한다.
3. **기대**: Electron 메인/렌더러는 종료되지 않고 계속 동작. 글쓰기/저장 정상.
4. 검색을 다시 실행 → 임베딩 sidecar lazy 재기동 또는 쿨다운 중이면 FTS 폴백으로 결과 반환.

### S2. 폴백 가용성 — 임베딩 미가용 검색 (P2 / R1.2, R2.3)
1. 임베딩 모델 미설치(또는 sidecar 다운) 상태.
2. 메모리 검색 수행.
3. **기대**: throw 없이 FTS(+짧은 토큰 LIKE) 결과 반환. (자동 테스트 S=`searchServiceFallback`로도 커버)

### S3. 임베딩 end-to-end — 설치 → 임베딩 → 의미 검색 (P4 / R1.1, R1.2)
1. 클린 상태에서 설정 > AI 모델 또는 온보딩에서 임베딩 모델 다운로드.
2. 원고 작성/메모리 재구성으로 청크 임베딩 생성(백그라운드).
3. 설정의 "의미 검색 준비됨" 인디케이터 확인.
4. 의미 기반 질의 → 키워드가 정확히 일치하지 않아도 관련 청크가 반환되는지 확인.

### S4. 메모리 분리 (P5 / R5.1, R5.2)
1. 채팅(생성 모델) 미사용, 백그라운드 임베딩만 도는 상태.
2. **기대**: 생성 sidecar 는 idle unload 되어 상주하지 않음(임베딩 sidecar 와 독립 idle 타이머).

### S5. llmfit 무해성 + 부팅 비차단 (P6, P7 / R3.5, R6.5, R7.4)
1. 네트워크 차단 또는 llmfit 릴리스 접근 불가 상태로 최초 부팅.
2. **기대**: 부트스트랩의 llmfit 설치 시도가 실패해도 앱 부팅·온보딩 진행. 추천 섹션은 "사용할 수 없음" 표시. 온보딩 "건너뛰기"로 Main 진입 가능.

### S6. 모델 전환 안전 재시작 (R4.3)
1. 임베딩 sidecar 가동 중 로컬 LLM 바이너리/모델 경로 변경.
2. 다음 의미 검색 시 `ensureStarted` 가 modelPath/binaryPath 변경을 감지해 기존 인스턴스를 정지하고 새 설정으로 재기동(무한 루프 없이 1회).
