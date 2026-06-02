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
- `src/renderer/src/features/workspace/stores/projectLayout/persistLogging.ts`: project layout persist recovery logger
- `src/renderer/src/features/canvas/components/binder/CanvasNodeInspector.tsx`: memory/memoryAdmin

의견:

- 직접 `window.api` 사용은 원칙적으로 줄이고 `@shared/api` 또는 domain adapter를 통해야 합니다.
- 단, 기존 예외는 즉시 제거하지 않고 문서화 후 호환 방식으로 이전해야 합니다.

## localStorage 예외

사실: `tests/scripts/localStorageBoundary.test.ts`가 현재 명시적으로 허용한 renderer localStorage 경로입니다.

- `src/renderer/src/app/fontLoader.ts`
- `src/renderer/src/features/research/components/event/EventDetailView.tsx`
- `src/renderer/src/features/research/components/faction/FactionDetailView.tsx`
- `src/renderer/src/features/research/components/MemoSection.tsx`
- `src/renderer/src/features/research/components/wiki/WikiDetailView.tsx`
- `src/renderer/src/features/research/services/worldPackageStorage.ts`
- `src/renderer/src/features/workspace/hooks/useCollapsedSidebarStore.ts`
- `src/renderer/src/features/workspace/stores/projectLayout/persistLogging.ts`
- `src/renderer/src/features/workspace/stores/projectLayoutStore.ts`
- `src/renderer/src/features/workspace/stores/uiStore.persist.ts`
- `src/renderer/src/i18n/index.ts`

의견:

- project/content canonical persistence는 `.luie` package 경계를 우선하고, localStorage는 UI preference 또는 recovery fallback으로 제한해야 합니다.

## 500 LOC 초과 Renderer 파일

사실:

- `src/renderer/src/i18n/locales/ko/base.ts`
- `src/renderer/src/i18n/locales/ja/base.ts`
- `src/renderer/src/i18n/locales/en/base.ts`
- `src/renderer/src/features/research/services/worldPackageStorage.ts`
- `src/renderer/src/features/research/stores/worldBuildingStore.actions.ts`
- `src/renderer/src/features/settings/components/tabs/ModelTab.tsx`
- `src/renderer/src/features/canvas/components/shell/CanvasActivityShell.tsx`
- `src/renderer/src/features/canvas/components/graph/GraphSurface.tsx`
- `src/renderer/src/styles/global.css`
- `src/renderer/src/features/project/hooks/useFileImport.ts`
- `src/renderer/src/i18n/locales/*/workspace.ts`

사실: `src/renderer/src/features/editor/components/EditorToolbar.tsx`는 editor toolbar shell과 TipTap command wiring만 유지하도록 축소되어 300 LOC입니다. 분리된 helper는 `editor/components/toolbar/index.ts` 배럴을 통해 제공합니다.

| Editor toolbar helper | 책임 | LOC |
| --- | --- | ---: |
| `toolbar/MoreMenu.tsx` | export/alignment/select-all/clear-formatting more menu | 130 |
| `toolbar/menus.tsx` | compact dropdown, color picker, typography slider popover | 272 |
| `toolbar/primitives.tsx` | toolbar button/divider primitives | 38 |
| `toolbar/useClickOutside.ts` | popover outside click hook | 20 |
| `toolbar/editorState.ts` | paragraph style detection and ghost editor factory | 42 |
| `toolbar/constants.ts` | font size/text color/highlight color options | 30 |
| `toolbar/types.ts` | toolbar props and paragraph style types | 17 |
| `toolbar/index.ts` | toolbar helper 배럴 export | 6 |

사실: `src/renderer/src/app/App.tsx`는 hash window mode, bootstrap/project gate, top-level screen routing, project open/restore, attachment toast 조정을 유지하도록 축소되어 472 LOC입니다. bootstrap gate UI, quit overlay, hash mode hook, theme DOM sync, dev-only UI mode integrity check는 `app/shell/index.ts` 배럴을 통해 제공합니다.

| App shell helper | 책임 | LOC |
| --- | --- | ---: |
| `shell/BootstrapGate.tsx` | bootstrap loading/error/retry/quit gate UI | 57 |
| `shell/QuitOverlay.tsx` | quit phase blocking overlay | 29 |
| `shell/windowMode.ts` | hash 기반 window mode hook | 31 |
| `shell/bootstrapStatus.ts` | bootstrap status schema parse helper | 7 |
| `shell/useThemeAttributes.ts` | editor theme DOM attribute sync | 39 |
| `shell/useUiModeIntegrityDevCheck.ts` | dev-only UI mode integrity logger | 60 |
| `shell/index.ts` | app shell helper 배럴 export | 7 |

사실: `src/renderer/src/features/workspace/components/layout/EditorRoot.tsx`는 workspace layout shell orchestration만 유지하도록 축소되어 491 LOC입니다. lazy component registry와 layout fallback은 `layout/rootShell/index.ts` 배럴을 통해 제공합니다.

| EditorRoot shell helper | 책임 | LOC |
| --- | --- | ---: |
| `rootShell/lazyComponents.tsx` | layout/sidebar/panel/banner lazy component registry | 62 |
| `rootShell/fallback.tsx` | layout suspense fallback element | 1 |
| `rootShell/index.ts` | EditorRoot shell helper 배럴 export | 19 |

사실: `src/renderer/src/features/workspace/stores/projectLayoutStore.ts`는 Zustand persist store wiring과 기존 public export 호환 진입점만 유지하도록 축소되어 147 LOC입니다. persisted layout 타입/기본값/sanitize/migration/merge/logging helper는 `workspace/stores/projectLayout/index.ts` 배럴을 통해 제공합니다.

| Project layout helper | 책임 | LOC |
| --- | --- | ---: |
| `projectLayout/types.ts` | persisted docs tab, layout state, patch, store 타입 | 80 |
| `projectLayout/constants.ts` | persistable tab/section/panel size 상수 | 39 |
| `projectLayout/defaults.ts` | default project layout state factory | 36 |
| `projectLayout/sanitize.ts` | persisted layout/tab/panel normalization | 214 |
| `projectLayout/merge.ts` | project layout patch merge policy | 88 |
| `projectLayout/migration.ts` | persisted schema version migration | 61 |
| `projectLayout/persistLogging.ts` | localStorage recovery/validation logging | 64 |
| `projectLayout/index.ts` | project layout helper 배럴 export | 21 |

## 위험 지점

의견:

- `App.tsx`는 routing, bootstrap, project open/restore, attachment approval/toast를 함께 담당합니다.
- `EditorRoot.tsx`는 editor/sidebar/canvas/panels/settings/shortcuts/split view를 묶는 shell입니다.
- `projectLayoutStore.ts`와 `projectLayout/**`는 persisted layout migration/sanitize/merge 계약이 있어 변경 위험이 큽니다.
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
