# Renderer Optimization Audit Result

조사 대상: `src/renderer/**` (사이드바 렌더링 · RAM/메모리)
기준 문서: `.kiro/skills/vercel-react-best-practices/rules/*.md`, `src/renderer/AGENTS.md`
상태: **초기 감사 + 2026-08-31 구현/검증 동기화 + 3차 정밀 재감사. O1-a, O1-b1, O1-b2, O2, O3 완료. O4~O12는 미착수다. 3차 재감사에서 신규 항목(N1~N8)과 문서 자체의 오류 2건을 찾았고 N1·N2·N3를 반영했다(§7).**

---

## 0. 검증 절차와 표기 규약

1차로 서브에이전트 2트랙(사이드바 렌더링 / 메모리)을 병렬 실행했고, 보고된 모든 항목을 **스킬 규칙 원문과 실제 코드로 재검증**했다. 1차 보고에는 오판이 있었고(§4) 이 문서에는 재검증을 통과한 항목만 남겼다.

규칙 매칭은 세 등급으로 구분한다. 이 구분이 없으면 규칙을 실제 적용 범위를 넘어 끌어다 쓰게 된다.

| 표기 | 의미 |
| --- | --- |
| **직접 적용** | 규칙 원문의 Incorrect 예시와 코드 구조가 일치 |
| **원리 적용** | 규칙의 전제(RSC, searchParams 등)는 다르지만 동일한 원리가 성립 |
| **매칭 없음** | 스킬에 해당 규칙이 없음. 일반 성능/코드 결함 |

확신도는 `코드 확인`(파일:줄로 확인) / `측정 필요`(코드로는 구조만 확인 가능)로 나눈다. 심각도는 스킬이 선언한 impact와 다를 수 있어 둘을 따로 적었다.

### 현재 구현 상태 요약 (2026-08-31)

| 범위 | 상태 | 현재 근거 |
| --- | --- | --- |
| O1-a: main 목록 조회 N+1 제거 | **완료** | `chapterBody` 배치 조회 + `Map` 병합. 20챕터 기준 select 21회 → 2회. |
| O1-b1: renderer 본문 전용 캐시/구독 경로 | **완료** | LRU 4, 동시 요청 dedup, retain 보호, reset 세대 가드, 로딩 게이트 구현. |
| O1-b2: 목록 IPC/store에서 본문 제거 | **완료** | `getAllChapters()`가 `ChapterListItem[]`을 반환하고 `chapterStore.items`도 같은 타입이다. body 조회가 사라져 목록 왕복은 select 1회다. store 경계에서 create/update/get 응답의 본문을 투영해 되살아나는 경로도 막았다. |
| O2: autosave 목록 리렌더 제거 | **완료** | 본문은 `chapterContentStore`만 갱신한다. 제목이 바뀔 때만 `applyOptimisticTitle`이 해당 항목을 교체하고, 그 외에는 `items` 배열 참조를 유지한다. |
| O3: 상시 Binder 본문 구독 제거 | **완료** | `BinderBarCompactHover`의 본문 구독/prop 전달을 제거하고 `SnapshotViewer`가 필요할 때 직접 구독한다. |
| 복원 안전성/깜빡임 | **완료·회귀 가드 있음** | 캐시 reset 즉시 무효화, stale response 차단, 복원 본문 seed, Editor 로딩 게이트, pointer-down 프리페치 적용. |
| O4~O12 | **미착수** | 이 문서의 분석/수정안 상태 유지. 3차 재감사에서 9건 전부 잔존 확인(줄번호 동일). |
| N1~N8 (3차 신규) | **N1·N2·N3 완료, 나머지 미착수** | §7에 근거와 수정안. N1은 `SplitViewEditor.tsx` 분리 + 로딩 게이트, N2는 O1-b2에서 `ChapterListItem` 채택으로 해소. |
| Tailwind 미정의 유틸 30건 | **보류(사용자 결정)** | §7-N8에 근거만 기록. 이번 회차 작업 범위에서 제외. |

> 중요: O1-b1의 캐시가 구현됐다는 사실만으로 O1이 해결된 것은 아니다. 현재 목록 응답과 `chapterStore.items`에도 본문이 남아 있어 같은 문자열이 목록 store와 전용 캐시에 동시에 존재할 수 있다. 실제 renderer 힙 감소는 O1-b2 이후에 발생한다.

---

## 1. 확인된 항목

### O1. 프로젝트를 열면 전 챕터 본문이 렌더러 힙에 상주 — HIGH (**부분 완료**)

**현재 근거**

```
src/main/services/features/manuscript/chapterService.ts
  getAllChapters()가 chapter + chapterBody를 2회 배치 조회하지만 최종 결과에 content를 병합해 반환
src/renderer/src/features/manuscript/stores/chapterStore.ts
  BaseChapterStore = CRUDStore<Chapter, ...>                         ← items가 아직 본문 포함 Chapter
src/renderer/src/shared/store/createCRUDStore.ts
  loadAll 응답 data를 items에 저장                                  ← 전 챕터 본문 상주
src/renderer/src/features/manuscript/hooks/useChapterManagement.ts
  저장 시 state.items.map(... content: newContent)                  ← 목록 store 본문도 계속 갱신
```

**완료된 하위 작업**

1. **O1-a — main DB N+1 제거**  
   과거에는 목록 1회 + 챕터별 `readChapterContent`로 20챕터에서 select 21회가 발생했다. 현재는 `chapter` 1회 + `chapterBody` 1회 조회 후 `Map`으로 병합한다. 빈 문자열, legacy fallback, 혼합 body, 0/1/20 경계와 쿼리 수를 `chapterListContentResolution.test.ts` 10개 케이스로 고정했다.
2. **O1-b1 — 본문 전용 캐시 경로 도입**  
   `chapterContentStore.ts`와 `useChapterContent.ts`를 추가했다. 요청된 본문만 저장하고 기본 LRU 상한은 4다. 같은 챕터 동시 요청 dedup, 구독 중 항목 retain/release 보호, reset 세대 가드, 조회 실패의 pending 유지, 빈 문자열의 정상 loaded 판정을 포함한다.
3. **본문 소비자 이관**  
   `EditorRoot`, `SnapshotList`, `SnapshotViewer`, `GoogleDocsRightPanel`의 side editor가 `useChapterContent`를 직접 사용한다. `BinderBarCompactHover`의 상시 본문 구독과 `activeChapterContent` prop chain은 제거했다.
4. **복원/전환 안전성**  
   `chapterStore.loadAll()`은 조회 전에 캐시를 reset한다. Editor는 `isLoaded=false`일 때 마운트하지 않아 빈 본문 autosave 덮어쓰기를 막는다. 스냅샷 복원은 이미 알고 있는 `snapshot.content`를 loadAll 후 seed해 재조회·깜빡임을 피한다. 챕터 선택은 hover가 아니라 `onPointerDown`에서만 프리페치한다.

**완료된 O1-b2** — `getAllChapters()`가 `ChapterListItem[]`을 반환한다. 목록이 본문을 나르지 않으므로 `chapterBody` 배치 조회 자체가 불필요해져 O1-a에서 2회로 줄인 왕복이 **select 1회**가 됐다. `chapterStore.items`도 `ChapterListItem`이다.

타입명은 새로 만들지 않고 `src/shared/types/manuscript.ts:23`에 이미 있던 **`ChapterListItem`**을 채택했다. 이전에 이 문서가 제안한 `ChapterSummary`는 쓰지 않았다 — 같은 파일 `:21`이 “`ChapterSummaryResult`/`ChapterSummaryStatus`는 AI 메모리 요약이라 별개 개념”이라고 경고하고 있어 이름이 충돌한다.

경계가 조용히 무너지는 경로를 하나 더 막았다. `api.chapter.create`/`update`/`get` 응답은 본문을 포함한 전체 `Chapter`이고(`ChapterSaveResult extends Chapter`) 그대로 items에 들어가면 **저장이나 이름 변경을 한 번 거친 챕터부터 본문이 목록에 되살아난다.** `chapterStore`의 `withListOnlyItems`가 목록 필드만 명시적으로 투영해 이를 차단한다.

`useExportManager`는 차단 요소가 **아니었다**. 이전 서술은 틀렸다 — 이 훅은 `api.chapter.get(chapterId)`로 단건 조회하므로 `chapterStore.items`를 참조하지 않는다.

**왜 문제인가** — 사이드바는 제목/순서만 필요하지만 현재도 모든 본문이 IPC 직렬화를 거쳐 목록 store에 들어온다. 전용 캐시가 추가돼 활성/최근 본문은 한 번 더 잡힐 수 있으므로, O1-b1은 안전한 이관 기반이지 메모리 절감 완료 단계가 아니다.

**규칙 매칭** — `server-serialization` **원리 적용**. 규칙 원문은 RSC 경계 전용이지만 “경계를 넘는 데이터는 실제 소비 필드만”이라는 원리가 Electron main↔renderer IPC에도 성립한다.

**검증** — O1-a 10 passed. O1-b1 관련 3스위트(`chapterContentStore`, `chapterContentInvalidation`, `chapterContentSubscription`) 26 passed. 세대 가드·retain 보호·`isLoaded` effect 의존성·loadAll 무효화를 의도적으로 제거했을 때 대응 테스트가 실패해 결함 검출력을 확인했다.

**확신도** — DB 왕복 감소와 캐시 상태전이: 테스트 확인. O1-b2 전후 실제 힙 MB: 측정 필요.

### O2. autosave가 `items` 배열 참조를 교체해 챕터 사이드바가 리렌더 — HIGH (**완료**)

**현재 상태**

```
src/renderer/src/features/manuscript/hooks/useChapterManagement.ts
  본문이 바뀌면 setChapterContent(chapterId, newContent)만 호출한다
  제목이 바뀔 때만 applyOptimisticTitle(chapterId, normalizedTitle)
src/renderer/src/features/manuscript/stores/chapterStore.ts
  applyOptimisticTitle이 제목 변화가 없으면 items 참조를 그대로 반환
```

`useChapterManagement()`는 `content`를 반환하지 않고, 본문이 필요한 화면은 `useChapterContent(chapterId)`로 직접 구독한다. 저장 경로에서 `items.map()`과 `content: newContent` 갱신을 제거했으므로 **본문만 바뀌는 자동 저장은 목록 store에 아무 write도 하지 않는다.** 제목이 바뀔 때만 해당 항목 하나가 새 객체로 교체되고 나머지 항목은 같은 객체를 유지해 행 단위 memo가 살아남는다.

`useChapterStore.setState` 직접 호출로 `chapters`/`currentChapter` 별칭을 수동 동기화하던 우회도 함께 제거했다. 이제 `createAliasSetter`를 쓰는 store 액션(`applyOptimisticTitle`) 하나만 그 일을 한다.

**규칙 매칭** — `rerender-derived-state` **원리 적용**. 목록은 본문이 없는 summary store만 구독한다.

**확신도** — 참조 동일성: `chapterListBoundary.test.ts` 7개로 확인. 캐시 구독 격리: Profiler 테스트 확인. 사이드바 실제 프레임 수: 측정 필요.

### O3. 상시 마운트 컴포넌트가 활성 챕터 본문 전체를 구독 — MEDIUM (**완료**)

**변경 전** — `BinderBarCompactHover`가 상시 마운트된 상태에서 활성 챕터 본문을 `chapterStore.items.find(...).content`로 구독했고, 실제 사용은 스냅샷 diff 화면이 열렸을 때뿐이었다.

**현재 상태**

- `BinderBarCompactHover`의 `activeChapterContent` 구독 및 `SnapshotViewer` 전달 prop 제거.
- `SnapshotViewer`가 열렸을 때 `useChapterContent(snapshot.chapterId)`로 직접 구독.
- 현재 본문이 로딩 중이면 diff를 비활성화해 빈 문자열을 “전체 삭제”로 오인하지 않음.
- `GoogleDocsRightPanel`은 `DocsSideEditor`로 분리해 side editor만 본문을 구독하고, 로딩 전 Editor 마운트를 차단.
- `EditorRoot → WorkspaceLayoutRouter → GoogleDocsLayout → GoogleDocsRightPanel`의 `activeChapterContent` prop chain 제거.

**규칙 매칭** — `rerender-defer-reads` **원리 적용**. 본문 읽기를 실제 소비 컴포넌트까지 지연했다.

**검증** — `chapterContentSubscription.test.tsx`에서 다른 챕터 본문 변경 시 현재 구독자의 Profiler commit 수가 증가하지 않음을 확인했다. 캐시 reset 후 같은 chapterId 재조회, 빈 본문 loaded, 실패 시 pending도 함께 고정했다.

**확신도** — 코드 및 테스트 확인.

### O4. 글꼴/크기/줄간격 변경이 TipTap 인스턴스를 파괴·재생성 — MEDIUM

**근거**

```
src/renderer/src/features/editor/components/Editor.tsx:197
  [extensions, fontFamilyCss, fontSize, lineHeight],     ← useEditor 의존성
```

**왜 문제인가** — 설정에서 글꼴/크기/줄간격만 바꿔도 에디터 인스턴스가 폐기되고 새로 만들어지면서 대형 doc이 재파싱된다. 같은 파일에서 letter/word/paragraph spacing은 이미 CSS 변수로 처리해 재생성을 피하고 있어, 동일 패턴을 적용할 수 있는 자리다. (TipTap이 unmount 시 destroy하므로 **누수는 아니다**. 순간 점유와 GC 부담 문제다.)

**규칙 매칭** — `rerender-split-combined-hooks` **원리 적용**. 서로 독립적인 의존성(에디터 스키마 vs 표시 스타일)이 한 훅의 dep 배열을 공유하고 있다. `rerender-dependencies`는 해당하지 않는다 — 이미 primitive 값이고, 문제는 dep의 타입이 아니라 dep로 둔 것 자체다.

**수정안** — `fontSize`/`lineHeight`/`fontFamilyCss`를 CSS 변수·`editorProps` 갱신으로 옮겨 `useEditor` 의존성에서 제거.

**확신도** — 재생성 트리거: 코드 확인. 힙/지연 영향: 측정 필요.

---

### O5. default 사이드바가 hover를 JS 상태로 처리해 리스트 전체 리렌더 — MEDIUM

**근거**

```
src/renderer/src/features/manuscript/components/useSidebarLogic.ts:74   const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
src/renderer/src/features/manuscript/components/Sidebar.tsx:137         onMouseEnter={() => setHoveredItemId(chapter.id)}
src/renderer/src/features/manuscript/components/Sidebar.tsx:256         onMouseEnter={() => setHoveredItemId(meta.hoverId)}
src/renderer/src/features/manuscript/components/Sidebar.tsx:150         {(hoveredItemId === chapter.id || menuOpenId === chapter.id) && ...}
src/renderer/src/features/manuscript/components/Sidebar.tsx:456         {sidebarItems.map((item, index) => (
src/renderer/src/features/manuscript/components/Sidebar.tsx:477         export default memo(Sidebar);
```

**왜 문제인가** — 항목 위로 마우스를 옮길 때마다 `Sidebar` 자신이 리렌더되고 `sidebarItems.map`이 전 항목을 다시 만든다. `memo(Sidebar)`는 내부 state 변경을 막아주지 못한다. 같은 기능을 `SidebarChapterList`는 `group-hover` CSS로 처리한다 — **레이아웃별 최적화 불일치**다.

**규칙 매칭** — `rerender-memo` **직접 적용**(행을 memo된 하위 컴포넌트로 추출해 hover가 해당 행만 리렌더). `rerender-use-ref-transient-values`는 **적용 불가**로 판단했다 — hover 값이 실제 UI 표시를 좌우하므로 ref로 대체하면 렌더가 갱신되지 않는다.

**수정안** — 프로젝트 선례(`SidebarChapterList`의 `group-hover:opacity-100`)에 맞춰 CSS hover로 전환하고 `hoveredItemId`를 제거하는 쪽이 가장 작다. 상태를 유지해야 한다면 행을 memo 컴포넌트로 추출.

**확신도** — 코드 확인. 챕터 수별 프레임 비용: 측정 필요.

---

### O6. `content-visibility`가 스크롤 컨테이너에 걸려 실효가 없음 — MEDIUM

**근거**

```
src/renderer/src/features/manuscript/components/Sidebar.tsx:455
  <div className="flex-1 min-h-0 py-3 [content-visibility:auto] overflow-y-auto">
```

`contain-intrinsic-size` 사용: **0건**(renderer 전체 grep). `SidebarChapterList`(docs/editor/scrivener 경로)에는 `content-visibility` 자체가 없다.

**왜 문제인가** — 규칙 원문은 `content-visibility: auto`를 **항목**에 걸고 `contain-intrinsic-size`로 예상 크기를 주라고 한다. 현재는 화면에 보이는 스크롤 컨테이너 자신에 걸려 있어 off-screen 항목 렌더를 건너뛰는 효과가 발생하지 않는다. 즉 적용됐지만 동작하지 않는 최적화다.

**규칙 매칭** — `rendering-content-visibility` **직접 적용**. 스킬 선언 impact는 **HIGH**(1000개 리스트에서 초기 렌더 10배).

**수정안** — 항목 단위로 옮기고 `contain-intrinsic-size` 부여. 리스트가 실제로 길어지는 경로(`SidebarChapterList.tsx:129`, `EntityGallery.tsx:362/461`)에 함께 적용.

**확신도** — 현재 적용 위치: 코드 확인. 개선 폭: 측정 필요(챕터 수 의존).

---

### O7. 캐릭터 AI 이미지를 base64 data URL로 store·DB에 저장 — MEDIUM

**근거**

```
src/main/services/features/characterAI/characterAIService.ts:118
  return `data:${prediction.mimeType ?? "image/png"};base64,${prediction.bytesBase64Encoded}`;
src/renderer/src/features/research/components/wiki/hooks/useCharacterWikiAttrs.ts:103
  const setGeneratedImage = useCallback( ... update("generatedImage", v) ... )
```

**왜 문제인가** — 생성 이미지가 base64 문자열로 캐릭터 `attributes`에 들어간다. characterStore는 `loadAll`로 전 캐릭터를 `items[]`에 상주시키므로(`createCRUDStore.ts:120`) 캐릭터 N명이면 base64 블롭 N개가 힙과 DB row에 동시에 남는다. base64는 원본 대비 약 33% 크다.

**규칙 매칭** — **매칭 없음**. 스킬에는 이미지 저장 포맷 규칙이 없다. `server-serialization`의 "경계 전송량" 원리와 방향이 같을 뿐이다.

**수정안** — `.luie` attachment 파일로 저장하고 attrs에는 경로만 보관. 프로젝트에 파일 저장 선례가 있다(`worldPackageStorage.ts`, `getReadableLuieAttachmentPath`). 저장 포맷 변경이므로 기존 데이터 마이그레이션이 필요하다.

**확신도** — 코드 확인. 실제 상주량: 측정 필요.

---

### O8. 챕터 순서 변경이 O(n²) — LOW-MEDIUM

**근거**

```
src/renderer/src/features/manuscript/stores/chapterStore.ts:60-61
  items: chapterIds
    .map((id) => state.items.find((ch) => ch.id === id))
```

**왜 문제인가** — 같은 키로 `.find()`를 n번 반복한다. 200챕터면 최대 40,000회 비교. 드래그 종료 시 1회이므로 체감은 작다.

**규칙 매칭** — `js-index-maps` **직접 적용**. 스킬 선언 impact **LOW-MEDIUM**.

**수정안** — `new Map(state.items.map((ch) => [ch.id, ch]))`를 만들고 조회.

**확신도** — 코드 확인.

---

### O9. 검색 입력이 `useDeferredValue` 없이 즉시 필터 — LOW-MEDIUM

**근거**

```
src/renderer/src/features/research/components/wiki/EntityGallery.tsx:140   const setQuery = (nextQuery: string) => { ... }
src/renderer/src/features/research/components/wiki/EntityGallery.tsx:167   const filteredGroups = useMemo(... query ...)
src/renderer/src/features/research/components/wiki/EntityGallery.tsx:236   onChange={(event) => setQuery(event.target.value)}
```

프로젝트에 이미 같은 패턴 선례가 있다: `memo/useMemoViewState.ts:9`, `project-selector/RestoreBackupDialog.tsx:75`.

**왜 문제인가** — 엔티티 수가 많을 때 타이핑 1글자마다 필터 + 카드 그리드 재렌더가 입력과 같은 우선순위로 처리된다.

**규칙 매칭** — `rerender-use-deferred-value` **직접 적용**.

**수정안** — `const deferredQuery = useDeferredValue(query)`를 필터 입력으로 사용.

**확신도** — 구조: 코드 확인. 실제 입력 지연: 측정 필요(엔티티 수 의존).

---

### O10. 사이드바 research 항목이 매 렌더 8키 메타 객체 + 아이콘 JSX를 재생성 — LOW

**근거**

```
src/renderer/src/features/manuscript/components/Sidebar.tsx:199
  const meta = {
    character: { label: t("sidebar.item.characters"), icon: <FolderOpen ... />, hoverId: "res-char" },
    event:     { ... }, faction: { ... }, ...        ← 8개 항목 전체를 만들고 하나만 인덱싱
  }[...]
```

**규칙 매칭** — `rendering-hoist-jsx` **직접 적용**. 스킬 선언 impact **LOW**.

**수정안** — 아이콘/hoverId는 컴포넌트 밖 상수 테이블로, `label`은 `t` 의존이라 `useMemo([t])`.

**확신도** — 코드 확인.

---

### O11. 렌더 본문에서 정렬 — LOW

**근거**

```
src/renderer/src/features/manuscript/components/sections/SidebarWorldList.tsx:54
  const orderedTerms = [...terms].sort((a, b) => (a.order || 0) - (b.order || 0));
```

**왜 문제인가** — 렌더마다 얕은 복사 + 정렬로 새 배열이 만들어져 하위 `map`이 전부 재조정된다. terms 규모를 측정하지 않았으므로 심각도는 LOW로 둔다(1차 보고의 MEDIUM에서 하향).

**규칙 매칭** — `js-tosorted-immutable` **직접 적용**(`terms.toSorted(...)`). 재계산 방지는 `rerender-memo` **원리 적용**.

**수정안** — `useMemo(() => terms.toSorted(...), [terms])`.

**확신도** — 코드 확인.

---

### O12. 구독자 없는 이벤트를 매 선택마다 emit — LOW

**근거**

```
src/renderer/src/features/editor/components/Editor.tsx:178,185   EditorSyncBus.emit("FOCUS_ENTITY", ...)
src/renderer/src/features/editor/components/Editor.tsx:251-252    EditorSyncBus.on/off("JUMP_TO_MENTION", ...)   ← 유일한 구독
```

`EditorSyncBus.on(` 전수 검색 결과 `JUMP_TO_MENTION`만 구독된다. `FOCUS_ENTITY`는 구독자가 0이며, emit 전에 캐릭터/용어 배열 `.find()`가 선택마다 실행된다.

**규칙 매칭** — **매칭 없음**. 죽은 코드다. `off`가 정상 호출되므로 버스 자체의 누수는 없다.

**수정안** — 구독처를 붙일 때까지 emit 제거.

**확신도** — 코드 확인.

---

## 2. 규칙 위반이 아닌 것으로 확인 (오적용 방지)

재검증 과정에서 "위반처럼 보이지만 아닌" 것들을 명시해 둔다.

| 대상 | 판정 |
| --- | --- |
| `Sidebar.tsx:101` `renderItem` | `rerender-no-inline-components` **해당 없음**. JSX를 반환하는 helper 함수이고 `<renderItem/>`로 마운트하지 않는다(`:456`에서 호출). 규칙은 컴포넌트를 컴포넌트 안에 *정의*해 마운트하는 경우를 다룬다. |
| `WorkspaceLayoutRouter.tsx` `<Suspense fallback={null}>` | `rerender-memo-with-default-value` **해당 없음**. `null`은 안정값이고 `layoutFallback`은 모듈 상수 import다. |
| 과거 `chapterService.getAllChapters()`의 `Promise.all(chapters.map(readChapterContent))` | O1-a에서 제거됐다. 현재는 `chapter`와 `chapterBody`를 각각 한 번 조회해 `Map`으로 병합한다. 병렬화 위반이 아니라 N+1 왕복 제거로 해결했다. |
| `SidebarChapterList.tsx:129` `chapters.map` key | index key 아님. `chapter.id` 사용 확인. |
| lucide-react 배럴 import (117개 파일) | `bundle-barrel-imports` **단정 불가**. Rollup 트리셰이킹으로 처리될 가능성이 높고, 번들 분석 없이 위반이라 말할 수 없다. 측정 항목으로 넘긴다. |

---

## 3. 이미 잘 처리돼 있어 손댈 필요 없는 것

중복 지적을 막기 위해 코드로 확인한 것만 적는다.

- Stats worker: `useEditorStats.ts` cleanup에서 `worker.terminate()` + timeout clear + ref null. worker는 stateless.
- Ghost editor(`toolbar/editorState.ts:15`): TipTap 인스턴스가 아닌 no-op chain 순수 객체 → destroy 불필요. `EditorToolbar.tsx:83`에서 `useMemo`.
- 리스너/옵저버 cleanup 전수 확인: `EditorToolbar`, `useElementWidth`, `FocusHoverSidebar`, `EditorLayout`, `SmartLinkTooltip`, `PlotBoard`, `world/index.tsx`, `useDrawingCanvas`, `useBufferedInput`, `useSettingsModel`.
- preload IPC `on*`: `windowApi.ts`/`projectApi.ts`/`systemApi.ts` 모두 `removeListener` 반환 클로저 제공.
- `uiStore.persist.ts` partialize가 소형 필드만 영속화(대형 값 미포함). `canvasViewStore`도 selection/entityPreview 제외.
- `saveBufferRegistry.ts`: flush 성공 시 self-unregister → 무한 증가 없음. `worldPackageStorage.ts`: module-level 캐시 없음.
- `uiStore.state.ts:212`: `Math.abs(panel.size - size) < 0.1` 가드로 동일 layout 재emit이 store write로 이어지지 않는다.

---

## 4. 1차 보고 오판 정정

**"ScrivenerLayout만 리사이즈 중 즉시 store write" — 사실이 아님.**

`updatePanelSize` 직접 호출은 세 레이아웃이 동일하다.

```
MainLayout.tsx:156        updatePanelSize(panelId, rawSize)
EditorLayout.tsx:190      updatePanelSize(panelId, rawSize)
ScrivenerLayout.tsx:116   updatePanelSize(panel.id, rawSize)
```

또한 `uiStore.state.ts:212`의 0.1% 임계 가드가 동일 값 재emit을 걸러낸다. `MainLayout`의 `useLayoutPersist`(debounce)는 **디스크 영속화** 경로이고 store write 경로가 아니다. 따라서 Scrivener 고유 결함이 아니라 레이아웃 공통 패턴이며, 이 문서에서는 지적 항목으로 올리지 않았다.

`SidebarWorldList` 정렬은 MEDIUM → LOW로 하향했다(terms 규모 미측정).

---

## 5. 측정으로만 확인 가능한 것

코드만으로 단정할 수 없어 지적에서 제외했거나 심각도를 확정하지 못한 항목이다.

1. O1-b2 전후 실제 힙 상주량 — 200챕터 시나리오 heap snapshot. 현재는 목록 store에 전 본문이 남아 있으므로 메모리 절감 완료 수치를 제시할 수 없다.
2. O2의 사이드바 autosave당 실제 커밋 수와 프레임 드랍 — 캐시 구독 격리만 Profiler로 확인했고, `items.map()` 제거 전후 비교는 아직 필요하다.
3. O4의 인스턴스 재생성 비용 — 설정 변경 전후 allocation timeline.
4. O6의 개선 폭 — 챕터 수별 초기 렌더 시간.
5. O9의 입력 지연 — 엔티티 수별 keypress→paint.
6. `DraggableItem`이 prop 참조 변화로 memo 무효화되는지 — 구현 미확인.
7. 탭 반복 전환 시 detached DOM/ProseMirror 인스턴스 누적 — 코드상 정리는 정상, 실측 필요.
8. lucide-react 배럴 import의 번들 영향 — 번들 분석 필요.

---

## 6. 착수 순서 제안

| 단계 | 항목 | 상태/근거 |
| --- | --- | --- |
| 완료 | O1-a | 목록 DB 조회 20챕터 21회 → 2회, 10개 테스트 통과. |
| 완료 | O1-b1 + 복원 안전성 | 본문 캐시·구독 게이트·세대 가드·retain 보호·복원 seed·pointer-down 프리페치, 관련 26개 테스트 통과. |
| 완료 | O3 | Binder 상시 본문 구독 및 prop chain 제거. |
| 완료 | N1 (분할뷰 Editor 이관) | O1-b2의 선행조건이었다. `SplitViewEditor`로 분리해 캐시 구독 + 로딩 게이트 적용, 회귀 테스트 6개. |
| 완료 | **O1-b2 + O2** | 목록 IPC/store를 `ChapterListItem[]`로 전환, 목록 왕복 select 1회, autosave의 목록 write 제거. N2도 함께 해소. 테스트 18개(main 11 + renderer 7). |
| **다음** | N3 잔여 · N7 (주석·배럴) | 영어 WHAT 주석 3건과 `domains/manuscript` 배럴에 `useChapterContent` 누락. 런타임 영향이 없다. |
| 이후 | O5 · O10 · O11 · O12 · N4 · N5 | 사이드바·트리·갤러리 국소 수정. 위험이 낮다. |
| 이후 | O6 · O9 | 미적용 최적화. 측정과 함께 효과 확인. |
| 이후 | O4 | 에디터 런타임 변경이라 단독 처리 권장. |
| 이후 | O8 | `reorderChapters`의 O(n²) find. O1-b2에서 타입만 바꾸고 알고리즘은 그대로 뒀다. |
| 별도 | O7 | 저장 포맷 변경 + 기존 데이터 마이그레이션 필요. |
| 별도 | N6 (사이드바 일관성) | 활성 스타일·위험색·portal 정책 통일. 시각 회귀 확인이 필요하다. |
| 보류 | N8 Tailwind 미정의 유틸 30건 | 사용자 결정으로 이번 회차 제외. |

---

## 7. 3차 정밀 재감사 신규 항목 (2026-08-31)

기준 문서는 이 파일 하나만 참조했고, 판정은 전부 실코드를 열어 줄번호를 확인했다. 서브에이전트 3트랙(성능/일관성/주석)의 보고도 재확인을 거쳤고 그 과정에서 오탐 2건을 제거했다(§7.5).

### N1. 분할뷰 Editor만 본문 캐시로 이관되지 않음 — HIGH (데이터 안전) (**완료**)

Editor 마운트 지점은 3곳인데 2곳만 이관됐다.

```
EditorRoot.tsx:118              useChapterContent + isLoaded 게이트   ✓
GoogleDocsRightPanel.tsx:105    useChapterContent + isLoaded 게이트   ✓
WorkspacePanels.tsx:288-290     chapters.find(...) → items의 content  ✗
WorkspacePanels.tsx:412         initialContent={editorChapter?.content ?? ""}  ← 게이트 없음
```

**왜 문제인가** — 오늘은 `items`에 본문이 있어 동작한다. 그러나 O1-b2로 목록에서 본문을 빼면 이 경로만 빈 문자열로 Editor를 열고, autosave(`onSave`)가 원본을 덮어쓴다. O1-b1의 "본문 소비자 이관 완료" 판정과 모순되며, **O1-b2보다 먼저 처리해야 하는 선행조건**이다.

**수정안** — `DocsSideEditor`(`GoogleDocsRightPanel.tsx:96`) 선례와 동일하게 자식 컴포넌트로 추출해 `useChapterContent`를 호출하고 `isLoaded`로 게이트한다. `.map()` 콜백 안에서는 훅을 호출할 수 없으므로 컴포넌트 추출이 필수다.

**반영 결과** — `panels/SplitViewEditor.tsx`로 분리했다. `WorkspacePanels`가 434 LOC로 이미 300 LOC 가이드를 넘겨 있었고, 별도 모듈이어야 패널 machinery 없이 테스트할 수 있어 파일을 나눴다. `WorkspacePanels`는 `chapterId`/`chapterTitle`만 넘기므로 O1-b2 이후에도 계약이 유지된다.

**확신도** — 코드 확인 + `splitViewEditorContentGate.test.tsx` 6개.

### N2. `ChapterListItem`이 선언·수출됐으나 소비자 0 — HIGH (**완료**)

`shared/types/manuscript.ts:23`의 `ChapterListItem = Omit<Chapter, "content">`는 `types/index.ts:13`으로 배럴 수출까지 됐는데 소비자가 0건이었다. TSDoc은 "목록 경계에서는 본문을 나르지 않는다"를 규범으로 선언하지만 코드는 반대로 동작했다 — shared 계약 타입에 남은 미실현 약속이었다.

O1-b2에서 이 타입을 목록 IPC 계약(`core.contract.ts`의 `chapter.getAll`), main 서비스(`getAllChapters`), renderer store(`chapterStore`)가 모두 채택해 해소했다.

### N3. 코드와 어긋난 주석 2건 — HIGH (주석 규약 4항) (**완료**)

```
useChapterManagement.ts:216-217  "items 폴백은 목록에서 본문을 제거하는 단계에서 사라진다"
useChapterManagement.ts:295-296  동일 문구
```

`Chapter.content`가 그대로였고, 같은 파일의 저장 경로가 오히려 `items`에 `content`를 계속 쓰고 있었다. 미래 약속형 주석이었다.

O1-b2에서 폴백 자체가 사라져 주석도 함께 제거됐다. 남은 것은 현재 사실만 기술한다 — 복제는 "목록에 본문이 없어 폴백할 곳이 없다", 저장은 "변경 감지 기준은 본문 캐시가 유일한 출처다".

**남은 주석 항목** — 영어 WHAT 주석 3건(`SnapshotViewer.tsx:222`, `Editor.tsx:61`, `ExportPreview.tsx:109`)과 지역 컴포넌트 TSDoc 1건(`GoogleDocsRightPanel.tsx:96-102`)은 미착수다.

### N10. 분할 editor 패널이 재오픈/재시작 시 min 폭으로 뜸 — MEDIUM (**완료**)

사용자 보고. DnD로 연 sub editor가 "마지막에 닫은 폭"이 아니라 항상 min 폭으로 렌더된다.

**근거**

```
src/renderer/src/features/workspace/components/panels/WorkspacePanels.tsx
  research 패널: editorPanelWidthPx 저장 + onResize + handle.resize 복원  ✓
  editor 패널:   onResize={undefined}, 복원 effect 없음                    ✗ (수정 전)
src/renderer/src/features/workspace/stores/uiStore.state.ts
  addPanel은 이전 폭을 기억하지 않는다 → 항상 DEFAULT_WORKSPACE_PANEL_SIZE(40%)
```

**왜 문제인가** — 코드베이스가 이미 두 NOTE로 원인을 적어 뒀다. `MainLayout.tsx:146`은 "close 애니메이션의 `resize("0%")`를 PanelGroup이 minSize로 클램프해 min 비율을 emit한다", `uiStore.state.ts:58`은 "PanelGroup이 layout을 panel id 조합별로 캐싱하며 그 캐시가 `defaultSize`보다 우선한다". `isLayoutPersistenceSuppressed()`는 store write만 막고 PanelGroup 내부 캐시는 막지 못한다. research 패널은 이걸 이기려고 px 저장 + 마운트 후 handle `resize` 강제 복원을 갖췄는데 editor 패널에는 그 세트가 없었다.

**수정** — research 패널과 동일한 메커니즘을 editor 패널에 미러링했다. 두 패널은 상호 배타적이지만(editor 추가 시 research 제거) 저장 키와 min 폭이 달라(320 vs 470) 세트를 나눴다.

```
projectLayout/types.ts        editorPanelWidthPx 필드
projectLayout/constants.ts    EDITOR_PANEL_MIN/MAX_WIDTH_PX (320/2000)
projectLayout/sanitize.ts     sanitizeEditorPanelWidthPx + default 투영
projectLayout/merge.ts        patch 병합
shared/schemas/persistence.ts strictObject에 필드 추가(없으면 payload 전체 폐기)
WorkspacePanels.tsx           px 저장(실제 drag만) + handle.resize 복원 + Panel 결선
```

**검증** — `defaultLayoutEditorPanelWidthPx.test.ts` 7개(merge/sanitize/schema 왕복, research와 독립성), `editorPanelWidthCapture.test.tsx` 4개(mount-time min 무시, 실제 drag 저장, snap-back 무시, handle 복원). onResize 결선 제거 시 2건 실패로 검출력 확인. research 기존 테스트 회귀 없음.

**확신도** — 지속화·캡처·복원 경로는 테스트 확인. 실제 PanelGroup 레이아웃 계산과 시각 결과는 수동 검증 영역.

### N9. 구독이 상한을 채우면 방금 받은 본문이 즉시 축출됨 — HIGH (**완료**)

O1-b2에서 `useChapterManagement`의 items 본문 폴백을 제거한 뒤 도달 가능해진 결함이다. 폴백이 있던 동안에는 캐시가 비어도 목록 본문으로 메울 수 있었다.

**근거**

```
src/renderer/src/features/manuscript/stores/chapterContentStore.ts
  evictOverflow가 오래된 순으로 훑되 retained를 건너뛴다
  → 상한(4)을 구독 항목이 모두 채우면 마지막 후보가 "방금 넣은 항목"이 된다
src/renderer/src/features/manuscript/hooks/useChapterManagement.ts
  handleDuplicateChapter: ensureChapterContent(source.id) 직후 peekChapterContent(source.id)
```

**왜 문제인가** — 복제는 화면에 없는 원본 본문을 받아 곧바로 읽는다. 구독자가 상한을 가득 채운 상태(메인 에디터 + 분할 에디터 2개 + 스냅샷 뷰어)에서는 받아온 본문이 저장 즉시 버려져 `peek`이 `undefined`를 반환하고, **사본이 본문 없이 만들어진다.** 원본은 손상되지 않는다.

**수정** — `evictOverflow`가 가장 최근 접근 항목(배열 끝 = 방금 저장한 항목)을 축출 후보에서 제외한다. 구독 항목을 지킬 수 없으면 상한을 일시적으로 넘긴다.

**검증** — `chapterContentRetainPressure.test.ts` 5개. 수정 전 3개 실패(복제 경로가 `''`를 읽음), 수정 후 전부 통과. 기존 `chapterContentStore.test.ts`의 BVA3~BVA5(정상 축출·retain 보호·release 후 축출)는 그대로 통과해 의도한 축출 동작이 유지됨을 확인했다.

**확신도** — 코드 및 테스트 확인. 실제 UI에서 동시 구독 4개가 발생하는 빈도는 미측정.

### N4. `memo`된 `TreeNode`가 재귀 prop으로 전멸 — MEDIUM

```
TreeNode.tsx:29        export const TreeNode = memo(...)
TreeNode.tsx:22-23     expandedFolders: Record<string, boolean>; selectedNodeId: string | null;
TreeNode.tsx:131-132   자식에 두 prop을 그대로 재귀 전달
```

폴더 하나만 토글해도 `expandedFolders` 객체 참조가 바뀌어 트리 전체 memo가 무효화된다. `isExpanded`/`isSelected` boolean만 내리면 해소된다.

**규칙 매칭** — `rerender-memo` 원리 적용. **확신도** — 코드 확인. 리렌더 폭은 노드 수 의존이라 측정 필요.

### N5. `EntityGallery`가 카드마다 `JSON.parse` — LOW-MEDIUM

```
EntityGallery.tsx:364 (grid) / :467 (list)   parseStructuredAttributes(entity.attributes)
parseStructuredAttributes.ts:3-6             문자열이면 JSON.parse
```

필터를 통과한 전 엔티티를 렌더 본문에서 매번 재파싱한다. O9(입력 우선순위)와 원인이 다르다. 카드를 memo 컴포넌트로 추출하고 내부에서 `useMemo([entity.attributes])`.

### N6. 사이드바 구현 불일치 — MEDIUM (코드 일관성)

| 갈래 | 근거 |
| --- | --- |
| 활성 행 스타일 | `Sidebar.tsx:134` `bg-active … border-l-[3px] border-accent` vs `SidebarChapterList.tsx:143` `bg-accent/10 text-accent`. 후자가 지배 관행이다 — `SidebarEventList:84`, `SidebarCharacterList:194`, `SidebarFactionList:84`, `EditorTab:258`, `ModelTab:279`, `ShortcutsTab:112`, `InspectorPanel:225`, `StartupWizard:134`. `Sidebar.tsx`만 예외이고 `border-l-[3px]`은 arbitrary 값이다. |
| 위험색 | `SidebarChapterList.tsx:119` `text-red-500`(raw 팔레트) / `TermCard.tsx:50` `text-danger` / `PlotBoard.tsx:392` `text-error` / `Sidebar.tsx:435` 무효 inline. 토큰 층에서 `--color-destructive`·`--color-error`·`--color-danger`·`--color-danger-fg`가 모두 같은 `--danger-fg`를 가리켜(`global.tokens.css:41,42,50,59`) 동의어 4개가 불일치를 구조적으로 유발한다. |
| 컨텍스트 메뉴 | `SidebarChapterList.tsx:100` `createPortal`(클리핑 회피 이유 주석 명시) vs `Sidebar.tsx:373-437` portal 없는 fixed 인라인. |

### N7. 배럴이 신규 훅을 노출하지 않아 import 경로가 혼용 — MEDIUM

`domains/manuscript/index.ts`는 `useChapterManagement`·`useChapterStore`를 수출하지만 `useChapterContent`가 빠졌다. 그래서 `EditorRoot.tsx:16`은 배럴에서, 바로 다음 `:17`은 features 직접 경로에서 import한다. **O1-b1 작업이 만든 불일치다.** 배럴 자체도 `../../features/…` 상대경로를 쓰는데 renderer AGENTS.md는 "Avoid fragile relative paths across domains"를 요구한다.

### N8. 기타 확인 항목 (이번 회차 보류 포함)

- **Tailwind 미정의 유틸 30건 — 보류(사용자 결정).** `global.tokens.css`의 `@theme` 블록은 1~122행이고 그 안의 `--color-*` 60개만 색상 유틸을 만든다. 정의 목록과 renderer 전체 사용을 대조한 결과 7종 30건이 CSS를 생성하지 못한다: `text-fg-secondary` 23건(설정 9파일), `hover:bg-bg-active` 2건(`Sidebar.tsx:158,270`), `from-bg-app/40`(`TemplateGrid.tsx:156`), `hover:bg-accent-hover`(`ExportSidebar.tsx:331`), `bg-overlay`(`GraphLegendModal.tsx:18`), `text-primary-fg`(`GlobalErrorBoundary.tsx:85`), `bg-sidebar-surface`(`SidebarWorldList.tsx:178`), `text-tertiary`(`MemoSection.tsx:297`). 같은 파일이 이미 두 차례 같은 버그를 일괄 수정한 이력을 주석으로 남겼다(`:41-45` 3곳, `:51-57` 94곳) — 이건 3차 잔존분이다.
- **무효 색 함수 — 보류(같은 토큰 계열).** `Sidebar.tsx:435` `style={{ color: "hsl(var(--destructive))" }}`. raw `--destructive`는 없고 `--color-destructive`는 hex를 가리켜 `hsl()` 포장이 무효다. 삭제 메뉴가 위험색을 잃는다.
- **`editor.css.bak`가 git 추적 중.** `styles/components/editor.css.bak`(401행)은 `editor.css`(473행)의 리팩터 이전 스냅샷이고 어디서도 import되지 않는다. 실제로 이번 감사에서 오탐(`z-index: 10`)을 유발했다.
- **임의 z-index 2곳.** `QuitOverlay.tsx:22` `z-[9999]`, `MainLayout.tsx:499,527` `z-[110]`. `global.tokens.css:116`이 "임의 z-index 경쟁을 막으려고 named utility의 값을 한 곳에서 관리한다"며 dropdown 50 / banner 100 / toolbar 120 / toast 150을 선언한다. `z-[110]`은 banner와 toolbar 사이에 끼운 값이다.
- **a11y 2건.** `ApiKeysCard.tsx:56,79` 아이콘 전용 눈 토글에 `focus:outline-none`만 있고 ring·`aria-label`·`title`이 없다. 형제 파일 `OllamaEndpointCard.tsx:85-86`은 `focus-visible:ring-2` + `aria-label`을 갖췄다.
- **`setState` 우회 1곳.** `useChapterManagement.ts:313`이 `createAliasSetter`를 거치지 않고 `chapters`/`currentChapter` 별칭을 수동 동기화한다. chapterStore에서 이 우회는 이곳뿐이다.
- **영어 WHAT 주석 3건.** `SnapshotViewer.tsx:222`, `Editor.tsx:61`, `ExportPreview.tsx:109`.
- **정적 값 inline style 2곳.** `Sidebar.tsx:174`, `:368`. `text-subtle` 유틸이 있고 className의 `text-muted`와 색을 이중 지정한다.
- **300 LOC 초과**(AGENTS.md "where practical" 연성 규칙): MainLayout 600, EntityGallery 563, ScrivenerLayout 537, uiStore.state 516, GoogleDocsRightPanel 515, AnalysisSection 515, EditorToolbar 499, App 497, Sidebar 483.
- **`memo` 행에 인라인 함수** — `ShortcutsTab.tsx:287,289`. 행 수가 적어 LOW.

### 7.5. 3차 재감사에서 걸러낸 오탐

| 대상 | 판정 |
| --- | --- |
| `text-canvas-doc-body`, `text-canvas-edge-label` | **정상.** `--text-canvas-doc-body: 0.9375rem`(`global.tokens.css:106`), `--text-canvas-edge-label: 0.625rem`(`:114`)로 `@theme` 안에 있는 font-size 유틸이다. 색상 유틸로 오인해 미정의 후보에 올랐다가 제외했다. |
| `border-text-tertiary` (`AppearanceTab.tsx:66`) | **정상.** `--color-text-tertiary`가 존재한다. |
| `contentRevision` | **죽은 코드 아님.** `SnapshotViewer.tsx:56`/`SnapshotList.tsx:126`에서 bump하고 3개 Editor 마운트 지점이 remount key로 소비한다. |
| `useExportManager`의 `chapter.content` | **O1-b2 차단 아님.** `api.chapter.get(chapterId)` 단건 조회이고 `items`를 참조하지 않는다. |
| `DraggableItem`에 인라인 `data={{…}}` | **결함 아님.** `DraggableItem`은 `memo`가 아니므로 깨질 memo가 없다. §5의 미확인 항목 6번에 대한 답이다. |
| zustand 객체 셀렉터 `useShallow` 누락 | **신규 없음.** 감싸지 않은 2곳(`BinderBarCompactHover.tsx:118`, `CanvasStatusBar.tsx:17`)은 primitive 반환이라 불필요하다. |
| renderer `console.*` / `!important` / 동적 Tailwind 조립 | **각 0건.** |

---

## 8. 구현 후 검증 기록 (2026-08-31)

### 추가 검증 (O1-b2 이후 위험 구간)

O1-b2로 items 폴백이 사라지면서 새로 생긴 위험 구간을 ISTQB 기법으로 훑었고, 그 과정에서 N9를 찾아 고쳤다.

| 범위 | 결과 | 확인한 계약 |
| --- | --- | --- |
| `chapterContentRetainPressure.test.ts` (신규) | **5 passed** | 구독 수를 등가분할(상한-1 / 상한 / 상한 초과)해 축출 판정을 고정. 복제 경로(ensure→peek)가 빈 본문을 읽지 않음. 구독 해제 후 정상 축출 복귀. **적용 전 3 failed로 N9를 검출했다.** |
| `chapterListRerenderBoundary.test.tsx` (신규) | **4 passed** | 사이드바와 같은 구독(`useShallow`+memo 행)에서 본문 저장 20회 반복 시 Profiler 커밋·행 렌더 수 불변, 같은 제목 재적용 시 커밋 불변, 제목 변경 시 바뀐 행만 리렌더. |

**결함 검출력 확인**

- `evictOverflow`의 최근 항목 보호를 제거 → 복제 경로 포함 3건 실패.
- `applyOptimisticTitle`을 O2 이전 동작(항상 `items.map()`)으로 되돌림 → 커밋 수 불변 테스트 실패.

**여전히 미검증**

- `handleSave` 결정표. 캐시 miss × 빈 `newContent` 조합에서 `api.autoSave`가 무조건 호출되는 경로가 남아 있다. Editor 로딩 게이트가 빈 마운트를 막으므로 현재는 도달하지 않지만, 게이트를 우회하는 진입점이 생기면 위험하다. 훅 전체를 마운트해야 해서 이번 회차에서는 다루지 않았다.
- 200챕터 heap snapshot, 실제 프레임 드랍.

### O1-b2 + O2 검증 (3차)

| 범위 | 결과 | 확인한 계약 |
| --- | --- | --- |
| `chapterListContentResolution.test.ts` (재작성) | **11 passed** | 목록 응답에 `content` 키 부재, 왕복 select 1회 고정(0/1/20 경계), order asc·soft delete 제외, 본문 저장 후에도 목록 계약 불변. 본문 해석(body→legacy→"") 커버리지는 SUT를 `getChapter`로 옮겨 보존했다. |
| `chapterListBoundary.test.ts` (신규) | **7 passed** | `loadAll` 항목의 본문 부재, create/update 응답 본문이 items로 새지 않음, 제목 무변화 시 `items` 참조 유지, 제목 변화 시 해당 항목만 교체(나머지 객체 동일성 유지), `chapters`/`currentChapter` 별칭 참조 일치. |
| `splitViewEditorContentGate.test.tsx` (신규, N1) | **6 passed** | 로딩 중 Editor 미마운트, 도착 후 캐시 본문 전달, 빈 본문도 loaded 판정, chapterId 없으면 즉시 마운트, 캐시 reset 시 게이트 재진입. |
| 기존 캐시 3스위트 + 휴지통 매트릭스 | **31 passed** | 회귀 없음. |
| 합계 | **7 files / 55 passed** | |
| TypeScript / ESLint | **0 errors / exit 0** | |
| `check:renderer-store-usage`, `check:core-complexity`, `check:ipc-contract-map` | **PASS** | 계약 맵은 재생성 후 통과(221 channels). |

**결함 검출력 확인**

- `SplitViewEditor`의 `isLoaded` 게이트 무력화 → 로딩 중 미마운트/캐시 reset 테스트 2건 실패.
- `chapterStore`의 `withListOnlyItems` 투영 제거 → create/update 본문 누출 테스트 2건 실패.

**이 변경으로 확인되지 않은 것**

- 200챕터 heap snapshot 실측. 코드 경계는 닫혔지만 실제 MB 감소 수치는 여전히 측정 항목이다(§5-1).
- 사이드바 autosave당 실제 프레임/커밋 수. 참조 동일성은 단위 테스트로 고정했으나 Profiler 기반 사이드바 측정은 하지 않았다.

**환경 관련 알려진 사항**

- `better-sqlite3`는 Electron ABI와 Node ABI를 오간다. main 프로세스 스위트를 vitest로 돌리려면 `pnpm rebuild better-sqlite3`가 필요하고, 앱을 다시 띄우려면 `pnpm rebuild:electron`이 필요하다.
- `check:persist-contracts`는 `graphStore.ts:24`(canvas)에서 실패한다. 워킹트리 변경이 없는 커밋된 기존 결함이며 이 변경과 무관하다.
- `check:main-service-boundaries`는 `spawnSync rg ENOENT`로 실패한다. ripgrep 미설치 환경 문제다.

### O1-a / O1-b1 / O3 검증 기록 (2차)

### 자동 테스트

| 범위 | 결과 | 확인한 계약 |
| --- | --- | --- |
| `chapterListContentResolution.test.ts` | **10 passed** | 등가분할·0/1/20 경계·legacy fallback·목록 계약·select 21→2. |
| `chapterContentStore.test.ts` + `chapterContentInvalidation.test.ts` + `chapterContentSubscription.test.tsx` | **26 passed** | miss/hit/failure/빈 본문/LRU 4/retain/dedup/reset/stale response/같은 id 재조회/Profiler 구독 격리/복원 seed. |
| `chapterTrashRestoreMatrix.test.ts` | **5 passed** | key 1~20 본문·research 이름·긴 본문·다국어·HTML·멱등·동시 복원·purge. package IO를 mock해 휴지통 로직 격리. |
| `chapterTrashRestoreRealPackage.test.ts` | **1 passed** | 사용자가 만든 `test.luie` 복사본을 실제 canonical attachment로 열어 20→0 삭제, 0→20 역순 복원, 본문 일치, key 1 purge를 실제 패키지까지 확인. |
| 휴지통 2스위트 동시 실행 | **6 passed / 2 files** | 실제 package 경로에서는 `FS_2002` 0건. |
| TypeScript / ESLint | **0 errors / exit 0** | 변경 범위 타입·정적 검사. |

`test.luie` 원본은 직접 변경하지 않았다. 테스트 전후 SHA-256은 `89983196ee804f0a5bae7a3ac80899c326ff87d68e43dda0d4193b8d9a8a760b`로 동일했고 SQLite `integrity_check=ok`, 컨테이너는 `luie/sqlite/v2`였다. 이전 가짜 `/tmp/*.luie` 픽스처의 `FS_2002`는 DB mutation 이후 실제 canonical 파일이 없어 export가 실패한 것이며, 본문 내용/key/research 이름 문제와는 분리됐다.

### 결함 검출력 확인

- cache generation 가드 제거 → reset 이전 stale response 테스트 실패.
- retain 보호 제거 → LRU BVA4/BVA5 실패.
- `useChapterContent`의 `isLoaded` effect 의존성 제거 → 같은 chapterId reset 후 재조회 테스트 실패.
- `chapterStore.loadAll()`의 즉시 무효화 제거 → stale cache 테스트 실패.
- O1-a 적용 전 효율성 테스트 → 20챕터에서 `expected 21 to be 2`로 실패, 적용 후 통과.

### 사용자 UI 확인

- 챕터 이동 및 본문 표시 정상.
- 스냅샷 복원 정상, 복원 후 깜빡임 경로 개선 확인.
- 휴지통 챕터 1~20 복원 정상.

### 알려진 한계

- 전체 renderer/dom 실행에서 기존 실패 3파일(`rebuildMemoryCardWriterFlow`, `projectTemplateInitialization`, `useSidebarResizeCommit`)이 있었으며 이 변경과 무관하다.
- 과거 UI에서 한 번 발생한 “챕터 1만 복원 실패”는 현재 코드와 실제 `test.luie`에서 재현되지 않았다. package persist 실패 후 renderer가 success 응답을 받지 못해 reload하지 않는 경로 또는 실제 purge 실행 가능성은 남지만, 당시 로그만으로 원인을 확정하지 않는다.

