# Handoff Report

## 1. Observation
- `src/renderer/src/features/research/components/AnalysisSection.tsx` 파일에서 레이아웃 구조와 제거 대상 6개 패널(`ConflictQueuePanel`, `EpisodeReviewPanel`, `FactReviewPanel`, `EntityReviewPanel`, `EntityAliasReviewPanel`, `MemoryEvalReportPanel`) 및 유지 대상 패널(`NarrativeSummaryStatusPanel`)의 사용처를 관찰하였습니다.
- 관련 hooks(`useMemoryReviewPanels.ts`, `useMemoryReviewQueues.ts`, `useMemoryReviewMutations.ts`, `useMemoryEvalPanel.ts`)가 `src/renderer/src/features/research/components/analysisSection/` 폴더 내에 위치함을 확인했습니다.
- Shared 계층(`src/shared/types/search/review.ts`, `src/shared/types/memoryEval.ts`, `src/shared/ipc/channels.ts`, `src/shared/api/io.contract.ts`) 및 Preload 계층(`src/preload/api/projectApi.ts`), Main Process 계층(`src/main/handler/search/ipcSearchHandlers.ts`, `src/main/services/features/memory/query/narrativeMemoryQueryService.ts`)에서 제거 대상 API들과 관련된 18개 채널 정의와 메소드를 추적하고 관찰하였습니다.

## 2. Logic Chain
- `AnalysisSection.tsx`는 `useMemoryReviewPanels` 훅을 통해 큐 상태 및 동작 함수를 인가받고 있습니다.
- `useMemoryReviewPanels`는 `useMemoryReviewQueues`와 `useMemoryReviewMutations`를 호출하여 반환합니다.
- `useMemoryReviewQueues`는 `api.memory.getNarrativeSummaryStatus` (서사 요약 상태)를 조회하는 부분과 나머지 5개 패널의 조회 기능을 포함합니다. 서사 요약 패널이 유지되므로 `useMemoryReviewQueues` 자체는 유지되되 5개 조회 로직이 삭제되어야 합니다.
- `useMemoryReviewMutations`는 오직 제거 대상 패널(충돌, 에피소드, 사실, 엔티티, 별칭)의 갱신/해결 행위만을 포함하며 서사 요약(읽기 전용)은 mutation이 필요 없으므로, 이 훅은 통째로 삭제할 수 있습니다.
- `useMemoryEvalPanel`은 오직 메모리 평가 패널(`MemoryEvalReportPanel`)에만 종속되어 있으므로 함께 삭제 가능합니다.
- 백엔드(Main) 프로세스의 `ipcSearchHandlers.ts` 및 `narrativeMemoryQueryService.ts`와 Preload/Shared 계약 내에서 제거할 18개 API 및 IPC 채널 매핑을 대응하여 지워야 깔끔한 정리가 이루어집니다.

## 3. Caveats
- Read-only 조사로만 진행되었으며 실제 코드 변경 사항은 발생하지 않았습니다.
- 실제 구현 단계에서 Main Process의 DB 쿼리나 도메인 서비스(예: `memoryEntityReviewService` 등) 자체를 완전히 삭제할지 여부는 비즈니스 범위 설정에 따라 달라질 수 있으므로, 본 보고서에서는 호출부와 API 계약 해제 중심으로 작성했습니다.

## 4. Conclusion
- 제거해야 할 6개 패널과 유지할 서사 요약 패널의 구조가 식별되었고, 제거 시 프론트엔드 훅(`useMemoryReviewMutations`, `useMemoryEvalPanel` 등) 및 API 계약(Shared/Preload), 백엔드 핸들러(Main)까지 총 18개 채널에 걸쳐 유기적으로 삭제 처리가 필요함을 식별하였습니다. 자세한 정보는 `analysis.md` 파일에 기록되어 있습니다.

## 5. Verification Method
- 구현 후 독립적인 검증 방법:
  - CLI 명령어 `pnpm run typecheck` 및 `pnpm run lint`를 통해 미사용 임포트나 불일치 타입 에러가 없는지 검증합니다.
  - 빌드 테스트 `pnpm run build`를 수행하여 정상 빌드 여부를 확인합니다.
