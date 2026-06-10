# Handoff Report

## 1. Observation

- **`analysisStore` 위치 및 구조**:
  - 파일 경로: `src/renderer/src/features/research/stores/analysisStore.ts` (라인 1-124)
  - 내용: `create<AnalysisStore>`를 사용한 Zustand 기반 스토어로, 로컬 스토리지를 활용한 `persist` 미들웨어가 적용되어 있지 않습니다.
- **`uiStore` 위치 및 구조**:
  - 파일 경로: `src/renderer/src/features/workspace/stores/uiStore.ts` (라인 23-28)
  - 내용: `persist` 미들웨어를 사용하여 로컬 스토리지에 UI 상태를 영구 저장하며, `uiStore.persist.ts` 및 `src/shared/schemas/persistence.ts` 내의 `uiStorePersistedStateSchema` Zod 스키마를 사용하여 엄격한 상태 유효성 검증을 수행합니다.
- **`AnalysisSection` 마운트 라이프사이클**:
  - 파일 경로: `src/renderer/src/features/research/components/ResearchPanel.tsx` (라인 99)
  - 내용: `activeTab === "analysis" && <FeatureErrorBoundary featureName="Analysis"><AnalysisSection /></FeatureErrorBoundary>`
  - 관찰: 탭 전환(`activeTab` 변경) 시 `AnalysisSection` 컴포넌트가 언마운트되며, 이로 인해 로컬 React 상태 및 하위 React Portal 등이 모두 소멸됩니다.

## 2. Logic Chain

- **문제 상황**: 탭 전환 시 뷰 모드(`fixView`/`floatingView`) 상태와 팝업창 UI가 유실되지 않는 구조를 구현해야 합니다.
- **추론 1**: 탭 전환 시 컴포넌트가 언마운트되므로 뷰 모드 상태는 전역 스토어(`useAnalysisStore` 또는 `useUIStore`)에서 들고 있어야 유실되지 않습니다.
- **추론 2**: `useAnalysisStore`에 상태를 두면, 탭 전환 시 메모리에 인스턴스가 보존되어 상태가 유지되며, 영구 저장 스키마 변경 및 마이그레이션 부담이 없습니다.
- **추론 3**: `useUIStore`에 상태를 영구 저장하려면 Zod 스키마(`uiStorePersistedStateSchema`) 수정 및 스토리지 마이그레이션 복잡도가 증가하나, 앱 재시작 시에도 선호 뷰 모드를 유지하는 장점이 있습니다.
- **추론 4**: `AnalysisSection` 컴포넌트 내부에 React Portal을 두면 탭 전환 시 컴포넌트 언마운트와 함께 팝업창이 닫힙니다. 이를 방지하고 다른 탭 작업 중에도 floating 창을 띄워 두려면(강력한 보존), 최상위 레이아웃(`EditorRoot.tsx` 등) 레벨에서 팝업창을 렌더링하고 `AnalysisSection`은 최소화된 트리거 버튼만 그리는 마운트 구조 분리가 필요합니다.

## 3. Caveats

- 뷰 모드 선호도를 앱을 종료하고 다시 켰을 때도 유지하고 싶은 비즈니스 요구사항이 강력할 경우, 본 리포트의 "방안 3(UIStore + Persist)"을 구현해야 하므로 마이그레이션 리스크가 수반됩니다.
- 본 분석은 구현을 배제한 설계 및 분석 단계이므로, 상세 스타일 및 드래그 라이브러리 연동 세부사항은 검토 범위에서 제외하였습니다.

## 4. Conclusion

- **전역 상태 스토어 최적 위치**: 도메인 응집력을 지키고 마이그레이션 리스크를 최소화하기 위해 **`useAnalysisStore`**에 `viewMode`와 `setViewMode`를 추가하는 것이 최적의 방안입니다. (앱 새로고침 시 초기화되나 AI 대화 세션도 같이 초기화되므로 논리적으로 자연스러움)
- **탭 전환 시 팝업 보존 아키텍처**: 다른 탭(에디터 등)을 보면서도 미니 대화창을 지속적으로 노출하려면, `MiniChatWindow` 컴포넌트를 `AnalysisSection`에서 분리하고 **최상위 레이아웃(`EditorRoot.tsx` 또는 `MainLayout.tsx`) 레벨에 직접 마운트**해야 합니다.

## 5. Verification Method

- `/Users/user/Luie/.agents/teamwork_preview_explorer_init_2/analysis.md` 파일의 분석 내용 및 3가지 스토어 변경 방안, 마운트 아키텍처 설계안 검토.
- `src/renderer/src/features/research/stores/analysisStore.ts` 및 `src/renderer/src/features/workspace/stores/uiStore.ts` 파일 열람을 통한 Zustand 스토어 및 Persist 옵션 확인.
