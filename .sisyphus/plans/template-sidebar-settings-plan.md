# Template / Sidebar / Settings Execution Plan (Ultrawork + TDD)

## 0) Objective

Deliver a production-safe fix set for the reported issues in:

1. **Template selector**
   - web novel / screenplay templates locked to dark visuals
   - template title text becomes white on hover
   - sync button visibility is poor
2. **Sidebar / Research navigation**
   - character/faction/event clicks occasionally require multiple attempts
   - missing i18n for `research.title.events` / `research.title.factions`
   - project rename from sidebar does not visibly update
   - missing back button in template flow
3. **Settings modal (font)**
   - no real system-font option list
   - font selection/apply behavior is unreliable

Primary constraints:

- keep type safety strict
- preserve existing behavior outside requested scope
- implement with TDD-first checkpoints

---

## 1) Confirmed scope and files

### Template / project selector

- `src/renderer/src/features/workspace/components/project-selector/TemplateGrid.tsx`
- `src/renderer/src/features/workspace/components/project-selector/RecentProjectsSection.tsx`
- `src/renderer/src/features/workspace/components/ProjectTemplateSelector.tsx`

### Sidebar / research interaction

- `src/renderer/src/features/manuscript/components/Sidebar.tsx`
- `src/shared/ui/DraggableItem.tsx`
- `src/renderer/src/features/manuscript/components/useSidebarLogic.ts`

### i18n

- `src/renderer/src/i18n/locales/en/base.ts`
- `src/renderer/src/i18n/locales/ko/base.ts`
- `src/renderer/src/i18n/locales/ja/base.ts`

### Settings fonts

- `src/renderer/src/features/settings/components/tabs/EditorTab.tsx`
- `src/renderer/src/features/editor/components/FontSelector.tsx`
- `src/renderer/src/features/editor/hooks/useEditorConfig.ts`
- `src/renderer/src/features/editor/stores/editorStore.ts`
- `src/shared/types/index.ts`
- `src/shared/schemas/index.ts`

---

## 2) Root-cause model

1. **Template dark lock / hover white**: hardcoded zinc/hex colors and `group-hover:text-white` in template cards.
2. **Sync button visibility**: fixed white/gray palette in `RecentProjectsSection` not aligned to app theme tokens.
3. **Sidebar click unreliability**: draggable wrapper listeners attached at root can conflict with nested click target behavior.
4. **Missing i18n labels**: `research.title.events` and `research.title.factions` are absent in locale trees.
5. **Rename appears not applied**: async update succeeds but current visible state may not refresh consistently in all paths.
6. **System font options missing**: current font model supports only preset family union (`system-ui|serif|mono` + preset/custom), no enumerated system font list.
7. **Font selection not reliably applied**: model/schema/UI path mismatch between selected value and persisted value can lead to fallback behavior.

---

## 3) TDD-oriented implementation plan

## Phase A — Template visual and navigation fixes

### A1. Add/adjust tests first

- Add focused test(s) for template card class/token behavior and hover label class regression.
- Add focused test for template back button render + action callback.

**Expected failing condition before code fix**

- dark-specific classes still present
- back button absent

### A2. Implement template theming fixes

- Replace hardcoded dark color classes in `TemplateGrid.tsx` with semantic tokens.
- Remove `group-hover:text-white` and use token-safe hover text classes.

### A3. Implement sync button visibility fixes

- Update connect/disconnect button classes in `RecentProjectsSection.tsx` to theme-safe semantic token classes.

### A4. Implement back button in template area

- Add deterministic back CTA in template UI and wire to parent state/action in `ProjectTemplateSelector.tsx` as needed.

**QA scenario**

- Light / sepia / dark: card previews readable, hover labels readable, sync buttons visible.
- Back button returns to expected previous context.

---

## Phase B — Sidebar reliability + i18n + rename propagation

### B1. Add failing tests first

- Add interaction test to assert single click on research item triggers selection consistently.
- Add i18n key coverage test for events/factions labels.
- Add rename flow test to assert updated title appears after rename action.

### B2. Fix click reliability

- Refactor `DraggableItem` interaction boundary (handle-based drag or controlled listener attachment).
- Ensure menu-button click and research-item click do not conflict.

### B3. Add missing i18n keys

- Add `research.title.events`, `research.title.factions` to en/ko/ja locale files.

### B4. Fix sidebar rename propagation

- Ensure `handleRenameProject` path results in immediate visible title update in active sidebar context.
- If needed, trigger explicit project reload/sync after update completion.

**QA scenario**

- 20 repeated single clicks on each research item open on first click.
- Language switch en/ko/ja displays events/factions correctly.
- Rename from sidebar updates instantly and survives reload.

---

## Phase C — Settings font system integration

### C1. Add failing tests first

- Add config/store tests for persisted font value path (preset/system/custom).
- Add `useEditorConfig` test for computed CSS family output for each source.

### C2. Extend type/schema model safely

- Update `FontFamily` model to support system-font selections without breaking existing values.
- Update editor settings schema accordingly with backward compatibility.

### C3. Add system-font options loader

- Implement options provider using `window.queryLocalFonts` when available.
- Fallback to safe preset list when unsupported.

### C4. Apply in Settings modal and editor selector

- Integrate system font options into `EditorTab` and align with `FontSelector` behavior.
- Ensure selecting a font updates store and editor rendering immediately.

### C5. Persistence verification

- Confirm selected font survives settings save/load and app restart.

**QA scenario**

- System font appears in options list (or graceful fallback message).
- Selected font visibly applies in editor and remains after restart.

---

## 4) Atomic commit strategy

1. **commit A**: Template theming tokenization (`TemplateGrid` + tests)
2. **commit B**: Sync button visibility improvements (`RecentProjectsSection` + tests)
3. **commit C**: Template back button (`TemplateGrid`/`ProjectTemplateSelector` + tests)
4. **commit D**: Sidebar click reliability (`DraggableItem`/`Sidebar` + tests)
5. **commit E**: i18n additions (`en/ko/ja` keys) + key coverage test
6. **commit F**: Sidebar rename propagation fix (`useSidebarLogic`/store sync) + tests
7. **commit G**: Font model/schema extension (`shared/types`, `shared/schemas`) + tests
8. **commit H**: System font option provider + EditorTab integration + tests
9. **commit I**: FontSelector alignment + persistence verification tests

Each commit must keep `typecheck` and `build` green.

---

## 5) Verification protocol

Per phase:

1. run targeted tests for changed area
2. `bun run typecheck`
3. `bun run build`

Final pass:

- run all newly added targeted tests in one command
- re-run `typecheck` and `build`

---

## 6) Risk handling

1. **Drag behavior regression**
   - Mitigation: protect existing chapter drag behavior with explicit interaction tests.
2. **Schema migration breakage**
   - Mitigation: backward-compatible schema update and fallback defaults.
3. **Browser API variance for fonts**
   - Mitigation: robust feature detection + fallback list + no-throw code path.
4. **Theming regressions**
   - Mitigation: semantic class usage only, avoid hardcoded hex except brand icon glyph paths.

---

## 7) Done criteria

- Template previews are theme-consistent in light/sepia/dark.
- Hover text remains readable and not forced white.
- Sync/auth button contrast is clear in all themes.
- Research items open reliably on first click.
- `research.title.events` and `research.title.factions` resolve in en/ko/ja.
- Sidebar project rename updates immediately and persists.
- Template flow has a functioning back button.
- Settings shows usable system-font options (or explicit fallback) and selected font applies/persists.
- Targeted tests + `bun run typecheck` + `bun run build` pass.
