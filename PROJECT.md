# Project: Luie - Analysis Layout Improvement

## Architecture
- **Framework**: Electron 40 + React 19 + TypeScript 5
- **State Management**: Zustand 기반 `useAnalysisStore` (메모리 싱글톤)를 확장하여 `viewMode`를 전역 상태로 관리.
- **Portal Mount**: `document.body`를 타겟으로 React Portal을 이용하여 미니 대화창 최상위 레이어 마운트.
- **Drag Feature**: Pointer Capture API (`setPointerCapture`)를 이용한 직접 구현으로 경량 드래그 기능 제공.
- **Liquid UI**: Tailwind v4 backdrop-blur-md, rounded-shell, transition-all 등을 결합하여 ChatGPT/Gemini APP 스타일의 디자인 연출.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | E2E Test Setup | E2E 테스트 인프라 및 케이스 작성 | none | DONE |
| 2 | Panel & Hook Removal | 6개 검토 패널 및 관련 API 훅(Mutations, Eval) 제거 | none | DONE |
| 3 | View Mode & Portal | useAnalysisStore 확장, React Portal 미니 대화창 및 포인터 캡처 드래그 구현 | M2 | DONE |
| 4 | Liquid UI Styling | 둥근 모서리, 블러 배경, 애니메이션 스타일링 적용 | M3 | DONE |
| 5 | QA & Verification | 빌드, 타입체크, Reviewer 및 Auditor 검증 패스 | M4 | DONE |

## Interface Contracts
### `useAnalysisStore`
- `viewMode`: `'fixView' | 'floatingView'`
- `setViewMode`: `(mode: 'fixView' | 'floatingView') => void`

### Code Layout
- `src/renderer/src/features/research/stores/analysisStore.ts` - 뷰 모드 상태 스토어 확장
- `src/renderer/src/features/research/components/AnalysisSection.tsx` - 고정 뷰 패널 및 floatingView 분기 처리
- `src/renderer/src/features/research/components/MiniChatWindow.tsx` - 미니 대화창 Portal 및 드래그 구현 컴포넌트 신설
- `src/renderer/src/features/workspace/components/EditorRoot.tsx` 또는 공통 레이아웃 - 최상위에 `MiniChatWindow` 마운트
