# Test Ready

AnalysisSection의 개편 및 신규 뷰 모드(fixView/floatingView)를 검증하기 위한 Vitest DOM 테스트 파일(`tests/dom/analysisViewMode.test.tsx`) 작성이 완료되었습니다.

## 테스트 파일 경로
- `tests/dom/analysisViewMode.test.tsx`

## 테스트 실행 명령어
실제 테스트는 빌드 및 검증 단계에서 아래 명령어로 실행할 수 있습니다.
```bash
vitest run tests/dom/analysisViewMode.test.tsx
```

## 검증 항목
1. **패널 삭제 검증**: 6개 패널(`ConflictQueuePanel`, `EpisodeReviewPanel` 등)의 제거 여부와 `NarrativeSummaryStatusPanel`의 유지 여부를 검증합니다.
2. **뷰 모드 토글 버튼 검증**: `AnalysisSection` 내에 뷰 모드(fixView/floatingView) 상태 전환 토글 버튼의 노출 여부를 검증합니다.
3. **React Portal 마운트 검증**: `floatingView` 상태에서 컴포넌트가 React Portal을 통해 `document.body`로 마운트되는지 검증합니다.
4. **드래그 동작 Mocking 검증**: Pointer Capture API를 활용한 헤더 드래그 시 좌표 이동 동작을 Mocking하고 검증합니다.
