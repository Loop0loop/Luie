# DoD: Settings Upgrade (i18n + Shortcuts + Recovery)

## Scope
- Add full-app i18n with `react-i18next` (ko/ja/en).
- Convert all `.tsx` UI strings to i18n (`t()` calls).
- Translate shared constants (`messages`, `characterTemplates`).
- Implement cross-platform shortcuts (mac/win/linux) with defaults and customization.
- Add file recovery using `.db` + `.db-wal` under OS userData path.
- Fix lint/type issues introduced by new work.

---

## Phase 0 - Discovery
- [ ] Confirm current SettingsModal tabs and existing constants usage.
- [ ] Identify all user-facing strings and map to translation keys.
- [ ] Locate DB path, WAL usage, and current recovery mechanisms.

## Phase 1 - i18n Infrastructure
- [ ] Add `react-i18next` + `i18next` + language detector.
- [ ] Create i18n bootstrap (init, default language, fallback).
- [ ] Add translation resources for `ko`, `ja`, `en`.
- [ ] Replace shared constants text with translation keys.
- [ ] Convert all `.tsx` UI strings to `t()`.
- [ ] Translate `shared/constants/messages.ts` + `shared/constants/characterTemplates.ts`.
- [ ] Persist selected language in settings store.

### DoD
- [ ] Language changes in Settings immediately update UI.
- [ ] No missing translation keys at runtime.
- [ ] Fallback language works if key is missing.
- [ ] App restarts keep last selected language.
- [ ] All `.tsx` UI strings come from i18n.
- [ ] Shared constants text mapped to translation keys.

## Phase 2 - Shortcuts System
- [ ] Define default shortcuts per OS (mac/win/linux).
- [ ] Add settings schema + persistence for shortcuts.
- [ ] Implement runtime registration + conflict validation.
- [ ] Build UI in SettingsModal to view/edit shortcuts.

### DoD
- [ ] OS-specific defaults applied on first run.
- [ ] User edits persist and re-register without restart.
- [ ] Conflicts are detected and shown to user.

## Phase 3 - File Recovery (.db + .wal)
- [ ] Add recovery service to inspect `luie.db` + `luie.db-wal`.
- [ ] Implement repair flow: backup current DB, apply WAL recovery, validate.
- [ ] Add SettingsModal "파일 복원" UI with status + logs.
- [ ] Provide safe dry-run and confirm dialog.

### DoD
- [ ] Recovery runs using userData path per OS.
- [ ] Backups created before any recovery.
- [ ] Clear success/failure message shown to user.
- [ ] No data loss on failure (rollback to backup).

## Phase 4 - QA & Cleanup
- [ ] TypeScript and ESLint pass.
- [ ] Manual smoke test: language switch, shortcut change, recovery action.
- [ ] Update README or docs only if user requests.

---

## Acceptance
- [ ] i18n fully functional across the app.
- [ ] Shortcuts configurable and OS-aware.
- [ ] Recovery available and safe.
- [ ] No lint/type errors.
