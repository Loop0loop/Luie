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

### 1. 토큰 레이어 정리 ✅

팔레트 값은 건드리지 않는다. 구조만 정리하며 **시각적 변화 없음**을 목표로 한다.

- [x] dead 토큰 제거 — `--namu-*` 7개, `--bg-panel-header`, `--bg-canvas`, `--bg-primary`, `--character-color-fallback` (전부 소비처 0)
- [x] `:root` 중복 선언 정리 — `--danger-fg`, `--bg-secondary`, `--bg-hover`가 같은 블록에서 두 번 선언됨
- [x] `--ring-color` 죽은 간접참조 제거 (`--color-ring: var(--ring-color, var(--accent-bg))` → 직접 참조)
- [x] `--border-strong` 신설 + `@theme` 매핑. WCAG 1.4.11이 3:1을 요구하는 실제 UI 경계(입력·토글·체크박스)용. 장식용 구분선을 3:1로 올리면 grid prison이 되므로 역할을 분리한다
- [x] `[data-contrast="high"]`에 sepia 분기 추가 — 현재 `data-theme` 한정이 없어 Sepia 고대비에서 종이 위에 회색(`#333`/`#d4d4d8`)이 뜬다
- [x] `--editor-bg` / `--editor-text` 소비처 연결 — 9개 테마 변형에서 `--bg-app`/`--text-primary`와 값이 완전히 중복. alias로 전환하고 `editor.css`가 실제로 참조하게 한다

### 2. Light 팔레트 재조정

흰색이 틀린 게 아니라 **카드와 컨테이너가 둘 다 흰색인 게 틀렸다.** 컨테이너는 내려가고 콘텐츠 면은 올라간다. 입력·칩은 Light/Sepia에서 오목하게, Dark에서 볼록하게 — 방향이 테마마다 다른 것이 정상이다.

검증된 후보값:

```
app #ffffff(에디터 종이) · sidebar #f1f1f4 · research #f6f6f8
surface/panel #ffffff(카드 = research 위에서 1.08:1 + 테두리) · element #f5f5f8(오목한 입력)
border #dcdce2 · text-tertiary #75757e (3.34 → 4.56:1)
```

- [ ] 표면 계단 재정의 (app / sidebar / research / panel / surface / element / ai-panel)
- [ ] `--text-tertiary` 4.5:1 확보
- [ ] border 3단계 값 확정
- [ ] `data-temp` cool/warm 변형 동기화
- [ ] 대비 실측 재검증

### 3. Sepia 팔레트 재조정

종이색(`--bg-app: #fbf2e2`)은 시그니처라 유지한다.

검증된 후보값:

```
app #fbf2e2(종이 유지) · sidebar #efe1c5 · research #f6ecd7
surface/panel #fefaf0(종이보다 밝게 = 떠 있음) · element #f4e9d3(오목)
border #dcc6a0 (1.33 → 1.60:1) · text-tertiary #8d7454 (2.82 → 3.97:1)
```

- [ ] 표면 계단 재정의
- [ ] `--text-tertiary` 대비 확보
- [ ] `--editor-selection: #b7d5f5`(파란 선택색) → brass accent 계열로 교정
- [ ] `--highlight-default: #f2e2a6`가 종이 위에서 1.06:1 — 형광펜이 안 보인다
- [ ] `data-temp` cool/warm 변형 동기화
- [ ] 대비 실측 재검증

### 4. border / outline / shadow 규칙 통일

- [ ] border 알파 방언 수렴 — 현재 `/40 /50 /60 /70 /80` + 무알파 혼재
- [ ] divider 3종(`bg-border/70`, `bg-border/60`, `bg-border`) → 단일 규칙
- [ ] Tailwind 기본 검정 그림자(`shadow-sm`/`shadow-xs`) → `--shadow-panel` 계열. 종이색 위에서 얼룩으로 보인다. 대상: `EditorToolbar.tsx:229,247`, `MainLayout.tsx:529,530`, `ScrivenerLayout.tsx:499`, `menus.tsx:250`
- [ ] `--radius-editor-shell` 중복 하드코딩 제거 — `GoogleDocsLayout.tsx:210` `rounded-[24px]`, `Editor.tsx:381` `rounded-[48px]`
- [ ] `focus-visible` ring을 3:1 이상으로 통일 (WCAG 2.2)

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

### 7. Research 카드 / 링크 / active 규칙 수렴

- [ ] `.research-surface`(`global.tokens.css:121`)의 평탄화 범위 축소. 현재 `--bg-surface`/`--bg-element`/`--bg-panel`을 `--bg-research`로 덮고 `--border-default: transparent`까지 만들어서 **Research 안에서는 카드에 배경·테두리를 주는 것이 물리적으로 불가능하다**
- [ ] `EntityGallery.tsx:373`의 `border-black/0 → hover:border-black/70` 제거
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
