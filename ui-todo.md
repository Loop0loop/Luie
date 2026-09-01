# UI System Refactor — Theme Token 재설계

> 브랜치: `refactor/ui-system`
> 상위 규범: [`DESIGN.md`](DESIGN.md), [`docs/quality/frontend-css-agents.md`](docs/quality/frontend-css-agents.md)
> 단일 진실 공급원: [`src/renderer/src/styles/global.tokens.css`](src/renderer/src/styles/global.tokens.css)

## 진단 요약

> **이 절의 수치는 착수 시점(기준 커밋 `9e2ad0ef`) 값이다.** §1-A·§2·§3에서 팔레트를 다시 잡았으므로 현재 값과 다르다. 왜 이 작업을 시작했는지에 대한 기록으로 남긴다. 현재 값은 각 절의 "확정값"·"검증" 블록과 아래 **현재 상태** 표를 본다.

나열된 증상 대부분이 하나의 원인에서 나온다. **Light/Sepia의 표면 계단(surface ladder)이 붕괴했고 border가 사실상 보이지 않는다.**

### 표면 분리 대비 실측 (착수 시점)

| 표면 쌍 | Light | Sepia | Dark |
| --- | --- | --- | --- |
| app / panel | **1.000 (동일색)** | 1.024 | 1.182 |
| app / surface | **1.000 (동일색)** | 1.024 | 1.182 |
| app / element | **1.000 (동일색)** | 1.059 | 1.342 |
| app / research | **1.000 (동일색)** | 1.024 | 1.081 |
| surface / element | **1.000 (동일색)** | 1.035 | 1.135 |

Light는 `--bg-app`·`--bg-panel`·`--bg-surface`·`--bg-element`·`--bg-research`가 전부 `#ffffff`다. Sepia는 값이 다르지만 폭이 2~6%라 인지되지 않는다. Dark만 규범을 지키고 있다.

### border 대비 (WCAG 1.4.11 UI 경계 3:1)

| 토큰 | Light | Sepia | 판정 |
| --- | --- | --- | --- |
| `--border-default` | 1.26:1 | 1.33:1 | 실패 |
| `--border-active` | 1.52:1 | 1.64:1 | 실패 |


표면 차이도 없고 테두리도 안 보인다 → 컴포넌트가 토큰을 포기하고 하드코딩으로 도망간다 (`EntityGallery.tsx:373`의 `border-black/0 → hover:border-black/70`).

### 텍스트 대비

`--text-tertiary`가 Sepia 2.82:1(실패), Light 3.34:1 / Dark 3.42:1(본문 4.5:1 미달). placeholder·3차 텍스트에 사용됨.

---

## 현재 상태 (2026-09-01 기준)

### 표면 계단 — 해소됨

인접 단계가 light/sepia 모두 1.04 → 1.07로 단조 증가한다(panel > app > ai > sidebar > element).

| 인접 | light | sepia |
| --- | --- | --- |
| panel / app | 1.054 | 1.043 |
| app / ai | 1.045 | 1.044 |
| ai / sidebar | 1.055 | 1.054 |
| sidebar / element | 1.067 | 1.065 |
| **app / research** (editor ↔ chrome) | **1.102** | **1.100** |

### border 3단 계단 — 해소됨 (§4)

기준면은 **컨트롤이 실제로 놓이는 `--bg-panel`**이다. §1·§2가 `--bg-element` 기준으로 잡았던 것을 §4에서 바로잡았다 — WCAG 1.4.11은 "인접 색" 대비를 요구하므로 컨트롤이 맞닿는 면이 기준이다.

| 역할 | 소비처 | light | sepia | dark |
| --- | --- | --- | --- | --- |
| `--border-default` (soft) | 카드 · 구분선 · 목록 행 | 1.27 | 1.28 | 1.28 |
| `--border-active` | hover 승격 | 1.99 | 2.00 | 1.67 |
| `--border-strong` | **input · select · 토글 · checkbox** | **3.29** | **3.30** | **3.07** |
| `data-contrast="high"`의 default | 고대비 시 카드·구분선 | 1.44 | 1.45 | 1.89 |

Radix Colors step 6/7/8과 M3 `outline`/`outline-variant`에 대응한다. `--border-default`·`--border-active`는 장식선·상태선이라 3:1을 목표로 하지 않는다.

### 역할별 하한 — 가장 불리한 표면(`--bg-element`) 기준

| 항목 | light | sepia | 판정 |
| --- | --- | --- | --- |
| `--text-secondary` | 4.88 | 4.91 | AA 통과 |
| `--text-tertiary` | 4.01 | 4.01 | 의도된 4:1 정렬 |
| accent 텍스트 | 4.17 | 4.25 | **AA 미달** — 남은 항목 |

### 고대비 모드 — 해소됨 (§4 Task 2)

9개 조합 **전부** 적용된다. 이전에는 색온도 변형 4개에서 특이도 때문에 아예 걸리지 않았다.

| | light 계열 | sepia 계열 | dark 계열 |
| --- | --- | --- | --- |
| `--text-primary` | 12.28~13.73 (유지) | 8.06~9.11 → **11.9~12.0** | 유지 |
| `--text-secondary` | 4.8~5.1 → **6.96~6.99** | 6.5 → **7.01~7.11** | 유지 |
| `--text-tertiary` | 4.01 → **4.52** | 4.25 → **4.51~4.56** | 2.55 → **5.00** |

축(`b − r`)이 전 조합에서 보존되므로 sepia에 중성 회색이 얹히지 않는다. 순검정 `#000`·`#333`은 제거했다.

### 회귀 방어 — 가동 중 (§8)

- `tests/renderer/styles/borderLadderContrast.test.ts` **65 케이스** — 계단 단조·3:1·특이도·base 폴백·색조 보존·dark 상속
- `pnpm run check:design-tokens`가 `qa:core` 게이트에 연결됨. 이전에는 어떤 스크립트에도 없어 수동 실행뿐이었다

### 남은 팔레트 부채

- accent를 `--bg-element` 위 본문 텍스트로 쓰면 4.17/4.25로 AA 미달
- dark `--text-tertiary` 기본 모드 2.55~2.98 (의도된 선택, §2 기록. 고대비가 5.00으로 메운다)
- `--bg-element`를 fill로 쓰는 컨트롤 4곳(`GraphFilterSidebar`·`SearchInput`·`SynopsisEditor`·`EntityGallery`)은 경계 대비 2.54~2.71로 3:1 미달. 이전 1.16보다는 크게 개선. fill을 올리면 §2의 "파인 면" 설계와 충돌하므로 경계 강도 우선으로 두고 기록만 남긴다
- `--border-focus`의 이름과 역할이 어긋난다 — focus 표시는 accent ring이 담당하므로 이 토큰의 소비처는 `--canvas-handle-bg` 하나뿐이고 실제 역할은 "neutral 계단의 최강 단계"다

---

## 작업 항목

한 번에 하나씩 진행한다. 각 단계 완료 시 `pnpm run typecheck` + 대비 실측으로 검증한다.

### 1. 토큰 레이어 정리 — 완료

기준 커밋 `9e2ad0ef`. 대상 파일 2개: `global.tokens.css`, `components/editor.css` (+49 −47).
팔레트 값은 건드리지 않았다. 일반 사용 경로의 렌더 결과는 동일하고, 변경은 고대비 경로에만 나타난다.

- [x] dead 토큰 제거 — `--namu-*` 7개, `--bg-panel-header`, `--bg-canvas`, `--bg-primary`, `--character-color-fallback` (전부 소비처 0 확인 후 제거)
- [x] `:root` 중복 선언 정리 — `--danger-fg`(`#ef4444`→`#dc2626`), `--bg-secondary`(`#f9fafb`), `--bg-hover`. 뒤 선언이 이기고 있었으므로 렌더 결과 유지하고 죽은 앞쪽만 제거
- [x] `--ring-color` 죽은 간접참조 제거 → `--color-ring: var(--accent-bg)`
- [x] `--border-strong` 신설 + `@theme` 매핑 `--color-border-strong`. 7개 테마 조합 전부 정의, 모두 3:1 이상 실측
- [x] `[data-contrast="high"]` — 교정 3건을 넣었다가 **사용자 결정으로 전량 롤백**(대비가 과했음). **§4 Task 2에서 낮은 강도 + theme별 분기로 해소.** 아래 상세 참조
- [x] `--editor-bg` / `--editor-text` alias 전환 — 테마 변형 리터럴 18개 제거, `editor.css:35`가 `var(--editor-text, …)`를 실제로 읽게 함

#### `--border-strong` 실측값

| 조합 | 값 | 가장 밝은 표면 대비 |
| --- | --- | --- |
| light | `#8e8e96` | 3.25:1 |
| light + cool | `#8a8f9b` | 3.24:1 |
| light + warm | `#918b7e` | 3.33:1 |
| dark (+cool/warm 상속) | `rgba(255,255,255,0.36)` | 3.07:1 |
| sepia | `#9d8462` | 3.39:1 |
| sepia + cool | `#948a7b` | 3.18:1 |
| sepia + warm | `#9a8356` | 3.34:1 |

dark는 기존 8%/16% 알파로는 3:1에 물리적으로 도달할 수 없어 36%가 필요했다. **소비처는 아직 0** — §4·§5에서 입력·토글에 연결할 기반이다.

#### 고대비 — 롤백했다가 §4 Task 2에서 해소

UI 확인 결과 대비가 과해서 **HEAD 상태로 전량 롤백**했다. 아래 두 버그는 알고도 남겨둔 것이었다.

- **sepia 고대비에 중성 회색이 얹힌다.** `[data-theme="sepia"]`와 `[data-contrast="high"]`가 특이도 1:1이고 후자가 뒤에 와서 이긴다 → 따뜻한 종이 위에 `#333` 글자, `#d4d4d8` 테두리
- **light+cool·light+warm·sepia+cool·sepia+warm에서 고대비가 아예 안 걸린다.** `[data-contrast="high"]`는 특이도 1, `[data-theme][data-temp]`는 2라서 색조 변형이 이긴다. dark는 특이도 2 블록이 있어 영향 없음

당시 기록한 재시도 방향: *"테두리는 `--border-strong`(3:1)이 아니라 `--border-active` 수준으로, 글자는 순검정 대신 theme 색조를 유지한 한 단계 진한 값으로. 특이도 문제는 theme별 분기를 두어야 해결된다."*

> **해소됨 (2026-08-31, §4 Task 2).** 위 방향 그대로 처리했다. theme별 분기 블록 5개를 신설해 특이도를 (0,2,0)·(0,3,0)으로 올렸고, 글자는 **채널 균등 감산**으로 축(`b − r`)을 보존했다(명도 스케일은 sepia 축을 −37 → −23으로 압축해 폐기). 테두리는 3:1이 아니라 soft보다 한 단계 진한 1.44~1.89다. 9개 조합 전수 실효값 비교로 검증했고, `tests/renderer/styles/borderLadderContrast.test.ts`가 재발을 막는다. 상세는 §4 참조.

#### 검증

- `pnpm run typecheck` 통과
- `canvasThemeTokens.test.ts` 6 passed
- 중복 선언 / 괄호 균형 검사 0건
- **theme×temp×contrast 18개 조합 × 감시 토큰 27개 = 486칸 실효값 전수 비교** — HEAD 대비 차이 23건. 전부 `--bg-research`(§2·§3 항목, 아래) 또는 `--editor-text`(alias 전환으로 **렌더 결과 동일**, 기존에도 `--text-primary`가 그려지고 있었음)

---

### 1-A. Research 표면을 sidebar 색으로 — 완료

§2·§3에 걸친 항목이지만 UI 확인에서 최우선으로 지목돼 먼저 처리했다.

**문제**: Research 패널이 editor(`--bg-app`)나 부유 표면(`--bg-panel`)의 색을 따라가고 있었다. Research는 작업대이자 chrome이지 부유 카드가 아니다.

| 조합 | 이전 `--bg-research` | 정체 | 이후 |
| --- | --- | --- | --- |
| light | `#ffffff` | **app과 동일 (완전 붕괴)** | `#f5f5f7` |
| light + cool | `#f8fafd` | panel | `#eff2f7` |
| light + warm | `#fdf8ef` | panel | `#f6eee2` |
| dark | `#212123` | **이미 sidebar** | 변화 없음 |
| dark + cool | `#2a3041` | panel | `#222636` |
| dark + warm | `#322d24` | panel | `#2a261f` |
| sepia | `#fcf5e7` | panel | `#f3e5cc` |
| sepia + cool | `#f7f2e9` | panel | `#ebe2d2` |
| sepia + warm | `#f8e6c3` | panel | `#f2ddb0` |

**dark neutral만 이미 올바른 관계였다.** 나머지 8개 조합을 그 규칙에 맞췄다.

- [x] `--bg-research: var(--bg-sidebar)` alias 1줄로 통합, theme·temp 블록의 리터럴 8개 제거 → 규칙을 다시 깰 수 없게 함
- [x] editor와의 분리 대비: light `1.000 → 1.089`, light+cool `1.019 → 1.094`, light+warm `1.024 → 1.114`, sepia `1.024 → 1.119`, sepia+cool `1.028 → 1.121`, sepia+warm `1.042 → 1.131`
- [x] 9개 조합 전부 `research == sidebar` 단정 검사 통과

**부수 효과(의도된 개선)**: `.editor-adjacent-surface`의 그라디언트가 `--bg-sidebar` → `--editor-adjacent-surface`인데, research 인접 시 두 stop이 같은 색이 되어 **단색으로 평탄해진다.** sepia에서 보이던 경계 띠가 사라진다 (§6 첫 항목의 일부 해소).

### 1-B. Modal을 Radix Dialog로 전환 — 완료

**증상** (UI 확인 지적): 캐릭터 추가 템플릿 모달이 열렸는데 sidebar와 editor toolbar가 모달 위에 그려지고 focus까지 갔다. 테마 무관.

**원인 2개**

1. **stacking context.** `Modal`이 portal 없이 호출 위치에 `fixed inset-0 z-9999`로 렌더됐다. `MainLayout.tsx:457`의 main-content-panel이 `relative z-0`으로 stacking context를 만들기 때문에 `z-9999`가 그 안에 갇힌다. 형제인 sidebar-panel(`z-10`)과 body로 portal되는 editor toolbar(`z-toolbar` 120)가 모달 위에 올라온다
2. **focus 관리 부재.** focus trap·Escape·focus 복원·`role="dialog"`·`aria-modal`이 전부 없었다

**해법**: `radix-ui` 1.6.0이 `Dialog`를 export하고 프로젝트가 이미 같은 패키지의 `DropdownMenu`·`ScrollArea`·`Slot`을 쓴다. 직접 focus trap을 만들지 않고 Radix Dialog로 전환했다. 신규 의존성 0.

- [x] `Dialog.Portal` → body로 렌더. stacking context 탈출
- [x] `z-9999` → `z-modal` (named scale, 1000)
- [x] `Dialog.Content`가 focus trap · Escape · focus 복원 · `aria-modal` · 배경 `aria-hidden` 담당
- [x] `Dialog.Title`로 `aria-labelledby` 연결. `aria-describedby={undefined}`로 Radix 경고 차단
- [x] 닫기 버튼에 `aria-label`/`title` 추가 (`common.close` — ko·en·ja 전부 존재, 신규 i18n 키 0)
- [x] `PromptDialog` input의 Escape 분기 제거 — Radix가 처리하므로 `onCancel`이 두 번 실행됐다
- [x] `PromptDialog` input에 `<label className="sr-only">` 연결 (placeholder를 label로 쓰지 않는다)
- [x] 모든 버튼에 `focus-visible:ring` 추가

**무효 클래스 제거** — 빌드 산출 CSS(`out/renderer/assets/styles/index-*.css`)에서 0건 확인

- [x] `rounded-shell` → `rounded-panel`. `--radius-shell`이 정의돼 있지 않아 **모달에 radius가 아예 없었다**
- [x] `shadow-modal` → `shadow-panel`. `--shadow-modal`도 없어 **shadow가 없었다**
- [x] `animate-in fade-in zoom-in-95 slide-in-from-bottom-2` 제거 — 아래 참조

**팔레트 위반 교정** (기존 토큰만 사용, 신규 토큰 0)

- [x] `bg-red-500 hover:bg-red-600` → `bg-destructive` (`--color-destructive: var(--danger-fg)`). sepia에서 red-500이 튀는 실제 테마 버그였다
- [x] `text-white` → `text-on-accent`

**부수 효과(의도된 개선)**: portal이 `.research-surface`의 token 평탄화 범위도 벗어나므로, Research 안에서 열린 모달의 `bg-panel`·`bg-secondary`·`bg-surface`·`border-border`가 살아난다. **캐릭터 템플릿 카드 outline·배경 문제(§7 지적사항)가 함께 해소된다.**

**검증**: typecheck 통과 · eslint 통과 · `tests/dom` 39/40 파일 통과 · `tests/renderer` 59/61 통과. `restoreBackupDialog.test.tsx`는 portal 구조에 맞게 조회 기준을 `document.body`로 갱신했다. 남은 실패 5건(`rebuildMemoryCardWriterFlow` 3, `projectTemplateInitialization` 1, `useSidebarResizeCommit` 1)은 **Modal을 원복해도 동일하게 실패하는 기존 문제**로 확인했다.

#### 발견: `tailwindcss-animate`가 설치돼 있지 않다 — 해소됨

빌드 CSS에서 `animate-in`·`fade-in`·`zoom-in`·`slide-in-from`이 **전부 0건**이다. 패키지가 `package.json`에 없고 `global.css`에 import도 없고 `@utility`/`@keyframes` 정의도 없다.

**즉 20개 파일에 흩어진 `animate-in` / `slide-in-from-left` / `slide-out-to-right` / `fade-in` / `zoom-in-95`가 모두 죽은 클래스다.** `DESIGN.md` §8은 "Enter/exit slides use `tailwindcss-animate`"라고 적고 있는데 사실이 아니다. `global.behaviors.css`의 `flex-grow` transition은 정상 동작하므로 패널 리사이즈 보간만 살아 있고, **열기/닫기 슬라이드·페이드는 실제로 실행되지 않는다.**

- [x] **결정: `tw-animate-css` 도입이 아니라 `@utility`로 직접 정의** — `styles/global.animations.css` 신설. 아래 상세
- [x] `DESIGN.md` §8 수정 — `tailwindcss-animate` 서술 제거, 치트시트의 BORDER·SHADOW·MOTION 행 갱신
- [x] `data-animations="off"` / `prefers-reduced-motion` 정책과 함께 설계

#### 결정: 외부 패키지 대신 직접 정의 (2026-08-31)

**왜 `tw-animate-css`(v4용 공식 대체)를 쓰지 않았나.** 처음에는 그쪽을 추천했으나 근거가 "shadcn이 쓴다"는 관성이었다. 실측해보니 판단이 뒤집혔다.

```
.duration-200{--tw-duration:.2s;transition-duration:.2s}
.ease-out{--tw-ease:var(--ease-out);transition-timing-function:var(--ease-out)}
```

**v4의 `duration-*`·`ease-*`가 `--tw-duration`·`--tw-ease`를 노출한다.** v3에는 없던 것이고, `tailwindcss-animate`라는 플러그인이 존재했던 주된 이유가 바로 이 배관이다. `animation-duration: var(--tw-duration, …)`로 읽으면 **컴포넌트에 이미 붙어 있는 `duration-100`~`duration-700`이 그대로 동작한다** — 클래스 이름을 하나도 바꾸지 않았다.

세 가지 근거로 직접 정의를 골랐다.

1. 필요한 프리미티브가 10개뿐이다. 외부 패키지는 수십 개를 싣는다
2. 이 프로젝트는 이미 `200ms cubic-bezier(0.2,0,0,1)`을 모션 규범으로 쓴다. 외부 패키지는 자기 기본값을 가져오므로 **모션 규범이 두 개**가 된다. 직접 정의하면 프로젝트 값을 기본으로 상속시킬 수 있다
3. `--shadow-control`·`--elevation-tint`를 직접 만든 것과 같은 결정이다. 외부 `--tw-enter-*` 대신 `--luie-*` 이름 규칙을 유지한다

**의존성 0 · 컴포넌트 변경 0.**

##### 수집한 기존 로직 (구현 전 전수 조사)

| 항목 | 실측 |
| --- | --- |
| 사용처 | 21개 파일 / 클래스 90건 / **고유 조합 20종** |
| 필요 프리미티브 | `animate-in`·`animate-out`·`fade-in`·`fade-out`·`zoom-in-95`·`slide-in-from-{left,right,bottom}`·`slide-out-to-{left,right}` + 접미사(`-2`·`-4`·`-5`·`-full`) |
| duration | `100`·`150`·`180`·`200`·`300`·`700` (기존 `duration-*` 유틸 그대로) |
| **게이팅 있음** | 레이아웃 패널 **6곳** — `enableAnimations && (isClosing ? animate-out … : animate-in …)` |
| **게이팅 없음** | 모달·툴팁·드롭다운·토스트·canvas 부유 요소 **13곳** — 항상 적용 |
| exit 기계 | `useResizablePanelPresence`가 `durationMs`(200ms) 동안 마운트를 유지하고 `isClosing`을 준다 → **CSS만 있으면 exit도 동작한다.** 구조는 이미 올바르게 만들어져 있었다 |
| 억제 층 1 | `data-animations="off"` / `data-layout-restoring="true"` → `global.behaviors.css`가 `animation-duration: 0ms !important`. **이미 animation을 포함**하므로 추가 작업 없음 |
| 억제 층 2 | OS `prefers-reduced-motion` → `canvas.css`에만 있어 canvas 밖은 미적용이었다. **전역으로 옮겼다** |
| Radix `data-state` 기반 | **0건.** 전부 조건부 렌더링/플래그 방식이라 `data-[state=open]:` 변형이 필요 없다 |

##### 구현

`@keyframes luie-enter`/`luie-exit` 2개 + `@utility` 20개(정적 13 + 숫자 접미사 함수형 8). `animate-in`/`animate-out`이 keyframe을 걸고 `fade-*`·`zoom-*`·`slide-*`는 그 keyframe이 읽는 `--luie-*` 변수만 설정한다. 설정되지 않은 축은 "변화 없음" 기본값으로 남으므로 조합이 자유롭다.

- 기본 duration/easing은 `@theme`의 `--animate-enter-exit-duration: 200ms` · `--animate-enter-exit-ease: cubic-bezier(0.2,0,0,1)`
- 숫자 접미사는 `--value(integer) * var(--spacing)`으로 Tailwind spacing 스케일을 따른다 → `slide-in-from-bottom-4` = 1rem (`mb-4`와 같은 값)
- 접미사 없는 `slide-in-from-left`는 100%(자기 폭). 패널은 폭 0에서 열리므로 이게 맞다
- `animation-fill-mode: both` — 시작 프레임을 첫 페인트부터 적용해 마운트 직후 깜빡임을 막는다
- `canvas.css`의 중복 reduced-motion 블록 제거

##### 검증

- 빌드 CSS에서 `@keyframes luie-enter`·`luie-exit` 생성, 사용 유틸 13종 전부 생성 확인
- `duration-100`~`duration-700`이 모두 `--tw-duration`을 세팅하는 것 확인 → 배관 동작
- 전역 `@media (prefers-reduced-motion:reduce)` 블록 생성 확인
- `typecheck` · `lint` · `build` 통과 · 테스트 288/291(잔여 3건 §1-B 기존 실패) · `check:design-tokens` 통과

> **UI 확인 필요**: 지금까지 움직이지 않았으므로 사이드바·Research 패널·Inspector 열고 닫기, 모달, 토스트, 툴팁, canvas 부유 컨트롤의 인상이 처음으로 달라진다. 특히 패널은 `flex-grow` 폭 보간(200ms)이 이미 동작하는데 거기에 `slide-out-to-left`가 겹치므로 **중복으로 보이면 slide를 빼고 fade만 남기는 선택지**가 있다.


---

### 2. Light 팔레트 재조정 — 표면·border 완료 / 텍스트 램프 결정 대기

흰색이 틀린 게 아니라 **카드와 컨테이너가 둘 다 흰색인 게 틀렸다.** light에서는 종이(`#ffffff`)보다 밝아질 수 없으니 control은 "떠 있는 면"이 아니라 **"파인 면"**으로 표현한다. dark는 반대로 element가 표면보다 밝다 — 방향이 theme마다 다른 것이 정상이고 그게 token이 존재하는 이유다.

`--bg-app`·`--bg-sidebar`·`--bg-panel`·`--bg-surface`·`--ai-panel-bg`는 **건드리지 않았다.** §1-A 이후 editor/Research 분리가 확인됐으므로 그 관계를 유지한다.

- [x] `--bg-element` 오목화 — 이전에 app·panel·surface·element가 **전부 `#ffffff`**여서 어떤 조합도 구분되지 않았다
- [x] border 3단계 값 확정
- [x] `--border-strong` 재조정 — §1에서 `#ffffff` 기준으로 잡았으나, element가 어두워지면서 input 테두리가 fill·부모 양쪽에 대해 3:1을 만족해야 하므로 가장 어두운 표면 기준으로 다시 계산
- [x] `data-temp` cool/warm 동기화 — 두 변형은 element가 `#ffffff`/`#fffdf8`로 **surface보다 밝아 방향이 반대**였다
- [x] 대비 실측 재검증 · dark/sepia 무영향 확인 (18조합 전수 비교에서 light 외 변화 0건)
- [x] **텍스트 램프 전 theme 정렬** (선택지 A, 목표는 낮춘 값으로 — 아래)

#### 확정한 light 표면 계단

UI 확인 후 두 가지 지적을 반영해 계단 전체를 한 칸 내렸다.

1. **에디터 본문이 순백(`#ffffff`)이라 눈에 부담** → `--bg-app`을 내린다
2. **차가움이 기본과 구분되지 않는다** → 색편차를 두 배로

`--bg-app`을 내리면 부수 효과로 **`--bg-panel`(`#ffffff`)이 app보다 밝아져 modal·dropdown 같은 부유 표면이 실제로 떠 보인다.** 이전에는 `panel/app`이 1.000:1로 붙어 있었다.

| 역할 | light | light + cool | light + warm |
| --- | --- | --- | --- |
| `--bg-panel` / `--bg-surface` (부유·카드) | **`#ffffff`** | `#f8fafd` → **`#fdfeff`** | `#fdf8ef` → **`#fffdfa`** |
| `--bg-app` (editor 종이) | `#ffffff` → **`#f9f9f7`** | `#fbfcff` → **`#f7f9fd`** | `#fefbf5` → **`#faf7f0`** |
| `--ai-panel-bg` | `#f8f8fa` → **`#f4f4f2`** | `#f5f7fc` → **`#f2f5fa`** | `#fbf4e9` → **`#f5f0e5`** |
| `--bg-sidebar` / `--bg-research` (chrome) | `#f5f5f7` → **`#eeeeec`** | `#eff2f7` → **`#eaeef5`** | `#f6eee2` → **`#efe9db`** |
| `--bg-element` (파인 control) | `#ffffff` → **`#e7e7e4`** | `#ffffff` → **`#e2e7ef`** | `#fffdf8` → **`#e8e0cd`** |
| `--border-default` | `#e5e5ea` → **`#d7d7d3`** | `#dde3ec` → **`#d1d6df`** | `#e8dccb` → **`#e0d3c3`** |
| `--border-active` | `#d1d1d6` → **`#b8b8b3`** | `#c7d0de` → **`#b0b7c3`** | `#d8c7b1` → **`#c3b4a0`** |
| `--border-strong` | **`#84847f`** | **`#7e828d`** | **`#847e74`** |
| `--text-tertiary` | `#8c8c94` → **`#70706c`** | `#7e8795` → **`#6a707c`** | `#968574` → **`#766a5d`** |

`--bg-app`은 순백 대비 **`#f9f9f7`** — b를 2단위 낮춘 살짝 따뜻한 off-white다. 순수 회색(`#f9f9f9`)이나 차가운 쪽(`#fafafb`)이 아니라 이 방향을 고른 이유는 위 색온도 규칙에 있다.

**인접 단계 목표와 실측** (panel → app → ai → sidebar → element)

| | panel/app | app/ai | ai/sidebar | sidebar/element | **app/sidebar** (editor↔Research) |
| --- | --- | --- | --- | --- | --- |
| 목표 | 1.04 | 1.04 | 1.05 | 1.055 | ≥1.09 |
| light | 1.054 | 1.045 | 1.055 | 1.067 | **1.102** |
| light + cool | 1.044 | 1.037 | 1.065 | 1.067 | **1.104** |
| light + warm | 1.054 | 1.062 | 1.065 | 1.086 | **1.131** |

editor↔Research 분리는 이전(1.089/1.094/1.114)보다 **넓어졌다.**

#### 규칙: 색온도는 chroma 크기가 아니라 **방향**으로 구분한다

이 항목은 한 번 틀렸다가 UI 확인으로 교정했다. 기록해 다시 반복하지 않는다.

- 첫 시도에서 cool/warm의 색편차(chroma)를 두 배로 올렸다 → "은은하게 다른 느낌"이 아니라 **"색이 깊어져 껄끄러운"** 결과가 됐다
- 색온도는 세게 바꾸는 축이 아니다. **살짝만 달라졌는데 다른 느낌을 주는** 것이 목적이다
- 해법: **neutral을 아주 약하게 따뜻한 쪽(`b < r`, 편차 2~3)에 둔다.** 그러면 cool은 chroma를 키우지 않고도 방향이 반대라 체감 차이가 커진다
- dark가 약한 cool tint를 쓰는 것과 light가 약한 warm tint를 쓰는 것이 대칭이고, 집필 표면을 종이처럼 읽히게 한다

**절대 색편차는 낮게 유지, 체감 차이는 두 배**

| | 절대 색편차 (app / sidebar / element) | neutral과의 축 거리 (app / sidebar) |
| --- | --- | --- |
| cool — HEAD | 4 / 8 / 10 | 4 / 6 |
| cool — 과했던 시도 | ~~8 / 17 / 22~~ | ~~7 / 14~~ |
| **cool — 확정** | **6 / 11 / 13** | **8 / 13** |
| warm — HEAD | 9 / 20 / 21 | 9 / 22 |
| **warm — 확정** | **10 / 20 / 27** | **8 / 18** |

즉 각 변형의 절대 chroma는 HEAD 수준으로 은은한데, neutral이 반대 방향으로 옮겨간 덕에 cool의 체감 구분은 두 배가 됐다.

**측정 지표 주의** — 색온도 구분을 대비율로 재면 안 된다. 같은 역할끼리 명도를 맞추는 게 설계이므로 대비는 항상 1.0 근처다. 색편차(chroma)와 따뜻↔차가움 축(`b − r`) 거리로 본다.

#### dark 색온도 재설계 (같은 규칙 적용)

dark의 cool/warm은 **원래부터** 색편차가 과했다(내가 만든 값이 아니다). 그래서 "더 전으로 롤백"할 대상이 없고 다시 잡아야 했다.

| 역할 | neutral | cool 이전 → 이후 | warm 이전 → 이후 |
| --- | --- | --- | --- |
| app | 2 | 11 → **8** | 8 → **8** |
| sidebar | 2 | 20 → **12** | 11 → **12** |
| panel / surface | 3 | 23 → **14** | 14 → **14** |
| ai-panel | 0 | 25 → **14** | 19 → **14** |
| element | 4 | 30 → **18** | 23 → **18** |
| **`--text-primary`** | 3 | **22 → 6** | **28 → 6** |
| `--text-secondary` | 10 | 33 → **14** | 36 → **14** |
| `--text-tertiary` | 11 | 34 → **14** | 37 → **14** |

**"editor 본문 괴리감"의 직접 원인은 본문 글자색이었다.** `--text-primary` 색편차가 neutral 3 → cool 22 / warm 28이라 글자 자체가 파랗거나 노랬다. 글자는 읽히는 것이 우선이므로 거의 중성으로 되돌렸다.

두 번째 원인은 **계단 폭이 neutral보다 넓었던 것**이다.

| | neutral | cool 이전 → 이후 | warm 이전 → 이후 |
| --- | --- | --- | --- |
| app/sidebar | 1.081 | 1.143 → **1.079** | 1.116 → **1.074** |
| app/panel | 1.182 | 1.306 → **1.177** | 1.229 → **1.175** |
| app/element | 1.342 | **1.613 → 1.330** | 1.527 → **1.339** |

**방법**: neutral의 명도를 목표로 고정하고 축(`b − r`)만 목표치에 맞춰 역산했다. 결과적으로 역할별 명도 편차 0.2~2.8%, 계단 폭 편차 0.3~0.8%로 neutral과 사실상 동일하고, 텍스트 대비도 neutral과 같다(primary 9.0 · secondary 4.6 · tertiary 2.55).

무드는 채도가 아니라 방향으로 만든다 — cool은 "어두운 방에 모니터 빛만 흘러올 때"의 냉기, warm은 램프 빛의 온기를 같은 강도로 반대 방향에 둔다.

#### 추가 규칙: 축(`b − r`)은 역할 전체에서 일정해야 한다

1차 조정 후에도 dark+cool의 sidebar 톤이 어긋난다는 지적이 나왔다. 원인은 **내가 색편차에 기울기를 넣었기 때문**이다.

| | app | sidebar | panel | ai | element | 범위 |
| --- | --- | --- | --- | --- | --- | --- |
| neutral | +2 | +2 | +3 | 0 | +4 | **4** |
| cool — 1차 | +8 | **+12** | +14 | +14 | +18 | **10** |
| **cool — 확정** | +8 | **+8** | +10 | +10 | +10 | **2** |

neutral은 app과 sidebar가 **같은 축**을 쓴다. 1차 조정은 sidebar를 app보다 +4 더 파랗게 만들었고, 그러면 "한 단계 밝은 같은 색"이 아니라 **"다른 색"**으로 읽혀 톤이 어긋난다. 축을 일정하게 맞추면 해소된다.

**웹 조사 결과** (참고용, 라이선스 준수를 위해 내용 재구성)

- [Tokyo Night](https://marketplace.visualstudio.com/items?itemName=nishantg96.tokyo-night-pure): editor `#1a1b26`(축 +12) · bars/menus `#16161e`(축 +8) — **sidebar가 editor보다 어둡고 덜 파랗다.** Luie는 chrome을 밝히는 반대 모델이다
- [Nord Polar Night](https://github.com/luke-beep/awesome-nord): `#2e3440`(+18) → `#3b4252`(+23) → `#434c5e`(+27) → `#4c566a`(+30) — 밝아질수록 축이 커지는 기울기를 쓴다. 즉 기울기 자체가 금기는 아니지만 Nord는 절대 채도가 훨씬 높은 팔레트다
- [JetBrains IntelliJ Platform](https://plugins.jetbrains.com/docs/intellij/supporting-islands-theme.html): dark에서 프레임을 editor·tool window보다 밝게, light에서는 어둡게. **최소 대비 1.20:1** 권장

Luie의 dark chrome 계단은 1.08로 JetBrains 권장(1.20)보다 좁다. 계단이 좁을수록 축 불일치가 상대적으로 크게 드러나므로 축 일정성이 더 중요하다.

> 미결 논점: Tokyo Night처럼 **chrome을 editor보다 어둡게** 두는 모델이 "chrome recedes"에 더 충실할 수 있다. 이는 `DESIGN.md`의 dark 모델("editor를 가장 어두운 초점 면, chrome은 한 단계 밝게")을 뒤집는 변경이라 별도 결정 사항으로 남긴다.

#### 규칙: warm은 cool의 반전이 아니다 (지각적 비대칭)

warm을 cool의 단순 반전(축 부호만 바꾸기)으로 만든 것도 틀렸다. **파랑은 저조도에서도 "어두운 파랑"으로 읽히지만, 주황은 저조도에서 갈색·탁함이 된다.**

그래서 호평받는 warm dark theme들은 **가장 어두운 면을 중성에 가깝게 두고 온기를 밝은 면에 싣는다.**

| 참조 | 값 | 축 |
| --- | --- | --- |
| [Gruvbox](https://gist.github.com/edgarcosta/93884f3325b64ef443b05f0ee58f403f) `bg0` | `#282828` | **0 (순회색)** |
| Gruvbox `bg0_soft` | `#32302f` | −3 |
| Gruvbox `bg1` | `#3c3836` | −6 |
| Gruvbox `bg2` | `#504945` | −11 |
| Gruvbox `bg3` | `#665c54` | −18 |
| [Everforest](https://gist.github.com/Lanny/04704c7860704aef5067491f5332005d) `bg-dim` | `#232a2e` | **+11 (차가움)** |
| Everforest `bg0` | `#2d353b` | **+14 (차가움)** |

Everforest는 "warm and soft"를 표방하지만 **배경은 차가운 청록**이고 온기는 전경색에만 있다. 즉 warm dark 배경 자체가 까다로운 영역이다.

**적용한 두 가지**

1. **축을 명도에 비례시킨다** — `app −3 → sidebar −5 → panel −8 → element −11`. 인접 단계 Δ가 2~3이라 cool에서 문제가 됐던 톤 점프가 없다
2. **hue lean을 주황 쪽으로** — `g`를 `b`쪽에 가깝게(`r−g : g−b ≈ 2:1`). 정확한 중간값은 같은 명도에서 탁한 갈색으로 보인다

결과적으로 같은 명도대의 Gruvbox 값과 lean이 일치한다.

| 역할 | 값 | 축 / lean | 대응 Gruvbox |
| --- | --- | --- | --- |
| app | `#1c1a19` | −3 / (2,1) | `bg0_soft` −3 / (2,1) |
| sidebar | `#24211f` | −5 / (3,2) | `bg1` −6 / (4,2) |
| panel | `#2c2724` | −8 / (5,3) | −9 / (5,4) |
| element / ai | `#37302c` / `#38312d` | −11 / (7,4) | `bg2` −11 / (7,4) |

해석: **따뜻한 광원이 표면에 닿고 가장 깊은 면은 그림자에 남는다.** cool은 이 문제가 없어 축을 일정하게 두는 것이 맞고, 이 비대칭은 의도된 것이다.

**확정값**

```
dark + cool   app #171b1f · sidebar/research #1e2226 · panel/surface #24292e
              ai #2e3338 · element #2d3237
              primary #d6d8da · secondary #969ba0 · tertiary #6a6f74
              축 일정: 8 / 8 / 10 / 10 / 10

dark + warm   app #1c1a19 · sidebar/research #24211f · panel/surface #2c2724
              ai #38312d · element #37302c
              primary #dad7d6 · secondary #9e9996 · tertiary #736d6a
              축 비례: 3 / 5 / 8 / 11 / 11
```

**검증**: 계단 폭 neutral과 편차 0.2~0.6% · 텍스트 대비 neutral과 동일(primary 9.05 · secondary 4.59 · tertiary 2.54) · 인접 축 Δ 최대 3

#### dark + cool 텍스트 램프는 롤백

§2에서 `--text-secondary`/`--text-tertiary`를 조정했다가 되돌렸다. 대비 수치만 보면 tertiary 2.77:1이 낮지만, 실제 화면에서 조정값이 차가운 톤을 과하게 밝혀 색온도의 은은함을 깨뜨렸다. **색온도 변형에서는 대비 최적화보다 톤 유지가 우선이다.** 토큰 주석에도 남겼다.

border 대비: 장식선 1.26 → **1.45**, 상태선 1.52 → **2.00**, UI 경계 **3.05** (가장 어두운 표면 기준). 고대비 모드의 3:1과는 다른 층이다.

**검증**: 3개 조합 전부 인접 단계·텍스트 램프·border 3단 기준 통과. HEAD 대비 변화 64건 전부 light 계열이며 **dark·sepia는 0건**.

#### 텍스트 램프 — 전 theme 정렬 (선택지 A)

**문제**: tertiary가 최악 배경에서 light 2.93 / dark 2.55 / sepia 2.52로 placeholder가 거의 읽히지 않았다.

**4.5:1(WCAG AA)로 올리면 안 되는 이유** (측정 결과)

- light tertiary를 4.5로 올리면 **secondary와 간격이 1.18배**만 남아 3단 위계가 무너진다
- dark의 램프 비율(1.81x)을 유지하며 4.5를 고정하면 **secondary가 8.14:1**까지 가서 앱 전체가 무거워진다
- dark 자신의 tertiary가 2.55:1이므로 light만 올리면 두 theme이 극단적으로 어긋난다
- 고대비 모드를 "대비를 낮추자"로 롤백한 방향과 충돌한다

**확정한 규칙**

| 역할 | 기준 배경 | 목표 |
| --- | --- | --- |
| `--text-primary` | — | **변경하지 않는다.** 낮추면 본문 가독성이 떨어진다 |
| `--text-secondary` | chrome (`--bg-panel`) | 6:1. light 계열은 이미 5.95~6.08이라 **유지** |
| `--text-tertiary` | 해당 조합의 최악 배경 | 4:1 |

최악 배경은 theme마다 다르다 — light은 가장 어두운 표면(`--bg-element`), dark는 가장 밝은 표면(`--bg-element`), sepia는 element가 가장 밝으므로 `--bg-sidebar`다.

> **기록 정정 (2026-08-31)**: 위 sepia 서술은 **§3 이전 기준이라 낡았다.** §3에서 계단 역전을 바로잡아 `panel > app > ai > sidebar > element` 순서가 됐으므로 **sepia도 `--bg-element`가 가장 어두운 표면**이고, 어두운 글자에 가장 불리한 면도 그쪽이다.
>
> 이 낡은 기록을 그대로 따라 §4 Task 2의 sepia 고대비 값을 `--bg-sidebar` 기준으로 산출했고, 그 결과 tertiary가 4.23으로 목표(4.5)에 미달했다. §8에서 추가한 정적 검사가 잡아냈다. **문서의 낡은 전제가 실제 버그를 만든 사례**이므로 기록을 지우지 않고 남긴다.

완전 준수(4.5:1)는 `data-contrast="high"`가 담당한다. 그게 그 모드의 존재 이유다.

**적용 범위 — dark는 전량 롤백했다**

처음 9개 조합 전부에 적용했으나 UI 확인에서 dark가 반려됐다. **dark에서 muted 텍스트를 밝히면 글레어와 노이즈가 생겨 "차분한 집필 표면"이 깨진다.** light는 반대로 어둡게 가는 방향이라 같은 조정이 문제가 없다. 방향이 다르므로 규칙도 갈라진다.

| 조합 | secondary | tertiary | 상태 |
| --- | --- | --- | --- |
| light | 유지 `#62626a` | `#8c8c94` → **`#70706c`** | 적용 |
| light + cool | 유지 `#566070` | `#7e8795` → **`#6a707c`** | 적용 |
| light + warm | 유지 `#6b5e4d` | `#968574` → **`#766a5d`** | 적용 |
| dark | `#989aa2` | `#6c6e77` | **롤백** |
| dark + cool | `#abb5cc` | `#78829a` | **롤백** |
| dark + warm | `#c3b59f` | `#92836d` | **롤백** |
| sepia | `#77644f` → **`#6c5b48`** | `#a48e75` → **`#7e6d5a`** | 적용 (§3에서 재검증) |
| sepia + cool | `#71685b` → **`#635b4f`** | `#9c9283` → **`#746d61`** | 적용 (§3에서 재검증) |
| sepia + warm | `#705b3c` → **`#665336`** | `#9b8057` → **`#7d6846`** | 적용 (§3에서 재검증) |

처음에는 dark+cool만 롤백했는데 **그게 오히려 괴리감을 키웠다** — 기본은 밝혀놓고 차가움만 되돌려서 색온도를 전환할 때 muted 텍스트 밝기가 튀었다. 세 변형을 함께 되돌려야 일관된다.

**결과**: dark 계열은 `da414bf2` 대비 변화 0종(완전 원복). light는 tertiary 4.00~4.01 확보.

**남는 부채**: dark의 tertiary는 2.55~2.98:1로 WCAG AA 미달이다. 의도된 선택이며 완전 준수는 `data-contrast="high"`가 담당한다. 토큰 주석에 근거를 남겼다.

> §3에서 sepia 표면 계단을 다시 잡을 때 sepia tertiary의 기준 배경(`--bg-sidebar`)이 바뀌므로 **재검증 필요**. light 계열을 살짝 따뜻한 쪽으로 옮겼으므로 **sepia와 light+warm의 구분**도 함께 봐야 한다.

### 3. Sepia 팔레트 재조정 — 완료

종이색 `--bg-app: #fbf2e2`는 시그니처라 **정확히 고정**하고 나머지를 역산했다.

- [x] 표면 계단 재정의 — 계단이 **뒤집혀 있었다**
- [x] `--text-tertiary` 대비 확보 (4.0:1)
- [x] `--editor-selection` brass 계열로 교정
- [x] `data-temp` cool/warm 변형 동기화
- [x] 대비 실측 재검증 · light/dark 무영향 확인
- [~] `--highlight-default` — **측정 오류였다.** 아래 참조

#### 계단 역전이 근본 원인이었다

`--bg-element`(`#fff9ed`)가 **가장 밝은 표면**이어서 "파인 control"이 아니라 가장 떠 있는 면이었다. 그 결과 축(`b − r`)도 역할 순서와 어긋났다.

| | 실제 명도 순 |
| --- | --- |
| sepia (이전) | element > panel > app > ai > sidebar |
| sepia+warm (이전) | element > **app > panel** > ai > sidebar |
| **확정** | panel > app > ai > sidebar > element |

축이 흔들린 것도 여기서 나왔다 — 이전 `panel −21 · app −25 · ai −34 · sidebar −39 · element **−18**`. element가 가장 덜 따뜻했던 이유가 계단 역전이다. 순서를 바로잡으면 축이 자연스럽게 정렬된다(light 계열과 같은 원리: 흰색에 가까운 면은 chroma 여유가 적고 어두운 면일수록 커진다).

#### 확정값

| 역할 | sepia | sepia + cool | sepia + warm |
| --- | --- | --- | --- |
| `--bg-panel` / `--bg-surface` | `#fcf5e7` → **`#fdf7ed`** | `#f7f2e9` → **`#fbf7f1`** | `#f8e6c3` → **`#fff7e9`** |
| `--bg-app` (종이) | **`#fbf2e2` 고정** | `#f4efe5` → **`#f8f2e8`** | `#faebcb` → **`#fef2dc`** |
| `--ai-panel-bg` | `#f8ebd6` → **`#f8edd9`** | `#f0e9dd` → **`#f4ede0`** | `#f7e3bc` → **`#fbecd1`** |
| `--bg-sidebar` / `--bg-research` | `#f3e5cc` → **`#f4e7d0`** | `#ebe2d2` → **`#f0e7d8`** | `#f2ddb0` → **`#f7e6c7`** |
| `--bg-element` | `#fff9ed` → **`#efe0c5`** | `#fbf7ef` → **`#eae0ce`** | `#fff4dc` → **`#f3dfbb`** |
| `--text-secondary` | `#6c5b48` → **`#6e5c49`** | `#635b4f` → **`#665e51`** | `#665336` → **`#715c3c`** |
| `--text-tertiary` | `#7e6d5a` → **`#7a6a57`** | `#746d61` → **`#726c60`** | `#7d6846` → **`#7f6947`** |
| `--border-default` | `#e4d2b4` → **`#dfceb0`** | `#ddd3c4` → **`#d8cfc0`** | `#dfc797` → **`#e6cd9c`** |
| `--border-active` | `#d3bd9a` → **`#c3af8f`** | `#cfc2af` → **`#bcb09f`** | **`#cdae77`** 유지 |
| `--border-strong` | `#9d8462` → **`#947c5c`** | `#948a7b` → **`#887e71`** | `#9a8356` → **`#927d52`** |

축은 `app: cool −16 · neutral −25 · warm −34`로 ±9 대칭이다. light 계열에서 확정한 ±8~10과 같은 폭이다.

**인접 단계** (목표 panel/app 1.04 · app/ai 1.045 · ai/sidebar 1.055 · sidebar/element 1.065)

| | panel/app | app/ai | ai/sidebar | sidebar/element | editor↔Research |
| --- | --- | --- | --- | --- | --- |
| sepia | 1.042 | 1.044 | 1.053 | 1.065 | **1.100** |
| sepia + cool | 1.043 | 1.046 | 1.053 | 1.067 | **1.101** |
| sepia + warm | 1.041 | 1.051 | 1.054 | 1.063 | **1.108** |

#### `--editor-selection` 교정

이전 값 `#b7d5f5`는 **축 +62의 완전한 파랑**이었다. accent가 brass(`#8a602e`)인 theme에서 선택 영역만 파랗게 떴다. light가 파란 accent에 맞춰 파란 선택색을 쓰는 것과 같은 원리로 brass 계열에 맞췄다.

`#b7d5f5` → **`#e2cb9c`** (축 −70) · 종이 대비 **1.426** (light의 `#bfdbfe` 1.421과 같은 수준) · 본문 글자 대비 6.45로 선택 중에도 읽힌다.

#### 정리한 부수 항목

- `--bg-secondary` / `--bg-hover`: 솔리드 `#f0e1c8` → `var(--bg-element)`. 계단을 따라가게 함
- `--grid-line`: `#e5d6bd` → `var(--border-default)`. dark의 패턴과 통일

#### 기록 정정: `--highlight-default`는 문제가 아니었다

§1 진단에서 "sepia의 형광펜이 종이 위에서 1.06:1"이라고 적었는데 **측정 오류였다.** 실측값은 **1.166**이고, light의 `#fef08a`는 **1.104**로 오히려 더 약하다. 잘못된 전제였으므로 값을 바꾸지 않았다.

다만 **형광펜 대비가 모든 theme에서 약한 것은 사실이다**(light 1.104 · sepia 1.166 · dark는 알파 32%). 이건 sepia만의 문제가 아니라 전 theme 공통 항목이므로 §4로 옮긴다.

#### 검증

- 3변형 전부 명도 순서 정상 · 인접 단계 목표 충족 · editor↔Research ≥1.10
- 텍스트: primary 7.55~8.57 · secondary 4.88~4.91 · tertiary 3.98~4.01 (전 표면 최저)
- border: 장식선 1.446~1.453 · 상태선 1.990~2.001 · UI 경계 3.05
- 색온도 명도 일치: 역할별 편차 0.3~0.6%
- **light 0종 · dark 0종 변화** (sepia 47종)
- sepia ↔ light+warm 축 거리 11~16으로 구분 유지

### 4. border / outline / shadow 규칙 통일

- [x] **focus 표시 통일** (WCAG 2.2 SC 2.4.11/2.4.13). 알파 ring 제거 · `outline-none` → `outline-hidden` · `ring-offset` 색 지정 · dark `--border-focus` 교정. 아래 상세
- [x] border 알파 방언 수렴 — `/5 /10 /15 /20 /25 /30 /40 /50 /60 /70 /80` 11종 → 무알파 `border-border`. 아래 상세
- [x] divider 알파 방언 수렴 — `bg-border/{20,30,40,50,60,70,80}` 7종 → `bg-border`. 아래 상세
- [x] **`--border-default`를 soft(기본) / high(`data-contrast="high"`) 2단으로 분리** — 위 수렴으로 light·sepia 테두리가 과해졌다. 값을 되돌린 게 아니라 강도 축을 하나 만들었다. 아래 상세
- [x] **`--border-strong`을 대화형 control 경계에 연결** — 소비처가 0이던 토큰을 input·select·토글·checkbox 32곳에 연결하고 기준면을 `--bg-element` → `--bg-panel`로 교정했다. 아래 상세
- [x] Tailwind 기본 검정 그림자(`shadow-sm`/`shadow-xs`) → theme tint 계열. 아래 상세
- [x] **v3 → v4 클래스 이름 이동 잔재 정리** — v4로 올릴 때 config만 옮기고 클래스 이름을 안 바꿔서, 같은 이름이 다른 값으로 조용히 렌더되고 있었다. 아래 상세
- [x] `--radius-editor-shell` 중복 하드코딩 제거 — **`rounded-[24px]` 3곳 + `rounded-r-[24px]` 1곳 → `rounded-editor-shell`/`rounded-r-editor-shell`** (2026-09-01). `SnapshotList.tsx:223` · `GoogleDocsLayout.tsx:209` · `ProjectTemplateSelector.tsx:232` · **`GoogleDocsRightPanel.tsx:429`(목록에 없던 4번째 — `rounded-r-` 변형이라 이전 조사에서 새어 나갔다)**. `arbitraryPx` 417 → 414. `Editor.tsx:330`의 `rounded-[48px]`는 기기 외형 표현이라 §6의 scoped token 항목에서 다룬다
- [~] **형광펜 대비가 전 theme에서 약하다** (§3에서 이관). `--highlight-default`가 종이 대비 light **1.104** · sepia **1.166** · dark는 `rgba(250,204,21,0.32)` 알파. 형광펜은 은은해야 하지만 1.1은 거의 안 보이는 수준이다. 세 theme 공통 목표를 정하고 함께 조정한다 — **won't-do (2026-09-01).** 근거는 「종결 — 하지 않기로 한 것」 절 참조
  - 조사 결과 **규범이 없다.** WCAG 1.4.11은 장식 배경에 대비를 요구하지 않고, 요구하는 것은 "그 위 글자가 4.5:1"뿐이다. 따라서 이전에 적었던 목표 `~1.35`는 근거 없는 숫자다. 값을 정하기 전에 **현재 형광펜 위 본문 글자 대비가 얼마나 남는지** 먼저 측정하고, 그 여유 안에서 형광펜을 진하게 하는 순서로 간다

#### focus / border / divider 규칙 확정 (2026-08-31)

##### 근거로 삼은 외부 규범

| 출처 | 내용 |
| --- | --- |
| [Radix Colors — Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) | step **6** = 비대화형 컴포넌트의 subtle border·**separator**(사이드바·헤더·카드·alert) / step **7** = 대화형 컴포넌트의 subtle border / step **8** = 대화형 컴포넌트의 강한 border + **focus ring** |
| Material 3 `outline` vs `outline-variant` | 양식·대화형 경계는 `outline`, 장식 divider는 `outline-variant`. Angular이 divider에 `outline`을 쓴 것이 "섹션이 예상보다 두드러진다"로 버그 리포트됨 ([angular/components#29494](https://github.com/angular/components/issues/29494)) |
| [WCAG 2.2 SC 2.4.13 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance) | focus 표시는 **2 CSS px 두께 이상 + 3:1** |
| [W3C Technique C40](https://www.w3.org/WAI/WCAG21/Techniques/css/C40) | 2색 지시자의 두 색이 서로 9:1 이상이면 **어떤 단색 배경에서도** 최소 한쪽이 3:1을 보장한다. 또한 "`outline: none`으로 `box-shadow`만 쓰지 말 것 — 사용자 에이전트가 forced-colors에서 box-shadow를 억제한다"고 경고 |
| [Tailwind v4 outline-style](https://tailwindcss.com/docs/outline-style) | `outline-none` = `outline-style: none` / `outline-hidden` = forced-colors에서 `outline: 2px solid transparent` 보존. **v3와 의미가 반대로 바뀐 이름이다** |

Luie의 3계층은 Radix 6/7/8과 값 순서로 정확히 대응한다.

| Luie | Radix | 역할 | 실측(최악 표면) |
| --- | --- | --- | --- |
| `--border-default` | 6 | 비대화 카드·헤더·**구분선** | 1.12~1.25 |
| `--border-active` | 7 | 대화형 rest / hover 승격 대상 | 1.54~1.65 |
| `--border-strong` | 8 | input·toggle 등 WCAG 1.4.11 UI 경계 | 3.03~3.09 |

##### 실측 — focus ring 알파는 3:1을 만들 수 없다

5개 표면(`app`·`sidebar`·`panel`·`ai`·`element`) × 9개 theme 조합의 **최저값**이다.

| ring 방언 | 사용처 | 최저 대비 | 판정 |
| --- | --- | --- | --- |
| `ring-ring` 불투명 (`--accent-bg`) | 8곳 | **3.47** | 통과 |
| `ring-accent` 불투명 (`--text-accent`) | 70곳 | **3.93** | 통과 |
| `ring-ring/50` | 9곳 | **1.86** | 실패 |
| `ring-accent/50` | 11곳 | **1.89** | 실패 |
| `ring-ring/40` | 3곳 | 1.7 내외 | 실패 |
| `ring-destructive/20`·`/40` | 8곳 | 2 미만 | 실패 |

**새 값을 만들 필요가 없었다** — 알파만 걷어내면 기존 토큰이 전 조합에서 통과한다. `ring-destructive`(=`--danger-fg`) 불투명도 3.39~4.97로 통과한다.

##### 확정한 canonical 패턴

```
focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring
```

- **색은 `ring-ring`.** `DESIGN.md`가 focus를 `--color-ring`에 연결하고 있고, `--color-accent`는 글자색(`--text-accent`)이다. 배경/글자 토큰을 ring·border 색으로 쓰는 것은 §5에서 교정한 `bg-muted` 오용과 같은 범주 오류다
- **알파 금지.** 위 실측 근거
- **두께 최소 2.** WCAG 2.4.11
- **`outline-none` 금지, `outline-hidden` 사용.** v4에서 `outline-none`은 forced-colors 보존을 하지 않는다
- full-bleed 목록 행은 `focus-visible:ring-inset` 추가
- 솔리드로 채워지는 control(토글)은 `ring-offset-2` + **`ring-offset-<surface>` 필수**
- 파괴적 동작은 `ring-danger-fg` / `ring-destructive`
- 박스형 입력은 `focus:border-accent focus:ring-2 focus:ring-ring`. **밑줄형(`border-b`) 입력은 테두리 색 전환이 표시**이므로 ring을 붙이지 않는다

##### 적용 내역

| 항목 | 건수 |
| --- | --- |
| `outline-none` → `outline-hidden` | **154** (`focus-visible:` 52 · `focus:` 52 · bare 49 · `[&_.ProseMirror]:` 1) |
| focus ring 색 → `ring-ring` | `focus-visible:ring-ring` 67 · `focus:ring-ring` 24 |
| focus ring 두께 `ring-1` → `ring-2` | 10 |
| `border-border/N` → `border-border` | **403**(무알파 총계). 알파로 만든 rest→hover 진행 5곳은 `hover:border-border-active`로 승격(총 10) |
| `bg-border/N` → `bg-border` | **48**(총계) |
| `ring-offset-2`에 offset 색 지정 | 4 |

##### 실측 — border 알파 방언은 시각적으로 존재하지 않았다

`border-border`가 light `--bg-element` 위에서 만드는 대비다.

```
/5  1.01   /30 1.05   /60 1.10   /100 1.16
/10 1.02   /40 1.06   /70 1.11
/20 1.03   /50 1.08   /80 1.13
```

**11종 전 구간이 1.01~1.16에 몰려 있다.** 인접 단계 차이가 0.02~0.03이므로 "방언끼리는 구분되지 않는다 → 유지할 이유가 없다"는 결론은 성립한다.

> **주의 — 이 측정만으로 "화면이 안 바뀐다"고 결론 내리면 틀린다.** 위 표는 `--bg-element`(가장 어두운 표면) 기준이고, 그 표면에서는 알파 구간이 압축된다. 테두리가 실제로 가장 많이 놓이는 **panel·surface(흰 카드)** 위에서는 `/60` 1.238 → 무알파 1.443, **RGB 색거리 29~37**로 인지되는 변화다. 알파 183건의 가중 평균이 39.6%였으므로 그 183곳은 실효 강도가 2.5배가 됐다. 이 오판을 근거로 아래 **soft / high 2단 분리** 항목이 생겼다.

알파로 만들었던 rest→hover 진행(`border-border/40` → `hover:border-border/80`)도 Δ0.07로 실재하지 않았다. `border-border`(1.16) → `hover:border-border-active`(1.61)로 승격해 **처음으로 실제 진행이 생겼다.** §7에서 `EntityGallery`·`TermCard`에 적용한 패턴과 같다.

##### 교정한 개별 버그

- **`ring-offset-2`가 dark에서 흰 링을 만들었다.** Tailwind 기본 `--tw-ring-offset-color: #fff`다. 토글 4곳(`EditorTab` 2 · `AppearanceTab` 1 · `ExportSidebar` 1)이 offset 색을 지정하지 않아 어두운 표면에 흰 간격이 그려졌다. `ring-offset-surface`로 지정 — `--bg-panel`과 `--bg-surface`는 전 theme에서 같은 값이고 `SettingsModal` 본문이 `bg-panel`이라 일치한다. 정답 패턴이 이미 `CharacterVisualPanel.tsx:228`에 있었다
- **`focus:border-active` / `focus:ring-active`는 배경 토큰 오용이었다.** `--color-active`는 `--bg-active`(알파 오버레이)다. 테두리·ring 색으로 쓰면 거의 보이지 않는다. `TermManager` 3곳 → `focus:border-accent focus:ring-2 focus:ring-ring`
- **`focus:ring-blue-500`** (`SynopsisSection.tsx:21`) — focus ring에 Tailwind 기본 팔레트 직접 사용 → `ring-ring`
- **`ExportSidebar`의 박스형 입력 8곳에 ring이 없었다.** `focus:border-accent focus:outline-hidden`만 있어 밑줄형과 박스형이 같은 표시를 썼다. ring 보강
- **shadcn 프리미티브가 별도 방언을 유지했다.** `button`·`badge`·`scroll-area`: `ring-3`/`ring-[3px]` → `ring-2`, `ring-ring/50` → `ring-ring`, `ring-destructive/20|40` → `ring-destructive`, 불투명화로 무의미해진 `dark:focus-visible:ring-destructive/*` 제거, `outline-hidden`과 충돌하는 `focus-visible:outline-1` 제거. `focus-visible:border-ring`은 C40의 2색 지시자에 해당하므로 유지
- **dark `--border-focus`가 1.65:1로 실패했다.** 가장 밝은 dark 표면(`--ai-panel-bg`) 위에서 `--border-strong`(3.04)보다도 약했다. 유일한 소비처인 canvas resize handle은 WCAG 1.4.11의 graphical object라 3:1이 필요하다. axis(`b−r`) 9를 유지하고 명도만 올려 **3.73~5.08** 확보. `--text-secondary`보다는 어두워 테두리가 글자보다 밝아지는 역전은 없다

##### 검증

- `pnpm run typecheck` 통과 · `pnpm run build` 통과 · `canvasThemeTokens.test.ts` 6/6
- 빌드 산출 CSS에서 확인: `.outline-hidden{--tw-outline-style:none;outline-style:none}` + `@media (forced-colors:active){.outline-hidden{outline-offset:2px;outline:2px solid #0000}}` — **forced-colors 보존이 실제로 생성됐다**
- `focus-visible\:ring-ring:focus-visible{--tw-ring-color:var(--color-ring)}` · `.ring-offset-surface{--tw-ring-offset-color:var(--color-surface)}` 생성 확인
- 제거 대상 0건 확인: `outline-none` · `border-border/N` · `bg-border/N` · `focus:ring-accent` · `ring-ring/N` · `focus:border-active` · `focus:ring-blue-500` · `focus:ring-1`
- `tokens-guard` 수치 변화 없음(`rawHex` 407 유지) — 토큰 1개 교체이므로 net 0

##### `--border-default` soft / high 2단 분리 — 완료

> 구현 플랜: [`docs/superpowers/plans/2026-08-31-border-soft-high-split.md`](docs/superpowers/plans/2026-08-31-border-soft-high-split.md) — **Task 1~4 전부 완료.** 실행 순서는 사용자 승인으로 Task 1 전역 → Task 3(soft) → Task 2(고대비) → Task 4(회귀 방어)로 바꿨다. soft가 기본 모드 인상을 결정하므로 먼저 확인받았다.

**배경.** 위 알파 수렴으로 light·sepia 테두리가 과해졌다. 알파 183건의 가중 평균이 **39.6%**였는데(`/5`:4 · `/10`:10 · `/15`:9 · `/20`:27 · `/25`:1 · `/30`:16 · `/40`:46 · `/50`:33 · `/60`:21 · `/70`:8 · `/80`:8) 그게 100%로 올라갔다. panel 위 실측으로 **대비 1.24 → 1.44, RGB 색거리 29~37**이다. 색거리 3 미만이 "구분 어려움"의 기준이므로 이건 인지되는 변화다.

> **기록 정정**: 이 문서의 이전 서술("무알파와의 최대 차이가 대비 0.15")은 **`--bg-element`(가장 어두운 표면) 위에서만 측정한 값**이었다. 그 표면에서는 알파 구간이 압축돼 차이가 작게 나온다. 테두리가 실제로 가장 많이 놓이는 **panel·surface(흰 카드)** 위에서는 차이가 0.20이고 색거리는 29~37이다. "방언 11종이 서로 구분되지 않는다"(인접 단계 Δ0.02~0.03)는 여전히 맞지만, **그 구간 전체가 무알파보다 일관되게 옅었다**는 사실을 놓쳤다.

**결정: 값을 되돌리지 않는다. 강도 축을 하나 만든다.** 지금 통일한 무알파 값을 `[data-contrast="high"]`로 올리고, 기본값은 soft로 내린다. 알파 방언 제거(v4 문법 정합 · 단일 시맨틱 토큰)라는 성과는 그대로 유지된다.

###### 근거: dark는 이미 이 2단 구조를 갖고 있다

| 조합 | soft (기본) | high (`data-contrast="high"`) |
| --- | --- | --- |
| dark | `rgba(255,255,255,0.08)` → **1.277** | `rgba(255,255,255,0.2)` → **1.915** |
| dark + cool | 상속 → 1.281 | 상속 → 1.921 |
| dark + warm | 상속 → 1.277 | 상속 → 1.911 |
| light / sepia | — **단일 단계뿐이고 그 값이 high 쪽에 가까웠다** (1.44~1.45) | `#d4d4d8` 중성 회색 (§1의 롤백 부채) |

즉 새 개념을 도입하는 게 아니라 **dark에만 있던 구조를 light·sepia에 맞추는 것**이다. 동시에 세 theme의 기본 테두리 강도가 처음으로 같아진다(현재 panel 위 light 1.44 · sepia 1.45 vs dark 1.28로 어긋나 있다).

###### 확정값 — soft는 dark의 1.277을 목표로 역산

| 조합 | soft (신규 기본) | panel 대비 | high (현재 값 이동) | panel 대비 | 알파 환산 |
| --- | --- | --- | --- | --- | --- |
| light | `#e4e4e1` | 1.274 | `#d7d7d3` | 1.443 | 68% |
| light + cool | `#dfe3e9` | 1.276 | `#d1d6df` | 1.445 | 68% |
| light + warm | `#eae1d5` | 1.274 | `#e0d3c3` | 1.449 | 67% |
| sepia | `#e9dbc4` | 1.280 | `#dfceb0` | 1.450 | 68% |
| sepia + cool | `#e3dccf` | 1.277 | `#d8cfc0` | 1.446 | 69% |
| sepia + warm | `#eedbb6` | 1.278 | `#e6cd9c` | 1.453 | 66% |
| dark 3종 | 변경 없음 | 1.277~1.281 | 변경 없음 | 1.911~1.921 | — |

soft가 `--border-active`(panel 대비 1.99~2.00)를 넘지 않아 3단 계단(soft → active → strong)의 단조성은 유지된다.

###### 선행 조건 — `--border-strong` 소비처를 먼저 연결해야 한다

**파일럿 완료 (2026-08-31, Settings modal 범위).** 전역 확장 전에 설정 모달에만 적용해 강도를 검증했다. 6개 파일 / 19줄(+19 −19 순수 치환).

- 입력 8곳(`EditorTab:236,305` · `ApiKeysCard:51,74` · `OllamaEndpointCard:51,65,80` · `ModelLibraryCard:111`) `border-border` → `border-border-strong`
- **버튼은 제외했다.** WCAG 1.4.11 Understanding이 "히트 영역의 시각적 표시가 텍스트뿐이면 텍스트 대비 외 요구가 없다"고 하는데 이 버튼들은 `bg-element`/`bg-surface` 배경이 히트 영역을 알린다. 테두리가 유일한 식별자가 아니므로 Radix step 6을 유지한다. 입력은 fill이 카드와 같은 값이라 테두리가 유일한 식별자다
- 카드·컨테이너 21곳도 그대로 뒀다

###### `--border-strong` 기준면 이동 — 3.72~3.96 → 3.05~3.07

**파일럿 UI 확인에서 "대비가 과하다"는 판단이 나왔고, 원인은 기준면 오류였다.**

§1·§2는 `--bg-element`(가장 어두운 light 표면) 기준으로 3:1을 맞췄다. 그런데 실제 input·select·토글은 **카드(`--bg-panel` = `--bg-surface`) 위에 놓이고 fill도 같은 값**이다. 그 면에서 재보면 넘친다.

| 조합 | element 기준(이전 계산 근거) | **panel 기준(실제 놓인 면)** |
| --- | --- | --- |
| light | 3.03 | **3.76** |
| light + cool | 3.09 | **3.81** |
| light + warm | 3.06 | **3.96** |
| sepia | 3.05 | **3.72** |
| sepia + cool | 3.05 | **3.73** |
| sepia + warm | 3.05 | **3.74** |

WCAG 1.4.11은 "인접 색(adjacent colors)" 대비를 요구하므로 **컨트롤이 실제로 맞닿는 면에서 3:1을 만족하면 된다.** 넘치는 25~30%는 그만큼 선이 과하게 읽히는 것뿐이다. 값을 임의로 낮춘 게 아니라 기준면을 바로잡았다.

| 조합 | 이전 | 신규 | panel 대비 | element 대비 |
| --- | --- | --- | --- | --- |
| light | `#84847f` | **`#94948f`** | 3.05 | 2.46 |
| light + cool | `#7e828d` | **`#8f939c`** | 3.05 | 2.48 |
| light + warm | `#847e74` | **`#979289`** | 3.05 | 2.35 |
| sepia | `#947c5c` | **`#a18b6e`** | 3.06 | 2.51 |
| sepia + cool | `#887e71` | **`#968d81`** | 3.06 | 2.50 |
| sepia + warm | `#927d52` | **`#a08c65`** | 3.07 | 2.50 |

**dark 3종은 변경하지 않았다.** 알파(36% white)라 어두운 면일수록 대비가 커지므로 가장 밝은 면(`--ai-panel-bg`)이 최악이고 그 값이 3.04~3.07이다. 이미 컨트롤이 놓인 면에서 3:1 근처다.

**이후 사용자 판단으로 3.05 → 3.30으로 상향했다** ("대비 좀 더 줘도 될 듯"). 3.76(과함) → 3.05(약간 약함) → **3.30**으로 수렴했다. element-fill 컨트롤도 2.35~2.51 → **2.54~2.71**로 함께 개선됐다.

| 조합 | 최종값 | panel | element |
| --- | --- | --- | --- |
| light | **`#8e8e89`** | 3.29 | 2.66 |
| light + cool | **`#898d97`** | 3.29 | 2.68 |
| light + warm | **`#918c82`** | 3.29 | 2.54 |
| sepia | **`#9c8567`** | 3.30 | 2.71 |
| sepia + cool | **`#91877b`** | 3.30 | 2.70 |
| sepia + warm | **`#9a865d`** | 3.32 | 2.71 |

3단 계단 단조성 유지: panel 위에서 default 1.27~1.28 < active 1.99~2.00 < strong 3.29~3.32.

**대가**: `--bg-element`를 fill로 쓰는 컨트롤에서는 2.54~2.71로 3:1에 미달한다. 전역 확장에서 개별 판단했다 — 아래 참조.

###### 토글에서 발견한 별개 버그 (파일럿에서 함께 교정)

- **노브가 dark 테마 OFF 상태에서 보이지 않았다.** 트랙 위 대비 light 1.44 · sepia 1.45 · **dark 1.28**. `EditorTab:466`만 하드코딩 `bg-white`로 우연히 맞고 나머지 3곳은 `bg-surface`였다. 4곳 전부 `bg-on-accent`(전 theme `#ffffff`)로 통일 → dark 11.51
- **OFF 트랙이 `bg-border`였다.** `--color-border`는 선 색이지 면 색이 아니다(§5 `bg-muted` 오용과 같은 범주). `bg-element` + `border border-border-strong`으로 교체 → 트랙 윤곽이 카드 대비 3.20~3.76
- **`SyncTab:150` 토글에 focus ring이 없었다.** `focus:outline-hidden`만 있어 §4 sweep에서 놓쳤다. canonical 패턴 적용
- `shadow-sm` → `shadow-control`(theme tint) 4곳

###### soft 값의 한계와 그 대응

soft 값은 **`--bg-element`(파인 control) 위에서 대비 1.016~1.048로 사실상 보이지 않는다**(high는 1.119~1.187).

| 조합 | soft on element | high on element |
| --- | --- | --- |
| light | 1.028 | 1.165 |
| light + cool | 1.037 | 1.175 |
| light + warm | 1.016 | 1.119 |
| sepia | 1.048 | 1.187 |
| sepia + cool | 1.042 | 1.180 |
| sepia + warm | 1.041 | 1.185 |

따라서 **input·select·toggle·checkbox의 경계는 `--border-default`가 아니라 `--border-strong`(3.03~3.09)으로 옮겨야 한다.** 이건 우회가 아니라 원래 규범이다 — Radix step 8("대화형 컴포넌트의 강한 border")이고 M3 `outline`이며 WCAG 1.4.11이 3:1을 요구하는 대상이다. §1에서 `--border-strong`을 신설하고 "소비처는 아직 0 — §4·§5에서 입력·토글에 연결할 기반"이라고 적어둔 것이 이 지점이다.

**순서가 중요하다.** `--border-strong` 연결을 먼저 하지 않고 soft를 적용하면 입력 필드 테두리가 사라진다.

###### 반드시 함께 고쳐야 하는 것 — `[data-contrast="high"]` 특이도

§1에서 기록하고 롤백한 두 버그를 이번에는 우회할 수 없다. `--border-default`를 high로 올리는 순간 그 경로가 실제 렌더에 관여하기 때문이다.

선언 순서와 특이도는 이렇다.

```
201  :root                                   (0,1,0)
359  [data-theme="dark"]                     (0,1,0)
440  [data-theme="dark"][data-temp="cool"]   (0,2,0)
466  [data-theme="dark"][data-temp="warm"]   (0,2,0)
483  [data-theme="light"][data-temp="cool"]  (0,2,0)
499  [data-theme="light"][data-temp="warm"]  (0,2,0)
517  [data-theme="sepia"][data-temp="cool"]  (0,2,0)
533  [data-theme="sepia"][data-temp="warm"]  (0,2,0)
560  [data-theme="sepia"]                    (0,1,0)
612  [data-contrast="high"]                  (0,1,0)   ← light 기본·sepia 기본은 이김
617  [data-theme="dark"][data-contrast="high"] (0,2,0)
```

- **light 기본 / sepia 기본**은 `[data-contrast="high"]`가 뒤에 와서 이긴다. 다만 sepia에 중성 회색(`#d4d4d8`)이 얹혀 따뜻한 종이 위에 회색 테두리가 그려진다 — §1이 남긴 부채
- **light+cool · light+warm · sepia+cool · sepia+warm 4개 조합은 특이도 (0,2,0)이라 `[data-contrast="high"]`(0,1,0)를 이겨서 고대비가 아예 걸리지 않는다**

해법은 §1이 이미 적어둔 대로 **theme별 분기**다. `[data-theme][data-temp][data-contrast="high"]`(0,3,0) 블록 4개 + `[data-theme="sepia"][data-contrast="high"]`(0,2,0) 1개를 추가하고, light 기본은 기존 `[data-contrast="high"]`가 담당하게 둔다. 총 5개 블록 신설이다.

###### 실행 순서 — 실제로 이렇게 갔다

1. **Task 1** `--border-strong`을 input·select·토글·checkbox 경계에 연결. Settings 파일럿 → 강도 조정 2회 → 전역 확장
2. **Task 3** 6개 조합의 `--border-default`를 soft로 교체 *(사용자 승인으로 Task 2보다 먼저. soft가 기본 모드 인상을 결정하므로 먼저 확인받았다)*
3. **Task 2** theme별 `[data-contrast="high"]` 블록 5개 신설 — 특이도 해결 + sepia 중성 회색 제거
4. **Task 4** 회귀 방어 정적 검사 — `borderLadderContrast.test.ts` 65 케이스

###### 결정 기록

- **`data-contrast`에 "테두리 강도"를 얹었다.** 접근성 토글과 강도 축이 섞이는 문제가 있다. 별도 축(`data-border="soft|normal"`)이 개념적으로 깨끗하지만 설정 UI·persist·i18n이 함께 늘어난다. 일단 `data-contrast`에 얹고 사용자 요구가 갈리면 분리한다
- **`--grid-line`(= `var(--border-default)`)이 soft를 따라 옅어졌다.** canvas 그리드가 의도보다 약하다고 판단되면 `--grid-line`을 high 값에 고정하는 분기를 둔다 — **UI 확인 항목으로 남겨둔 상태**

---

##### 남은 부채 (이번에 범위 밖으로 둔 것)

- [x] **bare 입력 focus 표시 부재 해소** (2026-09-01). `outline-hidden`만 있고 대체 표시가 없어 키보드 포커스 위치를 알 수 없던 곳 — WCAG 2.4.7 위반이자 `DESIGN.md` §297이 스스로 금지한 패턴이었다. 스캔 대상 14곳을 성격별로 갈랐다.

  **표시 방식 결정: 제목·인라인 입력은 ring이 아니라 `border-b-2 border-transparent focus:border-accent`.** ring은 "평범한 텍스트처럼 보이는" 제목 입력의 무게를 바꾼다는 것이 §4에 기록된 우려였고, 밑줄은 ① rest에 투명 2px를 미리 둬서 **레이아웃 밀림이 없고** ② rest 인상이 그대로이며 ③ 이 프로젝트가 이미 쓰는 밑줄형 입력 관례(§4 "밑줄형은 테두리 색 전환이 표시")와 같고 ④ 긴 변을 따르는 2px 선이라 SC 2.4.13의 최소 면적(짧은 변 × 2px)을 넘는다. 배경 틴트는 `--bg-active`가 알파라 대비 변화가 1.05 수준이어서 채택할 수 없었다.

  | 처리 | 대상 |
  | --- | --- |
  | 밑줄 신설 (5) | `Editor.tsx:345` 챕터 제목 · `MemoSection:283` 메모 제목 · `MemoMainView:31,42` 태그·제목 · `MindMapBoard:107` 노드 이름 |
  | 기존 밑줄에 전환 추가 (3) | `WikiDetailView:72` · `RadarChart:43`(rest가 이미 `accent/60`이라 focus에서 불투명으로) · `SidebarChapterList:158`(`accent/50` → `accent`) |
  | **래퍼 focus-within 보강 (2)** | `AIPanel:205` — `focus-within:border-border-active`(1.27→1.99, **3:1 미달**)를 `focus-within:border-accent` + `ring-2 ring-ring`으로 · `menus.tsx:266` HEX 래퍼 — `focus-within`이 아예 없었다 |
  | 래퍼가 이미 담당 (2, 무변경) | `EntityGallery:231` · `PromptComposer:299` |
  | **의도된 예외 (2, 무변경)** | `MemoSection:289` · `MemoMainView:56` 전면 집필 textarea. §4가 `SynopsisEditor:347`·`InspectorPanel:99`를 예외로 남긴 것과 같은 범주 — 전면 집필 표면에서는 캐럿이 focus를 알린다 |

  재스캔 결과 남은 6곳은 전부 위 표의 "래퍼 담당 4 + 의도된 예외 2"다.
- [ ] **`DrawingCanvas` 접근성 — 별도 항목으로 분리 (2026-09-01).** `aria-pressed`만 붙이면 이득이 거의 없다. ① 선 굵기·색 선택이 `<div onClick>`이라 **키보드로 도달할 수 없다** ② 아이콘 전용 버튼(mountain·castle·village)에 `title`도 `aria-label`도 없어 접근 이름이 아예 없다 ③ 상호배타 선택이므로 `aria-pressed`보다 radio 의미가 맞다. 컴포넌트 단위로 다뤄야 하고 i18n 키 신설이 따른다
- `focus:ring-0` 2곳(`SynopsisEditor:347` 본문 · `InspectorPanel:99` 노트)은 **의도된 예외**다. 전면 집필 표면에서는 캐럿이 focus를 알린다. 기록만 남긴다
- **토글 off 상태가 `bg-border` 트랙이라 대비 1.16이다.** 켜짐(`bg-accent`)과 꺼짐의 구분은 되지만 트랙 자체가 표면과 거의 붙는다. Radix 모델에서는 트랙이 대화형 표면(step 3~5)이지 border가 아니다 — §5의 "버튼 상태 일관화"와 함께 다룬다
- **`--border-focus`의 이름과 역할이 어긋난다.** focus 표시는 accent ring이 담당하도록 확정했으므로 이 토큰의 소비처는 `--canvas-handle-bg` 하나뿐이다. 실제 역할은 "neutral 계단의 최강 단계"다. `DESIGN.md:344`의 border 치트시트(`border  border-active  border-focus`)도 `--border-strong` 신설 이후로 낡았다 → 이름 정리는 `DESIGN.md` 갱신과 함께
- [x] **Tailwind v4가 앱 밖 파일을 소스로 스캔하는 문제 — 해소 (2026-09-01).** `global.css`에 `@source not` 6줄을 추가해 `**/*.md` · `.agents` · `.kiro` · `scripts` · `tests` · `dist`를 제외했다. **빌드 CSS 197,869 → 155,232 bytes (−42,637 · 21.6%).** `rounded-sm` · `shadow-sm` · `outline-none` · `focus:ring-blue-500` · `focus:outline-none` 전부 0건이 되고, 실사용 유틸(`shadow-control` · `shadow-panel` · `animate-in/out` · `slide-out-to-left` · `border-border-strong` · `outline-hidden`)은 그대로 생성된다
  - 원인이 문서·스킬 md만이 아니었다. **`.agents/context-mode/insight/`에 별개 React 프로젝트가 통째로 들어 있고** git 추적 대상이라 그쪽 `.tsx`의 클래스가 전부 실렸다. `scripts/*.mjs` · 스킬 `.py` · `dist/**`도 같은 경로다
  - **함정 2개를 토큰 파일 주석에 남겼다.** ① `@source`는 반드시 모든 `@import` 뒤에 와야 한다 — `@import` 사이에 끼우면 CSS 규격상 뒤따르는 `@import`가 무효가 되어 `global.tokens.css`가 로드되지 않고 `@theme` 토큰이 사라진다(CSS 91KB, `shadow-control` 0건으로 관측). ② `@import "tailwindcss" source("…")`로 기준을 `src/`에 고정하는 편이 개념적으로 깨끗하지만 상대·절대 어느 경로를 줘도 감지가 통째로 꺼진다(197KB → 87KB). 4.3.1의 경로 해석이 문서와 어긋나는 것으로 보여 채택하지 않았다

---


#### v3 → v4 클래스 이름 이동 잔재 (2026-08-31)

**원인**: `e9661f30`(2026-06-23) 커밋이 `tailwindcss`를 4.3.1로 올리면서 **같은 커밋에서 v3 그림자 리터럴을 `:root`에 박았다.** v4는 같은 클래스 이름을 다른 값으로 재해석하므로 에러가 나지 않고 조용히 다른 결과를 낸다. 이후 6월부터 이 토큰들을 건드린 커밋이 없다(`git log -S'--shadow-md'` 0건).

**조사 결과 — 실제로 값이 이동한 것은 3종뿐이다**

| 클래스 | v3 의도 | v4 실제 | 조치 |
| --- | --- | --- | --- |
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0/.05)` | `0 1px 3px/.1 + 0 1px 2px -1px/.1` (= v3의 `shadow`) | **`shadow-control`로 수렴** |
| `rounded-sm` | `0.125rem` | `0.25rem` (2배) | **`rounded-xs`로 복원** |
| `backdrop-blur-sm` | `4px` | `8px` (2배) | **역할별로 분기** |
| `shadow-md` · `shadow-lg` | — | 2번째 레이어 알파만 미세 변경 | 대상 아님 |
| bare `rounded` | `.25rem` | `.25rem` | 동일. 130건 무영향 |
| bare `ring` | 3px | 1px | **사용 0건**이라 무영향 |
| `bg-opacity-*` 등 제거된 유틸 | — | — | 사용 0건 |

##### `shadow-sm` → `shadow-control` (52건)

v3 의도를 복원하려면 `shadow-xs`인데 **그건 여전히 검정 그림자**라 §4가 지적한 "light·sepia 종이 위에서 회색 얼룩" 문제가 그대로 남는다. `--shadow-control`은 v4 `shadow-sm`과 **같은 형태에 theme tint만 입힌 것**이므로, 현재 렌더 크기를 유지하면서 색만 고친다. 새 값을 결정할 필요가 없다.

**같은 이름이 두 값으로 갈려 있던 것도 해소했다.** `global.tokens.css:344`가 `--shadow-sm`을 v3 값으로 재정의하고 있었는데, `@theme` 값은 유틸리티에 **텍스트로 인라인**되므로 뒤쪽 `:root` 재정의가 `.shadow-sm` 유틸에 반영되지 않았다. 결과적으로 `className="shadow-sm"`(v4 값)과 `canvas.css`의 `var(--shadow-sm)`(v3 값)이 서로 다른 그림자를 그렸다.

- [x] `shadow-sm` → `shadow-control` 52건 (`.tsx` 51 + `.ts` 상수 1)
- [x] `canvas.css:13` resize handle `var(--shadow-sm)` → `var(--shadow-control)`
- [x] `:root`의 v3 리터럴 `--shadow-sm` · `--shadow-md` · `--shadow-lg` 3개 제거. 소비처가 canvas handle 하나뿐이었고 그것을 옮겼으므로 안전하다

##### `rounded-sm` → `rounded-xs` (20건)

사용처가 전부 소형 요소(`h-3` · `w-4` · `w-2.5` · `p-1`)다. 12px 요소에서 반경 2px → 4px는 모서리가 1/3까지 둥글어지는 눈에 보이는 변화다. `--radius-xs: .125rem`이 빌드 CSS에 생성되는 것을 확인했다.

> **정정 (2026-09-01)**: 처음 18건으로 세고 전환했으나 **`DiffExtension.ts:95,96` 2건을 빠뜨렸다.** 스냅샷 diff 하이라이트는 "UI 확인 대상"에는 적어놓고 실제 전환은 안 한 상태였다. `.ts` 파일의 문자열 상수로 클래스를 조립하는 경로라 `.tsx` 위주 조사에서 새어 나갔다. 전환 완료 후 `rounded-sm` 전역 잔여 0건 · `rounded-xs` 20건.

##### `backdrop-blur` — 역할별로 갈랐다

4px → 8px는 작은 칩 위에서 과하고 전면 오버레이에서는 오히려 분리에 도움이 된다. 하나로 통일하는 게 아니라 **역할 기준**으로 나눈다.

| 역할 | 값 | 건수 | 대상 |
| --- | --- | --- | --- |
| 전면 오버레이 | `backdrop-blur-sm` (8px) | 5 | `QuitOverlay` · `GraphLegendModal` · `world/index` · `SyncConflictResolverModal` · `Modal` |
| 소형 부유 요소 | `backdrop-blur-xs` (4px) | 9 | `EdgeLabel`(2) · `RelationEdge` · `EntityNode` · `CharacterVisualPanel` · `WikiDetailView` · `EntityDetailView` · `GoogleDocsEditorColumn` · `SidebarCompactHover` |

`shared/ui/Modal.tsx`는 전면 오버레이인데 혼자 `backdrop-blur-xs`(4px)였다 — 다른 오버레이 4곳과 어긋나 있어 8px로 맞췄다.

##### 기록 정정 — 죽은 클래스가 아니었다

앞서 `decoration-slice`와 `flex-shrink-0`을 "v4에서 제거된 죽은 클래스"로 적었는데 **틀렸다.** 빌드 CSS에 둘 다 정상 생성된다 — `.decoration-slice{box-decoration-break:slice}` · `.flex-shrink-0{flex-shrink:0}`. 손대지 않았다.

##### 덤으로 제거한 죽은 상수

`canvas/constants/node.ts`의 `CANVAS_NODE_SHADOW_CLASS`·`CANVAS_NODE_SELECTED_SHADOW_CLASS`가 **소비처 0**이었다. canvas 노드 그림자는 `canvas.css`가 `--canvas-shadow-rest/hover/active`(3테마 tint)로 이미 처리한다.

##### 검증

- `typecheck` · `build` 통과 · `tests` 281/284(잔여 3건 §1-B 기존 실패)
- 빌드 CSS: `.shadow-control`이 `var(--elevation-tint)`를 참조하고 3테마 값이 모두 생성됨 · `.rounded-xs{border-radius:var(--radius-xs)}` + `--radius-xs:.125rem` · `.backdrop-blur-xs`가 `--blur-xs`(4px) 참조
- `:root`의 `--shadow-sm/md/lg` 리터럴 제거 후 중복 정의 해소
- `check:design-tokens` 전 항목 통과, `shadowBig` 22 → 21

> 남은 v3 관련: 빌드 CSS에 `focus:outline-none`·`focus:ring-blue-500`·`shadow-sm` 유틸이 아직 생성되는데 출처가 앱 코드가 아니라 **`.kiro/skills/**/*.md`·`.agents/skills/**/*.md`의 예제 코드**다(git 추적 대상이라 Tailwind v4 자동 소스 감지에 걸린다). §8의 `@source not` 정리 항목에서 함께 다룬다.

---

#### 검정 그림자 → `--shadow-control` 신설 (2026-08-31)

`--shadow-panel`은 `0 10px 28px`이라 control 크기에 그대로 쓸 수 없다. 같은 tint 계열의 control 크기 token을 새로 만들었다.

```
@theme  --shadow-control: 0 1px 3px 0 var(--elevation-tint), 0 1px 2px -1px var(--elevation-tint)
:root              --elevation-tint: rgba(15, 23, 42, 0.1)
[data-theme=dark]  --elevation-tint: rgba(0, 0, 0, 0.28)
[data-theme=sepia] --elevation-tint: rgba(95, 75, 50, 0.14)
```

**핵심 제약**: tint를 `var()`로 참조해야 한다. Tailwind v4는 `@theme` 값의 텍스트를 그대로 인라인하므로, 리터럴 rgba를 적으면 theme 블록에서 `--shadow-control`을 덮어써도 utility에 반영되지 않는다. 빌드 산출 CSS에서 확인했다 — `.shadow-control{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,var(--elevation-tint)), …}`.

알파 비율은 canvas 그림자(`--canvas-shadow-*`)가 이미 쓰는 light 0.14 → dark 0.36 → sepia 0.18 관계에 맞췄다.

적용 6곳: `EditorToolbar.tsx`(2) · `MainLayout.tsx`(2) · `ScrivenerLayout.tsx`(1) · `menus.tsx`(1).

> 이후 v3 잔재 정리(위 절)에서 `shadow-sm` 52건을 여기로 수렴해 **총 60여 곳**이 됐다.

### 5. Toolbar 표면 / 상태 확정

- [~] Toolbar 막대에 표면 부여 — **사용자 결정으로 won't-do.** 아래 참조
- [~] 참조 패턴 `EditorBubbleMenu.tsx:67` — 위 항목이 won't-do가 되어 적용 대상 없음
- [x] `bg-muted/*` 오용 제거 — `EditorToolbar.tsx`(1) · `ScrivenerLayout.tsx`(3) · `EditorRuler.tsx`(2)
- [x] `EditorRuler.tsx`의 Google Docs 브랜드 블루 4곳 → accent 토큰
- [x] `EditorToolbar.tsx`의 텍스트색·형광펜 fallback 하드코딩 → 팔레트 상수 참조
- [x] **토글 6곳 트랙·노브 교정** (§4 Task 1에서 처리) — 트랙 `bg-border`(선 색을 면 색으로 쓴 오용) → `bg-element` + `border-border-strong`, 노브 `bg-white`/`bg-surface` → `bg-on-accent`(dark에서 대비 1.28 → 11.51로 노브가 보이게), `shadow-sm` → `shadow-control`. `SyncTab`·`LocalLlmCard`는 focus ring 자체가 없어 함께 보강
- [x] **`aria-pressed` 부재 해소** (2026-09-01). 눌린 상태를 색으로만 알려 스크린리더 사용자에게 전달되지 않던 토글 7곳
  - `toolbar/primitives.tsx` **`ToolbarButton`** — 공용 컴포넌트 1곳 수정으로 호출처 10곳이 함께 해소된다. `active`를 받지 않은 호출처는 `undefined`로 남겨 일반 버튼으로 읽히게 했다(`false`를 넘기면 토글이 아닌 버튼도 "안 눌림"으로 읽힌다)
  - `CanvasMarkdownEditor` 5곳 (bold · italic · underline · strike · highlight). `EditorBubbleMenu`가 이미 같은 패턴을 쓰고 있었는데 canvas 쪽만 빠져 있었다
  - `InspectorPanel` 레일 버튼 — `aria-pressed` + **`aria-label` 함께 추가**. `title`만 있는 아이콘 전용 버튼이라 접근 이름이 취약했다
- [~] 버튼 상태 **시각** 일관화(`bg-accent/15` vs `bg-active`) — **won't-do.** 아래 참조

#### Toolbar 무배경은 의도다 — won't-do (2026-08-31)

`toolbarContentRef`(`w-max` 내용 폭)에 `rounded-control border border-border bg-surface p-1 shadow-panel`을 부여했다가 **전량 롤백**했다. 툴바에 배경을 넣지 않은 것은 의도된 설계다.

따라서 §6의 `h-11` drag 스트립 문제도 "리본 밴드(`Ribbon.tsx:37` `bg-panel`)를 없애는" 방향이 아니라 **밴드를 의도된 백드롭으로 인정하고 스트립만 불투명화하는** 방향으로 처리했다.

#### `bg-muted/*` 오용 (2026-08-31)

`--color-muted`는 `--text-secondary`(글자색)다. 교정 방향은 대상마다 갈렸다.

| 위치 | 이전 | 이후 | 근거 |
| --- | --- | --- | --- |
| `EditorRuler` 여백 음영 2곳 | inline `backgroundColor: var(--color-muted, …)` + `opacity: 0.3` | `bg-element` | 폴백이 가리키던 밝은 회색이 원래 의도였고 `--bg-element`가 그 값에 일치한다. 짙은 회색 띠가 그려지던 것이 버그 |
| `EditorToolbar` 세그먼트 토글 트랙 | `bg-muted/20` | `bg-element` | 활성 세그먼트가 `bg-panel`이므로 트랙은 파인 면이어야 한다 |
| `ScrivenerLayout` 아이콘 버튼 3곳 | `hover:bg-muted/40` | `hover:bg-surface-hover` | `DESIGN.md`의 "solid hover 금지, 알파 오버레이 사용" |

#### 브랜드 블루 제거 + `--color-accent-bg-hover` 신설 (2026-08-31)

`fill-[#0b57d0] group-hover:fill-[#1a73e8]` 4곳 → `fill-accent-bg group-hover:fill-accent-bg-hover`.

이를 위해 `@theme`에 `--color-accent-bg-hover: var(--accent-bg-hover)`를 추가했다. **부수 효과가 본래 목적보다 크다** — `hover:bg-accent-bg-hover`가 이미 3곳(`PromptComposer:336` · `EntityGallery:311` · `EditorTab:315`)에서 쓰이는데 매핑이 없어 CSS가 전혀 생성되지 않는 dead class였다. 함께 살아났다.

실측: rest 4.90 → hover 6.36(light) · 4.98 → 6.51(sepia). hover가 대비를 올리는 방향이다.

#### 색상 fallback은 token이 아니라 상수여야 한다 (2026-08-31)

`ColorPickerMenu`가 값을 `hexToHsv(value)`로 파싱하므로 **CSS variable을 넣을 수 없다.** 그래서 theme token이 아니라 팔레트 상수를 단일 출처로 참조한다.

```
toolbar/constants.ts
  DEFAULT_TEXT_COLOR      = TEXT_COLORS[0].hex
  DEFAULT_HIGHLIGHT_COLOR = HIGHLIGHT_COLORS[0].hex
```

목록에 없던 `EditorBubbleMenu.tsx:130`도 같은 매직값을 쓰고 있어 함께 정리했다. 이전 값은 어느 스와치와도 맞지 않아 "색 없음" 상태의 표시색이 실제 팔레트와 어긋나 있었다.

### 6. Editor Layout 인접 표면 정리

- [~] `.editor-adjacent-surface` 그라디언트 — Light는 양끝이 `#ffffff`/`#f5f5f7`라 둥근 모서리와 border가 붕 뜨고, Sepia는 세 값이 달라 경계가 띠로 보인다 *(진단 수치는 §2·§3 이전 값. §1-A 부수 효과로 일부 해소돼 재측정 필요)* — **won't-do (2026-09-01).** 근거는 「종결 — 하지 않기로 한 것」 절 참조
- [x] `--editor-adjacent-surface` 폴백 부재 → `var(--editor-adjacent-surface, var(--bg-sidebar))`
- [x] `bg-[var(--ai-panel-bg)]` arbitrary value → `bg-ai-panel` 유틸 (2026-09-01). `@theme`에 `--color-ai-panel: var(--ai-panel-bg)` 매핑을 신설하고 **8곳** 치환 — `MainLayout.tsx:268,573,588` · `AIPanel.tsx:91,94,204` · `GoogleDocsLayout.tsx:200`(`to-ai-panel`) · **`GoogleDocsRightPanel.tsx:429`(`bg-[var(--ai-panel-bg,#323232)]` — 폴백이 붙어 있어 이전 조사에서 새어 나갔다. dark `--ai-panel-bg`가 `#323232`라 폴백은 죽은 값이었다)**. §7이 "`--color-ai-panel` 매핑이 아직 없어 var 형태로 남겼다"고 적어둔 것도 함께 해소
  - **렌더 결과 동일함을 확인했다.** `.research-surface`의 평탄화 목록에 `--ai-panel-bg`가 없으므로 `bg-[var(--ai-panel-bg)]`도 원래 평탄화되지 않았다. 새 매핑도 같은 조건이라 Research 안에서의 거동이 바뀌지 않는다
- [x] `h-11` WebkitAppRegion drag 스트립 배경 부재 → `bg-app` (`workspace/components/layout/EditorLayout.tsx:295`). 아래 상세
- [x] `GoogleDocsEditorColumn.tsx`의 A4 페이지 `bg-transparent` → `bg-editor-bg`
- [~] 모바일 프레임의 하드코딩 정리 — `Editor.tsx:330`의 `rounded-[48px]`(`--radius-editor-shell` 중복)·`border-[#2c2c2e]`·`shadow-[0_0_0_2px_rgba(...)]`. 기기 외형 표현이라 theme을 따르지 않는 건 의도된 것이므로 **토큰화가 아니라 의도를 명시한 scoped token으로 이동** — **won't-do (2026-09-01).** 근거는 「종결 — 하지 않기로 한 것」 절 참조

#### `--editor-adjacent-surface` 폴백 (2026-08-31)

`.editor-research-surface`/`.editor-ai-surface` 둘 중 아무것도 붙지 않으면 `var()`가 무효값이 되어 **`background` 선언 전체가 버려지고 스트립이 투명해진다.** 폴백을 `--bg-sidebar`로 둔 이유는 `MainLayout`의 else 분기가 `bg-sidebar`라서 의도가 같기 때문이다(그라디언트가 단색으로 평탄해진다).

현재 호출처는 `MainLayout` 한 곳이고 항상 짝이 붙으므로 잠재 버그였다.

#### `h-11` drag 스트립 — 원인은 "비침"이었다 (2026-08-31)

앱이 프레임리스(`windowChrome.ts:46` `titleBarStyle: "hiddenInset"`)라 창을 잡아 옮길 영역을 직접 만든다. 그 스트립이 투명해서 아래 `overflow-y-scroll` 컨테이너의 **본문 글자가 상단 44px에 비쳐 보였다.** 그 위로 `z-40` 리본 밴드(`bg-panel`)가 opacity로 토글되며 비친 글자를 덮었다 열었다 해서 Sepia처럼 panel/app 대비가 좁은 theme에서 띠가 점멸했다.

`EditorLayout.tsx`의 스트립에 스크롤 표면과 같은 `bg-app`을 줘서 이음선 없이 가린다. `MainLayout.tsx:464`에도 같은 구조의 스트립이 있으나 그쪽은 `Ribbon`을 쓰지 않아 토글되는 밴드가 없어 점멸이 없다 — 손대지 않았다.

#### A4 페이지 배경 (2026-08-31)

`--editor-bg`는 현재 `--bg-app` alias라 **렌더 결과는 동일하다.** 종이 역할이 표면에서 갈라질 때 이 지점이 함께 따라가도록 한 것이고, 뒤의 스크롤 표면이 비치던 구조를 없앤 것이 실질 이득이다.

### 7. Research 카드 / 링크 / active 규칙 수렴

- [x] `.research-surface` 평탄화 범위 축소 — **배경만 평탄화, 테두리는 복구.** 아래 상세
- [x] `EntityGallery.tsx`의 하드코딩 hover 테두리 제거 → `border-border` / `hover:border-border-active`
- [~] 캐릭터 템플릿 카드가 `CharacterManager.tsx:81-89`와 `character/CharacterSidebarList.tsx:68-78`에 거의 그대로 복사돼 있다 — 컴포넌트 추출 후보 (§1-B로 표면 문제는 해소됨) — **won't-do (2026-09-01).** 근거는 「종결 — 하지 않기로 한 것」 절 참조
- [~] active/selected **5개** 방언 → 1개로 수렴 *(테두리가 복구됐으므로 테두리를 쓰는 방언도 이제 성립한다)* — **won't-do (2026-09-01).** 근거는 「종결 — 하지 않기로 한 것」 절 참조
  - `bg-active + border-l-accent + text-accent` (`research/components/shared/EntitySidebarList.tsx:126`)
  - `bg-active + border-l-accent` (`research/components/memo/MemoSidebarList.tsx:61`)
  - `bg-active + border-accent + text-fg + font-medium` (`manuscript/components/Sidebar.tsx:166`) — *2026-09-01 추가 발견. `border-l-accent`가 아니라 `border-accent`를 쓰는 6번째 변형이기도 하다*
  - `bg-element + text-fg + shadow-xs` (`research/components/ResearchPanel.tsx:138`)
  - `bg-accent/15 + text-accent` (`research/components/WorldPanel.tsx:38`) — 같은 방언이 `toolbar/primitives.tsx:27` · `GoogleDocsPanelRail.tsx:95` · `StartupWizard.tsx:19` · `LlmfitCard.tsx:20`에도 있어 사실상 최다수다
- [~] Link 성격 요소 hover/active 규칙 정의. Research에 `<a>`가 1개(`WikiContentPanel.tsx:71` 목차 앵커)뿐이고 `hover:underline`도 0건 — 색 전환만으로 처리되고 있다. 그 앵커에는 `focus-visible`도 없다 — **won't-do (2026-09-01).** 근거는 「종결 — 하지 않기로 한 것」 절 참조
- [x] `TermCard.tsx`의 hover 역전 교정 → `hover:border-accent`
- [~] `ENTITY_KIND_TINT`(`wiki/visual/constants.ts:5`) 3색 → 테마 토큰화. `${tint}18` 문자열 조합 4곳도 함께 — **won't-do (2026-09-01).** 근거는 「종결 — 하지 않기로 한 것」 절 참조
- [x] Google Docs 레이아웃의 dark literal 하드코딩 제거 — 3곳. 아래 상세

#### `.research-surface`는 배경만 평탄화한다 (2026-08-31)

**사용자 결정**: 카드에는 테두리를 주는 게 맞고, Editor와 Research가 맞닿는 **바깥 경계**는 선을 주지 않는 현재 형태가 맞다.

제거한 5줄 — `--border-default` · `--border-active` · `--color-border` · `--color-border-active` · `--color-border-focus`의 `transparent` 덮어쓰기. 배경 평탄화(`--bg-*`, `--color-*`)는 그대로 유지한다.

바깥 경계는 token이 아니라 **컴포넌트가 명시한 `border-0`**이 담당하므로 token을 되살려도 선이 생기지 않는다 — `MainLayout` `contentSurfaceClass`, `PlotBoard`·`SynopsisEditor`·`WorkspacePanels`·`SnapshotViewer` 루트, 그리고 `.editor-research-surface .rounded-editor-shell`의 `border-right-width: 0`.

되살아난 선 (Research 전역):

| 화면 | 복구된 것 |
| --- | --- |
| 엔티티/메모 목록 | 그룹 헤더 아래 선, 항목 간 구분선 |
| 세계관 탭바 | 탭바 하단선, 탭 그룹 외곽선, 활성 탭 테두리 |
| 플롯 보드 | 컬럼 카드 테두리, 컬럼 헤더 하단선, 플롯 카드 테두리 + hover |
| 시놉시스 | 모드 전환 pill 외곽선, 입력 밑줄 + **focus 밑줄** |
| 용어 관리 | 헤더 하단선, 입력 3곳 테두리 + **focus 표시**, 점선 드롭존 |
| 위키 상세 | 목차 nav 외곽선, 앵커 칩 테두리 |

**접근성 이득이 핵심이다.** `TermManager`·`SynopsisEditor` 입력의 `focus:border-*`까지 투명해져서 키보드 포커스 위치를 알 수 없었다.

Research 표면 위 선 대비 (복구 후):

| | rest (`border`) | hover (`border-active`) | `border-strong` | `border-focus` |
| --- | --- | --- | --- | --- |
| light | 1.24 | 1.71 | 3.23 | 5.15 |
| sepia | 1.26 | 1.75 | 3.24 | 4.62 |
| dark | 1.27 | 1.68 | 3.30 | 2.08 |

> 미결: hover 1.71이 약하다고 판단되면 카드 hover를 `border-border-strong`(3.23)으로 한 단계 올린다. 반대로 선이 너무 많으면 `--border-default`를 낮추는 게 아니라 지울 곳을 `border-0`로 명시한다.

#### `EntityGallery` 카드 — 검은 outline 제거 (2026-08-31)

이전에 이 갤러리가 하드코딩으로 도망간 이유가 §1 진단의 그 항목이다. hover에 어두운 hex를 직접 박아 light·sepia에서 **검은 outline(6.15:1)** 이 떴다.

rest `border-border` → hover `border-border-active`로 정규 카드 패턴을 쓴다. 테두리 평탄화가 사라졌으므로 token이 그대로 동작한다.

#### `TermCard` hover 역전 (2026-08-31)

rest `border-accent/60` → hover `border-accent`. 실측 rest 2.29 → hover **4.17**(light) / 2.22 → **4.25**(sepia). 이전에는 hover가 1.72로 rest보다 약했다.

#### Google Docs 레이아웃 dark literal — 목록보다 2곳 많았다 (2026-08-31)

`#212123`은 dark theme `--bg-sidebar`의 리터럴이다. theme 분기가 없어 light·sepia 종이 옆에 near-black 패널이 붙고, 자식이 쓰는 `bg-panel`이 그 위에 얹혀 대비가 뒤집혔다.

| 파일 | 이전 → 이후 |
| --- | --- |
| `GoogleDocsRightPanel.tsx` | `research-surface bg-[#212123]` → `research-surface bg-research` / `bg-[#212123]` → `bg-sidebar` |
| `GoogleDocsPanelRail.tsx` | `bg-[#212123]` → `bg-sidebar` |
| `GoogleDocsLayout.tsx` | `to-[#323232]` → `to-[var(--ai-panel-bg)]` · `to-[#212123]` → `to-research` |

목록에는 `GoogleDocsRightPanel` 한 곳만 있었지만 **하나만 고치면 패널 레일이 여전히 near-black으로 남는다.**

dark `--bg-sidebar`가 정확히 `#212123`이라 **dark 렌더는 변하지 않는다.** light `text-muted` 대비 2.66 → **5.20**, sepia 2.52 → **5.22**.

`to-[var(--ai-panel-bg)]`는 `--color-ai-panel` 매핑이 아직 없어 var 형태로 남겼다(§6의 `bg-ai-panel` 유틸 항목에서 함께 처리).

### 8. 회귀 방어

- [~] `tests/renderer/styles/canvasThemeTokens.test.ts`를 테마 토큰 전반으로 확장 (현재 canvas 범위만) — **won't-do (2026-09-01).** 근거는 「종결 — 하지 않기로 한 것」 절 참조
- [x] **테마별 대비 임계값 정적 검사 추가** — `tests/renderer/styles/borderLadderContrast.test.ts` 신설(65 케이스). border 계단·고대비 경로를 담당한다. 아래 상세
- [x] **하드코딩 색 guard script 연결** — 스크립트는 있었지만 **어떤 npm script·CI에도 연결돼 있지 않아 수동 실행뿐이었다.** `check:design-tokens`로 노출하고 `qa:core` 게이트에 넣었다
- [x] **`scripts/design/tokens-guard.mjs` 결함 3건 수정** — 아래 상세
- [x] `src/renderer/src/styles/components/editor.css.bak` 정리 — **삭제 (2026-09-01).** git 추적 파일이라 이력에서 복구 가능하고, `editor.css`와 389줄 차이로 이미 낡았다. import 참조 0건. 부수 이득: Tailwind v4 자동 소스 감지가 git 추적 파일을 훑으므로 이 파일의 낡은 클래스가 빌드 CSS에 실리던 경로도 함께 사라진다 (아래 `@source not` 항목과 같은 범주)
- [~] `global.tokens.css` 모듈 분할 (파일 상단에 `/* 모둘화 필요 */` 주석 존재, 현재 **893줄**) — **won't-do (2026-09-01).** 근거는 「종결 — 하지 않기로 한 것」 절 참조

#### 대비 임계값 정적 검사 (2026-08-31)

`tests/renderer/styles/borderLadderContrast.test.ts` — 값을 하드코딩하지 않고 `global.tokens.css`를 파싱해 **실효값**을 해석한다. alias(`var(--x)`)를 따라가고, 선택자 특이도와 선언 순서로 승자를 고른다(CSS cascade와 같은 규칙). 임계값은 `THRESHOLD` 상수 한곳에 모아 뒀다.

| 검사 | 내용 |
| --- | --- |
| 3단 계단 단조 | 조합별 `default < active < strong` |
| WCAG 1.4.11 | `border-strong`이 control 표면에서 3:1 이상(반올림 금지) |
| 장식선 상한 | `border-default`가 상한을 넘지 않는다 — grid prison 방지 |
| **특이도 회귀** | 9개 조합에서 `data-contrast="high"`가 실제로 값을 바꾼다 |
| **base 폴백 금지** | 고대비 값이 자기 조합 블록에서 온다. 색온도 변형이 base의 회색 램프를 물려받는 것을 잡는다 |
| 고대비 border | 기본보다 진하다 |
| 고대비 tertiary | 최악 표면에서 4.5:1 (AA 완전 준수) |
| 색조 보존 | 고대비 텍스트의 축(`b − r`) 부호가 기본 모드와 같다 — 순검정 회귀 방지 |
| dark 상속 | dark+cool·warm의 `border-default`가 dark와 같다 |

**RED 검증**: 4종 회귀를 인위적으로 만들어 전부 검출을 확인했다. light+warm 고대비 블록 제거 → 4 failed · `border-strong` 3:1 위반 → 2 failed · `border-default` 상한 초과 → 3 failed · 계단 역전 → 1 failed.

**이 테스트가 작성 중 실제 버그를 잡았다.** sepia 계열 고대비 `tertiary`·`secondary`가 목표 미달이었다. 내가 기준면을 `--bg-sidebar`로 잡았는데 §3에서 sepia 계단을 바로잡은 뒤로는 `--bg-element`가 가장 어두운 면이다 — **아래 §2 기록 정정 참조.** tertiary 4.23 → 4.51~4.56, secondary 6.54~6.58 → 7.01~7.11로 교정했고 축은 전부 보존됐다.

#### `tokens-guard.mjs` 결함 3건 수정 (2026-08-31)

이전 구현은 **개선할수록 수치가 나빠지는 구조**라 신호로 쓸 수 없었다.

1. **주석을 세고 있었다.** 토큰 작업은 반드시 값의 근거를 NOTE로 남기는데, 그 안의 hex가 위반으로 잡혔다. 이번 세션에서 주석 hex만 24건이었다
2. **토큰 정의 파일을 위반으로 세고 있었다.** `global.tokens.css`는 hex가 있어야 하는 유일한 곳이다. `rawHex` 431 중 **262(61%)**가 이 파일이라 컴포넌트의 실제 진척이 묻혔다
3. **baseline이 낡아 상시 REGRESSION이었다.** `arbitraryPx`는 HEAD에서도 417 vs baseline 403으로 초과 상태였다. 상시 경고는 경고를 무의미하게 만든다

**수정**: 주석 제거 후 계산, 토큰 정의 파일을 게이트에서 분리해 참고 수치로 출력, baseline을 실측값으로 재설정.

| 항목 | 이전 표시 | 현재 |
| --- | --- | --- |
| `rawHex` | 431 / 313 ✗ | **145 / 145** ✓ |
| `rawColor` | 99 / 197 ✓ | 99 / 99 ✓ |
| `arbitraryPx` | 417 / 403 ✗ | **417 / 417** ✓ |
| `roundedBig` | 155 / 157 ✓ | 155 / 155 ✓ |
| `shadowBig` | 22 / 41 ✓ | 21 / 21 ✓ (2026-09-01 baseline 하향) |

토큰 정의 파일을 게이트에서 뺀 것은 검사를 포기한 게 아니다. 그 파일의 값 정합성은 위 `borderLadderContrast`·`canvasThemeTokens`가 **대비·계단·특이도로** 검증하므로 개수를 세는 것보다 강한 보호가 걸려 있다.

**게이트 동작 검증**: 컴포넌트 코드에 hex 추가 → 146/145 REGRESSION + exit 1 · 주석에 hex 추가 → 무변화(주석 제거 동작 증거) · 토큰 정의 파일에 hex 추가 → 게이트 무영향, 참고 수치만 262 → 263.

- [x] **`arbitraryPx` 417 → 414** (2026-09-01, `rounded-[24px]` 계열 4곳 이관). 나머지 414는 대부분 정당한 크기 지정(`min-w-[150px]` · `text-[10px]` 등)이고, 남은 토큰화 후보는 `Editor.tsx:330` `rounded-[48px]`와 `PromptComposer:154,159` `rounded-[12px]`·`rounded-[6px]` 정도다
- [x] `shadowBig` baseline 21 · `rawHex` 144 · `rawColor` 98로 하향 (감소 방향 갱신). guard가 스스로 권고 출력하던 항목이다

---

### 9. 목록 외 발견 및 처리 (2026-08-31)

§4~§7 작업 중 발견해 함께 처리한 항목이다. 원래 이 문서에 없었으므로 근거를 남긴다.

#### 9-1. `warning` / `danger` 토큰 미정의 — 죽은 클래스 94곳

`@theme`에 `--color-warning` · `--color-warning-fg` · `--color-danger`가 없어서 **CSS가 전혀 생성되지 않았다.** `--color-danger-fg`만 존재해 `text-danger-fg`(14회)만 살아 있었다.

```
text-danger 26회 · bg-danger/10 12회 · bg-warning/10 8회 · border-warning/30 8회
text-warning 7회 · text-warning-fg 6회 · ... 총 20종 94회 / 29개 파일
```

즉 경고·오류 UI가 **배경과 테두리를 잃고 기본 글자색으로만 렌더됐다.** 영향 화면: 설정→동기화(degraded/오류/충돌 박스), 동기화 충돌 모달, 오프라인 알림, 설정→모델 카드(로컬 LLM·임베딩·llmfit·메모리 재구축), 시작 위저드, Research 분석 패널, 위키 상세, 에러 바운더리.

- [x] `--warning-fg` 3테마 신설 — light `#b45309` · dark `#f59e0b` · sepia `#9a4c04`
- [x] `@theme`에 `--color-warning` · `--color-warning-fg` · `--color-danger` · `--color-success` 매핑

**매핑 원칙**: base와 fg를 같은 값에 연결한다. 이 코드베이스의 실제 사용 패턴이 "전체 강도로 글자, 낮은 알파로 배경·테두리"이기 때문이다(살아 있던 `bg-danger-fg/20`·`border-danger-fg/50`이 그 증거).

**값 근거**: 기존 `--danger-fg`와 같은 대비 대역에 맞췄다(light 5.02 : danger 4.83 / sepia 5.78 : 6.07). red와의 색거리를 최대화해 `SyncTab`처럼 경고 박스와 오류 박스가 나란히 놓일 때 구분되게 했다. dark는 amber-400이 8.8~10.4로 본문색보다 밝아 글레어가 되므로 한 단계 낮췄다.

**부작용 1건 처리**: `SyncTab.tsx`의 "해결" 버튼이 `bg-warning` + `text-warning-fg`라 **토큰이 살아나면 amber-on-amber로 글자가 사라진다.** `text-app`으로 교정(light 4.76 · dark 8.09 · sepia 5.54 — `text-on-accent`는 dark에서 2.15로 실패).

#### 9-2. Inspector 색인 카드가 sepia에서 보이지 않았다

Scrivener Inspector → 시놉시스 탭의 노란 메모지다. `bg-yellow-50 dark:bg-yellow-900/10`으로 `dark:` 분기만 있어서 **sepia가 light 값을 그대로 받았다.** sepia panel이 이미 크림색이라 카드와 배경이 같은 색이 됐다(1.030).

노란 메모지 표현은 의도이므로 일반 surface token을 따르지 않는다. 대신 Tailwind palette 직접 사용을 걷어내고 역할 token으로 노출했다.

- [x] `--index-card-bg` / `--index-card-border` 3테마 + `@theme` 매핑

| | 값 | panel 대비 |
| --- | --- | --- |
| light | `#fefce8` / `#fde68a` | 1.034 (기존 렌더 유지 — 구분 신호는 명도가 아니라 hue) |
| sepia | `#f6e9b8` / `#e0c884` | 1.030 → **1.141** |
| dark | `#423022` / `#644519` | 알파 tint(거의 안 보임) → **1.174** |

#### 9-3. 오프라인 배너 → 팝업, 의미색 제거

- [x] `w-full` 상단 배너 → 좌하단 `z-toast` 팝업

배너는 레이아웃을 밀어 집필 화면을 흔들고, 존재를 색으로 알리려면 표면 전체를 물들여야 한다. 좌하단인 이유는 우하단이 `UpdaterNotification`(bottom-4)·`FloatingAnalysisPanel`(bottom-6)·`AnalysisSection`(bottom-24)으로 이미 점유돼 있기 때문이다.

**결정: 의미색을 쓰지 않고 theme 표면 token만 쓴다.** amber를 썼더니 light·sepia 값이 둘 다 갈색 계열이어서 theme을 바꿔도 계속 "sepia 톤"으로 읽혔다. 차가운 색으로 구분을 만드는 방향은 sepia에서 `--editor-selection`을 파란색에서 brass로 바꾼 기존 결정과 반대다. 오프라인은 경고가 아니라 상태이고 의미는 아이콘과 문구가 전달한다. 근거는 컴포넌트 주석에도 남겼다.

함께 정리: 죽은 `animate-in slide-in-from-top-2 fade-in` 제거 · 하드코딩 `hover:bg-black/5 dark:hover:bg-white/5` → `hover:bg-surface-hover` · `shadow-sm` → `shadow-panel` · `z-banner` → `z-toast` · `role="status"`/`aria-live="polite"` 추가 · 닫기 버튼 `aria-label`과 `focus-visible:ring` 추가 · `w-[360px]` → `w-90`(같은 360px인데 `arbitraryPx`를 늘리지 않는다).

#### 9-4. Google Docs 눈금자가 세 theme 모두 안 보였다

원인은 `--color-foreground`(본문 글자색)에 `opacity 0.2/0.4`를 곱해 눈금을 그린 것이다. **opacity를 곱하면 theme마다 결과가 예측 불가능해진다.**

- [x] 눈금 → `bg-border-strong`(본문) / `bg-border-active`(여백), 숫자 → `text-muted` / `text-subtle`. opacity 곱 제거

| | 본문 눈금 | 본문 숫자 | 여백 숫자 |
| --- | --- | --- | --- |
| light | 2.45 → **3.56** | 3.05 → **5.73** | 1.48 → **4.01** |
| sepia | 2.06 → **3.57** | 3.06 → **5.74** | 1.49 → **4.01** |
| dark | 3.03 → **3.32** | 3.72 → **6.19** | 1.62 → 2.55 |

**롤백한 것**: 숫자를 `z-30` + 구간별 표면색 knockout으로 만들어 여백 핸들 위로 올렸다가 **사용자 결정으로 되돌렸다.** 기본 여백이 `INCH_PX`(96px) = 정확히 1인치라서 좌측 여백 핸들(`z-10`)이 숫자 "1" 위에 겹치는 것은 **알고도 남긴 상태**다.

> 남은 부채: 여백 음영 띠가 `bg-element`로 바뀌면서 1.52 → 1.175로 옅어졌다. 눈금과 숫자가 선명해져 상쇄됐지만, 띠 구분을 더 원하면 표면을 어둡게 하는 게 아니라 여백 경계에 선을 넣는 방향이 맞다.

---

### 10. v3 → v4 미착수본 전수 조사 (2026-09-01)

§4의 "v3 → v4 클래스 이름 이동 잔재"는 `shadow-sm`·`rounded-sm`·`backdrop-blur-sm` 3종만 다뤘다. v4 upgrade guide의 파괴적 변경 전체를 기준으로 다시 훑어 **미착수 4건 + 오탐 배제 6건**을 확정한다.

#### 10-1. `--border-subtle`이 정의돼 있지 않다 — 6곳

**v3 → v4 기본 테두리색 변경에 정확히 걸린 케이스다.** v3의 `border-color` 기본값은 `gray-200`이고 v4는 `currentColor`다. `border-[var(--border-subtle)]`는 토큰이 없으므로 `var()`가 무효값이 되어 `border-color` 선언이 버려지고, **v4에서는 그 자리에 글자색이 그려진다.** v3에서는 옅은 회색으로 떨어져 눈에 띄지 않았다.

`--bg-secondary`(4) · `--accent-fg`(18) · `--text-primary`(16)은 정의돼 있고 `--border-subtle`만 **0건**이다.

| 파일 | 위치 |
| --- | --- |
| `project-selector/TemplateGrid.tsx` | 77(`border-2 dashed`) · 89 · 106(`border-l-[6px]`) · 136 |
| `project-selector/RecentProjectsSection.tsx` | 123 |
| `workspace/components/ProjectTemplateSelector.tsx` | 306 |

- [x] `--border-subtle` 6곳 이관 완료 (2026-09-01). 역할별로 갈랐다 — 구분선·드롭존은 `border-border`, `border-l-[6px]` 장식 바는 **`border-border-strong`**(그 바가 `--bg-element` 위에 놓이는데 soft는 그 표면에서 대비 1.03으로 사라진다), 버튼 2곳은 §4 결정대로 `border-border`(배경이 히트 영역을 알리므로 step 6 유지). **`--bg-tertiary`도 미정의였다** — `TemplateGrid:85` 템플릿 미리보기의 종이면이 투명해져 바깥 면 색이 그대로 보였다 → `bg-editor-bg`, `ProjectTemplateSelector:306` hover → `hover:bg-element-hover`. 덤으로 `TemplateGrid:77`의 **`dashed`가 유효 클래스가 아니었다**(다른 9곳은 모두 `border-dashed`) → 점선이 아예 안 그려지던 것도 함께 고쳤다
  - [~] 남은 것: 같은 파일들의 `bg-[var(--bg-secondary)]`·`text-[var(--text-primary)]`·`text-[var(--text-tertiary)]` arbitrary value. **토큰은 정의돼 있어 렌더는 정상**이므로 이번 묶음(판단 불필요·실제 버그) 범위 밖으로 뒀다. 프로젝트 선택 화면 단위 이관으로 별도 처리한다 — **won't-do (2026-09-01).** 근거는 「종결 — 하지 않기로 한 것」 절 참조

#### 10-2. prefix important가 v4에서 동작하지 않는다 — 2곳

v3는 `!opacity-0`, v4는 후치 `opacity-0!`다. `wiki/visual/EntityNode.tsx:38,58`의 React Flow `Handle`에 `!opacity-0 !pointer-events-none`이 붙어 있어 **핸들 숨김이 실패한다** — 보이고 포인터 이벤트도 잡는다.

- [x] `!opacity-0 !pointer-events-none` → `opacity-0! pointer-events-none!` (2곳, 2026-09-01). 빌드 CSS에 `opacity:0!important`·`pointer-events:none!important`가 생성되는 것을 확인했다. **`!important`는 실제로 필요하다** — `reactflow/dist/style.css`는 layer 없이 import되고 Tailwind 유틸은 `@layer utilities`에 들어가므로, 선언 순서와 무관하게 unlayered인 `.react-flow__handle`이 항상 이긴다

#### 10-3. 검정 그림자 잔여 71건 — §4 체크박스가 실제보다 넓게 적혀 있었다

§4는 "Tailwind 기본 검정 그림자(`shadow-sm`/`shadow-xs`) → theme tint 계열 [x]"로 적었으나 **`shadow-sm` 52건만 처리됐다.**

| 클래스 | 건수 | 성질 |
| --- | --- | --- |
| `shadow-control` | 61 | theme tint (`--elevation-tint`) |
| `shadow-panel` | 27 | theme tint |
| `shadow-xs` | 26 | **검정** |
| `shadow-lg` | 20 | **검정** — `roundedBig`/`shadowBig` guard 대상 |
| `shadow-md` | 16 | **검정** |
| `shadow-2xs` | 5 | **검정** |
| `shadow-xl` | 4 | **검정** |

- [~] `shadow-xs`(26) · `shadow-2xs`(5) → `shadow-control`로 수렴 검토. v4 `shadow-xs`는 v3 `shadow-sm`(`0 1px 2px 0 rgb(0 0 0/.05)`)이라 `--shadow-control`보다 한 단계 약하다. 같은 tint 계열의 더 약한 token을 하나 더 만들 것인지, `shadow-control`로 합칠 것인지 결정이 필요하다 — **won't-do (2026-09-01).** 근거는 「종결 — 하지 않기로 한 것」 절 참조
- [~] `shadow-md`(16) · `shadow-lg`(20) · `shadow-xl`(4) → `--shadow-panel`(`0 10px 28px`)과 크기가 겹치는 것만 수렴. 전부 옮기면 부유 표면 위계가 무너진다 — **won't-do (2026-09-01).** 근거는 「종결 — 하지 않기로 한 것」 절 참조

#### 10-4. `bg-gradient-to-*` → `bg-linear-to-*` — 완료 (2026-09-01)

v4에서 이름이 바뀌었고 구 이름은 deprecated 상태로 동작했다. 빌드 CSS에서 `.bg-gradient-to-r`·`.bg-gradient-to-t` 0건 · `.bg-linear-to-r`·`.bg-linear-to-t` 생성 확인.

- [x] `CharacterVisualPanel.tsx:52` · `GoogleDocsLayout.tsx:200,201`

#### 10-5. dark 전용 가정 잔재 — light·sepia에서 hover가 사라진다

v3/v4와 무관한 팔레트 부채지만 같은 조사에서 나왔다. `bg-white/N` 33 · `text-white` 29 · `bg-black/N` 11 · `text-black` 2.

- [x] **`hover:bg-white/5|10`이 light·sepia에서 무효였다** — 해소 (2026-09-01). `manuscript/components/sections/` 5파일(`SidebarWorldList` 2 · `SidebarEventList` · `SidebarMemoList` 3 · `SidebarCharacterList` · `SidebarFactionList`) + `ScrivenerSidebar` 2곳 → `hover:bg-surface-hover`. 이 토큰은 theme별 알파 오버레이(light `rgba(0,0,0,.04)` · dark `rgba(255,255,255,.06)` · sepia `rgba(95,75,50,.05)`)라 `bg-white/N`이 dark에서만 맞던 문제가 사라진다. `SidebarMemoList:76`의 `bg-white/10`은 hover가 아니라 **선택 상태**였으므로 `bg-active`로 갈랐다(§7 방언 표의 `manuscript/Sidebar.tsx` 변형과 같은 조합). manuscript 전역 `bg-white|black/N` 잔여 0건
- [x] `PromptComposer.tsx:154,161,162`의 dark 전용 글래스 해소 (2026-09-01). `bg-white/6` → `bg-surface-hover`, `border-white/10` · `focus-within:border-white/20` → `border-border` · `focus-within:border-accent`, `bg-white/15 text-white` → `bg-accent/15 text-accent`, `text-zinc-400 hover:bg-white/10 hover:text-white` → `text-muted hover:bg-surface-hover hover:text-fg`
  - **불투명 표면 토큰을 쓸 수 없는 자리다.** 이 컴포저는 floating과 docked 양쪽에서 쓰여 부모 표면이 고정되지 않는다. `--bg-surface-hover`는 theme별 알파 오버레이(light `rgba(0,0,0,.04)` · dark `rgba(255,255,255,.06)` · sepia `rgba(95,75,50,.05)`)라 `bg-white/6`이 노리던 반투명 성질과 `backdrop-blur`를 유지하면서 세 theme 전부에서 성립한다
  - active 상태는 **새 방언을 만들지 않고** §7 표의 최다수(`bg-accent/15 + text-accent`, 8곳)를 따랐다. 방언 수렴을 하든 안 하든 이 자리가 추가 부채가 되지 않는다
- [x] `ExportSidebar.tsx:122` `bg-accent text-white` → `text-on-accent` (§1-B에서 `Modal`만 처리했다). 2026-09-01
- [x] `AppearanceTab.tsx:138` `border-black/10` → `border-border-strong`. 색 스와치 윤곽이므로 theme 무관 검정이 아니라 경계 토큰이 맞다. 전역 `border-black/N` 잔여 0건

#### 배제한 오탐 (조사해서 문제 없음을 확인)

이 6종은 다시 조사하지 않기 위해 기록한다.

| 항목 | 결과 |
| --- | --- |
| bare `ring` (v3 3px blue → v4 1px currentColor) | **0건.** §4 기록과 일치 |
| 색 미지정 `border`/`border-2` | 32건 검출되나 **실제 위험 0.** 전부 inline `style.borderColor`(`EdgeLabel` · `EntityNode` · `EntityGallery` · `CharacterVisualPanel`) 또는 `cn()` 조건부 `border-accent`/`border-border`/`border-transparent`가 붙는다. `border-0`(테두리 제거) 오탐도 포함 |
| `divide-x`/`divide-y` (v4 currentColor) | 3건 전부 `divide-border` 색 지정됨 (`EditorTab:239` · `LlmfitCard:55` · `StartupWizard:227`) |
| `blur-*` (v3→v4 값 2배 이동) | 2건은 `window.addEventListener("blur")` 오탐. 실제 `blur-*` 유틸 사용 0건 |
| `max-w-screen-*` · `overflow-ellipsis` · `bg-opacity-*` 계열 | 0건 |
| `theme()` CSS 함수 · `bg-[--var]` 대괄호 shorthand | 0건. v4는 `bg-(--var)` 소괄호를 요구한다 |

`flex-shrink-0`(1) · `flex-grow`(5) · `decoration-slice`(1)은 §4에서 이미 "죽은 클래스가 아니다"로 정정한 항목이다.

---

### 11. Editor Toolbar · 형광펜 · 글자색 · Typography · Slash 메뉴 (2026-09-01 착수)

사용자 지시로 새로 연 묶음이다. **착수 전 전수 실측 결과, 미관 문제가 아니라 기능이 깨져 있는 곳이 둘 있다.**

#### 11-1. 형광펜이 dark 테마에서 글자를 지운다 — 심각

`HIGHLIGHT_COLORS` 8색이 전부 **theme 무관 고정 hex**다. Tiptap `Highlight`가 `<mark style="background-color:#FEF08A">`로 인라인 스타일을 넣어 `editor.css:382`의 theme-aware 규칙(`color-mix(accent 18%, transparent)`)을 덮는다. 글자색은 `color: inherit`로 `--text-primary`를 그대로 쓰므로, dark에서 **거의 흰 글자 + 밝은 파스텔 배경**이 된다.

| 색 | hex | light | sepia | **dark** |
| --- | --- | --- | --- | --- |
| 노랑 | `#FEF08A` | 14.62 | 11.20 | **1.09** |
| 초록 | `#BBF7D0` | 14.04 | 10.75 | **1.05** |
| 하늘 | `#BAE6FD` | 12.82 | 9.82 | **1.05** |
| 분홍 | `#FBCFE8` | 12.31 | 9.43 | **1.09** |
| 주황 | `#FED7AA` | 12.57 | 9.63 | **1.07** |
| 보라 | `#E9D5FF` | 12.50 | 9.57 | **1.07** |
| 빨강 | `#FCA5A5` | 8.96 | 6.87 | **1.50** |
| 민트 | `#A7F3D0` | 13.27 | 10.16 | **1.01** |

**같은 파일의 다른 경로는 이미 올바르다.** `CanvasMarkdownEditor`는 `toggleHighlight({ color: "var(--highlight-default)" })`로 **토큰 참조를 값에 넣어** theme을 따라간다. EditorToolbar만 hex를 넣는다.

**alpha 조절로는 풀리지 않는다.** 3테마 전수 측정:

| alpha | 글자 최저(3테마) | 형광펜 가시성 최저 |
| --- | --- | --- |
| 0.30 | 5.37 | 1.016 |
| **0.35** | **4.57** (AA 통과 경계) | 1.019 |
| 0.45 | 3.37 ✗ | 1.022 |

theme별로 보면 방향이 반대다.

- **light/sepia**: alpha를 1.0까지 올려도 형광펜 가시성이 **1.05~1.10**에 머문다. 파스텔 8색이 밝은 종이와 명도가 거의 같기 때문이다
- **dark**: alpha 0.35를 넘으면 글자가 4.5:1 미달. 현재 `--highlight-default`의 0.32가 맞는 값이었다

##### 레퍼런스 조사 (2026-09-01) — 위 진단 중 하나를 뒤집었다

| 출처 | 방식 |
| --- | --- |
| [Notion](https://matthiasfrank.de/en/notion-colors/) | **theme별 불투명 hex 2세트.** 글자·배경·아이콘 hex를 각각 따로 둔다("Text colors, background colors, and icon colors each have their own set of hex codes"). dark에서는 배경을 **밝은 파스텔이 아니라 어두운 틴트로 뒤집는다** — Yellow `#FAF3DD` → `#372E20`, Blue `#E9F3F7` → `#1F282D`. 글자색은 `#D4D4D4`를 그대로 쓴다 |
| [Obsidian](https://forum.obsidian.md/t/compatible-highlighting-with-more-colors-and-fast/19378) | **알파 기반 + theme 분기.** `--text-highlight-bg-yellow: rgba(255,242,0,0.4)`이고 `.theme-dark { --text-highlight-bg: … }`로 갈린다. callout은 `--callout-blend-mode`까지 theme별로 다르다 |

**둘 다 theme별로 갈랐다. 단일 고정 hex를 쓰는 곳은 없다.** 진단은 맞았다.

그런데 **형광펜 가시성 목표는 내가 과하게 잡았다.** Notion 자체 값을 실측하면 이렇다.

| | light 펜 가시성 | light 글자 | dark 펜 가시성 | dark 글자 |
| --- | --- | --- | --- | --- |
| Notion Yellow | 1.109 | 11.04 | 1.318 | 9.00 |
| Notion Green | 1.124 | 10.90 | 1.213 | 9.78 |
| Notion Blue | 1.127 | 10.87 | 1.172 | 10.12 |
| Notion Red | 1.149 | 10.66 | 1.197 | 9.91 |
| Notion Orange | 1.163 | 10.53 | 1.251 | 9.48 |
| **Luie 현재 (light)** | **1.039~1.224** | 8.96~14.62 | — | — |

**Luie의 light/sepia 형광펜은 이미 Notion과 같은 대역이다.** §4가 "형광펜 대비가 전 theme에서 약하다"고 적은 것은 레퍼런스 없이 판단한 것이었고, 실제로는 **업계 관행 범위 안**이다. 형광펜은 글자를 가리지 않는 것이 우선이므로 은은한 것이 정상이다.

> **기록 정정**: 이 절의 이전 서술("light/sepia 8색을 한 단계 진하게 다시 잡는다, 목표 1.25~1.40")은 **폐기한다.** 근거 없이 잡은 숫자였고 레퍼런스가 반대를 가리킨다. §4의 형광펜 항목도 won't-do를 유지한다 — 닫은 판단이 맞았다.

**남는 문제는 dark뿐이다.** Notion dark 값을 Luie 종이(`#1c1c1e`)에 그대로 얹어보면 바로 쓸 수 있다.

| Notion dark | 펜 가시성 (Luie 종이) | 글자 대비 (`--text-primary`) |
| --- | --- | --- |
| Yellow `#372E20` | 1.275 | **10.51** |
| Orange `#36291F` | 1.210 | 11.08 |
| Green `#242B26` | 1.174 | 11.43 |
| Red `#332523` | 1.158 | 11.58 |
| Blue `#1F282D` | 1.134 | 11.82 |
| Purple `#2A2430` | 1.129 | 11.88 |

현재 dark 글자 대비 1.01~1.50이 **10.5~11.9로 올라간다.**

- [x] ~~light/sepia 8색을 진하게 다시 잡는다~~ — **레퍼런스 조사로 폐기.** 현재 값이 Notion과 같은 대역이다
- [x] **해소 (2026-09-01).** 값을 theme별로 3세트 잡는 대신 **`color-mix(anchor, var(--bg-app))` 1세트**로 만들어 9조합이 자동 파생되게 했다. 대비가 구조적으로 보장되므로 분기가 필요 없다. 아래 확정값·검증 참조
- [x] 저장 형식을 토큰 참조로 전환 — 11-3-A 참조

##### 확정: 형광펜 = 종이에서 hue 방향으로 이동

사용자 결정은 "3세트"였으나 **실제로는 1세트로 3세트(정확히는 9조합) 효과가 나온다.** 종이(`--bg-app`)를 `var()`로 참조하므로 theme이 바뀌면 결과가 따라간다.

```
--editor-mark-yellow: color-mix(in srgb, #b49004 17%, var(--bg-app));
--editor-mark-green:  color-mix(in srgb, #22c55e 20%, var(--bg-app));
--editor-mark-sky:    color-mix(in srgb, #0ea5e9 17%, var(--bg-app));
--editor-mark-pink:   color-mix(in srgb, #ec4899 14%, var(--bg-app));
--editor-mark-orange: color-mix(in srgb, #f97316 17%, var(--bg-app));
--editor-mark-purple: color-mix(in srgb, #a855f7 14%, var(--bg-app));
--editor-mark-red:    color-mix(in srgb, #ef4444 13%, var(--bg-app));
--editor-mark-mint:   color-mix(in srgb, #14b8a6 19%, var(--bg-app));
```

**비율은 hue별로 다르다.** 각 hue의 명도가 달라 같은 비율이면 대비가 어긋난다. 노랑 anchor만 `#facc15`가 아니라 **`#b49004`**다 — 밝아서 light 종이에서 목표 가시성을 만들려면 41%가 필요했고, 그 비율을 dark에 쓰면 글자 대비가 4.09로 떨어졌다. anchor를 어둡게 해 17%로 내렸다.

**9조합 전수 실측**

| 조합 | 펜 가시성 | 그 위 글자 대비 |
| --- | --- | --- |
| light / +cool / +warm | 1.177~1.181 | 12.63~13.69 |
| sepia / +cool / +warm | 1.169~1.178 | 7.82~8.01 |
| dark / +cool / +warm | 1.135~1.448 | 8.37~10.67 |

**최저 글자 대비 7.82** — 이전 1.01~1.50에서 올라왔다. 펜 가시성은 Notion 대역(light 1.10~1.16 · dark 1.17~1.32)과 정합한다.

**dark 산출값이 레퍼런스와 수렴했다.** 독립적으로 도출했는데 Notion과 거의 같은 값이 나온 것이 검증이다.

| | Luie 산출 | Notion |
| --- | --- | --- |
| yellow | `#352f18` | `#372E20` |
| sky/blue | `#18323f` | `#1F282D` |
| red | `#361f21` | `#332523` |

**색온도는 미세하게 따라간다.** 종이 색조를 물려받기 때문이다. hue는 anchor가 지키므로 "노랑"이 연두로 읽히지 않고, 폭은 §2가 확정한 "살짝만 달라졌는데 다른 느낌"과 같다. 명시적으로 9세트를 잡지 않아도 같은 결과가 나오므로 유지비가 최소다.

- [x] `--highlight-default`의 theme별 리터럴 3개 제거 → `var(--editor-mark-yellow)` alias. 이전에는 light `#fef08a` · dark `rgba(250,204,21,.32)` · sepia `#f2e2a6`로 흩어져 **툴바 형광펜과 canvas 형광펜이 서로 다른 색을 칠했다**

##### 미결: 색온도(cool/warm)를 따라갈 것인가

Luie는 theme 3 × 색온도 3 = 9조합이다. Notion·Obsidian에는 색온도 축이 없어 레퍼런스가 없다.

**제안: theme(3)만 갈고 색온도는 따라가지 않는다.** 근거 3개.

1. **형광펜 hue는 사용자가 고른 의미색이다.** 종이 축(`b − r`)이 ±8~10 움직인다고 형광펜 hue를 같이 밀면 "노랑"이 연두나 주황으로 읽힐 수 있다. §7에서 `ENTITY_KIND_TINT`를 won't-do로 닫은 논리와 같다
2. **§2가 확정한 "축은 역할 전체에서 일정해야 한다"를 형광펜에는 적용할 수 없다.** 표면 토큰은 무채색이라 하나의 축으로 정렬되지만, 형광펜은 서로 다른 8개 hue라 정렬 대상이 아니다
3. **§2가 확정한 "절대 색편차는 낮게 유지"** 때문에 색온도의 축 이동은 작다(±8~10). 채도 있는 형광펜 위에서는 그 정도로 인지되지 않는다

- [x] **결정: theme(3)만 갈고 색온도는 명시적으로 잡지 않는다** (사용자 승인). 결과적으로 `color-mix(anchor, var(--bg-app))` 구조가 색온도까지 자동으로 미세 반영하므로 9조합이 모두 성립한다 — 명시적 24색을 잡지 않고 8색으로 끝났다

#### 11-3-A. 저장 형식 전환 방법 — `!important`는 필요 없다 (2026-09-01 정정)

> **기록 정정**: 이 문서의 이전 서술("렌더링 시점 보정에는 `!important`가 필요하다")은 **CSS만으로 인라인 스타일을 이기려 할 때만 맞다.** Tiptap 확장 층에서 처리하면 필요 없다. 3개 선택지(신규만 토큰 / 문서 일괄 치환 / 렌더 보정)를 놓고 고민할 필요도 없었다 — 하나로 전부 해결된다.

`Highlight`(그리고 `Color`)를 `.extend()`해서 `renderHTML`·`parseHTML`을 갈면 된다. `@tiptap/extension-highlight` 3.27.1이라 지원한다.

- `renderHTML`이 `background-color` 대신 **커스텀 프로퍼티**를 세운다 → `style="--luie-mark:#FEF08A"`
- CSS가 그것을 소비한다 → `mark { background-color: color-mix(in srgb, var(--luie-mark) var(--luie-mark-alpha) , transparent) }`. `--luie-mark-alpha`는 theme별로 갈린다. **인라인 스타일이 `background-color`를 직접 세우지 않으므로 CSS가 이긴다 — `!important` 불필요**
- `parseHTML`이 **옛 형식도 읽는다** → `el.style.getPropertyValue("--luie-mark") || el.style.backgroundColor`

이 세 줄로 얻는 것:

| | 결과 |
| --- | --- |
| 기존 문서 | 옛 `background-color` hex를 parseHTML이 읽어 attribute로 복원하고, renderHTML이 새 형식으로 그린다 → **렌더 시점에 즉시 고쳐진다** |
| 저장 | 다음 저장에서 `editor.getHTML()`이 새 형식을 내보낸다 → **마이그레이션 스크립트 없이 자연히 이행된다** |
| 스냅샷·동기화 | 문서를 일괄 변환하지 않으므로 영향 없다 |
| 커스텀 픽커 색 | 팔레트 밖 색도 같은 경로를 타므로 함께 보정된다 |
| Export | 11-3에서 확인한 대로 `<mark>`·`<span>`이 애초에 제거되므로 무관 |

- [x] `Highlight.extend()` · `Color.extend()`로 `renderHTML`/`parseHTML` 오버라이드 — `extensions/ThemedTextColor.ts` 신설(`ThemedHighlight` · `ThemedColor`)
- [x] `editor.css:382`의 `mark` 규칙을 `--luie-mark` 소비 형태로 교체 + `--luie-ink` 규칙 신설

**빌드 CSS 확인** (`editor-*.css` 별도 청크다 — `Editor.tsx`·`ExportPreview.tsx`가 직접 import한다)

```
mark{background-color:var(--luie-mark,color-mix(in srgb, var(--accent-bg,#2563eb) 18%, transparent));…}
.tiptap .ProseMirror [style*=--luie-ink]{color:var(--luie-ink)}
```

`!important` 0건. 인라인 스타일이 `background-color`/`color`를 세우지 않으므로 필요 없다.

토큰은 Lightning CSS가 `color-mix` 미지원 폴백까지 함께 생성했다 — `:root{--editor-mark-yellow:#b49004}` + `@supports (color:color-mix(…)){…}`. Electron 40은 `color-mix`를 지원하므로 혼합값이 적용된다.

#### 11-2. 글자색 팔레트 9색 중 쓸 수 있는 것이 2색뿐이다

같은 원인(고정 hex)이다. 종이 대비 실측:

| 색 | hex | light | sepia | dark | 판정 |
| --- | --- | --- | --- | --- | --- |
| 검정 | `#18181B` | 16.81 | 15.95 | **1.04** | dark에서 안 보임 |
| 흰색 | `#D7D7DA` | **1.36** | **1.29** | 11.85 | light·sepia에서 안 보임 |
| 파랑 | `#2563EB` | 4.90 | 4.65 | 3.29 | light·sepia AA 통과 |
| 보라 | `#9333EA` | 5.11 | 4.84 | 3.16 | light·sepia AA 통과 |
| 빨강 | `#EF4444` | 3.57 | 3.39 | 4.52 | 본문 미달 |
| 청록 | `#0D9488` | 3.55 | 3.37 | 4.54 | 본문 미달 |
| 초록 | `#16A34A` | 3.13 | 2.97 | 5.16 | 본문 미달 |
| 노랑 | `#CA8A04` | 2.79 | 2.64 | 5.79 | 본문 미달 |
| 주황 | `#F97316` | 2.66 | 2.52 | 6.07 | 본문 미달 |

**단일 고정 hex로 3테마를 만족하는 것은 물리적으로 불가능하다.** light에서 4.5:1을 맞추려면 어두워야 하고, 그러면 dark 종이에서 3:1도 안 된다. `#2563EB`가 그 증거다(4.90 → 3.29).

- [x] **해소 (2026-09-01).** 형광펜과 **대칭 구조**로 잡았다 — 형광펜이 종이에서 hue 방향으로 조금 움직이는 것과 반대로, 글자색은 **본문색(`--text-primary`)에서 hue 방향으로 많이** 움직인다. 배경은 종이 근처에 머물러야 글자를 안 가리고, 글자는 종이에서 멀어져야 읽히기 때문이다. 대비가 구조적으로 보장된다

```
--editor-ink-red:    color-mix(in srgb, #dc2626 69%, var(--text-primary));
--editor-ink-orange: color-mix(in srgb, #ea580c 64%, var(--text-primary));
--editor-ink-yellow: color-mix(in srgb, #ca8a04 51%, var(--text-primary));
--editor-ink-green:  color-mix(in srgb, #16a34a 60%, var(--text-primary));
--editor-ink-teal:   color-mix(in srgb, #0d9488 68%, var(--text-primary));
--editor-ink-blue:   color-mix(in srgb, #2563eb 73%, var(--text-primary));
--editor-ink-purple: color-mix(in srgb, #9333ea 68%, var(--text-primary));
--editor-ink-pink:   color-mix(in srgb, #db2777 73%, var(--text-primary));
```

비율은 hue별로 **9조합 전부에서 4.7:1을 넘는 최대값**을 골랐다. 채도를 최대한 남기면서 AA를 보장하는 값이다. 노랑이 51%로 가장 낮다 — 명도가 높아 여유가 적다.

| 조합 | 종이 대비 |
| --- | --- |
| light / +cool / +warm | 5.61~7.74 |
| sepia / +cool / +warm | 4.70~6.34 |
| dark / +cool / +warm | 4.71~8.37 |

**최저 4.70 — 8색 × 9조합 = 72칸 전부 AA 통과.** 이전에는 9색 중 2색만 통과했다.

- [x] "검정"·"흰색"을 팔레트에서 뺐다. 그 둘이 원하는 결과는 "theme의 본문색"이고, 그 역할은 팔레트가 아니라 `clearLabel`("기본 글자색")이 담당한다 → **8색**
- [x] `DEFAULT_TEXT_COLOR`를 `var(--text-primary)`로 바꿨다. 이전에는 팔레트 첫 항목이었고 그게 우연히 "검정"이라 맞았는데, 검정을 뺀 뒤로는 첫 항목이 빨강이라 **색을 안 칠했는데 빨간 밑줄이 뜨게 된다**
- [x] `menus.tsx`의 `normalizedValue === "#ffffff"` 죽은 코드 제거
- [x] `ColorPickerMenu`가 토큰 값을 다루게 했다. 팔레트 항목이 `token`(저장·표시값)과 `anchor`(커스텀 픽커 초기값 hex)를 함께 갖는다 — 픽커가 값을 `hexToHsv()`로 파싱하므로 토큰 참조를 넣을 수 없다

#### 11-3. Export는 색·형광펜·취소선을 이미 버리고 있다 — 위 전환의 리스크가 0인 근거

`exportContentNormalization.ts`의 화이트리스트가 `p br h1 h2 h3 ul ol li blockquote strong em u`다. `<span>`은 69행에서 **명시적으로 제거**되고 `<mark>`·`<s>`는 화이트리스트에 없어 76~90행에서 떨어진다.

즉 **글자색·형광펜은 DOCX/HWPX에 애초에 반영되지 않는다.** 따라서 저장 형식을 `var()`로 바꿔도 Export가 깨질 수 없다.

- [ ] **정정 (2026-09-01): 취소선만의 문제가 아니었다.** 저비용 항목으로 잡았다가 조사해보니 화이트리스트에 `s`를 넣어도 아무것도 고쳐지지 않는다.

  `exportService.ts:103`의 `stripHtmlTags()`가 `text.replace(/<[^>]+>/g, " ")`로 **모든 인라인 태그를 제거한다.** 그리고 `htmlToParagraphs()`가 문단 단위로 이 함수를 통과시킨다. 즉 `exportContentNormalization`이 화이트리스트로 살려둔 `strong`·`em`·`u`도 **DOCX 생성 단계에서 전부 벗겨진다.** `TextRun`에 `bold`를 지정하는 곳은 `buildTitleParagraph`(제목) 한 군데뿐이고 본문 서식 경로가 없다. HWPX도 인라인 서식 처리가 없다.

  따라서 **DOCX/HWPX에는 굵게·기울임·밑줄·취소선·글자색·형광펜이 하나도 반영되지 않는다.** `exportContentNormalization`의 화이트리스트는 문단 구조(`p`·`h1~3`·`ul`/`ol`/`li`·`blockquote`)만 실효가 있다.

  이건 클래스 치환이 아니라 `htmlToParagraphs`를 **TextRun 단위 파싱으로 다시 쓰는** 작업이다(HWPX는 별도). §11 범위 밖으로 옮기고 Export 기능 항목으로 분리한다 — 사용자에게 "굵게가 내보내기에 안 나온다"로 체감되는 항목이므로 우선도는 낮지 않다

#### 11-4. Toolbar 드롭다운 3개가 종이 위에서 보이지 않는다

`CompactDropdown`이 fill `bg-app`(= 종이색) + `border-border`(soft)다. 툴바가 무배경(§5 won't-do)이라 컨트롤이 종이 위에 바로 놓인다.

| | soft (현재) | strong (§4 규범) |
| --- | --- | --- |
| light | **1.209** | 3.122 |
| sepia | **1.228** | 3.169 |

§4 Task 1이 input·select·토글·checkbox 32곳을 `border-border-strong`으로 옮겼는데 **이 3개(문단 스타일·글꼴·크기)가 빠졌다.** select 역할이므로 규범 대상이다.

- [x] `CompactDropdown` · **`FontSelector`** 경계 → `border-border-strong` (2026-09-01). 둘 다 select 역할이고 fill이 `bg-app`이다. `FontSelector`는 목록에 없었는데 같은 성격이라 함께 옮겼다. `rounded` bare도 `rounded-control`로 바꿨다. 두 컨트롤에 `focus-visible:ring-2 ring-ring`도 없어 함께 보강했다
  - `menus.tsx:247`의 `border border-border`는 커스텀 색 미리보기 스와치라 **장식선이 맞다.** §4 결정대로 soft 유지

#### 11-5. `CompactDropdown`이 ARIA 없는 커스텀 select다

- [ ] `role="listbox"`/`role="option"`·`aria-expanded`·`aria-activedescendant`·화살표 키 이동·Escape 전부 없다. 네이티브 `<select>`가 아니므로 스크린리더와 키보드에 아무것도 전달되지 않는다

#### 11-6. Slash 메뉴 — 선택 표시가 1.05이고 ARIA가 없다

- [ ] 항목이 `<div onClick>`이고 `role="listbox"`/`option`/`aria-selected`/`aria-activedescendant`가 없다. 화살표 이동은 Suggestion 플러그인이 처리하지만 **보조기술에는 선택 위치가 전달되지 않는다**
- [ ] 선택 항목이 `bg-active`(알파 오버레이) — 대비 약 1.05로 어느 항목이 선택됐는지 알기 어렵다
- [ ] 아이콘 박스가 `w-11 h-11`(44px)로 시각적으로 무겁다. 메뉴 높이가 항목당 60px를 넘어 8개가 화면을 채운다
- [x] `rounded` bare → `rounded-control` (아이콘 박스·항목 행) · `z-50` → `z-dropdown` · `descriptions`에 없는 id는 **빈 줄을 그리지 않는다**(이전에는 빈 `<div>`가 항목 높이만 차지했다). 2026-09-01

#### 11-7. 메뉴 3개 전부 Escape로 닫히지 않는다

- [x] **Escape로 닫힌다 (2026-09-01).** `useClickOutside`에 Escape 처리를 통합했다. 소비처 5곳(`ColorPickerMenu` · `TypographyMenu` · `CompactDropdown` · `MoreMenu` · **`FontSelector`**)이 한 훅을 쓴다 — `FontSelector`는 바깥 클릭을 자체 `useEffect`로 구현하고 있어 훅으로 통합했다
  - **훅에 `open` 인자를 추가한 이유**: Escape는 `stopPropagation`을 해야 상위 모달이 같이 닫히지 않는다. 그런데 메뉴가 닫혀 있을 때도 리스너가 붙어 있으면 **에디터의 Escape를 앱 전역에서 삼킨다.** 그래서 열려 있는 동안만 등록한다. capture 단계에서 받는 것은 ProseMirror가 Escape를 먼저 소비하는 것을 막기 위해서다

#### 11-8. Typography 메뉴에 단위가 없다

- [x] 단위 표기 추가 (2026-09-01). 자간 `0.02em` · 줄간격 `1.70×` · 문단간격 `1.0em`. `aria-valuetext`로 보조기술에도 같은 문자열을 전달한다 — 네이티브 range는 값을 숫자로만 읽어준다
- [ ] 기본값 복원 수단이 없다
- [x] `accent-[var(--accent-bg)]` → `accent-accent-bg` (매핑이 이미 있었다)

---

## 종결 — 하지 않기로 한 것 (2026-09-01)

**사용자 결정.** 아래 항목은 "하면 얻는 것이 있지만 굳이 할 필요가 없다"로 판단해 닫는다. 다시 열 근거가 생기면 그때 판단하고, 그때까지는 **미착수가 아니라 종결**로 읽는다. §5 Toolbar 무배경을 won't-do로 남긴 것과 같은 방식이다.

접근성에 해당하는 2건(`aria-pressed`, bare 입력 focus 표시)만 분리해 처리했다. 그 둘은 "일관성이 좋아진다"가 아니라 **기능이 깨져 있던 것**이기 때문이다.

### 시각 일관성 — 닫음

| 항목 | 왜 닫는가 |
| --- | --- |
| active/selected **5개 방언** 수렴 (§7) | 화면마다 선택 표현이 다른 것은 인상 문제고 동작은 정상이다. 새 작업이 방언을 늘리지 않도록 **`PromptComposer`에서 최다수(`bg-accent/15 + text-accent`, 8곳)를 따르는 선례만 남겼다** |
| 버튼 상태 **시각** 일관화 (§5) | 위와 같은 축. `aria-pressed`만 갈라내 처리했다 |
| 검정 그림자 71건 수렴 (§10-3) | `shadow-xs` 26 · `2xs` 5 · `md` 16 · `lg` 20 · `xl` 4. sepia 종이 위 회색 얼룩이 남지만, `shadow-xs`는 `--shadow-control`보다 한 단계 약해 **tint 토큰을 하나 더 만들어야** 하고 `md`·`lg`·`xl`을 전부 옮기면 부유 표면 위계가 무너진다. 비용이 이득보다 크다 |
| `ENTITY_KIND_TINT` 3색 토큰화 (§7) | 엔티티 종류를 구분하는 의미색이고 3테마 전부에서 읽힌다. 토큰화 이득이 작다 |
| Link hover/active 규칙 (§7) | 대상이 `WikiContentPanel:72` 앵커 **1개**뿐이다. 규칙을 세울 표본이 아니다 |
| 모바일 프레임 scoped token (§6) | `Editor.tsx:330`의 기기 외형 표현. theme을 따르지 않는 것이 의도이므로 하드코딩이 오히려 의도를 드러낸다 |
| `.editor-adjacent-surface` 그라디언트 재측정 (§6) | §1-A에서 `--bg-research: var(--bg-sidebar)` alias로 통합한 부수 효과로 두 stop이 같은 색이 되어 **이미 단색으로 평탄해졌다**. 진단 당시의 경계 띠 자체가 사라졌다 |
| 프로젝트 선택 화면 arbitrary value 이관 (§10-1) | `bg-[var(--bg-secondary)]`·`text-[var(--text-primary)]` 등. **토큰이 정의돼 있어 렌더는 정상**이다. 미정의 토큰(`--border-subtle`·`--bg-tertiary`)만 골라 이미 고쳤다 |
| 형광펜 대비 (§4) | 규범이 없다는 결론이 이미 나와 있고(WCAG는 장식 배경에 대비를 요구하지 않는다), 목표값을 정할 근거가 없다 |

### 구조 작업 — 닫음

| 항목 | 왜 닫는가 |
| --- | --- |
| **`global.tokens.css` 893줄 모듈 분할 (§8)** | **하면 손해다.** `borderLadderContrast.test.ts`가 **이 파일 하나를 파싱해** 선택자 특이도와 선언 순서로 cascade 승자를 계산한다. 쪼개면 그 해석을 여러 파일 + import 순서까지 확장해야 하고 65케이스 회귀 방어가 약해진다. 파일 길이는 불편이지만 이 테스트가 팔레트의 유일한 방어선이다 |
| `canvasThemeTokens` 테마 전반 확장 (§8) | `borderLadderContrast` 65케이스가 이미 대비·계단·특이도·색조 보존·base 폴백·dark 상속을 덮는다. 중복이 크다 |
| `arbitraryPx` 정리 (§8) | A그룹으로 417 → 414가 됐고 나머지는 `min-w-[150px]`·`text-[10px]` 같은 정당한 크기 지정이다. 실질 종결 |
| 캐릭터 템플릿 카드 컴포넌트 추출 (§7) | 복사가 2곳뿐이라 유지보수 이득이 작다. §1-B에서 표면 문제는 이미 해소됐다 |

### 열어두는 것

- **UI 확인 12건** — 코드가 아니라 사용자 판단이 필요하다. 특히 애니메이션 7건은 이번에 처음 움직이므로 미확인 상태다
- **`DrawingCanvas` 접근성** — `<div onClick>` 키보드 도달 불가 + 아이콘 버튼 접근 이름 없음. 위 "시각 일관성" 범주가 아니라 §5의 접근성 항목과 같은 성격이라 닫지 않는다

---

## UI 확인 — 완료 (2026-09-01)

> **사용자 확인 결과: 이상 없음.** 아래 항목 전부 승인됐다.
>
> 확인 방식은 **항목별 실측이 아니라 전체 인상 확인**이었다("특히 이상하다고 느낀 건 없다"). 나중에 특정 항목에서 문제가 드러나면 이 기록의 정밀도를 감안해야 하므로 그대로 남긴다.

### 1. 애니메이션 — 이번에 처음 움직였다

`global.animations.css` 신설로 21개 파일 90건이 죽은 클래스에서 살아났다. **확인 전까지 아무 움직임이 없었으므로 전부 새로운 인상이었다.**

- [x] **패널 열고 닫기의 slide 중복** — 이중 움직임이 과하지 않다고 판단됐다. `flex-grow` 폭 보간(200ms)과 `slide-out-to-left`를 함께 두는 현재 형태를 유지한다. *fade만 남기는 선택지는 쓰지 않았다*
- [x] 설정 모달 · 동기화 충돌 모달 (`fade-in` + `zoom-in-95`)
- [x] 토스트 (`slide-in-from-right-full duration-300`) · 업데이트 알림 (`slide-in-from-bottom-5`)
- [x] 스마트링크 툴팁 · canvas 부유 컨트롤 · 그래프 범례
- [x] 시놉시스 에디터의 `duration-700` — 유일하게 700ms인데 어긋나 보이지 않았다. **규범(200ms)에 맞추지 않고 유지한다**
- [x] 설정 → 모양 → 애니메이션을 끈 상태에서 움직임이 즉시 사라진다
- [x] OS 손쉬운 사용 → 동작 줄이기를 켠 상태에서도 사라진다 (이전에는 canvas 밖이 미적용이었으므로 처음 검증된 경로다)

### 2. border soft 도입의 부수 영향

- [x] **canvas 그리드가 옅어진 것이 문제되지 않았다.** `--grid-line`이 `var(--border-default)`라 soft(1.27)를 따라갔는데 그대로 둔다. *`--grid-line`만 고대비 값에 고정하는 분기는 넣지 않았다*
- [x] `--bg-element`를 fill로 쓰는 컨트롤 4곳(그래프 필터 드롭다운 · 검색창 · 시놉시스 입력 · 위키 검색)의 경계 대비 2.54~2.71이 다른 입력(3.30)보다 약해 보이지 않았다. §2의 "파인 면" 설계를 유지한다

### 3. v3 잔재 정리의 시각 영향

- [x] **`rounded-sm` → `rounded-xs`** (20곳, 반경 4px → 2px). 각져 보이지 않았다
- [x] **`backdrop-blur` 역할 분기.** 전면 오버레이 8px / 소형 부유 요소 4px
- [x] **`shadow-sm` → `shadow-control`** (52곳). 검정 그림자가 theme tint로 바뀐 결과

### 4. 접근성 라운드의 시각 영향 (2026-09-01 추가분)

- [x] **제목 입력의 focus 밑줄** — 챕터 제목 · 메모 제목 · 마인드맵 노드 이름에 `border-b-2 border-transparent focus:border-accent`를 넣었다. 제목 서체 무게와 어울리는지가 판단 지점이었고 이상 없었다
- [x] `AIPanel` 컴포저 · `menus.tsx` HEX 입력의 focus ring 신설

### 5. 형광펜·글자색 팔레트 전환 (§11, 2026-09-01)

- [x] **사용자 확인 완료.** dark에서 형광펜을 칠했을 때 글자가 읽히는지, 기존 문서의 옛 hex가 `parseHTML`로 복원되는지, 글자색 팔레트가 8색이 되고 "기본 글자색"으로 해제되는지 — 이상 없음

---
