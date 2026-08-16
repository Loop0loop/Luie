# Renderer AGENTS.md

이 문서는 `src/renderer/**` 작업 전에 반드시 읽는다. 하위 디렉터리에 더 구체적인 `AGENTS.md`가 있으면 그 규칙도 함께 따른다.

## Scope

- Electron renderer process only.
- UI, React components, Zustand stores, hooks, renderer services, styles, i18n, and feature modules live under `src/renderer/src/**`.
- Desktop capability access must go through preload contracts. Do not import Node or Electron APIs directly from renderer code.

## Required References

- Visual/design system: `DESIGN.md`
- Frontend/CSS hard rules: `docs/quality/frontend-css-agents.md`
- Feature map: `src/renderer/src/features/AGENTS.md`

## Architecture

- Keep feature-first boundaries. Prefer `src/renderer/src/features/<domain>/**` for domain code.
- Use `@renderer/*` and `@shared/*` aliases. Avoid fragile relative paths across domains.
- Shared renderer UI belongs in `@shared/ui` only when it is genuinely reusable.
- Do not deep-import another feature’s internals unless there is no shared contract and the dependency is already established locally.
- Keep component files under 300 LOC where practical. If UI, store access, model conversion, editor runtime, and visual chrome mix in one file, split it.

## React Rules

- Hooks only at component/custom-hook top level.
- Do not call hooks conditionally or inside callbacks, loops, `useMemo`, `useEffect`, or `try/catch`.
- `useEffect` is for external synchronization only. Derived values should be computed during render.
- Keep state minimal. Do not store values that can be derived from props/state.
- Do not mutate object or array state directly.
- `useMemo` and `useCallback` are not default tools. Use them only when identity or expensive computation is proven relevant.
- Rendering must stay pure. No store writes, DOM writes, timers, or global mutation during render.

## Styling Rules

- Tailwind utility classes are the default for component styling.
- Use `DESIGN.md` semantic tokens: `bg-app`, `bg-sidebar`, `bg-panel`, `bg-surface`, `bg-element`, `text-fg`, `text-muted`, `text-subtle`, `border-border`, `rounded-control`, `rounded-panel`.
- Custom CSS is allowed for global rules, tokens, keyframes, markdown/content styling, pseudo-elements, and third-party internal DOM such as ProseMirror or ReactFlow.
- Scope custom CSS under a feature root class. Do not write broad global selectors for feature UI.
- No `!important`.
- No hardcoded colors.
- No arbitrary z-index. Use project z-index utilities.
- No dynamic Tailwind class construction such as `bg-${color}-500`; use explicit maps.
- Inline `style` is only for runtime data values such as graph coordinates, dynamic node color, and SVG stroke.
- If `outline-none` is used, an equivalent `focus-visible` state must exist.

## UX / A11y

- Use semantic HTML first: `button`, `a`, `input`, `label`, heading, list.
- Icon-only buttons need `aria-label` and `title`.
- Keyboard access is required for interactive UI.
- Focus must be visible and not hidden behind panels/popovers.
- Do not communicate state by color alone.
- Loading, empty, error, disabled, saving/saved states must be designed for user-facing flows.
- Prefer role/name based tests for UI behavior.

## Renderer Boundaries

- Renderer must not import from `src/main/**` or use Electron/Node directly.
- IPC additions require shared channel/types, main handler, preload API, and renderer usage to stay aligned.
- Keep heavy graph/editor/layout work out of render where possible.
- Persist drag/resize/layout updates on commit/end events, not every paint, unless explicitly required.

## Canvas-Specific Notes

- Canvas UI must feel like Luie’s writing/worldbuilding workspace, not a clone of another app.
- ReactFlow node/edge internals may use scoped CSS, but first try ReactFlow props/className and Tailwind.
- Do not use `!important` to fight ReactFlow styles. If a style cannot be applied cleanly, adjust component structure or isolate a feature root selector.
- Canvas document/editor code should stay split by role: shell view, chrome, editor runtime, model helpers, store hook.

## Verification

- Run `pnpm run typecheck` after renderer changes when the worktree is not blocked by unrelated main-process errors.
- If typecheck fails outside the renderer files touched, report the blocker with exact paths.
- For UI behavior changes, prefer targeted DOM/Vitest checks where existing tests exist.
- Before finalizing, search changed renderer files for: `!important`, hardcoded hex colors, `rgba(`, `z-[`, dynamic class construction, and `console.warn/log`.
