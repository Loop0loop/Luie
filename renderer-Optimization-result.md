# Renderer Optimization Audit Result

조사 대상: `src/renderer/**` (사이드바 렌더링 · RAM/메모리)
기준 문서: `.kiro/skills/vercel-react-best-practices/rules/*.md`, `src/renderer/AGENTS.md`
상태: **초기 감사 → 2차 구현/검증 → 3차 정밀 재감사 → 4차 ISTQB 라운드(사용자 수동 검증 통과 이후) → 5차 composition-patterns 라운드.**

- **완료**: O1(a·b1·b2), O2, O3, O8, O10, O11, O12 / N1, N2, N3, N7, N9, N10, N11, N12
- **부분 완료**: O5 — 목록에 박힌 무거운 서브트리(`SnapshotList`·`TrashList`)에 memo. 챕터 행 memo 추출은 잔여
- **미착수**: O4, O6, O7, O9 / N4, N5, N6, N13, N15
- **의도적 미변경**: N14 (`forwardRef` — TipTap `ReactRenderer` 통합 경계), N8 (Tailwind 미정의 유틸 30건 — 사용자 결정으로 보류)
- **미측정**: 200챕터 heap snapshot(O1의 원래 목표 수치), 실제 프레임 드랍 — §5
- **알려진 위험 1건**: `handleSave`의 캐시 미스 + 빈 본문 조합 — §8 "남은 위험"

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
| O1-a: main 목록 조회 N+1 제거 | **완료·이후 대체됨** | 당시 `chapterBody` 배치 조회로 20챕터 select 21회 → 2회. O1-b2가 목록에서 본문을 빼면서 body 조회 자체가 불필요해져 **현재는 1회**다. |
| O1-b1: renderer 본문 전용 캐시/구독 경로 | **완료** | LRU 4, 동시 요청 dedup, retain 보호, reset 세대 가드, 로딩 게이트 구현. |
| O1-b2: 목록 IPC/store에서 본문 제거 | **완료** | `getAllChapters()`가 `ChapterListItem[]`을 반환하고 `chapterStore.items`도 같은 타입이다. body 조회가 사라져 목록 왕복은 select 1회다. store 경계에서 create/update/get 응답의 본문을 투영해 되살아나는 경로도 막았다. |
| O2: autosave 목록 리렌더 제거 | **완료** | 본문은 `chapterContentStore`만 갱신한다. 제목이 바뀔 때만 `applyOptimisticTitle`이 해당 항목을 교체하고, 그 외에는 `items` 배열 참조를 유지한다. |
| O3: 상시 Binder 본문 구독 제거 | **완료** | `BinderBarCompactHover`의 본문 구독/prop 전달을 제거하고 `SnapshotViewer`가 필요할 때 직접 구독한다. |
| 복원 안전성/깜빡임 | **완료·회귀 가드 있음** | 캐시 reset 즉시 무효화, stale response 차단, 복원 본문 seed, Editor 로딩 게이트, pointer-down 프리페치 적용. |
| O5: 사이드바 hover 리렌더 | **부분 완료** | 목록에 박힌 `SnapshotList`·`TrashList`에 memo(UI/UX 무변경). 챕터 행 memo 추출은 잔여. |
| O8 · O10 · O11 · O12 | **완료** | reorder Map 조회, meta 상수 hoist, terms 정렬 memo, 죽은 `FOCUS_ENTITY` 핸들러 제거. |
| O4 · O6 · O7 · O9 | **미착수** | 이 문서의 분석/수정안 상태 유지. |
| N1~N15 (3·4·5차 신규) | **10건 완료, N4·N5 보류, N6·N13·N15 미착수, N14는 변경 안 함** | §7에 근거. N12는 N10에서 만든 자기 회귀. N13~N15는 5차(composition-patterns + 미검사 Vercel 규칙) 신규. |
| Tailwind 미정의 유틸 30건 | **보류(사용자 결정)** | §7-N8에 근거만 기록. 이후 사용자가 Tailwind v4 마이그레이션을 별도 진행. |

> 경계 요약: 목록(`getAllChapters`·`getDeletedChapters`)은 본문을 나르지 않고, 본문은 단건 조회(`getChapter`)와 `chapterContentStore` 캐시만이 공급한다. store 경계에서 create/update/get 응답의 본문을 투영해 되살아나는 경로도 막았다. 다만 **실제 힙 감소 MB는 아직 측정하지 않았다**(§5-1).

---

## 1. 확인된 항목

### O1. 프로젝트를 열면 전 챕터 본문이 렌더러 힙에 상주 — HIGH (**완료 · 힙 수치는 미측정**)

**현재 상태**

```
src/main/services/features/manuscript/chapterService.ts
  getAllChapters() → ChapterListItem[]  (본문 미포함, select 1회)
  getDeletedChapters() → ChapterListItem[]  (N11에서 함께 정리)
src/renderer/src/features/manuscript/stores/chapterStore.ts
  BaseChapterStore = CRUDStore<ChapterListItem, ...>
  withListOnlyItems가 create/update/get 응답의 본문을 투영해 차단
src/renderer/src/features/manuscript/hooks/useChapterManagement.ts
  저장 시 본문은 chapterContentStore만 갱신, 목록은 제목 변경 시에만 write
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

**왜 문제였는가** — 사이드바는 제목/순서만 필요한데 프로젝트를 열 때 모든 챕터 본문이 IPC 직렬화를 거쳐 목록 store에 들어왔다. 이제 목록 경계에서 본문이 빠졌고, 본문은 요청된 것만 상한 있는 캐시에 담긴다. **다만 코드 경계가 닫힌 것과 실제 힙이 줄어든 것은 별개이며 후자는 아직 측정하지 않았다.**

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

### O5. default 사이드바가 hover를 JS 상태로 처리해 리스트 전체 리렌더 — MEDIUM (**부분 완료**)

**정정된 진단** — 1차 보고는 "챕터 행 전체 리렌더"를 비용으로 봤지만, 재조사에서 더 비싼 것이 확인됐다. `sidebarItems`에는 **`SnapshotList`와 `TrashList`가 항목으로 들어간다**(`Sidebar.tsx:304`, `:355`). 둘 다 `memo`가 아니었고, `SnapshotList`는 `useChapterContent`로 본문까지 구독한다. 그래서 마우스가 항목 하나를 지날 때마다 이 두 리스트 서브트리가 통째로 다시 그려졌다. 실제로 바뀌는 출력은 케밥 버튼 2개뿐이다.

`sidebarItems` 자체는 `useMemo`이고 hover가 deps에 없어 배열 재생성은 없다. 순수 렌더 낭비였다.

**반영: `SnapshotList`·`TrashList`에 `memo`** — prop이 원시값뿐이라(`chapterId` / `projectId`+`refreshKey`, 콜백은 미전달) memo가 그대로 실효한다. **UI·UX·이벤트는 전혀 바뀌지 않는다** — 케밥의 조건부 마운트, `hoveredItemId` 상태, DOM 구조, 핸들러가 모두 그대로다.

**CSS hover 전환은 하지 않았다.** 문서의 원래 수정안(`group-hover`)은 동작 동일성을 보장할 수 없다.

- 케밥이 항상 마운트되므로 hover하지 않은 상태에서도 제목의 가용 폭이 줄어 **말줄임 시작 지점이 바뀐다**(현재는 조건부 마운트).
- `opacity-0` 요소도 포인터 이벤트를 받아 `pointer-events-none`이 필요하고, 스크린리더에 항상 노출된다.

`hoveredItemId` 제거로 얻는 잔여 이득(챕터 행 JSX 재생성)은 행을 memo 컴포넌트로 추출하면 UI 변경 없이 얻을 수 있다. 그쪽이 남은 작업이다.

**규칙 매칭** — `rerender-memo` **직접 적용**.

**검증** — `sidebarHoverSubtreeIsolation.test.tsx` 2개. 실제 `Sidebar`를 `ToastProvider`+`DialogProvider`로 마운트해 hover를 발화시키고 두 리스트의 렌더 횟수 불변을 확인, 그리고 실모듈이 memo인지 `importActual`로 고정한다.

> 주의: 이 스위트를 처음 작성했을 때 `vi.mock`이 테스트 파일의 import까지 가로채 **대역을 검사하는 무효 테스트**가 됐다(실코드에서 memo를 떼도 통과했다). `importActual`로 실모듈을 가져오도록 고쳐 검출력을 확인했다.

**확신도** — 리렌더 격리: 테스트 확인. 챕터 수별 실제 프레임 비용: 여전히 측정 필요.

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

### O8. 챕터 순서 변경이 O(n²) — LOW-MEDIUM (**완료**)

**근거**

```
src/renderer/src/features/manuscript/stores/chapterStore.ts:60-61
  items: chapterIds
    .map((id) => state.items.find((ch) => ch.id === id))
```

**왜 문제인가** — 같은 키로 `.find()`를 n번 반복한다. 200챕터면 최대 40,000회 비교. 드래그 종료 시 1회이므로 체감은 작다.

**규칙 매칭** — `js-index-maps` **직접 적용**. 스킬 선언 impact **LOW-MEDIUM**.

**반영** — `chapterIds`마다 `items.find`를 돌던 것을 `new Map(items.map(...))` 한 번 만들고 조회하도록 바꿨다. `chapterListBoundary.test.ts`에 reorder 정확성 3케이스(재배열+order 재부여, 누락 id 제외, 실패 시 순서 불변)를 추가했다.

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

### O10. 사이드바 research 항목이 매 렌더 8키 메타 객체 + 아이콘 JSX를 재생성 — LOW (**완료**)

**근거**

```
src/renderer/src/features/manuscript/components/Sidebar.tsx:199
  const meta = {
    character: { label: t("sidebar.item.characters"), icon: <FolderOpen ... />, hoverId: "res-char" },
    event:     { ... }, faction: { ... }, ...        ← 8개 항목 전체를 만들고 하나만 인덱싱
  }[...]
```

**규칙 매칭** — `rendering-hoist-jsx` **직접 적용**. 스킬 선언 impact **LOW**.

**반영** — 아이콘 컴포넌트·hoverId·labelKey를 모듈 상수 `RESEARCH_ITEM_META`로 올렸다. 렌더 시점에는 `t(labelKey)`로 label만 계산하고 `<meta.Icon/>`으로 아이콘을 그린다. 매 렌더 8키 객체 + JSX 8개 생성이 상수 조회 1회로 바뀌었다.

**확신도** — 코드 확인. 순수 구조 리팩터라 출력 JSX는 동일(typecheck로 8개 id 매핑·타입 확인).

---

### O11. 렌더 본문에서 정렬 — LOW (**완료**)

**근거**

```
src/renderer/src/features/manuscript/components/sections/SidebarWorldList.tsx:54
  const orderedTerms = [...terms].sort((a, b) => (a.order || 0) - (b.order || 0));
```

**왜 문제인가** — 렌더마다 얕은 복사 + 정렬로 새 배열이 만들어져 하위 `map`이 전부 재조정된다. terms 규모를 측정하지 않았으므로 심각도는 LOW로 둔다(1차 보고의 MEDIUM에서 하향).

**규칙 매칭** — `js-tosorted-immutable` **직접 적용**이지만 lib target이 ES2022라 `toSorted`를 쓸 수 없다. 재계산 방지는 `rerender-memo` **원리 적용**.

**반영** — `useMemo(() => [...terms].sort(...), [terms])`. `toSorted` 대신 복사본을 정렬해 불변성을 지키면서 `terms` 참조가 바뀔 때만 재정렬한다. lib를 ES2023으로 올리는 건 범위 밖이라 하지 않았다.

**확신도** — 코드 확인.

---

### O12. 구독자 없는 이벤트를 매 선택마다 emit — LOW (**완료**)

**근거**

```
src/renderer/src/features/editor/components/Editor.tsx:178,185   EditorSyncBus.emit("FOCUS_ENTITY", ...)
src/renderer/src/features/editor/components/Editor.tsx:251-252    EditorSyncBus.on/off("JUMP_TO_MENTION", ...)   ← 유일한 구독
```

`EditorSyncBus.on(` 전수 검색 결과 `JUMP_TO_MENTION`만 구독된다. `FOCUS_ENTITY`는 구독자가 0이며, emit 전에 캐릭터/용어 배열 `.find()`가 선택마다 실행된다.

**규칙 매칭** — **매칭 없음**. 죽은 코드다. `off`가 정상 호출되므로 버스 자체의 누수는 없다.

**반영** — `onSelectionUpdate` 핸들러 전체를 제거했다. 이 핸들러의 유일한 목적이 `FOCUS_ENTITY` emit이었고 구독자가 0이라, 선택마다 텍스트 샘플링 + 캐릭터/용어 `.find()`를 도는 것 자체가 순수 낭비였다. 함께 죽은 `selectionAnalyzeTimerRef`·`lastSelectionSampleRef`·`lastSelectionEmitAtRef`와 그 cleanup도 제거했다. `Character`/`Term` 타입과 store import는 `JUMP_TO_MENTION` 핸들러가 계속 쓰므로 유지했다.

**확신도** — 코드 확인(구독자 0을 전수 grep으로 확정, typecheck로 미사용 잔여 없음 확인).

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

1. **O1-b2 전후 실제 힙 상주량 — 200챕터 시나리오 heap snapshot.** 목록 경계는 닫혔지만(§7-N2, §1-O1) **실제 MB 감소는 여전히 미측정**이다. O1의 원래 목표 수치이므로 남은 측정 중 가장 중요하다.
2. **사이드바 autosave당 실제 프레임/커밋 수.** `items` 참조 동일성과 Profiler 커밋 수 불변은 `chapterListRerenderBoundary`(4개)로 확인했다. 남은 것은 실제 챕터 수에서의 프레임 드랍 실측이다.
3. O4의 인스턴스 재생성 비용 — 설정 변경 전후 allocation timeline.
4. O6의 개선 폭 — 챕터 수별 초기 렌더 시간. 적용 위치를 옮길 가치가 있는지도 이 측정으로 정해야 한다(§6 참조).
5. O9의 입력 지연 — 엔티티 수별 keypress→paint.
6. `DraggableItem`의 memo 무효화 — **결함 아님으로 확정됐다.** `src/shared/ui/DraggableItem.tsx`는 `memo`가 아니므로 인라인 객체 prop이 깨뜨릴 memo가 없다(§7.5).
7. 탭 반복 전환 시 detached DOM/ProseMirror 인스턴스 누적 — 코드상 정리는 정상, 실측 필요.
8. lucide-react 배럴 import의 번들 영향 — 번들 분석 필요.
9. N15(capture scroll listener passive)의 체감 효과 — 툴바 bounds 동기화 빈도 의존.

---

## 6. 착수 순서 및 커밋 대응

### 완료 (커밋 대응)

| 커밋 | 항목 | 내용 |
| --- | --- | --- |
| (2차, `19e0d011`·`e8af08a0`) | O1-a, O1-b1, O3 | 목록 N+1 제거, 본문 전용 캐시·구독 게이트·세대 가드·retain 보호, Binder 상시 구독 제거. |
| `a414f31b` | **N1**, N3(일부) | 분할뷰 Editor를 `SplitViewEditor`로 분리해 캐시 구독 + 로딩 게이트. O1-b2의 선행조건이었다. |
| `4c417ea4` | **O1-b2 + O2** (N2 해소) | 목록 IPC/store를 `ChapterListItem[]`로 전환, 목록 왕복 select 1회, autosave의 목록 write 제거, `withListOnlyItems`로 본문 되살아남 차단. |
| `62ab2459` | **N9** | 구독이 상한을 채우면 방금 받은 본문이 즉시 축출되던 결함(복제 시 사본 본문 누락). |
| `77cc20dd` | **N10** | 분할 editor 패널 폭 px 저장 + handle 복원. |
| `fbea1e5f` | N3(잔여), N7 | 영어 WHAT 주석 3건 정리, `useChapterContent` 배럴 노출 + 소비자 5곳 통일. |
| `e7e4217e` | O8, O11, O12 | reorder Map 조회, terms 정렬 `useMemo`, 죽은 `FOCUS_ENTITY` 핸들러 제거. |
| `ed942419` | O10 | research-item meta를 모듈 상수로 hoist. |
| `2304c2a1` | O5(부분) | `SnapshotList`·`TrashList`에 memo. UI/UX 무변경. |
| `32cc7c2c` | **N11** + 저장 결정표 | 휴지통 조회에서 본문 제거, `handleSave` 결정표 7케이스 고정. |
| `0e243c92` | **N12** | 전역 `pointerup` 중복 등록 병합(N10에서 만든 자기 회귀). |

### 남은 항목

| 우선도 | 항목 | 판단 근거 |
| --- | --- | --- |
| **다음** | 측정 (§5) | O1의 원래 목표였던 힙 절감 수치가 미측정이다. 남은 최적화의 우선순위를 사실로 정하려면 이게 먼저다. |
| 다음 | O4 | `--editor-font-size`/`--editor-line-height`가 **이미 세팅돼 있다**(`Editor.tsx:370`, `:293`). `editor.css:38`이 `font-size: 1rem`을 하드코딩해 CSS 변수를 무시하는 게 문제다. 같은 스타일이 세 경로로 중복 적용되고 그중 `useEditor` deps 경로만 재생성을 유발한다. 자체 완결적이고 같은 파일에 letter/word spacing 선례가 있다. |
| 이후 | O9 · N5 | 둘 다 `EntityGallery.tsx`다. 한 번에 처리하는 편이 효율적이다. |
| 이후 | N15 | `EditorToolbar.tsx:134` capture scroll listener에 `{ capture: true, passive: true }`. 한 줄. |
| 보류 | O6 | 스킬 impact는 HIGH지만 현재 적용 위치가 감싸는 것은 값싼 챕터 행 + `SnapshotList`(Virtuoso 가상화)다. 항목 단위로 옮기면 Virtuoso 측정과 충돌할 위험이 있다. 이득이 큰 곳은 가상화가 없는 `EntityGallery`·`SidebarChapterList`다. 측정 후 판단. |
| 보류 | N4 | canvas 확장/선택 상태를 store로 옮기는 중간 규모 리팩터가 필요하다. boolean prop만 내리는 우회는 자식이 여전히 맵을 필요로 해 성립하지 않는다. 집필 핫패스가 아니다. |
| 보류 | N13 | `Editor.tsx`(440 LOC, autosave 포함)의 전면 리팩터는 이 세션의 어떤 변경보다 크다. 낮은 위험 부분은 3개 임베드 호출부가 공유하는 `EmbeddedEditor` 추출이다. 성능 이득은 없고 유지보수성 개선. |
| 별도 | O7 | 저장 포맷 변경 + 기존 데이터 마이그레이션 필요. 소비처 3곳. |
| 별도 | N6 | 활성 스타일·위험색·portal 정책 통일. 시각 회귀 확인 범위가 넓다. |
| 사용자 결정 | N8 | Tailwind 미정의 유틸 30건. v4 커밋 2건을 거쳐도 그대로다(§7-N8 재확인). |
| 변경 안 함 | N14 | `forwardRef`는 TipTap `ReactRenderer` 통합 경계라 유지. 근거는 §7-N14. |

### 롤백 지점

```
git tag pre-o5-20260831      # O5 착수 전 (ed942419)
git revert <sha>             # 항목별 개별 롤백 — 위 표의 커밋 단위로 가능
```

---

## 7. 3~5차 재감사 신규 항목 (N1~N15)

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

---

### N2. `ChapterListItem`이 선언·수출됐으나 소비자 0 — HIGH (**완료**)

`shared/types/manuscript.ts:23`의 `ChapterListItem = Omit<Chapter, "content">`는 `types/index.ts:13`으로 배럴 수출까지 됐는데 소비자가 0건이었다. TSDoc은 "목록 경계에서는 본문을 나르지 않는다"를 규범으로 선언하지만 코드는 반대로 동작했다 — shared 계약 타입에 남은 미실현 약속이었다.

O1-b2에서 이 타입을 목록 IPC 계약(`core.contract.ts`의 `chapter.getAll`), main 서비스(`getAllChapters`), renderer store(`chapterStore`)가 모두 채택해 해소했다.

---

### N3. 코드와 어긋난 주석 2건 — HIGH (주석 규약 4항) (**완료**)

```
useChapterManagement.ts:216-217  "items 폴백은 목록에서 본문을 제거하는 단계에서 사라진다"
useChapterManagement.ts:295-296  동일 문구
```

`Chapter.content`가 그대로였고, 같은 파일의 저장 경로가 오히려 `items`에 `content`를 계속 쓰고 있었다. 미래 약속형 주석이었다.

O1-b2에서 폴백 자체가 사라져 주석도 함께 제거됐다. 남은 것은 현재 사실만 기술한다 — 복제는 "목록에 본문이 없어 폴백할 곳이 없다", 저장은 "변경 감지 기준은 본문 캐시가 유일한 출처다".

**남은 주석 항목** — 없음. 영어 WHAT 주석 3건도 처리했다: `SnapshotViewer.tsx`(리마운트 이유를 한국어 WHY로), `Editor.tsx`(`// Default false` 삭제), `ExportPreview.tsx`(부분 높이 이유를 한국어 WHY로). 지역 컴포넌트 TSDoc(`GoogleDocsRightPanel.tsx:96-102`)은 내용이 WHY라 LOW로 남긴다.

---

### N4. `memo`된 `TreeNode`가 재귀 prop으로 전멸 — MEDIUM

```
TreeNode.tsx:29        export const TreeNode = memo(...)
TreeNode.tsx:22-23     expandedFolders: Record<string, boolean>; selectedNodeId: string | null;
TreeNode.tsx:131-132   자식에 두 prop을 그대로 재귀 전달
```

폴더 하나만 토글해도 `expandedFolders` 객체 참조가 바뀌어 트리 전체 memo가 무효화된다. `isExpanded`/`isSelected` boolean만 내리면 해소된다.

**규칙 매칭** — `rerender-memo` 원리 적용. **확신도** — 코드 확인. 리렌더 폭은 노드 수 의존이라 측정 필요.

---

### N5. `EntityGallery`가 카드마다 `JSON.parse` — LOW-MEDIUM

```
EntityGallery.tsx:364 (grid) / :467 (list)   parseStructuredAttributes(entity.attributes)
parseStructuredAttributes.ts:3-6             문자열이면 JSON.parse
```

필터를 통과한 전 엔티티를 렌더 본문에서 매번 재파싱한다. O9(입력 우선순위)와 원인이 다르다. 카드를 memo 컴포넌트로 추출하고 내부에서 `useMemo([entity.attributes])`.

---

### N6. 사이드바 구현 불일치 — MEDIUM (코드 일관성)

| 갈래 | 근거 |
| --- | --- |
| 활성 행 스타일 | `Sidebar.tsx:134` `bg-active … border-l-[3px] border-accent` vs `SidebarChapterList.tsx:143` `bg-accent/10 text-accent`. 후자가 지배 관행이다 — `SidebarEventList:84`, `SidebarCharacterList:194`, `SidebarFactionList:84`, `EditorTab:258`, `ModelTab:279`, `ShortcutsTab:112`, `InspectorPanel:225`, `StartupWizard:134`. `Sidebar.tsx`만 예외이고 `border-l-[3px]`은 arbitrary 값이다. |
| 위험색 | `SidebarChapterList.tsx:119` `text-red-500`(raw 팔레트) / `TermCard.tsx:50` `text-danger` / `PlotBoard.tsx:392` `text-error` / `Sidebar.tsx:435` 무효 inline. 토큰 층에서 `--color-destructive`·`--color-error`·`--color-danger`·`--color-danger-fg`가 모두 같은 `--danger-fg`를 가리켜(`global.tokens.css:41,42,50,59`) 동의어 4개가 불일치를 구조적으로 유발한다. |
| 컨텍스트 메뉴 | `SidebarChapterList.tsx:100` `createPortal`(클리핑 회피 이유 주석 명시) vs `Sidebar.tsx:373-437` portal 없는 fixed 인라인. |

---

### N7. 배럴이 신규 훅을 노출하지 않아 import 경로가 혼용 — MEDIUM (**완료**)

`domains/manuscript/index.ts`는 `useChapterManagement`·`useChapterStore`를 수출하지만 `useChapterContent`가 빠져 있었다. 그래서 `EditorRoot.tsx:16`은 배럴에서, `:17`은 features 직접 경로에서 import하는 혼용이 O1-b1 작업으로 생겼다.

배럴에 `useChapterContent`(+ `ChapterContentState` 타입)를 추가하고, cross-domain 소비자 5곳(`SplitViewEditor`, `EditorRoot`, `GoogleDocsRightPanel`, `SnapshotViewer`, `SnapshotList`)을 모두 배럴 경로로 통일했다. `EditorRoot`·`GoogleDocsRightPanel`의 중복 import 라인도 하나로 합쳤다.

배럴 자체의 `../../features/…` 상대경로는 파일 전체가 그 스타일이라 이번엔 건드리지 않았다(별도 정리 대상).

---

### N8. 기타 확인 항목 (이번 회차 보류 포함)

- **Tailwind 미정의 유틸 30건 — 보류(사용자 결정), 재확인 결과 그대로 남아 있음.** `global.tokens.css`의 `@theme` 블록 안 `--color-*`만 색상 유틸을 만든다. 정의 목록과 renderer 전체 사용을 대조한 결과 7종 30건이 CSS를 생성하지 못한다: `text-fg-secondary` 23건(설정 9파일), `hover:bg-bg-active` 2건(`Sidebar.tsx:158,270`), `from-bg-app/40`(`TemplateGrid.tsx`), `hover:bg-accent-hover`(`ExportSidebar.tsx`), `bg-overlay`(`GraphLegendModal.tsx`), `text-primary-fg`(`GlobalErrorBoundary.tsx`), `bg-sidebar-surface`(`SidebarWorldList.tsx`), `text-tertiary`(`MemoSection.tsx`). 같은 파일이 이미 두 차례 같은 버그를 일괄 수정한 이력을 주석으로 남겼다(`:41-45` 3곳, `:51-57` 94곳) — 이건 3차 잔존분이다.

  > 재확인(2026-09-01): 사용자의 Tailwind v4 커밋 2건(`4cd75632` 마이그레이션, `72eb33f8` 문법 전환)을 거친 뒤에도 **8종 전부 건수가 동일하고 토큰 정의도 추가되지 않았다**(`--color-fg-secondary`/`--color-bg-active`/`--color-overlay`/`--color-sidebar-surface` 각 0건). v4 전환 작업의 사각지대로 보인다.
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

---

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

---

### N11. 휴지통 조회가 본문을 계속 실어 보냄 — LOW-MEDIUM (**완료**)

O1-b2는 `getAllChapters`만 고쳤고 휴지통 경로는 놓쳤다. ISTQB 재감사에서 찾았다.

**근거(수정 전)**

```
src/main/services/features/manuscript/chapterService.ts
  getDeletedChapters가 .select()로 전 컬럼(legacy chapter.content 포함) 조회
src/shared/api/core.contract.ts
  getDeleted 반환이 Chapter[]
src/renderer/src/features/trash/components/TrashList.tsx
  setItems(response.data as TrashItem[])   ← 캐스팅으로 타입 검사 우회
```

**왜 문제인가** — `TrashList`는 `content`를 **한 번도 참조하지 않고**(전수 grep 0건) 복원은 `restoreChapter`가 따로 처리하므로 본문이 필요 없다. 그런데 삭제 챕터 수만큼 legacy 본문이 IPC를 건너 렌더러 힙에 올라왔다. 신규 데이터는 `chapter.content`가 `""`라(본문은 `chapterBody`에 쓴다) 실피해가 작지만, 마이그레이션 이전 프로젝트는 실제 본문이 그대로 남아 있다. 무엇보다 **목록 경계가 한쪽만 닫혀 있던 불일치**다.

`as TrashItem[]` 캐스팅이 타입 검사를 우회하고 있어서, 나중에 누가 `item.content`를 읽으면 런타임에 `undefined`를 만나는 함정도 있었다.

**수정** — `getDeletedChapters`를 `getAllChapters`와 같은 명시 컬럼 목록으로 바꿨다(`ChapterListItem[]` 반환). 계약 타입, `TrashItem` 기반 타입(`Chapter` → `ChapterListItem`), `SidebarCompactHover`의 `trashItems` 상태를 함께 전환하고 캐스팅을 제거했다.

**검증** — `chapterListContentResolution.test.ts`에 4케이스 추가(본문 키 부재, 미삭제 챕터 제외, 빈 목록 BVA, 삭제→복원 후 단건 조회가 본문 반환). `.select()`로 되돌리면 2건 실패로 검출력 확인.

---

### N12. 같은 컴포넌트가 전역 `pointerup`을 두 번 등록 — LOW (**완료 · 자기 회귀**)

N10(패널 폭 저장)을 넣을 때 제가 만든 회귀다. research용 listener effect를 복사해 editor용을 따로 등록했다.

**근거(수정 전)**

```
src/renderer/src/features/workspace/components/panels/WorkspacePanels.tsx:260  window.addEventListener("pointerup", ...)  ← research
src/renderer/src/features/workspace/components/panels/WorkspacePanels.tsx:355  window.addEventListener("pointerup", ...)  ← editor (중복)
```

한 컴포넌트에서 같은 이벤트를 두 번 등록하면 포인터를 뗄 때마다 핸들러가 두 번 실행된다. 두 `end*Resize`가 각자 자기 resize 플래그를 확인해 조기 반환하므로 기능 결함은 없었지만, 규칙상 명확한 위반이고 앞으로 패널 종류가 늘면 선형으로 증가한다.

**수정** — 하나의 effect로 합쳐 두 `end*Resize`를 함께 호출한다. 두 패널은 상호 배타적이고 각 함수가 자기 플래그로 가드하므로 안전하다.

**규칙 매칭** — `client-event-listeners` **직접 적용**.

**검증** — `pointerup` 등록 1건으로 확인. `editorPanelWidthCapture` + `researchPanelWidthCapture` 9개 통과(폭 캡처·복원 회귀 없음).

---

### N13. `Editor`가 boolean prop 8개로 모드를 표현 — MEDIUM (**미착수 · 범위 큼**)

`vercel-composition-patterns` 규칙집으로 처음 검사한 항목이다(이전 라운드는 이 규칙집을 쓰지 않았다).

**근거**

```
src/renderer/src/features/editor/components/Editor.tsx:32-48
  readOnly, hideToolbar, hideFooter, hideTitle, scrollable, autoHeight, focusMode, mobileView
src/renderer/src/features/workspace/components/layout/EditorRoot.tsx:316-328
  hideToolbar={uiMode === "docs" || uiMode === "scrivener" || uiMode === "editor"}
  hideFooter={uiMode !== "default"}
  scrollable={uiMode === "scrivener" || uiMode === "default"}
  autoHeight={uiMode === "docs"}
```

**호출부 조합**

| 호출부 | readOnly | hideToolbar | hideFooter | hideTitle | scrollable | autoHeight |
| --- | --- | --- | --- | --- | --- | --- |
| `EditorRoot` (메인) | `!activeChapterId` | uiMode 조건 | uiMode 조건 | uiMode 조건 | uiMode 조건 | `uiMode === "docs"` |
| `GoogleDocsRightPanel` | — | ✓ | ✓ | ✓ | ✓ | — |
| `SplitViewEditor` | false | ✓ | ✓ | — | — | — |
| `SnapshotViewer` | ✓ | ✓ | ✓ | — | — | — |

**왜 문제인가** — 4개 호출부 중 3개가 "chrome 없이 본문만" 이라는 같은 의도를 boolean 조합으로 반복한다. 메인만 `uiMode`에서 boolean을 파생시키는데, 이는 규칙이 지적하는 "모드 enum → boolean 다발" 패턴이다. 조합이 늘면 유효하지 않은 조합(예: `hideTitle` + `autoHeight`)도 타입상 표현 가능해진다.

**규칙 매칭** — `architecture-avoid-boolean-props` **직접 적용**, `patterns-explicit-variants` **직접 적용**.

**수정 범위(주의)** — `Editor.tsx`는 약 440 LOC이고 autosave가 그 안에 있다. 전면 compound-component 리팩터는 이 세션에서 다룬 어떤 변경보다 크고, 데이터 손실 경로를 건드린다. 낮은 위험으로 얻을 수 있는 부분은 **3개 임베드 호출부가 공유하는 `EmbeddedEditor` 변형 추출**이다(`SplitViewEditor`가 이미 그 형태다). 메인의 `uiMode` 파생은 그대로 두는 편이 안전하다.

**확신도** — 조합표는 코드 확인. 리팩터 이득은 유지보수성이고 성능 이득은 없다.

---

### N14. `forwardRef` 사용 — LOW (**변경하지 않음 · 근거 있음**)

```
src/renderer/src/features/editor/components/SlashMenu.tsx:1,52  forwardRef + useImperativeHandle
```

React 19.2.7이라 `react19-no-forwardref`가 **직접 적용**되는 형태이긴 하다. 그러나 이 컴포넌트는 TipTap `ReactRenderer`(@tiptap/react 3.27.1)가 마운트하고 `suggestion.tsx:234`가 `suggestionRef?.onKeyDown?.()`로 인스턴스를 읽는 **서드파티 통합 경계**다. ref 전달 방식이 TipTap 내부 구현에 달려 있어, 바꾸면 슬래시 메뉴 키보드 조작이 조용히 깨질 수 있다.

`forwardRef`는 React 19에서 제거되지 않았고 신규 코드에 권장하지 않을 뿐이다. 이득(스타일 정합)보다 위험(사용자 조작 회귀)이 커서 유지한다. renderer의 `useContext` 사용은 2건뿐이고(`shared/ui/useDialog.ts:5`, `shared/ui/ToastContext.tsx:13`) 둘 다 provider 훅 내부라 `use()` 전환 이득이 미미하다.

---

### N15. capture scroll listener에 `passive` 누락 — LOW (**미착수**)

```
src/renderer/src/features/editor/components/EditorToolbar.tsx:134  window.addEventListener("scroll", syncBounds, true)
```

3번째 인자가 `true`(capture)라 옵션 객체가 아니어서 `passive`를 줄 수 없는 형태다. `{ capture: true, passive: true }`로 바꾸면 된다. 같은 파일 `:133`의 `resize`는 passive 대상이 아니다.

**규칙 매칭** — `client-passive-event-listeners` **직접 적용**. 프로젝트에 선례가 있다(`useEditorScrollRestoration.ts:52`가 `{ passive: true }` 사용).

**확신도** — 코드 확인. 체감 효과는 툴바 bounds 동기화 빈도에 달려 측정 필요.

---

## 8. 검증 기록

### 최종 집계 (2026-09-01)

| 범위 | 스위트 | 테스트 |
| --- | --- | --- |
| main (`tests/main/services/**`) | 2 | **20 passed** |
| renderer + dom (chapter·panel 관련) | 13 | **82 passed** |
| 합계 | **15** | **102 passed** |
| TypeScript | — | **0 errors** |
| ESLint (변경 파일) | — | **exit 0** |

이 세션에서 추가한 스위트 7개: `chapterContentRetainPressure`(5), `chapterListBoundary`(10), `defaultLayoutEditorPanelWidthPx`(7), `splitViewEditorContentGate`(6), `chapterListRerenderBoundary`(4), `editorPanelWidthCapture`(4), `sidebarHoverSubtreeIsolation`(2), `handleSaveDecisionTable`(7). 기존 `chapterListContentResolution`은 계약 변경에 맞춰 재작성했다(10 → 15).

**모든 신규 스위트는 결함 검출력을 확인했다** — 대응 수정을 되돌리면 해당 테스트가 실패하는 것을 실제로 실행해 검증했다. 검출력 확인 목록은 각 회차 절에 있다.

### 테스트 작성 중 잡은 무효 테스트 1건

`sidebarHoverSubtreeIsolation` 초안은 `vi.mock`이 **테스트 파일 자신의 import까지 가로채** 실코드가 아니라 대역(memo로 감싼)을 검사했다. 실코드에서 `memo`를 떼도 초록으로 통과했다. `vi.importActual`로 실모듈을 가져오도록 고쳐 검출력을 확보했다. 검출력 확인을 생략했다면 그냥 넘어갔을 함정이다.

### 환경 관련 (반복 발생)

- `better-sqlite3`가 Electron ABI ↔ Node ABI를 오간다. main 스위트를 vitest로 돌리려면 `pnpm rebuild better-sqlite3`, 앱을 띄우려면 `pnpm rebuild:electron`이 필요하다. 세션 중 여러 번 전환됐다.
- 이 변경과 무관한 기존 실패: `check:persist-contracts`(`graphStore.ts:24` persist 옵션 누락), `check:main-service-boundaries`(`rg` 미설치), `chapterKeywords.ts` lint 5건(`no-await-in-loop`). 셋 다 워킹트리 변경이 없는 커밋된 상태의 결함이다.

### ISTQB 정밀 재감사 라운드 (2026-08-31, 사용자 수동 검증 통과 이후)

수동 검증이 전부 통과한 뒤 한 번 더 훑었고, 그 과정에서 N11을 찾아 고쳤다.

| 범위 | 결과 | 확인한 계약 |
| --- | --- | --- |
| `chapterListContentResolution.test.ts` (확장) | **15 passed** | 기존 11 + 휴지통 경계 4(본문 키 부재·미삭제 제외·빈 목록 BVA·삭제→복원 후 본문 반환). |
| `handleSaveDecisionTable.test.tsx` (신규) | **7 passed** | 저장 경로 결정표. stale 프로젝트 차단, dedupe, 본문/제목 변경별 분기, 본문만 바뀔 때 `items` 참조 유지, 빈 제목 대체, 본문 전체 삭제, **캐시 미스 + 빈 본문의 현재 동작**. |
| 전체 chapter 관련 renderer/dom 11스위트 | **71 passed** | 회귀 없음. |
| main 2스위트 | **20 passed** | |
| TypeScript / ESLint | **0 errors / exit 0** | |

**결함 검출력 확인**

- `getDeletedChapters`를 `.select()`로 되돌림 → 휴지통 경계 2건 실패.
- `handleSave`의 stale 프로젝트 가드 제거 → R3 실패.
- `applyOptimisticTitle`을 무조건 호출로 바꿔도 결정표는 통과했다. store 액션 자체에 제목 무변화 가드가 있어(2중 방어) hook 조건이 없어도 `items` 참조가 유지되기 때문이다. 그 store 가드는 `chapterListBoundary.test.ts`가 따로 고정한다.

**남은 위험 1건 (가드 미적용, 의도적으로 현재 동작을 고정만 함)**

`handleSave`는 `api.autoSave`를 조건과 무관하게 호출한다. 그래서 **캐시 미스(해당 챕터에 마운트된 Editor 없음) + 빈 `newContent`** 조합에서는 본문 변경이 감지되지 않아 캐시에는 쓰지 않지만 **빈 본문이 저장 큐에는 들어간다.**

현재 도달하지 않는다 — Editor는 `isLoaded` 게이트로 빈 본문 마운트를 막고, 마운트된 챕터는 `retainChapterContent`로 축출되지 않아 캐시가 항상 채워져 있다. 즉 안전은 **게이트가 보장하고 `handleSave` 자체에는 가드가 없다.** 게이트를 우회하는 진입점이 생기면 데이터 손실 경로가 열린다.

가드를 넣지 않은 이유는 정당한 흐름을 막을 수 있어서다(예: 캐시가 없는 챕터에 스냅샷 본문을 적용하는 경로). `handleSaveDecisionTable.test.tsx`의 마지막 케이스가 이 동작을 명시적으로 고정하므로, 가드를 추가하면 그 기대값을 함께 바꿔야 한다.

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

