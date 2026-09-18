# Renderer 개선 진행 기록

기준 문서: `renderer.md` (2026-09-08). 이 기록은 DB/Windows 항목(D)을 제외하고,
렌더러·빌드 산출물 경로에서 수행한 변경과 검증 근거를 남긴다. 커밋하지 않은 작업 트리
기준이다.

## 판단 기준

- 사용자 체감 경로(입력, 문서 전환, 캔버스 상호작용, 스트리밍)를 우선한다.
- 동작을 바꾸는 비동기화는 이전 결과가 현재 상태를 덮지 않도록 요청 식별자 또는 기존
  순서를 보존한다.
- 테스트는 호출 횟수 자체보다 저장 대상, 최신성, 결과 일치, 데이터 유실 방지라는
  관찰 가능한 계약을 검증한다.
- 수치가 필요한 항목은 재현 가능한 벤치마크가 있을 때만 수치를 주장한다. R4 감사에
  사용된 `/private/tmp/luie-renderer-audit/bench.mjs`는 현재 없으므로, 개선 수치를
  새로 주장하지 않는다.

## 처리한 R 항목

| 항목 | 상태 | 변경 | 기대 효과 | 트레이드오프 |
| --- | --- | --- | --- | --- |
| R1 저장 대상 | 처리 | raw TipTap 문서를 flush 시점에 직렬화 | 900ms debounce 안의 입력도 수동 저장/전환/언마운트에서 보존 | flush 때 직렬화 비용은 남지만, debounce 중에는 수행하지 않음 |
| R2 분할 편집 | 처리 | SplitView가 명시적인 대상 chapter id를 Editor까지 전달 | 왼쪽/오른쪽 편집기가 같은 챕터에 저장하는 오류 방지 | 추가 prop 전달 경로 |
| R3 SmartLink | 부분 처리 | 링크 가능한 엔터티의 id/name 서명 변경 때만 재스캔 | 선택 상태 등 무관한 스토어 갱신의 전체 본문 스캔 제거 | 본문 편집 자체는 아직 전체 스캔. 범위 스캔은 ProseMirror 다중 transaction 좌표와 텍스트 경계를 별도 검증한 뒤 진행 |
| R4 force layout | 처리 | O(N²) force 계산을 Vite worker로 이동하고 요청을 최신 상태로 합침 | 큰 그래프 갱신 중 renderer main thread 점유 감소 | worker 복제/결과 지연, 실행 중인 한 계산은 취소하지 못함. worker 실패 시 기존 main-thread 계산으로 복귀 |
| R5 diff | 부분 처리 | 동일 문서·비교본·모드에서 `DecorationSet` 재사용 | selection 이동 같은 doc 불변 transaction에서 diff 재계산 제거 | 문서 변경 시 동기 diff 비용은 남음; worker화는 async plugin-state 설계가 필요 |
| R6 canvas markdown | 부분 처리 | markdown storage가 있으면 `editor.getText()` fallback을 지연 평가 | 일반 저장 때 불필요한 전체 텍스트 생성 제거 | storage가 없을 때 fallback 비용은 유지 |
| R7 graph mutation | 처리 | 다중 삭제의 renderer graph 갱신·보조 스토어 refresh·그래프 문서 persist를 1회로 합침 | K개 삭제에서 K번 re-render/persist/동일 타입 reload를 1회로 축소 | 각 엔터티의 실제 삭제는 기존 순서 유지(관계 정리·패키지 export 부수효과 보존), 따라서 DB 삭제 latency 자체는 병렬화하지 않음 |
| R8 stats worker | 처리 | worker 응답에 client/request/stats key를 붙이고 보조 editor reporting을 끔 | stale stats 반영 방지, split/docs 보조 pane의 worker 왕복 제거 | 정식 editor만 footer 통계를 보고 |
| R9 project meta | 처리 | 객체 전체가 아닌 project id에 초기화 effect를 의존 | 이름 변경 같은 meta 갱신으로 graph/settings 재로드하지 않음 | id 불변이 프로젝트 identity라는 전제 |
| R10 renderer start | 처리 | i18n 완료만 기다려 render하고 setup은 선행/비차단으로 실행 | 렌더 시작의 불필요한 setup 대기 제거 | setup 실패는 앱 렌더를 막지 않고 운영 로그로만 남음 |
| R11 streaming | 처리 | token delta를 `requestAnimationFrame`당 한 상태 갱신으로 합침 | 빠른 스트림의 React 상태 갱신/paint 압력 감소 | 최대 한 프레임의 표시 지연 |
| R12 IME | 처리 | composing/229 Enter를 전송 단축키에서 제외 | 한글·일본어 조합 확정 중 오발송 방지 | 브라우저 IME 표준 플래그에 의존 |

## 변경 위치와 코드베이스 연결

- R1: `features/editor/components/Editor.tsx`, `hooks/useEditorAutosave.ts`.
  에디터가 가진 원본 문서를 autosave flush에 넘겨 저장 대상 chapter id와 함께 확정한다.
- R2/R8: `workspace/components/panels/SplitViewEditor.tsx`,
  `workspace/components/layout/GoogleDocsRightPanel.tsx`, `Editor.tsx`,
  `hooks/useEditorStats.ts`, `workers/stats.worker.ts`. 보조 에디터는 통계를 생성하지 않고,
  주 에디터의 worker 응답만 현재 chapter/request와 일치할 때 적용한다.
- R3: `services/smartLinkService.ts`, `components/extensions/SmartLink.ts`.
  네 research store의 전체 상태가 아닌 link source 목록만 서명으로 비교한다.
- R4: `canvas/components/graph/GraphSurface.tsx`,
  `canvas/workers/graphLayoutWorkerCore.ts`, `canvas/workers/graphLayout.worker.ts`.
  기존 `calculateForceLayout` 알고리즘을 바꾸지 않고 실행 위치만 worker로 옮겼다.
  결과는 position만 반영해, 늦은 worker 응답이 현재 filter/opacity 데이터를 되돌리지 않는다.
- R5: `editor/components/extensions/DiffExtension.ts`.
  ProseMirror `decorations(state)`가 state doc identity와 비교 조건이 같으면 이전
  `DecorationSet`을 돌려준다.
- R6: `canvas/components/shell/document/CanvasMarkdownEditor.tsx`.
  markdown storage 우선 경로에만 `getText()` fallback을 지연했다.
- R7: `canvas/components/viewport/BaseCanvasViewport.tsx`,
  `research/stores/worldBuilding/worldBuildingStore.{actions,graph,types}.ts`,
  `worldBuildingActions/types.ts`.
  ReactFlow의 multi-delete가 `deleteGraphNodes`/`deleteRelations`를 한 번 호출한다.
  graph helper는 id Set으로 node/연결 edge를 한 번 필터한다. entity 삭제 서비스는 실제로
  관계 삭제와 package export를 수행하므로 renderer에서는 순차 호출을 보존하고, 성공한
  결과만 한 snapshot으로 적용한다.
- R9/R10: `app/main.tsx`, `features/project/hooks/useProjectInit.ts`.
- R11/R12: `research/stores/analysis/actions/ragChatActions.ts`,
  `research/components/analysisSection/chat/useRagChat.ts`, `ai/components/AIPanel.tsx`.

## 자동 테스트 설계와 기준

테스트는 모두 실제 모듈 경계를 사용하되 IPC/worker/스토어 외부면은 mock으로 고정한다.
이는 타이밍 의존성을 줄이면서도 해당 renderer 계약이 깨지면 실패하게 하는 기준이다.

- autosave 테스트: raw draft를 수동 flush·chapter 교체·unmount 했을 때 올바른 chapter에
  최신 내용이 저장되는지 확인한다.
- SmartLink 테스트: 초기 문서, 늦은 research 데이터, 무관한 selection 갱신을 각각
  분리해 하이라이트 존재와 재스캔 부재를 확인한다.
- stats 테스트: chapter 교체 뒤 옛 worker 응답을 무시하고, `reportStats=false` pane는
  worker를 만들거나 post하지 않는지 확인한다.
- graph worker 테스트: worker core 결과가 기존 force-layout 결과와 동일한지,
  request id가 유지되는지 확인한다. 기존 layout test는 빈 그래프, 결정성, 연결 노드의
  거리, dangling edge, finite position을 함께 확인한다.
- diff 테스트: selection transaction은 동일 `DecorationSet` instance를 유지하고,
  문서 변경은 새 결과를 생성하는지 확인한다.
- R7 batch-delete 테스트: 두 노드 삭제가 연결 edge까지 제거하고 storage persist 1회,
  같은 Character backing store refresh 1회를 만드는지 확인한다. 관계 두 개 삭제도
  persist 1회인지 확인한다. 이 기준은 성능 구현의 핵심 계약(중복 작업 제거)과 데이터
  정합성(연결 edge 제거)을 동시에 잡는다.
- stream/IME 테스트: 한 frame 안의 두 delta가 상태 갱신 한 번으로 합쳐지는지, IME
  Enter는 전송하지 않고 일반 Enter만 전송하는지 확인한다.

실행 결과 (2026-09-11):

```bash
SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run \
  tests/dom/editorAutosaveManualFlush.test.tsx \
  tests/dom/editorAutosaveChapterTargeting.test.tsx \
  tests/dom/editorChapterSwap.test.tsx \
  tests/dom/splitViewEditorContentGate.test.tsx \
  tests/dom/smartLinkInitialScan.test.tsx \
  tests/dom/canvasSaveBuffer.test.tsx \
  tests/dom/editorStatsWorkerIsolation.test.tsx \
  tests/dom/projectInitOperationalScenarios.test.tsx \
  tests/dom/ragChatFrameBatch.test.ts \
  tests/dom/ragChatImeEnter.test.tsx \
  tests/renderer/utils/canvasGraphLayout.test.ts \
  tests/renderer/utils/canvasGraphLayoutWorkerCore.test.ts \
  tests/dom/canvasGraphFiltering.test.tsx \
  tests/dom/diffExtensionCache.test.tsx \
  tests/dom/worldBuildingStoreBatchDelete.test.ts \
  tests/renderer/stores/worldBuildingStore.graph.test.ts
```

결과: 16 files, 66 tests passed.

`pnpm run build` 통과. `node scripts/check-render-boot-budget.mjs` 통과:
boot JS 580.9 KB / 600 KB, boot CSS 166.2 KB / 170 KB. build 산출물에
`graphLayout.worker-*.js` (2.46 KB)가 별도 생성되는 것도 확인했다.

`node_modules/.bin/tsc6 --noEmit`은 다음 기존 오류 한 건으로 실패한다. 변경 파일은
보고하지 않았다.

```text
src/renderer/src/features/manuscript/components/Sidebar.tsx(157,5):
TS6133: 'handleRenameProject' is declared but its value is never read.
```

## 수동 UI 확인 목록

1. 일반 editor에서 글자를 입력한 직후 저장/챕터 전환/창 닫기를 각각 실행하고, 재진입해
   마지막 입력이 남았는지 확인한다.
2. Split View에서 서로 다른 두 chapter를 열어 각각 수정·저장하고, 반대편 chapter가
   바뀌지 않는지 확인한다.
3. 한글 IME 조합 중 Enter는 전송하지 않고, 조합 완료 후 Enter는 채팅 전송되는지 확인한다.
4. 100개 이상 node/edge 그래프에서 filter 변경, 빠른 연속 filter 변경, 화면 이탈을
   수행한다. UI가 멈추지 않고 마지막 filter 상태의 위치/투명도가 유지되어야 한다.
5. Diff mode에서 커서만 이동할 때 표시가 유지되고, 실제 편집 때 diff가 즉시 갱신되는지
   확인한다.
6. Canvas/Graph에서 다중 선택 후 Delete를 실행한다. node·연결 relation이 함께 사라지고,
   앱 재시작 또는 graph 재진입 후에도 삭제 상태가 유지되어야 한다. node 삭제와 edge
   삭제를 별도로도 확인한다.
7. Docs/분할 보조 editor를 열고 chapter를 빠르게 전환한다. footer 통계가 이전 chapter의
   수치로 잠깐 바뀌지 않아야 한다.
8. 긴 RAG 응답을 스트리밍해 스크롤·입력이 끊기지 않고, 완료/중지 시 마지막 token이
   빠지지 않는지 확인한다.

## 남은 범위

- R3의 문서 변경 범위 재스캔, R5의 diff worker화, R6 selection-driven rerender 완화는
  별도 설계·성능 측정이 필요한 후속이다.
- D 항목과 Windows 패키지/운영체제 검증은 현재 환경 제약으로 수행하지 않았다.
