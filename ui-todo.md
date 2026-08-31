# UI System Refactor — Theme Token 재설계

> 브랜치: `refactor/ui-system`
> 상위 규범: [`DESIGN.md`](DESIGN.md), [`docs/quality/frontend-css-agents.md`](docs/quality/frontend-css-agents.md)
> 단일 진실 공급원: [`src/renderer/src/styles/global.tokens.css`](src/renderer/src/styles/global.tokens.css)

## 진단 요약

나열된 증상 대부분이 하나의 원인에서 나온다. **Light/Sepia의 표면 계단(surface ladder)이 붕괴했고 border가 사실상 보이지 않는다.**

### 표면 분리 대비 실측

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

## 작업 항목

한 번에 하나씩 진행한다. 각 단계 완료 시 `pnpm run typecheck` + 대비 실측으로 검증한다.

### 1. 토큰 레이어 정리 — 완료

기준 커밋 `9e2ad0ef`. 대상 파일 2개: `global.tokens.css`, `components/editor.css` (+49 −47).
팔레트 값은 건드리지 않았다. 일반 사용 경로의 렌더 결과는 동일하고, 변경은 고대비 경로에만 나타난다.

- [x] dead 토큰 제거 — `--namu-*` 7개, `--bg-panel-header`, `--bg-canvas`, `--bg-primary`, `--character-color-fallback` (전부 소비처 0 확인 후 제거)
- [x] `:root` 중복 선언 정리 — `--danger-fg`(`#ef4444`→`#dc2626`), `--bg-secondary`(`#f9fafb`), `--bg-hover`. 뒤 선언이 이기고 있었으므로 렌더 결과 유지하고 죽은 앞쪽만 제거
- [x] `--ring-color` 죽은 간접참조 제거 → `--color-ring: var(--accent-bg)`
- [x] `--border-strong` 신설 + `@theme` 매핑 `--color-border-strong`. 7개 테마 조합 전부 정의, 모두 3:1 이상 실측
- [~] `[data-contrast="high"]` — 교정 3건을 넣었다가 **사용자 결정으로 전량 롤백**(대비가 과했음). 아래 상세 참조
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

#### 고대비 — 롤백함 (미해결 부채로 남김)

UI 확인 결과 대비가 과해서 **HEAD 상태로 전량 롤백**했다. 아래 두 버그는 알고도 남겨둔 것이며, 나중에 **더 낮은 강도**로 다시 다룬다.

- **sepia 고대비에 중성 회색이 얹힌다.** `[data-theme="sepia"]`와 `[data-contrast="high"]`가 특이도 1:1이고 후자가 뒤에 와서 이긴다 → 따뜻한 종이 위에 `#333` 글자, `#d4d4d8` 테두리
- **light+cool·light+warm·sepia+cool·sepia+warm에서 고대비가 아예 안 걸린다.** `[data-contrast="high"]`는 특이도 1, `[data-theme][data-temp]`는 2라서 색조 변형이 이긴다. dark는 특이도 2 블록이 있어 영향 없음

재시도 시 방향: 테두리는 `--border-strong`(3:1)이 아니라 `--border-active` 수준으로, 글자는 순검정 대신 theme 색조를 유지한 한 단계 진한 값으로. 특이도 문제는 theme별 분기를 두어야 해결된다.

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

#### 발견: `tailwindcss-animate`가 설치돼 있지 않다

빌드 CSS에서 `animate-in`·`fade-in`·`zoom-in`·`slide-in-from`이 **전부 0건**이다. 패키지가 `package.json`에 없고 `global.css`에 import도 없고 `@utility`/`@keyframes` 정의도 없다.

**즉 20개 파일에 흩어진 `animate-in` / `slide-in-from-left` / `slide-out-to-right` / `fade-in` / `zoom-in-95`가 모두 죽은 클래스다.** `DESIGN.md` §8은 "Enter/exit slides use `tailwindcss-animate`"라고 적고 있는데 사실이 아니다. `global.behaviors.css`의 `flex-grow` transition은 정상 동작하므로 패널 리사이즈 보간만 살아 있고, **열기/닫기 슬라이드·페이드는 실제로 실행되지 않는다.**

- [ ] 결정 필요: `tw-animate-css` 도입 vs 필요한 keyframes만 `@utility`로 직접 정의 vs 클래스 전량 제거
- [ ] 결정 후 `DESIGN.md` §8 수정
- [ ] 어느 쪽이든 `data-animations="off"` / `prefers-reduced-motion` 정책과 함께 설계

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

- [ ] border 알파 방언 수렴 — 현재 `/40 /50 /60 /70 /80` + 무알파 혼재
- [ ] divider 3종(`bg-border/70`, `bg-border/60`, `bg-border`) → 단일 규칙
- [ ] Tailwind 기본 검정 그림자(`shadow-sm`/`shadow-xs`) → `--shadow-panel` 계열. 종이색 위에서 얼룩으로 보인다. 대상: `EditorToolbar.tsx:229,247`, `MainLayout.tsx:529,530`, `ScrivenerLayout.tsx:499`, `menus.tsx:250`
- [ ] `--radius-editor-shell` 중복 하드코딩 제거 — `GoogleDocsLayout.tsx:210` `rounded-[24px]`, `Editor.tsx:381` `rounded-[48px]`
- [ ] `focus-visible` ring을 3:1 이상으로 통일 (WCAG 2.2)
- [ ] **형광펜 대비가 전 theme에서 약하다** (§3에서 이관). `--highlight-default`가 종이 대비 light **1.104** · sepia **1.166** · dark는 `rgba(250,204,21,0.32)` 알파. 형광펜은 은은해야 하지만 1.1은 거의 안 보이는 수준이다. 세 theme 공통 목표(~1.35)를 정하고 함께 조정한다

### 5. Toolbar 표면 / 상태 확정

- [ ] Toolbar 막대가 `bg-transparent` + border/shadow 없음 (`EditorToolbar.tsx:358`). 게다가 `createPortal`로 `document.body`에 붙어 `Ribbon.tsx:37`의 `bg-panel`이 도달하지 못한다. **툴바가 떠 있는 chrome으로 보일 근거가 토큰에 없다**
- [ ] 참조 패턴은 프로젝트 안에 이미 있다 — `EditorBubbleMenu.tsx:67`의 `border border-border bg-surface shadow-panel`
- [ ] `bg-muted/*` 오용 제거. `--color-muted`는 `--text-secondary`(글자색)다. 대상: `EditorToolbar.tsx:213`, `ScrivenerLayout.tsx:368,385,503`, `EditorRuler.tsx:160,169`
- [ ] `EditorRuler.tsx`의 Google Docs 브랜드 블루 `#0b57d0`/`#1a73e8` 4곳 → accent 토큰. 현재 Sepia에서도 파란 핸들이 뜬다
- [ ] `EditorToolbar.tsx:188,190`의 `#111827`/`#FEF08A` 하드코딩 → 토큰/상수 참조
- [ ] 버튼 상태 일관화 — `bg-accent/15`(ToolbarButton) vs `bg-active`(ColorPickerMenu) 불일치, `aria-pressed`/`:active` 스타일 부재

### 6. Editor Layout 인접 표면 정리

- [ ] `.editor-adjacent-surface` 그라디언트 — Light는 양끝이 `#ffffff`/`#f5f5f7`라 둥근 모서리와 border가 붕 뜨고, Sepia는 세 값이 달라 경계가 띠로 보인다
- [ ] `--editor-adjacent-surface` 폴백 부재 (`editor-research-surface`/`editor-ai-surface` 미부착 시 무효값)
- [ ] `bg-[var(--ai-panel-bg)]` arbitrary value → `bg-ai-panel` 유틸 (`MainLayout.tsx:268,573,588`)
- [ ] `h-11` WebkitAppRegion drag 스트립이 배경 없음 — Sepia에서 툴바 hover마다 상단 띠가 점멸한다
- [ ] `GoogleDocsEditorColumn.tsx:115`의 A4 페이지가 `bg-transparent` — 종이면이 자기 배경을 갖지 않는다
- [ ] 모바일 프레임의 하드코딩 정리 — `Editor.tsx:381`의 `rounded-[48px]`(`--radius-editor-shell` 중복)·`border-[#2c2c2e]`·`shadow-[0_0_0_2px_rgba(...)]`. 기기 외형 표현이라 theme을 따르지 않는 건 의도된 것이므로 **토큰화가 아니라 의도를 명시한 scoped token으로 이동**

### 7. Research 카드 / 링크 / active 규칙 수렴

- [ ] `.research-surface`(`global.tokens.css:121`)의 평탄화 범위 축소. 현재 `--bg-surface`/`--bg-element`/`--bg-panel`을 `--bg-research`로 덮고 `--border-default: transparent`까지 만들어서 **Research 안에서는 카드에 배경·테두리를 주는 것이 물리적으로 불가능하다**
- [ ] `EntityGallery.tsx:373`의 `border-black/0 → hover:border-black/70` 제거
- [ ] 캐릭터 템플릿 카드가 `CharacterManager.tsx:81-89`와 `character/CharacterSidebarList.tsx:68-78`에 거의 그대로 복사돼 있다 — 컴포넌트 추출 후보 (§1-B로 표면 문제는 해소됨)
- [ ] active/selected 표현 4개 방언 → 1개로 수렴
  - `bg-active + border-l-accent + text-accent` (`EntitySidebarList.tsx:126`)
  - `bg-active + border-l-accent` (`MemoSidebarList.tsx:57`)
  - `bg-element + text-fg` (`ResearchPanel.tsx:135`)
  - `bg-accent/15 + text-accent` (`WorldPanel.tsx:38`)
- [ ] Link 성격 요소 hover/active 규칙 정의. Research에 `<a>`가 0개이고 `hover:underline`도 0건 — 색 전환만으로 처리되고 있다
- [ ] `TermCard.tsx:24`의 기본 상태 `border-accent/60` → hover에서 `/40`으로 흐려지는 역전 교정
- [ ] `ENTITY_KIND_TINT`(`wiki/visual/constants.ts:5`) 3색 → 테마 토큰화. `${tint}18` 문자열 조합 4곳도 함께
- [ ] `GoogleDocsRightPanel.tsx:393`의 `research-surface bg-[#212123]` 하드코딩 제거

### 8. 회귀 방어

- [ ] `tests/renderer/styles/canvasThemeTokens.test.ts`를 테마 토큰 전반으로 확장 (현재 canvas 범위만)
- [ ] 테마별 대비 임계값 정적 검사 추가 (표면 계단 / border / 텍스트)
- [ ] 하드코딩 색 guard script 추가 (`scripts/check-*` 패턴) — 현재 Tailwind 기본 팔레트 직접 사용 86건, 그중 75건이 `ExportPreviewPanel.tsx` 한 파일
- [ ] `src/renderer/src/styles/components/editor.css.bak` 정리
- [ ] `global.tokens.css` 모듈 분할 (파일 상단에 `/* 모둘화 필요 */` 주석 존재, 764줄)
