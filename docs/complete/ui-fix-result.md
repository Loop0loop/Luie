# UI Fix Result

Canvas / Graph의 react-flow 최적화와 렌더러 전역 테마 토큰 정리 기록.

- 기준 커밋: `9e2ad0ef` (1단계 작업 일부가 이 커밋에 포함되어 있음)
- 검증 명령: `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`, `SKIP_DB_TEST_SETUP=1 pnpm vitest run tests/renderer tests/dom`

---

## 1단계 — Canvas react-flow 최적화

### `[React Flow]: ...new nodeTypes or edgeTypes...` 경고

**앱 코드 원인이 아님.** 코드를 바꾸지 않았다.

근거:

- `GraphSurface.tsx`의 `nodeTypes`는 이미 모듈 레벨 상수였다.
- 콘솔 트레이스가 `GraphView`의 두 호출(6560, 6561)을 모두 가리킨다. 6561은 `edgeTypes` 호출이고 GraphSurface는 `edgeTypes`를 전달하지 않으므로 **reactflow 내부의 `defaultEdgeTypes`(모듈 상수)에도 경고가 났다.**
- jsdom 재현 실험에서 모듈 레벨 `nodeTypes`로 `<ReactFlow>`를 마운트하고 StrictMode 유무 + `isEmpty` 조기 반환 리마운트 패턴을 반복했으나 `onError` 호출 **0건**.
- 프로덕션 번들(`out/renderer/assets/chunks/esm-*.js`)에서 경고 문자열은 `errorMessages` 맵에 데이터로만 남고 **호출부는 트리셰이킹으로 제거**됨(`process.env.NODE_ENV === 'development'` 가드).

결론: dev 서버 전용 오탐. reactflow v11(React ≤18 / zustand v4 대상)을 React 19 + zustand 5에서 쓰는 데서 오는 잡음이며 프로덕션 빌드에서는 발생 불가. 근본 해소는 `@xyflow/react` v12 이관.

### 성능 수정

| 항목 | 변경 전 | 변경 후 |
| --- | --- | --- |
| `useGraphDataFiltering` | 노드마다 `edges.filter`/`some` → O(N·E) | degree Map + adjacency `Map<string, Set>` 1회 계산 → O(N+E) |
| 노드 클릭(focus) | focus가 필터 memo 의존성이라 force layout(70~85회 × N² 물리) 전체 재실행 | `topologySignature`(노드·엣지 id 조합)에만 묶어 focus 변경 시 재실행 없음 |
| `calculateForceLayout` 엣지 루프 | `layoutNodes.findIndex` → O(iter·E·N) | id→index Map 사전 계산 |
| 위치 승계 | `nodesRef.current.find` → O(N²) | prevPositions Map |
| 노드 선택 | `buildFlowGraph(projection, selectedNodeId)`가 전체 node/edge 배열 재생성 | 선택은 reactflow의 `node.selected`가 담당, `data.isSelected` 제거 |
| projection 구독 | `CanvasPane`과 `StaticCanvasViewport`가 각각 `useStaticProjection()` 호출 | prop 필수화로 1회 |
| `currentAttrs` | 매 렌더 새 객체 → 콜백 identity 파괴 | `useMemo` |

focus 책임 분리: `useGraphDataFiltering`은 토폴로지 + 필터 드롭다운만, canvas focus는 `useFocusSync`가 adjacency로 O(1) 이웃 판정.

### 연결 / 삭제 로직

- `onConnect` 검증을 `utils/connectionGuards.ts`의 순수 함수 `resolveRelationConnection`으로 분리.
  - self-loop 차단 (기존: 허용 → 엣지가 노드 카드 뒤에 숨어 선택·삭제 불가)
  - 중복 관계 차단, 방향 반대도 동일 연결로 판정 (기존: DB 중복 행 + 겹친 엣지)
  - `normalizeEntityType` 제거. `graphData.entityType`은 이미 `WorldEntitySourceType`이라 문자열 재가공 후 캐스팅하면 신규 타입 추가 시 조용히 깨짐.
- `onNodesDelete` / `onEdgesDelete`를 `Promise.all` → 순차 체인. 두 삭제 모두 `persistGraphDocument`로 그래프 문서를 통째로 재작성하므로 병렬 실행 시 lost update 발생.

### 발견한 버그 2건

1. **엣지를 Delete 키로 지우면 화면에서만 사라짐.** `canvasFlowAdapter`가 엣지 id에 `rel-` 접두사를 붙이는데 `onEdgesDelete`가 그대로 `deleteRelation`에 넘겨 삭제 실패 → 다음 로드에 되살아남. `edge.data.rawId` 사용으로 수정.
2. **위치 미저장 노드가 전부 원점에 겹침.** `calculateForceLayout`의 초기 궤도 배치가 `node.position?.x ?? orbit`인데 미저장 좌표는 `undefined`가 아니라 `0`이라 nullish 병합이 절대 걸리지 않았다. 모든 노드가 (0,0)에서 시작하면 거리 0 → 반발력 방향 벡터 0 → 이후 반복이 무효. `canvasFlowAdapter`와 같은 기준(0,0 = 미저장)으로 판정.

### DnD 현황 (조사 결과, 미구현)

`features/canvas` 전체에 `onDrop`, `onDragOver`, `dataTransfer`, `screenToFlowPosition`, `useDraggable` **0건**. 존재하는 드래그는 reactflow 내부 노드 이동뿐.

- 좌측 탐색기 `TreeNode`는 `draggable`이 아님
- `BottomInteractiveToolbar`의 `new-block` / `insert-image`는 `comingSoon` 토스트, `import-doc`은 switch에 case가 없어 `default`의 "Unknown action" 경고로 떨어짐
- 에디터 쪽 DnD(`GlobalDragContext` / `EditorDropZones` / `workspaceDropRouting`)는 캔버스와 연결되어 있지 않음

---

## 2단계 — Canvas / Graph 테마 토큰

### 근본 원인

`styles/components/canvas.css` 하단이 `:root`에서 토큰을 재선언하고 있었다.

```css
:root {
  --canvas-bg: #121212;
  --canvas-bg-dark: #121212;   /* light와 값이 동일 */
}
```

`<Background>`가 렌더하는 `.react-flow__background` SVG가 이 값을 칠하므로, 아래 `bg-app`이 무엇이든 캔버스는 모든 테마에서 고정 `#121212`. 노드 글래스(`rgba(24,24,27,0.72)`), 플로팅 툴바(`rgba(26,26,30,0.76)`), 핸들 테두리(`rgba(255,255,255,0.4)`)도 다크 전용 리터럴이었고 컴포넌트에는 `bg-white/15`, `hover:bg-white/10` 등 12개.

### 설계

`global.tokens.css`에 Canvas 섹션을 추가하고 기존 표면 토큰에서 `color-mix()`로 파생. theme × temp × contrast × accent(인라인 custom hex 포함) 조합을 자동으로 따라간다. 테마별 오버라이드가 필요한 것은 세 종류뿐:

- inset highlight 방향 (다크는 위쪽 밝은 선, 라이트/세피아는 어두운 선)
- 그림자 강도 (밝은 표면에서 다크용 그림자는 얼룩으로 보임)
- entity 종류 색과 그 위 글자색

### 틴트 기준 표면 선택

`--bg-panel`에서 파생시키면 라이트에서 무너진다:

```
light   app=#fff      sidebar=#f5f5f7   panel=#fff       ← app == panel
dark    app=#1a1a1c   sidebar=#212123   panel=#28282b
sepia   app=#fbf2e2   sidebar=#f3e5cc   panel=#fcf5e7    ← 거의 동일
```

노드·플로팅 툴바는 `--bg-sidebar` 기준(라이트에서 한 단계 어둡고 다크에서 한 단계 밝아 세 테마 모두 대비 유지), 팝오버는 툴바 위에 겹치므로 `--bg-panel` 유지.

### 최종 해석값 (빌드 산출물에서 var 체인 추적)

| token | light | dark | sepia |
| --- | --- | --- | --- |
| `--canvas-bg` | `#fff` | `#1a1a1c` | `#fbf2e2` |
| `--canvas-node-bg` | `#f5f5f7` 82% | `#212123` 82% | `#f3e5cc` 82% |
| `--canvas-grid` | `#d1d1d6` | `#ffffff29` | `#d3bd9a` |
| `--canvas-inset-highlight` | `#0000000a` | `#ffffff1f` | `#5f4b3214` |
| `--canvas-kind-chip-fg` | `#fff` | `#000000d1` | `#fff` |

프로덕션 CSS에서 `#121212` 0건.

### 함께 나온 결함 4건

1. **`var(--accent)` 미정의** (`useFocusSync`). `stroke`가 계산 시점에 무효가 되어 focus한 관계선이 기본 검정으로 그려졌다. → `--accent-bg`
2. **`var(--highlight-default)` 미정의** (`CanvasMarkdownEditor`). 어디에도 정의된 적이 없어 형광펜 버튼이 배경을 칠하지 못했다. → 테마별 정의(다크는 반투명 앰버)
3. **`--bg-surface-hover`가 다크에 누락.** 라이트의 `rgba(0,0,0,0.04)`를 상속해 다크 모드 hover가 표면을 어둡게 만들었다. `hover:bg-surface-hover`를 쓰는 파일 61개에 영향. → 다크에 `rgba(255,255,255,0.06)` 추가
4. **종류 색 칩의 `text-white` 대비 실패.** 다크의 종류 색은 밝은 파스텔(`#ffd60a`, `#64d2ff`)이라 흰 글자가 읽히지 않았다. → `--canvas-kind-chip-fg`

`EntityNode`가 넘기던 `--node-color` 인라인 변수는 읽는 CSS가 없어 제거.

---

## 3단계 — 렌더러 전역 테마 토큰

### 다크 토큰 값을 리터럴로 복제한 곳

light/sepia에서도 다크 패널이 남아 있던 케이스.

| 위치 | 변경 전 | 변경 후 |
| --- | --- | --- |
| `GoogleDocsLayout` 그라디언트 | `to-[#323232]` / `to-[#212123]` | `to-ai-panel` / `to-research` |
| `GoogleDocsRightPanel` | `bg-[var(--ai-panel-bg,#323232)]`, `bg-[#212123]` | `bg-ai-panel`, `bg-research` |
| `GoogleDocsPanelRail` | `bg-[#212123]` | `bg-sidebar` |
| `App.tsx` export 로딩 폴백 | `bg-[#333] text-white` | `bg-app text-fg` |
| `DrawingCanvas` | `bg-[#f4f1ea] dark:bg-zinc-900`, `text-[#8B4513]` | `bg-drawing`, `text-drawing-hint` (sepia 대응 추가) |

### 미정의 CSS 변수 참조 (선언 자체가 무효화되던 것들)

전역 검사 테스트로 발견.

| 변수 | 위치 | 증상 | 처리 |
| --- | --- | --- | --- |
| `--radius-md` | `components/ui/button.tsx` (4곳) | `min(var(--radius-md),10px)`가 무효 → 해당 size 버튼의 모서리 소실 | `:root`에 `var(--radius-control)`로 정의 |
| `hsl(var(--destructive))` | `manuscript/Sidebar.tsx` | 색상 무효 → 상속색으로 표시 | `var(--danger-fg)` |
| `--muted` | `wiki/visual/RelationGraph.tsx` | 폴백 `#888`이 모든 테마에서 사용 | `var(--text-secondary)` |
| `--border-subtle` | TemplateGrid, RecentProjectsSection, ProjectTemplateSelector | 테두리 소실 | `var(--border-default)` |
| `--bg-tertiary` | TemplateGrid, ProjectTemplateSelector | 배경 소실 | `var(--bg-element)` |
| `--accent-border` | RecentProjectsSection | 테두리 소실 | `var(--accent-bg)` |

`--radius-md`와 템플릿 선택 화면 3건은 **사용자가 처음 보는 화면**에 해당한다.

### Tailwind 팔레트 직접 사용 → 토큰

- **오버레이 5곳**: `bg-black/40~60` → `bg-overlay` (`Modal`, `QuitOverlay`, `SettingsModal`, `SyncConflictResolverModal`, `world/index`)
- **상태색**: `text-emerald-500/400` → `text-success-fg`, `text-red-400/500`·`bg-red-500` → `text-danger-fg`/`bg-danger-fg`, `bg-emerald-500/20` → `bg-success-tint`, `border-red-500/40 bg-red-500/10` → `border-danger-fg/40 bg-danger-tint`
- **프로젝트 동기화 배지**: `bg-emerald-500/15 text-emerald-300` 계열 → `bg-success-tint text-success-fg` 등. `-300` 계열 글자색은 다크 기준이라 라이트에서 대비가 무너지던 곳.
- **사이드바 컨트롤 11곳**: `hover:bg-white/10` → `hover:bg-element-hover`, `hover:bg-white/5` → `hover:bg-surface-hover`, `bg-white/10` → `bg-active`
- **AI 프롬프트 입력창**: `bg-white/6`, `border-white/10`, `text-zinc-400`, `bg-white/15 text-white` → 표면/텍스트 토큰
- **배너 hover**: `hover:bg-black/5 dark:hover:bg-white/5` → `hover:bg-surface-hover` (sepia 대응)
- **템플릿 카드 테두리**: `border-white/5`, `group-hover:border-white/10` → `border-border`, `group-hover:border-border-active`
- **갤러리 카드 hover 테두리**: `hover:border-black/70` → `hover:border-border-active` (다크에서 검정 테두리는 보이지 않음)
- **accent 버튼 전경 17곳**: `bg-accent text-white` → `text-accent-fg`. 현재 `--accent-fg`는 모든 테마에서 `#ffffff`라 시각 변화는 없지만, custom hex accent를 밝은 색으로 지정하면 흰 글자가 사라진다.
- **시놉시스 노트**: `bg-yellow-50 dark:bg-yellow-900/10` → `bg-note border-note-border`
- **에디터 룰러 마커**: `fill-[#0b57d0] group-hover:fill-[#1a73e8]` → `fill-accent-bg group-hover:brightness-125`. Google Docs 고정 파랑이 사용자 accent(rose/amber 등)와 충돌하던 곳. **시각 변화 있음.**
- **출력 미리보기 종이**: `bg-[#fcfcfc]`, `#1f1f1f`, `#6b6b6b` → `--paper-*` 토큰. 값은 테마 무관 고정을 유지하되 의도를 한 곳에 명시.

### 네이티브 다이얼로그 제거

`EntityNode`의 노드 삭제 확인이 `window.confirm`이었다. renderer를 블로킹하고 테마도 따르지 않으며, 리포지토리의 `check:no-native-dialogs` 게이트가 **실패 상태**였다. 프로젝트 공용 `DialogProvider`(`useDialog().confirm`)로 교체해 게이트를 통과시켰다. 렌더러 전역에 `window.confirm/alert/prompt` 잔존 0건.

---

## 신규 토큰

`global.tokens.css`에 46개 선언 추가.

**Canvas** (`:root` 파생 + dark/sepia/high-contrast 오버라이드)
`--canvas-bg`, `--canvas-grid`, `--canvas-node-bg{,-hover,-selected}`, `--canvas-node-border{,-hover,-selected}`, `--canvas-chrome-bg`, `--canvas-chrome-border`, `--canvas-popover-bg`, `--canvas-popover-border`, `--canvas-control-hover`, `--canvas-control-active`, `--canvas-control-active-border`, `--canvas-divider`, `--canvas-handle-bg`, `--canvas-handle-border`, `--canvas-inset-highlight`, `--canvas-shadow-{rest,hover,active}`, `--canvas-node-{chapter,character,event,faction,term,world-entity}`, `--canvas-kind-chip-fg`

**상태 / 표면**
`--warning-fg`, `--success-tint`, `--warning-tint`, `--danger-tint`, `--overlay-bg`, `--note-bg`, `--note-border`, `--drawing-bg`, `--drawing-hint`, `--highlight-default`

**고정(테마 무관)**
`--paper-bg`, `--paper-ink`, `--paper-ink-muted`

**보정**
`--bg-surface-hover` (dark 추가), `--radius-md`

Tailwind 유틸리티는 `@theme`에 `--color-*` 매핑으로 노출: `bg-overlay`, `bg-ai-panel`, `bg-paper`, `text-paper-ink`, `bg-drawing`, `bg-note`, `bg-success-tint`, `text-warning-fg`, `bg-canvas-control-hover`, `text-canvas-kind-chip` 등. 빌드 CSS에서 생성 확인.

---

## 의도적으로 고정한 색 (코드에 근거 주석 추가)

토큰화하지 않은 19곳. 색이 콘텐츠이거나 외부 UI 모사인 경우.

| 위치 | 근거 |
| --- | --- |
| `ExportPreviewPanel` (103곳) | HWP / Word UI를 그대로 모사한 목업. 출력물이 그 프로그램에서 어떻게 보일지 검수하는 화면이라 앱 테마를 따르면 목적이 사라짐 |
| `MindMapBoard`, `CharacterVisualPanel` | 사용자·생성 이미지 위에 겹치는 컨트롤. 이미지 밝기와 무관하게 대비를 보장해야 함 |
| `toolbar/menus.tsx` | HSV 색 공간 그라디언트. saturation은 흰색, value는 검은색이 기준 |
| `Editor.tsx` 모바일 프레임 | `#2c2c2e` 기기 베젤 표현 |
| `AppearanceTab` accent 스와치 | 색 자체가 미리보기 콘텐츠 |
| `RecentProjectsSection` Google 로고 칩 | 브랜드 가이드상 흰 배경 필수 |
| `EditorTab`, `LocalLlmCard` 스위치 knob | iOS 관례대로 양 테마 흰색 유지 |
| `CANVAS_COLOR_PALETTE`, `HIGHLIGHT_COLORS`, `TEXT_COLORS` | 사용자가 문서에 저장하는 콘텐츠 색 |

---

## 검증

| 항목 | 결과 |
| --- | --- |
| `pnpm run typecheck` | 통과 |
| `pnpm run lint` | 18 errors. 전부 `src/main/**`의 사전 존재 `no-await-in-loop` / `preserve-caught-error`. `features/canvas`·`styles` 0건 (작업 전 canvas 경고 5건도 해소) |
| `pnpm run build` | 성공 |
| 정책 게이트 | `check:no-native-dialogs` **FAIL → PASS**, `check:renderer-store-usage` / `check:core-complexity` / `check:i18n-parity` PASS |
| `tests/renderer` + `tests/dom` | 464개 중 459 통과 |
| 실패 5건 | 작업 전과 **동일한 집합**: `rebuildMemoryCardWriterFlow` 3, `projectTemplateInitialization` 1, `useSidebarResizeCommit` 1. 모두 이번 변경 무참조이며 워킹트리에 이미 있던 `useLayoutSurfaceResizeCommit.ts` / `layoutSizing.ts` 변경에서 옴 |
| 하드코딩 색상 잔여 | 122건 = HWP·Word 목업 103 + 근거 명시 19. **미분류 0** |

### 추가한 테스트 (27개)

- `tests/renderer/styles/themeTokens.test.ts` (9) — 캔버스·전역 토큰 계약. `canvas.css`에 색상 리터럴 잔존 여부, 테마별 재정의 필수 토큰, 상호작용 상태 배경 토큰의 테마 커버리지, 종이 토큰의 고정 보장, **렌더러 전체가 참조하는 모든 `var()`가 어딘가에 정의되어 있는지**(인라인 런타임 변수 허용). 이 마지막 검사가 `--highlight-default`와 위 미정의 변수 6종을 찾아냈다.
- `tests/renderer/utils/canvasConnectionGuards.test.ts` (6) — self-loop / 중복 / 미존재 노드 / entityType 원본 전달
- `tests/renderer/utils/canvasGraphLayout.test.ts` (5) — 결정성, 연결 노드 근접, dangling 엣지 무시, 좌표 유한성
- `tests/dom/canvasGraphFiltering.test.tsx` (5) — adjacency·degree, focus 비관여, 필터 투명도, `topologySignature` 안정성
- `tests/renderer/utils/canvasAdapters.test.ts` (2) — 작업 전부터 실패 상태였던 stale 기대값 정정(`rawId`, `type`, `direction` 반영 + 선택 상태 제거)

---

## 남은 과제

1. **reactflow v11 → `@xyflow/react` v12 이관.** dev 경고의 근본 해소, React 19 정식 지원.
2. **캔버스 외부 DnD 구현.** 탐색기·사이드바에서 캔버스로 드롭, `screenToFlowPosition` 기반 좌표 변환, `BottomInteractiveToolbar`의 `new-block` / `insert-image` / `import-doc`.
3. **관계 생성 피드백.** `onConnect`가 항상 `relation: "belongs_to"`로 고정 생성하고, `isValidRelationForPair`에서 튕기면 사용자에게 아무 안내가 없다.
4. **`RelationEdge.handleSaveLabel`이 사용자 입력을 relation enum에 직접 주입.** `createRelation`에는 `isValidRelationForPair` 검증이 있는데 `updateRelation`에는 없어 임의 문자열이 저장된다.
5. **`graphSurfaceData`의 `relationshipsByNodeId`가 source 방향만 채운다.** 타깃 노드는 자기 관계 목록이 빈다.
6. **`vitest.config.ts`의 `environmentMatchGlobs`가 Vitest 4에서 동작하지 않는다.** dom 테스트들이 각자 `// @vitest-environment jsdom` 도크블록에 의존하고 있어 이 설정은 죽은 코드다.
7. **`:root`에 `--danger-fg`가 두 번 선언되어 있다**(200행 `#ef4444`, 208행 `#dc2626`). 뒤 선언이 이기므로 동작은 하지만 정리 대상.
8. **선택된 노드 테두리에 엔티티 종류 색 사용 여부.** 현재는 accent 파생. 제거한 `--node-color`를 되살려 종류 색을 쓰면 그래프가 더 읽기 쉬워지지만 디자인 판단이 필요하다.
9. **라이트 테마 스위치 off 트랙 대비.** `bg-border`(`#e5e5ea`)에 흰 knob이라 대비가 약하다. 토큰 문제가 아닌 디자인 이슈로 분류.
