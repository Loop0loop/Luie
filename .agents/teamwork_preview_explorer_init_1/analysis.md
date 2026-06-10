# AnalysisSection 구조 및 제거 대상 패널/API 분석 보고서

본 보고서는 `AnalysisSection`의 레이아웃 구조를 파악하고, 제거해야 할 6개 패널과 관련 API hooks, 그리고 Main/Preload/Shared 계층의 연관 요소를 분석한 결과를 정리합니다.

---

## 1. AnalysisSection 현재 레이아웃 구조
`src/renderer/src/features/research/components/AnalysisSection.tsx`는 다음 세 가지 주요 영역으로 구성됩니다.

1. **상단 패널 스택 영역** (`space-y-5`)
   - 분석 결과 및 검토 작업들을 보여주는 패널들이 세로 순서로 배치되어 있습니다.
   - 구성: `ConflictQueuePanel` → `EpisodeReviewPanel` → `FactReviewPanel` → `EntityReviewPanel` → `EntityAliasReviewPanel` → `NarrativeSummaryStatusPanel` → `MemoryEvalReportPanel`
2. **중앙 메시지 기록 영역**
   - `MessageList` 컴포넌트를 통해 RAG Chat 대화 내역을 표시합니다.
   - 대화 내역이 없을 경우 빈 상태 가이드 문구를 표시합니다.
3. **하단 플로팅 입력창 영역**
   - 질문을 입력할 수 있는 textarea가 있으며, 상단에 `RuntimeStatusPanel`을 통해 로컬/원격 LLM 연결 상태를 표시합니다.
   - 툴바로 LLM Route 선택 버튼, Memory Scope(현재/과거 범위) 선택 버튼, 현재 챕터 정보, 메시지 전송 및 정지 버튼이 배치되어 있습니다.

---

## 2. 패널별 상세 분석 (제거 6개, 유지 1개)

### [제거 대상 패널]
1. **충돌 큐 (Conflict Queue)**
   - **패널 경로**: `src/renderer/src/features/research/components/analysisSection/ConflictQueuePanel.tsx`
   - **사용처**: `AnalysisSection.tsx`에서 `ConflictQueuePanel` 컴포넌트로 렌더링.
2. **검토할 에피소드 (Episode Review)**
   - **패널 경로**: `src/renderer/src/features/research/components/analysisSection/EpisodeReviewPanel.tsx`
   - **사용처**: `AnalysisSection.tsx`에서 `EpisodeReviewPanel` 컴포넌트로 렌더링.
3. **검토할 사실 (Fact Review)**
   - **패널 경로**: `src/renderer/src/features/research/components/analysisSection/FactReviewPanel.tsx`
   - **사용처**: `AnalysisSection.tsx`에서 `FactReviewPanel` 컴포넌트로 렌더링.
4. **검토할 엔티티 (Entity Review)**
   - **패널 경로**: `src/renderer/src/features/research/components/analysisSection/EntityReviewPanel.tsx`
   - **사용처**: `AnalysisSection.tsx`에서 `EntityReviewPanel` 컴포넌트로 렌더링.
5. **검토할 별칭 (Entity Alias Review)**
   - **패널 경로**: `src/renderer/src/features/research/components/analysisSection/EntityAliasReviewPanel.tsx`
   - **사용처**: `AnalysisSection.tsx`에서 `EntityAliasReviewPanel` 컴포넌트로 렌더링.
6. **메모리 평가 (Memory Evaluation)**
   - **패널 경로**: `src/renderer/src/features/research/components/analysisSection/MemoryEvalReportPanel.tsx`
   - **사용처**: `AnalysisSection.tsx`에서 `MemoryEvalReportPanel` 컴포넌트로 렌더링.

### [유지 대상 패널]
* **서사 요약 (Narrative Summary)**
  - **패널 경로**: `src/renderer/src/features/research/components/analysisSection/NarrativeSummaryStatusPanel.tsx`
  - **사용처**: `AnalysisSection.tsx`에서 `NarrativeSummaryStatusPanel` 컴포넌트로 렌더링.
  - **특징**: `useMemoryReviewQueues`를 통해 `api.memory.getNarrativeSummaryStatus` 조회 결과를 상태로 전달받아 렌더링합니다.

---

## 3. 관련 API Hooks 분석
`AnalysisSection.tsx`에서 사용되는 관련 hooks는 `src/renderer/src/features/research/components/analysisSection/` 폴더 하위에 존재합니다.

1. **`useMemoryReviewPanels.ts`**
   - **역할**: `useMemoryReviewQueues`와 `useMemoryReviewMutations`의 반환값을 통합하여 반환하는 엔트리 hook.
   - **사용처**: `AnalysisSection.tsx`에서 `review` 인스턴스로 호출하여 하위 패널들에 상태 및 Mutation 함수들을 전달.
2. **`useMemoryReviewQueues.ts`**
   - **역할**: 각 큐들의 조회 상태(Loading, Error, Items)를 useState와 useEffect로 페칭 및 관리.
   - **영향 범위**:
     - **유지 필요**: `getNarrativeSummaryStatus` 호출 및 관련 상태 (`showNarrativeSummaryStatus`, `narrativeSummaryStatus`, `narrativeSummaryStatusLoading`, `narrativeSummaryStatusError`).
     - **제거 대상**: 충돌 큐, 에피소드, 사실, 엔티티, 별칭 검토 큐 관련 Fetching 로직 전체.
3. **`useMemoryReviewMutations.ts`**
   - **역할**: 충돌 해결, 에피소드 거절, 사실 확정/거절, 엔티티 확정/거절, 별칭 확정/거절/통합/분리 관련 API 호출 및 토스트 메시지 처리.
   - **영향 범위**: 유지 대상인 '서사 요약'은 조회 전용(읽기 전용)이므로 Mutation이 필요하지 않습니다. 따라서 6개 패널 제거 후 이 파일은 **통째로 제거(삭제)가 가능**합니다.
4. **`useMemoryEvalPanel.ts`**
   - **역할**: 메모리 평가, LLM Intent Calibration, Episode Calibration의 실행 트리거 및 상태 관리.
   - **영향 범위**: '메모리 평가' 패널에만 독점적으로 사용되므로, 패널 제거 시 **통째로 제거(삭제)가 가능**합니다.

---

## 4. 공유 타입 및 IPC 채널 매핑

### 4.1 공유 타입 정의 (Shared Types)
- **`src/shared/types/search/review.ts`**: 리뷰 큐(충돌 큐, 에피소드, 사실, 엔티티, 별칭)에 대한 I/O 타입 정의. (제거 대상)
- **`src/shared/types/memoryEval.ts`**: 메모리 평가 및 캘리브레이션 I/O 타입 정의. (제거 대상)
- **`src/renderer/src/features/research/components/analysisSection/types.ts`**: 렌더러단에서 사용하는 타입 별칭. (제거 대상 타입 정리 필요)

### 4.2 IPC 채널 및 Preload API (Shared & Preload Contract)
- **`src/shared/ipc/channels.ts`**: `IPC_CHANNELS` 상수 정의. 제거 대상 IPC 채널 목록은 다음과 같습니다.
  - `MEMORY_RUN_EVAL_SUITE`, `MEMORY_RUN_INTENT_CALIBRATION`, `MEMORY_RUN_EPISODE_CALIBRATION`
  - `MEMORY_GET_CONFLICT_QUEUE`, `MEMORY_EPISODE_REVIEW_QUEUE`, `MEMORY_EPISODE_REJECT`
  - `MEMORY_FACT_REVIEW_QUEUE`, `MEMORY_FACT_CONFIRM`, `MEMORY_FACT_REJECT`, `MEMORY_CONFLICT_RESOLVE`
  - `MEMORY_ENTITY_ALIAS_REVIEW_QUEUE`, `MEMORY_ENTITY_REVIEW_QUEUE`, `MEMORY_ENTITY_CONFIRM`, `MEMORY_ENTITY_REJECT`
  - `MEMORY_ENTITY_ALIAS_CONFIRM`, `MEMORY_ENTITY_ALIAS_REJECT`, `MEMORY_ENTITY_ALIAS_SPLIT`, `MEMORY_ENTITY_MERGE`
  - *(유지 채널: `MEMORY_GET_NARRATIVE_SUMMARY_STATUS`)*
- **`src/shared/api/io.contract.ts`**: `IoRendererApi` 타입 정의 내 `memoryAdmin` 및 `memory` 섹션에 선언된 위 18개 API 정의. (제거 대상)
- **`src/preload/api/projectApi.ts`**: `safeInvoke`를 사용해 IPC 채널과 바인딩하는 `memoryAdmin` 및 `memory` 객체의 제거 대상 프로퍼티들. (제거 대상)

---

## 5. 메인 프로세스 및 백엔드 서비스 계층 영향
- **`src/main/handler/search/ipcSearchHandlers.ts`**:
  - `registerSearchIPCHandlers` 함수 내에서 제거 대상 IPC 채널들에 대응하는 Zod 검증 스키마 바인딩 및 핸들러 등록 해제 필요.
- **`src/main/services/features/memory/query/narrativeMemoryQueryService.ts`**:
  - `NarrativeMemoryQueryService` 클래스 내부의 제거 대상 API 18개에 해당하는 메소드들 제거 가능.
  - 의존성을 갖는 하위 서비스 모듈 파일들:
    - `src/main/services/features/memory/entity/memoryEntityReviewService.ts`
    - `src/main/services/features/memory/episode/memoryEpisodeReviewService.ts`
    - `src/main/services/features/memory/episode/memoryEpisodeExtractorCalibration.ts`
    - `src/main/services/features/memory/temporal/memoryTemporalFactReviewService.ts`
    - `src/main/services/features/memory/eval/memoryEvalRunner.ts`
    - `src/main/services/features/memory/query/internal/memoryIntentClassifierCalibration.ts`
