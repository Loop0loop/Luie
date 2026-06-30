# Luie — Design System (DESIGN.md)

> Single source of truth for Luie's visual & interaction design. Every rule here
> is grounded in this repository's code (file paths cited inline). External
> references are folded in where they shaped a decision. Written so an agent
> (Codex/Claude) can reproduce Luie's look without guessing.
>
> **Golden rule:** never hardcode a color, radius, font, or z-index. Consume the
> tokens. If a value isn't a token yet, add it to
> [`global.tokens.css`](src/renderer/src/styles/global.tokens.css) first.

---

## 1. What Luie is, visually

Luie is an Electron desktop **writing app** (novel/worldbuilding). The design
intent is encoded directly in the token comments:

- A **"recessed editor" model** (see [`global.tokens.css:231`](src/renderer/src/styles/global.tokens.css)):
  the editor is the dark focal writing surface; the chrome (sidebar, toolbar,
  footer) sits **one calm step lighter** as the frame. In light themes it
  inverts — the editor is paper, the chrome is a slightly tinted frame.
- **Calm, neutral, professional.** Zinc neutral scale, a single blue brand
  accent, no pure black, subtle cool tint in dark (pure greys "read drab"). The
  comments explicitly calibrate against **Notion, Linear, Vercel, Tokyo Night,
  Gruvbox, Everforest, Solarized**.
- **Writer-focused.** A dedicated Sepia ("warm paper") theme exists for long-form
  writing comfort, plus serif font support (KoPub Batang etc.).
- **App-like, not web-like.** `body { overflow: hidden }`
  ([`global.behaviors.css:21`](src/renderer/src/styles/global.behaviors.css)); the
  whole surface is a fixed-viewport workspace of resizable panels, not a
  scrolling document.

Design north star: **the writing surface is sacred; chrome recedes.** When in
doubt, lower the contrast/visual weight of chrome and raise it on content.

---

## 2. Theming architecture

Luie uses **Tailwind CSS v4** with a CSS-first config (there is **no**
`tailwind.config.js` — it was removed). The wiring lives in
[`global.css`](src/renderer/src/styles/global.css):

```css
@import "tailwindcss";
@import "./global.tokens.css";       /* tokens + @theme */
@import "./global.behaviors.css";    /* base element styles + motion */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

### Two-layer token model

1. **Raw tokens** — `--bg-app`, `--text-primary`, `--accent-bg`, … defined on
   `:root` and **redefined per theme** via attribute selectors.
2. **Tailwind `@theme` aliases** — map raw tokens to utility namespaces so
   `bg-app`, `text-fg`, `border`, `text-accent`, etc. become real classes
   ([`global.tokens.css:1-72`](src/renderer/src/styles/global.tokens.css)).

Because utilities resolve to `var(--raw-token)`, **switching a theme attribute
re-themes the entire app instantly** with no class changes.

### Theme is driven by HTML attributes (runtime, user-selectable)

| Attribute | Values | Effect |
|---|---|---|
| `data-theme` | `light` (default) · `dark` · `sepia` | Full palette swap |
| `data-temp` | `cool` · `warm` (neutral = unset) | Re-tints only the bg ladder + primary text |
| `data-contrast` | `high` (unset = normal) | Stronger text + borders (a11y) |
| `data-animations` | `on` · `off` | Master motion switch (see §8) |
| `data-layout-restoring` | `true` while panels reflow | Suppresses transitions during programmatic layout |

`data-temp` × `data-theme` produces a matrix (e.g. `dark+cool` ≈ Tokyo Night,
`light+warm` ≈ Solarized Light, `sepia+warm` = deep amber paper). Structure never
changes across temperatures — only the background ladder and text.

> **External alignment:** the Vercel _Web Interface Guidelines_ require honoring
> contrast and reduced-motion. Luie implements both as first-class user controls
> (`data-contrast="high"`, `data-animations="off"`) rather than relying only on
> OS media queries — see §8 for the reduced-motion gap to close.

---

## 3. Color system

**Always use the semantic utility, never the raw hex.** The raw values exist
only so themes can redefine them.

### Semantic surfaces (the "recessed" ladder)

| Token / utility | Light | Dark (neutral) | Sepia | Role |
|---|---|---|---|---|
| `bg-app` | `#ffffff` | `#1a1a1c` | `#fbf0d9` | Editor / main canvas (focal) |
| `bg-sidebar` | `#f4f4f5` | `#212123` | `#f5e6cc` | Chrome frame (one step off app) |
| `bg-panel` | `#ffffff` | `#28282b` | `#fbf0d9` | Floating surfaces (modal/inspector/dropdown) |
| `bg-surface` | `#ffffff` | `#28282b` | `#fffefb` | Cards / inputs / popovers |
| `bg-element` | `#ffffff` | `#313135` | `#fffefb` | Top-of-stack controls/inputs |
| `bg-surface-hover` / `bg-active` | alpha black | alpha white | alpha brown | Hover/active overlays (alpha, not solid) |

**Hover/active are alpha overlays** (`rgba(0,0,0,0.04)` light, `rgba(255,255,255,0.08)`
dark), Vercel-style — so they compose over any surface. Don't invent solid hover
colors.

### Text

| Utility | Light | Dark | Role |
|---|---|---|---|
| `text-fg` | `#18181b` | `#d7d7da` | Primary |
| `text-muted` | `#71717a` | `#989aa2` | Secondary |
| `text-subtle` | `#a1a1aa` | `#6c6e77` | Tertiary / placeholder |
| `text-accent` | `#2563eb` | `#60a5fa` | Links / interactive |

### Brand + semantic

- **One accent only:** blue (`--accent-bg #2563eb`). Alternate accent swatches
  were deliberately removed ([`global.behaviors.css:2`](src/renderer/src/styles/global.behaviors.css)).
  In Sepia the accent becomes warm orange `#cc7832`.
- `--success-fg` green, `--danger-fg` red, `--accent-fg` (`on-accent`) white.
- Borders: `border` (`--border-default`), `border-active`, `border-focus`. In
  dark, borders are **white at 8% opacity** — "enough for definition, not a grid
  prison" ([`global.tokens.css:266`](src/renderer/src/styles/global.tokens.css)).
- **Wiki** ("Namuwiki") tokens are aliased to core tokens so the wiki shares
  Luie's single palette — never give the wiki its own colors.

---

## 4. Typography

Font stacks ([`global.tokens.css:198-206`](src/renderer/src/styles/global.tokens.css)),
Korean-first:

- `--font-sans`: `-apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", Roboto …`
- `--font-serif`: `"KoPub Batang", "Noto Serif KR", "Nanum Myeongjo", Merriweather, Georgia …` (long-form writing)
- `--font-mono`: `"D2Coding", "NanumGothicCoding", ui-monospace, Menlo …`

`body` enables ligatures + contextual alternates and antialiasing
([`global.behaviors.css:6-22`](src/renderer/src/styles/global.behaviors.css)):
`font-feature-settings: "liga" 1, "calt" 1`, `-webkit-font-smoothing: antialiased`,
`text-rendering: optimizeLegibility`.

Type scale is **context-scoped via CSS variables**, not a global ramp — e.g.
`--context-panel-body-font-size: 13px`, `--memo-tag-font-size: 9px`,
`--world-overview-font-size: 14px`. When building a feature, prefer a
feature-scoped size token over an inline `text-[13px]`.

`--font-weight-semibold: 600` is the heaviest UI weight; chrome text is 500.

---

## 5. Spacing, radius, shadow, z-index

From the `@theme` block ([`global.tokens.css:55-85`](src/renderer/src/styles/global.tokens.css)):

| Token | Value | Use |
|---|---|---|
| `--radius-control` (`rounded-control`) | `0.625rem` (10px) | Buttons, inputs, small controls |
| `--radius-panel` (`rounded-panel`) | `0.875rem` (14px) | Panels, cards, dialogs |
| `--shadow-panel` | `0 10px 28px rgba(15,23,42,.14)` | Floating panels |
| `--shadow-sm/md/lg` | standard ramp | Elevation |
| `--spacing-control-x / -y` | `0.75rem` / `0.5rem` | Control padding |
| `--spacing-panel-pad` | `1.25rem` | Panel inner padding |
| `--spacing-panel-gap` | `1rem` | Gap between panel items |

**Z-index is a 4-step named scale** — do **not** reintroduce ad-hoc
`z-[9999]`. Use the `@utility` classes:

| Utility | Value | Layer |
|---|---|---|
| `z-dropdown` | 50 | context menus, popovers, tooltips |
| `z-banner` | 100 | sticky top banners (offline) |
| `z-toast` | 150 | transient notifications |
| `z-modal` | 1000 | full-surface dialogs + floating panels |

Fixed app dimensions: `--header-height: 48px`, `--sidebar-width: 260px`,
`--panel-width: 320px`.

---

## 6. Icons

- Library: **lucide-react** (e.g. `PanelLeftClose`, `PanelRightOpen` in
  [`MainLayout.tsx`](src/renderer/src/features/workspace/components/layout/MainLayout.tsx)).
- Sizes are tokenized (`--icon-size-xs 12 → -xxxl 32`) with `.icon-xs … .icon-xxxl`
  utility classes ([`global.behaviors.css:24-58`](src/renderer/src/styles/global.behaviors.css)).
  Toolbar icons are 16px (`--editor-toolbar-icon-size`).
- **Icon-only buttons must carry `aria-label`** (and `title`) — see the sidebar
  toggles in `MainLayout.tsx` for the pattern. This is also a hard rule in the
  Vercel guidelines.

---

## 7. Layout system (the defining structure)

Luie has **four top-level layouts**, selected by app mode, all built on
**`react-resizable-panels` v4** (`Group` / `Panel` / `Separator` API):

| Layout | File | Shape |
|---|---|---|
| **Main** (default) | [`MainLayout.tsx`](src/renderer/src/features/workspace/components/layout/MainLayout.tsx) | Sidebar │ Editor │ Binder (context) |
| **Editor** | `EditorRoot.tsx` | Focused editor variant |
| **Google Docs** | `GoogleDocsLayout.tsx` | Doc-style with right rail |
| **Scrivener** | `ScrivenerLayout.tsx` | Sidebar │ Editor split │ Inspector |

### The three-region model (Main)

```
┌──────────┬───────────────────────────┬──────────┐
│ sidebar  │        main-content        │  context │
│ (left,   │   (editor; nested split    │ (binder; │
│ collaps- │    group for split view)   │ right,   │
│ ible)    │                            │ collaps- │
│          │                            │ ible)    │
└──────────┴───────────────────────────┴──────────┘
   one `main-layout-group` (horizontal, %-based)
```

Key, non-obvious layout rules learned from this codebase (uphold them):

- **One horizontal `PanelGroup` holds all three panels.** Both end panels
  (`sidebar-panel`, `context-panel`) are `collapsible collapsedSize={0}`; the
  middle (`main-content-panel`) is the flex absorber. Dragging a separator must
  only move the adjacent pair — the middle absorbs the delta.
- **Sizes persist as ratios/px in the UI store**, keyed by *surface*
  (`default.sidebar`, `default.panel`, …) — see
  [`layoutSizing.ts`](src/renderer/src/shared/constants/layoutSizing.ts) and
  [`useLayoutPersist.ts`](src/renderer/src/features/workspace/hooks/useLayoutPersist.ts).
  Sidebar and binder use **different keys** — they are not coupled state.
- **Open/close uses a presence hook**
  ([`useResizablePanelPresence.ts`](src/renderer/src/features/workspace/hooks/useResizablePanelPresence.ts))
  that drives the panel imperatively and exposes `isOpening`/`isClosing`/`shouldRender`.
- **Research/inner sidebars** use a fixed-pixel layout hook
  ([`useFixedPixelPanelGroupLayout.ts`](src/renderer/src/features/workspace/hooks/useFixedPixelPanelGroupLayout.ts)):
  the sidebar holds a fixed px width, the content panel flexes. Their widths
  persist **per feature** (`characterSidebar`, `eventSidebar`, …) and only
  **user drags** persist — programmatic relayouts must not write width (guarded
  via `data-layout-restoring`, see
  [`useSidebarResizeCommit.ts`](src/renderer/src/features/workspace/hooks/useSidebarResizeCommit.ts)).

---

## 8. Motion & animation

Motion is **globally gated by attributes**, not scattered media queries
([`global.behaviors.css:65-89`](src/renderer/src/styles/global.behaviors.css)):

- `html[data-animations="off"] *` → all `animation-duration` / `transition-duration`
  forced to `0ms`. This is a **user setting** (Settings → Appearance → 애니메이션).
- `html[data-layout-restoring="true"] *` → same kill-switch **while panels are
  being programmatically laid out**, so reflow never animates/flickers.
- **Panel resize transition** is opt-in per element:
  `html[data-animations="on"] [data-panel][data-panel-animated="true"]`
  transitions **only** `flex-basis, flex-grow, width, max-width` over `200ms`
  `cubic-bezier(0.2,0,0,1)`. Critically, `data-panel-animated` is gated so it is
  **off during an active separator drag** (otherwise the eased flex writes make
  the opposite panel visibly drift). Enter/exit slides use
  `tailwindcss-animate` (`animate-in slide-in-from-left`, `slide-out-to-right`),
  applied only during the opening/closing window.

**Standard duration: 200ms.** Standard easing: `cubic-bezier(0.2,0,0,1)`
(decelerate). Match these.

> **External alignment & the one gap to close:** the Vercel guidelines say
> *animate `transform`/`opacity` only*, *never `transition: all`*, *honor
> `prefers-reduced-motion`*. Luie already lists properties explicitly (never
> `all`) and has a master off-switch — **but it keys off the in-app
> `data-animations` flag, not the OS `prefers-reduced-motion` media query.**
> When adding motion, also respect `@media (prefers-reduced-motion: reduce)` so
> OS-level users are covered without toggling the in-app setting.

---

## 9. Component conventions (how to build UI in Luie)

Do:

- **Compose semantic utilities**: `bg-panel`, `bg-surface-hover`, `text-fg`,
  `text-muted`, `border border-border`, `rounded-control`, `rounded-panel`,
  `shadow-panel`, `z-dropdown`. These already theme correctly.
- **Hover/active/focus must raise contrast** above rest (guideline + Luie's alpha
  overlays). Every interactive element needs a visible `hover:` and a
  `focus-visible:` ring (`--color-ring` → accent).
- **Icon buttons**: `aria-label` + `title`; use the `MainLayout` toggle buttons as
  the canonical example.
- **Dark mode**: use the `dark:` variant (wired to `[data-theme="dark"]`) or just
  let tokens cascade — prefer token cascade.
- **Per-feature sizing tokens** over inline pixel values.

Don't:

- ❌ Hardcode hex / `rgb()` in components — breaks 6 theme combinations.
- ❌ `z-[9999]` or new magic z-indices — use the named scale.
- ❌ `transition: all` / `transition-all` — list properties (matches the
  `data-panel-animated` rule).
- ❌ Solid hover backgrounds — use the alpha `bg-surface-hover` / `bg-active`.
- ❌ Give the wiki/binder/any feature a private color palette.
- ❌ `outline-none` without a `focus-visible` replacement.

---

## 10. State & persistence that shapes design

- **Zustand** is the only state lib. UI/layout state lives in the workspace
  `uiStore` (persisted, versioned, zod-validated, migrated — see
  [`uiStore.persist.ts`](src/renderer/src/features/workspace/stores/uiStore.persist.ts)).
- **Theme/appearance** (`data-theme`, `data-temp`, `data-contrast`,
  `enableAnimations`) is user state persisted across sessions and applied as the
  HTML attributes above. Treat these attributes as the rendering contract.
- **Panel widths, collapsed state, open/closed** all persist (globally and
  per-project). Respect the rule: *only user interaction writes layout state;
  programmatic relayout must not.*

---

## 11. Accessibility checklist (Luie + Vercel Web Interface Guidelines)

External source: **Vercel Web Interface Guidelines**
(`https://github.com/vercel-labs/web-interface-guidelines`). Apply on every UI
change:

- [ ] Interactive elements are real `<button>`/`<a>` (no clickable `<div>`/`<span>`).
- [ ] Icon-only controls have `aria-label`; inputs have associated `<label>`.
- [ ] Visible `hover:` **and** `focus-visible:` states; states increase contrast.
- [ ] No `outline-none` without a focus-visible ring.
- [ ] Motion: `transform`/`opacity` only, explicit properties, honors **both**
      `data-animations="off"` and `prefers-reduced-motion`.
- [ ] Animations are interruptible (the presence hook already supports this).
- [ ] Contrast holds in all themes; verify `data-contrast="high"`.
- [ ] Touch/drag: disable text selection during drag; `touch-action: manipulation`
      on tappable controls.
- [ ] Large lists (>50) virtualized; no `getBoundingClientRect`/`offsetHeight`
      reads during render.
- [ ] Dates/numbers via `Intl.*`, not hardcoded formats.

---

## 12. Quick reference — tokens at a glance

```text
SURFACES   bg-app  bg-sidebar  bg-panel  bg-surface  bg-element
OVERLAYS   bg-surface-hover  bg-active            (alpha, compose over surfaces)
TEXT       text-fg  text-muted  text-subtle  text-accent  text-on-accent
BRAND      accent (blue #2563eb / sepia #cc7832)  success  danger
BORDER     border  border-active  border-focus
RADIUS     rounded-control (10px)  rounded-panel (14px)
SHADOW     shadow-sm/md/lg  shadow-panel
Z-INDEX    z-dropdown 50 · z-banner 100 · z-toast 150 · z-modal 1000
MOTION     200ms  cubic-bezier(0.2,0,0,1)  · gated by data-animations / data-layout-restoring
FONTS      --font-sans (KR-first) · --font-serif (writing) · --font-mono
THEME ATTRS data-theme · data-temp · data-contrast · data-animations
```

**If you remember one thing:** Luie themes through tokens + HTML attributes.
Consume `bg-app`/`text-fg`/`rounded-panel`/`z-modal`; never hardcode. The editor
is the focal surface; chrome recedes one calm step.
