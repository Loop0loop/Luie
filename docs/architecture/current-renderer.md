# Current Renderer Architecture

이 문서는 `src/renderer`의 현재 구조를 사실 기준으로 기록합니다.

## 확인 범위

주요 근거 파일:

- `src/renderer/src/features/AGENTS.md`
- `src/renderer/src/app/main.tsx`
- `src/renderer/src/app/setup.ts`
- `src/renderer/src/app/App.tsx`
- `src/renderer/src/features/workspace/components/layout/EditorRoot.tsx`
- `src/renderer/src/features/**/stores/**`
- `src/renderer/src/features/editor/**`
- `src/renderer/src/features/manuscript/**`
- `src/renderer/src/features/research/**`
- `src/renderer/src/features/canvas/**`
- `src/renderer/src/shared/**`
- `src/shared/api/index.ts`
- `src/shared/api/windowApi.contract.ts`

## 현재 역할

사실:

- renderer는 feature-first 구조입니다.
- 큰 축은 `workspace`, `editor`, `manuscript`, `research`, `canvas`입니다.
- 보조 기능은 `project`, `settings`, `snapshot`, `export`, `startup`, `auth`, `trash`입니다.
- bootstrap은 `app/main.tsx`에서 `initI18n()`과 `setupRenderer()`를 병렬 실행한 뒤 React root를 mount합니다.
- React root는 `GlobalErrorBoundary`, `ToastProvider`, `DialogProvider`, `App` 순서로 감쌉니다.
- `App.tsx`는 hash 기반 window mode와 bootstrap readiness를 기준으로 export/auth/world-graph/startup-wizard/template/editor root 화면을 분기합니다.
- 일반 편집 화면의 실제 shell은 `features/workspace/components/layout/EditorRoot.tsx`입니다.
- `EditorRoot.tsx`는 editor, sidebar, canvas, panels, settings, shortcuts, split view를 lazy load로 조립합니다.

## UI/State/API Flow

```text
index.html
  -> src/renderer/src/app/main.tsx
    -> initI18n + setupRenderer
    -> GlobalErrorBoundary + ToastProvider + DialogProvider
    -> App.tsx
      -> api.app.getBootstrapStatus / onBootstrapStatus
      -> window hash mode 분기
      -> useProjectInit
      -> ProjectTemplateSelector 또는 EditorRoot
        -> useEditorStore
        -> useUIStore
        -> useProjectStore
        -> useChapterManagement
        -> layout 선택
        -> Editor / Sidebar / Research / Canvas / Settings / Panels
```

```text
renderer API 접근
  대부분: @shared/api 의 api
    -> getBrowserApi()
    -> window.api
    -> preload contract

  일부 예외:
    -> window.api?.logger
    -> window.api.memory / memoryAdmin
```

## Renderer Shared vs Root Shared

사실:

- `src/renderer/src/shared`는 renderer 내부 전용 공통 코드입니다.
- 예: error boundary, renderer hook, Zustand CRUD store factory.
- `src/shared`는 main/preload/renderer가 공유하는 API 계약, 타입, 상수, schema, UI primitive 영역입니다.
- root shared의 `windowApi.contract.ts`는 `Window["api"]`와 `RendererApi`가 양방향으로 호환되는지 타입 수준에서 검증합니다.

## Store Boundary

사실:

- `projectStore`: project CRUD와 호환 alias.
- `chapterStore`: chapter CRUD와 reorder.
- `editorStore`: editor preference, theme, uiMode persistence.
- `editorStatsStore`: transient word/char/save status.
- `uiStore`: workspace view, panels, regions, legacy fields, mainView.
- `projectLayoutStore`: project별 layout persistence.
- `research` stores: character/event/faction/term/memo/world graph/analysis/plugin.
- `canvasViewStore`: canvas viewport/sidebar logical state와 persisted view state.

의견:

- `workspace` store와 `EditorRoot`는 domain state라기보다 layout orchestration 결합 지점입니다.

## 직접 window.api 예외

사실:

- `src/renderer/src/app/main.tsx`: startup logger
- `src/renderer/src/features/workspace/stores/uiStore.persist.ts`: logger
- `src/renderer/src/features/workspace/stores/projectLayoutStore.ts`: logger
- `src/renderer/src/features/canvas/components/binder/CanvasNodeInspector.tsx`: memory/memoryAdmin

의견:

- 직접 `window.api` 사용은 원칙적으로 줄이고 `@shared/api` 또는 domain adapter를 통해야 합니다.
- 단, 기존 예외는 즉시 제거하지 않고 문서화 후 호환 방식으로 이전해야 합니다.

## 500 LOC 초과 Renderer 파일

사실:

- `src/renderer/src/i18n/locales/ko/base.ts`
- `src/renderer/src/i18n/locales/ja/base.ts`
- `src/renderer/src/i18n/locales/en/base.ts`
- `src/renderer/src/features/research/services/worldPackageStorage.ts`
- `src/renderer/src/features/editor/components/EditorToolbar.tsx`
- `src/renderer/src/features/workspace/stores/projectLayoutStore.ts`
- `src/renderer/src/features/research/stores/worldBuildingStore.actions.ts`
- `src/renderer/src/features/settings/components/tabs/ModelTab.tsx`
- `src/renderer/src/app/App.tsx`
- `src/renderer/src/features/canvas/components/shell/CanvasActivityShell.tsx`
- `src/renderer/src/features/canvas/components/graph/GraphSurface.tsx`
- `src/renderer/src/features/workspace/components/layout/EditorRoot.tsx`
- `src/renderer/src/styles/global.css`
- `src/renderer/src/features/project/hooks/useFileImport.ts`
- `src/renderer/src/i18n/locales/*/workspace.ts`

## 위험 지점

의견:

- `App.tsx`는 routing, bootstrap, project open/restore, theme DOM sync, quit overlay를 함께 담당합니다.
- `EditorRoot.tsx`는 editor/sidebar/canvas/panels/settings/shortcuts/split view를 묶는 blast-radius 큰 shell입니다.
- `uiStore.state.ts`는 legacy flat fields와 `regions` 동기화가 있어 변경 위험이 큽니다.
- `worldBuildingStore.actions.ts`는 graph load, replica merge, persistence queue, mutation version, CRUD mutation을 함께 처리합니다.
- `CanvasNodeInspector.tsx`의 직접 `window.api` memory 호출은 API 경계 예외입니다.

## 보존 불가침 경계

사실:

- renderer는 Electron/Node API를 직접 import하지 않습니다.
- desktop capability는 preload `window.api` 계약 또는 `@shared/api`를 통해 접근합니다.
- IPC 계약은 `src/shared/api`, `src/shared/ipc`, preload, main handler가 함께 맞아야 합니다.
- `uiStore.regions`와 legacy fields는 호환성 경계입니다.
- graph/editor/canvas hot path는 stable callback, memoization, staged persistence를 보존해야 합니다.

