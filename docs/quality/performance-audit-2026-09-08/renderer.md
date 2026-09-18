# Renderer 심층 성능·메모리·비동기 감사

감사 범위: renderer/app 시작, Editor/TipTap/SmartLink/diff/statistics, manuscript 본문 캐시·저장, canvas/ReactFlow/graph mutation, research 자료/채팅/메모리, export, shared UI 저장 registry. 읽기 전용 감사이며 소스 수정·실앱 기동·사용자 DB 접근·native rebuild 없음. 기존 package.json/pnpm-lock.yaml 변경은 건드리지 않음. 그래프 MCP 미제공 확인 후 scoped rg/read 사용. Renderer/features AGENTS 및 DESIGN.md 읽음. docs/quality/frontend-css-agents.md는 현 작업트리에 없음. React best-practices/ponytail 적용.

상태 표기: **확정**은 실제 소스 경로의 비용/결함이 확인됨을 뜻하며 전체 앱의 지연값은 뜻하지 않는다. **재현**은 분리 검사에서 관찰했다는 뜻이다. **측정 필요**는 packaged Electron/실제 OS에서 실제 크기·빈도 검증이 남았다.

## 우선순위 및 근거

### R1 · P1 · 저장 최적화가 raw editor draft를 유실시키는 900ms 공백 — 재현

- `src/renderer/src/features/editor/components/Editor.tsx:160`: onUpdate는 타이머만 갱신하며 900ms 뒤에야 getHTML/getText → setContent를 수행한다. useEditorAutosave에 넘어간 content는 그때까지 이전 본문이다(`:114`). 첫900ms 동안 lifecycle dirty도 갱신되지 않는다.
- `src/renderer/src/features/editor/hooks/useEditorAutosave.ts:283`: flushLatestDraft는 React로 전달된 latestDraftRef만 읽고 raw TipTap document/900ms timer를 모른다. `:319`에서 이 flusher만 registry에 등록한다.
- `src/renderer/src/features/editor/components/Editor.tsx:136`: unmount에서 raw serialization timer를 clear하고 본문을 직렬화하거나 저장하지 않는다. 따라서 저장 전환/종료를 최적화할 때 debounce를 단순 연장하면 데이터 유실창도 늘어난다.
- 호출 흐름: TipTap onUpdate → 900ms → React content → autosave 300ms(`src/shared/constants/runtime/interactionTiming.ts:5`) → handleSave/IPC. 수동 저장은 `saveCoordinator.ts:25`의 flushSaveBuffers → main manualSave, 종료는 `useProjectQuitFlush.ts:17`의 동일 registry를 사용하므로 앞단900ms가 빠져 있다.
- 분리 재현 `/private/tmp/luie-renderer-audit/editor-buffer.test.tsx`: 실제 Editor + 실제 useEditorAutosave를 사용하고 기존 테스트의 TipTap mock만 재사용. (a) onUpdate 직후 flushSaveBuffers → onSave 0회,900ms 후 flush→최신본문 저장. (b)900ms 전에 unmount→2초 후에도 onSave0회. 두 관찰 assertion 통과. 실제 native IME/OS close 자체를 재현한 검사는 아님.
- 최소 수정안: raw document의 dirty/version 및 serialization flush를 기존 저장 registry에 연결. 수동저장·chapter 전환·unmount/종료 때 최신 raw 문서를 정확한 chapterId로 직렬화하고 저장을 await하도록 같은 경로로 모은다. 평상시 debounce는 유지 가능하나 저장 보장과 분리해야 한다.
- 기존 `editorAutosaveManualFlush`/`editorAutosaveChapterTargeting` 테스트는 hook에 이미 최신 content를 직접 전달하므로 이900ms 경계를 검증하지 않는다.

### R2 · P1 · SplitViewEditor wrapper가 이전 챕터 저장 타깃을 버림 — 실제 wrapper + 실제 hook 통합 재현

- `src/renderer/src/features/workspace/components/panels/SplitViewEditor.tsx:39`: key에 chapterId가 없어서 챕터 전환 시 인스턴스를 재사용한다.
- 같은 파일`:49`: onSave wrapper가 `(nextTitle, nextContent) => onSave(nextTitle, nextContent, chapterId)`이므로 useEditorAutosave가 세 번째 인자로 전달한 previousChapterId를 무시한다.
- `useEditorAutosave.ts:260`에서 챕터 전환 미저장 draft를 previousChapterId로 flush하려고 하지만 onSaveRef/performSaveRef는 새 render callback으로 갱신된 뒤 이 effect를 수행한다. 따라서 새 chapterId를 강제하는 wrapper가 이전 draft를 새 원고로 보낼 수 있다.
- 최소 수정안: wrapper를 제거하여 원본 onSave를 전달하거나 `(title,content,targetChapterId) => onSave(title,content,targetChapterId ?? chapterId)`로 계약을 보존. pending save가 있는 전환까지 integration regression으로 확인 필요.
- 최종 bounded integration probe `/private/tmp/luie-renderer-audit/split-chapter-target.test.tsx`는 실제 SplitViewEditor와 실제 useEditorAutosave를 연결했다. TipTap display만 이전 local title/content를 유지하는 harness로 대체했다. A 저장본문 → A 최신 미저장본문 → 300ms debounce 전 B 전환(content 미도착/suppressed) 시 `onSave("A title", "<p>A unsaved latest</p>", "chapter-b")`가 1회 실행되고 chapter-a 저장은 0회였다. 이후 wrapper에 명시 target chapter-a를 직접 전달해도 chapter-b로 바뀌는 계약 위반도 함께 확인했다. 단독 1 file / 1 test PASS, 761ms. 따라서 원인과 chapter 전환 호출 흐름을 모두 분리 환경에서 재현했으며 native Electron UI 전환을 직접 조작한 검사는 아니다.
- hook 단독 타깃 테스트의 성공을 wrapper 타깃 보장으로 확대 해석하면 안 된다. 이번 검증에서 다른 벤치와 suite는 재실행하지 않았다.

### R3 · P1 · SmartLink가 매 입력과 무관한 store 변경에 전체 원고를 동기 스캔 — 재현·실측

- `src/renderer/src/features/editor/components/extensions/SmartLink.ts:30`: 모든 tr.docChanged에서 findSmartLinks(tr.doc). `:49` requestRescan 및`:55` 네 연구 store의 selector 없는 subscribe는 currentItem/isLoading/error 변경에도 동일 스캔을 발화한다.
- `src/renderer/src/features/editor/services/smartLinkService.ts:52`: service 자체도 네 store의 모든 변경에 정규식/엔티티 map 캐시를 무효화한다. `:119` findSmartLinks는 전체 doc.descendants → text마다 regex.exec → 모든 decoration 새 할당 → DecorationSet.create(`:156`). 매치→entity Map 최적화는 이미 적용되어 있으며 그것을 다시 권고할 이유는 없다.
- 비용: 매 keystroke마다 본문 전체 탐색 + M개의 decoration 재구축. 여러 editor가 살아 있으면 store rescan 비용이 editor 수에 곱해진다. IME 조합 중에도 docChanged가 생성되면 경로를 통과한다.
- 실제 ProseMirror document/DecorationSet 사용, DOM mount와 IPC를 제외한 분리 측정(`/private/tmp/luie-renderer-audit/smartlink-results.json`): 100문단/5,300자/400매치 median0ms, 1,000문단/53,000자/4,000매치 7ms, 5,000문단/265,000자/20,000매치 144ms(워밍업 후3회; millisecond 반올림). 실제 store의 currentItem만 변경해도 scan1회 발생하는 assertion 통과.
- 최소 수정안: store listener는 이름/id/type 집합이 바뀔 때만 invalidation/rescan. 일반 typing은 tr.mapping으로 기존 decoration 위치를 갱신하고 changed textblock만 재스캔. Worker 도입 전에 불필요한 전체 스캔 자체를 제거한다. 변경 범위 경계의 긴 이름·한글조합·삭제·undo/redo 검증 필요.

### R4 · P1 · 그래프 force layout이 renderer에서 75/85×N² 동기 실행 — 실측

- `src/renderer/src/features/canvas/components/graph/GraphSurface.tsx:81` effect →`:104` calculateForceLayout. node/edge 구성 또는 character/event mode 변경 때 실행한다. focusId 클릭 재실행 방지는 이미 되어 있다.
- `src/renderer/src/features/canvas/utils/graphLayout.ts:63`: iterations loop 내부`:68`/`:72`의 모든 i,j 쌍 비교. `graphSurfaceParts/constants.ts:7`/`:8`에서75/85회 지정. edge 인덱스 Map도 이미 있다.
- 최신 보존 JSON, macOS arm64 Node22.23.0 실제 순수 함수 워밍업+3회 median: N100/E99 4ms, N500/E499123ms, N1000/E999359ms, N2000/E19991444ms(75회). 브라우저/OS 비교 벤치가 아니라 단일-thread 알고리즘 비용 측정이다.
- 최소 수정안: 기존 순수 함수를 Worker로 옮기고 request generation으로 stale 결과를 폐기. 취소/새 topology coalescing 필요. N 증가에도 전량 쌍 비교는 총CPU 비용이 유지되므로 이후 측정에 따라 spatial approximation/기존 dagre 등 레이아웃 요구에 맞는 알고리즘 선택. 단순 await/Promise.resolve는 thread를 바꾸지 않는다.
- DOM도 GraphSurface와 BaseCanvasViewport가 모든 노드/엣지를 전달하며 visibility culling 옵션을 사용하지 않는다. 불투명도0 focus는 DOM 제거가 아니므로 layout 개선 후에도 pan/zoom paint/DOM 비용 별도 측정 필요.

### R5 · P1 · 50k문자 제한 이하에서도 snapshot diff가 수초 동기 실행 — 실측

- `src/renderer/src/features/snapshot/components/SnapshotViewer.tsx:75` useMemo에서 HTML 문자열에 diffWordsWithSpace를 동기 수행한다. 상한은 합산50k자뿐이며 토큰 차이량/시간 상한이 없다.
- `src/renderer/src/features/editor/components/extensions/DiffExtension.ts:67` decorations(state)에서 매호출 getDocTextMap/HTML→text/단어diff를 다시 수행(`:73`,`:81`). doc이 안 바뀐 selection transaction에도 결과 캐시가 없으며 added-part마다 전체 mapping을 다시 순회(`:101`). snapshot viewer와 highlight editor가 각각 diff를 계산한다.
- 최신 JSON `/private/tmp/luie-renderer-audit/bench-results.json`: 실제 설치 diff9.0.0, 서로 다른 `a0...`/`b0...` 단어 입력 각1000개/합9778자145ms, 각2000개/21778자575ms, 각4000개/45778자2320ms. 모두 코드의50k 제한 이하. 토큰 전부 변경된 스트레스 입력이며 일반 원고의 평균값은 아님.
- 최소 수정안: 문서/비교본 revision에 대해 diff/decorations 캐시, selection만 변하면 mapping 재활용. 시간/작업량 제한을 가진 worker 계산(설치 diff의 옵션을 먼저 확인)과 취소·오래된 결과 폐기. 결과 목록도 수천 additions이면 가상화 필요. 기존50k 일괄 skip으로만 해결하면 장편 기능을 포기하는 셈이므로 요구를 따로 정해야 한다.

### R6 · P2 · CanvasMarkdownEditor는 저장만 debounce하고 매 입력 전체 직렬화 — 확정

- `src/renderer/src/features/canvas/components/shell/document/CanvasMarkdownEditor.tsx:139`: getMarkdown(editor.storage, editor.getText())에서 fallback인 getText()를 먼저 전체 실행한 뒤 getMarkdown도 실행한다. 결과 최신 ref 갱신 후500ms 저장 timer. `:147`/`:150`는 입력과 selection마다 forceUpdate({})로 toolbar/bubble/editor shell 전체 React render를 강제한다. extensions 배열도 render마다 재생성된다.
- N자 원고×입력건수의 직렬화/문자열 할당·GC + selection render. 글자수가 많은 canvas 문서에서 main editor의900ms 정책과 다른 hot path다.
- 최소 수정안: fallback lazy 평가로 getText 불필요 실행부터 제거. 문서직렬화는 revision/dirty ref로 지연하되 R1처럼 flush 손실창을 만들지 않는다. toolbar의 실제 선택 상태만 TipTap useEditorState로 구독하여 forceUpdate 제거.
- 설치 @tiptap/react/src/useEditor.ts:363-364는 shouldRerenderOnTransaction을 생략해도 transaction rerender를 비활성화한다. main Editor의 옵션 미지정을 rerender 버그로 지적하는 것은 오탐이다. 여기서는 직접 forceUpdate이므로 확정이다.

### R7 · P2 · 여러 그래프 항목 삭제·이동이 전체 그래프를 반복 저장 — 확정

- `src/renderer/src/features/canvas/components/viewport/BaseCanvasViewport.tsx:182`: 여러 node 삭제를 reduce Promise chain으로 하나씩 순차 처리. edge도`:196` 같은 경로. 데이터 일관성을 위해 순차화한 의도는 타당하지만 각 항목마다 전체 저장한다.
- `src/renderer/src/features/research/stores/worldBuilding/worldBuildingStore.actions.ts:227`: 개별 삭제→그래프 filter→syncGraphBackedStore 전체 목록 재조회(`:241`)→persistGraphDocument(`:242`). 개별 관계 삭제도`:331-341` 전체 document 저장.
- `worldBuildingActions/runtime.ts:40-93`: 각 작업의 전체 graphData snapshot을 Promise closure로 보관하고 buildWorldGraphDocument→IPC setDocument를 매작업 수행한다. queue는 직렬화하며 중간 state를 합치지 않는다. 느린 filesystem/IPC에서 pending snapshot 배열/graph 객체가 증가할 수 있다.
- batch positions라는 API는 이미 있다(`worldBuildingStore.actions.ts:175`)지만 내부에서도 K개의 updateNodePositionInGraph 전체 nodes map(`:196`) 및 K개 updatePosition IPC를 Promise.all로 발사(`:208`), 마지막 전체 graph persist1회. K×N scan과 burst가 남는다.
- 최소 수정안: 사용자 한 번의 multi-select 변경을 하나의 graph mutation으로 만들고 nodes Map으로 한번 갱신, 엔티티 mutation 완료 뒤 전체 graph persist1회. 기존 updateGraphNodePositionsBatch 재사용 가능. 중간 snapshot coalescing은 호출자 acknowledgment/실패 보존 계약을 먼저 정의하고 구현한다.

### R8 · P2 · 통계 worker 공유에 editor/request ID가 없어 교차갱신·오래된 응답 가능 — 확정

- `src/renderer/src/features/editor/hooks/useEditorStats.ts:18`: 모든 Editor가 singleton worker를 acquire,`:20` 모든 message를 무조건 global setStats. postMessage는 `{text}`만 전송(`:42`), worker 응답도 count만 반환(`workers/stats.worker.ts:33`).
- main+split+snapshot이 모두 hook을 mount한다. readOnly가 초기통계를 보내지 않도록 한 guard는 있으나 listener는 붙는다. A가 요청하고B로 전환한 뒤A응답이 도착하면B통계에 적용할 수 있다. 동시에 Editor H개가 있으면 응답1건에 동일 store set H회. StatusFooter는 전체 stats store를 구독(`src/shared/ui/StatusFooter.tsx:11`).
- 최소 수정안: editor/chapter key + monotonic requestId를 응답에 돌려주고 활성 대상의 최신 응답만 commit. readOnly/숨김 footer 등 소비자가 필요없는 경우 hook 일을 생략. worker 하나 자체는 적절하며 매 전환마다 spawn/terminate로 되돌릴 필요 없음.
- getText 및 string postMessage 복사 비용은 renderer에 남는다. worker가 전체 문자열 복사·ProseMirror traversal까지 없애는 것은 아니다. 필요 시 변경된 textblock별 통계 누적을 측정 후 고려.

### R9 · P2 · 같은 프로젝트 metadata 갱신이 프로젝트 전체 초기화를 반복 — 확정

- `src/renderer/src/features/project/hooks/useProjectInit.ts:13`가 currentItem 객체 전체 구독,`:81` effect dependency도 객체 전체. 제목/설명·path 갱신으로 동일ID 새객체가 되면`:59` chapters/characters/events/factions/terms5개 전체load 반복.
- `src/renderer/src/shared/store/createCRUDStore.ts:295`는 update response를 currentItem으로 교체한다. `chapterStore.ts:103` loadAll은 content cache reset부터 하므로 단순 project rename도 본문 캐시 무효화+재조회+SmartLink rescan 폭증으로 이어질 수 있다.
- 최소 수정안: 프로젝트 전환 effect는 primitive currentProjectId에 의존. 복원/임포트 같은 외부 데이터 변경은 기존 명시 loadAll 경로로 유지하여 신선도를 보장한다. 프로젝트 rename과 restore/import를 나눈 call-count 검사 필요.

### R10 · P2 · 초기 paint가 설정 IPC 완료를 기다리고 별도 창도 공통 초기화 — 확정, 사용자 지연 측정 필요

- `src/renderer/src/app/main.tsx:74`: i18nPromise와 setupRendererPromise가 모두 settled되어야 root render. setupRenderer는 먼저 cached theme을 반영하지만 `src/renderer/src/app/setup.ts:116` 이후 settings.getEditor를 await하므로 theme seed가 있어도 첫React shell은 IPC 완료 전 그리지 못한다.
- 이후 `useProjectInit.ts:29`가 editorStore.loadSettings→동일 getEditor를 또 호출한다. `App.tsx:133` useProjectInit 호출은 export(`:411`),oauth,wizard(`:465`) 조기return보다 앞에 있으므로 bootstrapReady인 별도 창도 projects/settings를 load한다.
- 최소 수정안: cache/default theme shell을 먼저 그린 뒤 settings hydrate를 background 처리하고 부트에서 이미 가져온 editor settings를 재사용. windowMode별 필요한 초기화만 활성화. 설정 실패·잘못된 캐시·초기 마이그레이션 gate를 유지해야 한다.
- root fresh isolated build 결과: JS573.1KB/17files(예산600), CSS166.1KB(170), PASS. 기존 out1108.9KB는 stale이라 성능 finding에서 제외. fresh build의 INEFFECTIVE_DYNAMIC_IMPORT(manuscript barrel)은 청크 분리 의도가 무효인 근거이며 현재 부트 budget 초과는 아니다.

### R11 · P2 · RAG delta마다 전체 메시지 render·smooth scroll, 세션 history 무상한 — 확정, 실효 비용 측정 필요

- `src/renderer/src/features/research/stores/analysis/actions/ragChatActions.ts:79`: delta마다 messages.map + 해당 content에 문자열 append. `:42`는 신규 질문·응답을 영구 append하고 상한/페이지 분리 없음.
- `src/renderer/src/features/research/components/analysisSection/chat/useRagChat.ts:52`: 매messages변경 bottom.scrollIntoView({behavior:'smooth'}). 사용자가 위쪽 과거 답을 보고 있어도 stream마다 스크롤을 재요청.
- `.../chat/MessageList.tsx:40`: 과거 메시지 및 evidence DOM까지 매delta 전체 map, row memo/가상화 없음. input도 같은 useRagChat hook/store selection이므로 새질문 입력중에도 상위 AnalysisSection re-render와 전체 목록 render가 발생한다.
- `analysisStore.ts:115`에 reset은 있지만 renderer production caller가 검색되지 않음. 프로젝트 전환 뒤에도 답변/evidence/narrativeMemory객체가 global session store에 남는다. bytes 기준 상한 없음.
- 최소 수정안: 스트림 chunk를 rAF/짧은 시간 단위로 묶고 마지막 message만 갱신; 기존 row memo+이미설치 react-virtuoso 사용; 사용자 bottom-follow일 때만 스크롤. 대화 history는 프로젝트/세션별 명확한 수명과 저장/페이지 정책을 정하며 임의 삭제하지 않는다.
- 별도 mock에서 ask Promise reject시 isStreaming=true가 남는 경로는 재현했지만 preload safeInvoke가 정상 transport/timeout 실패를 envelope로 반환하므로 실제 timeout defect로는 **제외**했다. 뜻밖의 bridge throw 방어만 P3 후보이다.

### R12 · P2 · 한글/일본어 IME 확정 Enter가 곧바로 RAG 전송 — 코드 경로 확정, OS 실기 확인 필요

- `.../analysisSection/chat/useRagChat.ts:66`: Enter && !shiftKey만 검사하고 preventDefault/onSend. nativeEvent.isComposing, keyCode229 또는 composition 상태 확인 없음. PromptComposer.tsx의 textarea가 이 handler를 그대로 사용한다. `features/ai/components/AIPanel.tsx:78` 시뮬레이션UI에도 같은 형태가 있다.
- 조합중 문장을 확인하는 Enter가 요청 전송/비싼 inference를 시작하면 UX와CPU/메모리 낭비 모두 생긴다. shared BufferedInput은 compositionStart/end와 flush 정책이 이미 있으나 이 composer에는 적용 안 됨.
- 최소 수정안: 조합중 Enter 제외, 실제 macOS KOR/JPN·Windows Microsoft IME·Linux IBus/Fcitx에서 compositionend/keydown 순서를 확인. jsdom synthetic event만으로 OS일관성을 주장하지 않는다.

### R13 · P2 · 연구 갤러리·사이드바는 전량 DOM, 숨긴 탭도 메모리에 유지 — 확정, 임계규모 실측 필요

- `src/renderer/src/features/research/components/wiki/EntityGallery.tsx:167` 검색키마다 이름+description 전체 lowerCase/filter, `:362`/`:467`는 모든 entity card/row를 렌더. 이미지 lazy/async decoding과 attributes500-entry cache는 이미 적용되어 있다.
- `ResearchPanel.tsx:217`/`:245`/`:273`: 한번 방문한 character/event/faction을 CSS hidden으로 유지. state/DOM/subscription은 살아 있으므로 프로젝트 전환/자료변경 시 안 보이는 탭도 작업한다. 의도는 remount/selection보존이며 완전누수라고 부르면 부정확하다. 다만 많은 자료·중복 panel에서 resident memory 및 render 비용에 더해진다.
- SidebarChapterList.tsx:130, SidebarCharacterList.tsx:184 등은 전체 map. Sidebar 상위 content-visibility:auto 한개는 리스트 내부 row 수를 제한하지 않는다.
- 최소 수정안: 이미설치 react-virtuoso로 큰목록만 가상화하고 검색용 정규화text는 entity데이터변경 때만 생성. 숨김tab의 expensive 구독/계산을 정지하거나 필요한 UI상태만 보존. 작은목록은 그대로 두어도 된다.

## 메모리·수명 추가 관찰(P3/측정 후 결정)

- `worldPackageStorage.ts:86,134,144,167`: synopsisCacheByProject는 프로젝트별 strong Map이며 eviction/clear가 없다. 장기세션에서 방문한 모든 프로젝트 시놉시스를 보유. 소수 프로젝트에는 작을 수 있으므로 실제 retained bytes 측정 후 bounded eviction/close invalidate.
- `saveCoordinator.ts:15-20,41-44`: 매수동저장 performance.measure 두개 누적, production clearMeasures는 검색되지 않음. 낮은빈도라 큰병목으로 과장하지 않고 장기계측 ring buffer/observer drain 후보로 기록.
- `chapterContentStore.ts:19`4-entry 상한·inflight coalescing·generation invalidation·active retain은 이미 적용. 단 엔트리수는 bytes상한이 아니며 열린editor는 상한을 넘어 유지한다. 활성문서를 버려IPC ping-pong을 만드는 공격적메모리최적화는 금지. unmount 후 release는 다음 setContent 때까지 eviction을 즉시 수행하지 않는다.
- `parseStructuredAttributes.ts:6`500-entry FIFO는 이미 존재. image data URI가 attributes에 들어가면 원문string+파싱string+DOM/decodebitmap이 각 layer에 존재할 수 있으므로 엔트리수와 실제byte를 함께 관찰해야 한다.
- listener/timer 정리는 editor SmartLink destroy, typewriter RAF, ResizeObserver, save timers 등 주요경로에서 구현됨. 타이머가 있다는 이유만으로 메모리누수를 주장하지 않았다.
- ExportManager는 단일chapter 조회이고 sanitize/prepare는 content변경에 memo화되어 있다. 전체project export로 오인하지 않았다. `ExportPreview.tsx:124`는 chapter전체 DOM을 한sheet에 넣고 typography/margin 변경시 전체reflow 가능, `:90` transition-all은 layout속성 애니메이션 비용 후보. 긴본문일 때만 실제measure 후 preview pagination/범위렌더 고려. exportCreate로 다시 전체content를 보내는 IPC복사는 별도창에서 수정하지 않는본문이라 생략가능성 있지만 export snapshot 계약을 먼저 확인해야 한다.

## 확인된 기존 개선 및 오탐 배제

1. 본문은 chapter list DTO에서 분리,4-entryLRU 및 retain/inflight/generation 적용.
2. 대부분 hot store는 selector/useShallow이며 main Editor의 TipTap transaction rerender는 설치버전 기본으로 꺼짐.
3. graph focus시force layout재실행 차단,edge-nodelookup Map,adjacencySet 적용.
4. graph drag시position은 drag-end persist,main graph canonical writes는 queue직렬화.
5. locale는 감지언어+ko fallback만 초기로드,나머지lazy. editor/layout/research/export 화면lazy+hoverprefetch 적용.
6. fresh renderer boot budget PASS. stale out는근거로사용안함.
7. export HTML sanitize memo,이미지lazyload,attributesparse cache,기존엔티티ensureLoaded dedup 적용.
8. 통계 worker1개 공유는spawn churn을줄이는선택이며문제는응답식별/소비자수명이다.

## 실행 검증·재현 산출물

기존 suite 명령:

```sh
SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run tests/dom/editorAutosaveManualFlush.test.tsx tests/dom/editorAutosaveChapterTargeting.test.tsx tests/dom/editorStatsOnCreate.test.tsx tests/renderer/stores/chapterContentStore.test.ts tests/renderer/services/saveCoordinator.test.ts
```

결과 5 files / 34 tests PASS, 1.29s. native DB 초기화 및 실앱 실행 없음.

분리감사 명령:

```sh
node /private/tmp/luie-renderer-audit/bench.mjs
SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run --config /private/tmp/luie-renderer-audit/vitest.config.mjs
```

최종 분리 suite 3 files / 4 tests PASS, 1.49s. editor-buffer 2개 + smartlink-cost 1개는 확정 관찰이다. rag-state 1개는 정상 preload 경로와 달라 실제 결함 목록에서 제외했다. 임시 directory의 node_modules symlink는 기존 설치 패키지를 읽는 용도다.

파일:
- `/private/tmp/luie-renderer-audit/bench.mjs`: actual graphLayout/diff9.0.0벤치.
- `/private/tmp/luie-renderer-audit/bench-results.json`: 최신공통벤치결과. final보고는이JSON수치사용.
- `/private/tmp/luie-renderer-audit/smartlink-results.json`: actualProseMirror/DecorationSet벤치.
- `/private/tmp/luie-renderer-audit/editor-buffer.test.tsx`: 900ms flush/unmount 공백 2건 관찰.
- `/private/tmp/luie-renderer-audit/split-chapter-target.test.tsx`: 실제 SplitViewEditor + 실제 autosave hook의 전환 타깃 오라우팅 관찰 1건.
- `/private/tmp/luie-renderer-audit/smartlink-cost.test.tsx`:정상선택store변경rescan관찰및벤치.
- `/private/tmp/luie-renderer-audit/rag-state.test.tsx`:정상preload와다른exception모델대조용,실사용timeout재현아님.
- `/private/tmp/luie-renderer-audit/vitest.config.mjs`:repoaliases+기존setup사용,외부tmp테스트범위.

root 검증 공유: fresh isolated build `/private/tmp/luie-audit-build/out` 성공 및 boot budget PASS. tsc6 --noEmit는 기존 `src/renderer/src/features/manuscript/components/Sidebar.tsx:157` unused handleRenameProject 1건으로 실패했다. 이번 renderer 감사는 소스 변경이 없으므로 자체 타입 회귀가 아니다.

## OS 검증 순서

핵심 알고리즘·직렬화·상태 경계는 macOS/Windows/Linux에 공통적이다. 실제 측정은 macOS arm64 Node에서만 했으며 Windows/Linux 속도를 확정하지 않았다. Windows x64/arm64, macOS arm64/x64, Linux Wayland/X11의 packaged production에서 동일 fixture로 입력 p95, long task, 메모리 peak, idle CPU, graph pan/layout, IME Enter 및 native quit flush를 비교해야 한다. JS thread 병목은 OS 플래그나 일괄 worker 증설보다 불필요한 전체 연산과 원고 유실 경계를 먼저 제거하여 해결해야 한다.


### R2 추가 단독 검증 명령

```sh
SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run --config /private/tmp/luie-renderer-audit/vitest.config.mjs /private/tmp/luie-renderer-audit/split-chapter-target.test.tsx
```

1 file / 1 test PASS (761ms). 기존 벤치 JSON은 변경하지 않았다.
