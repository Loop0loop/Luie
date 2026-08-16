# Task 16 Report — project scope and quit ACK integrity

## SSOT

- Plan: `docs/superpowers/plans/2026-07-18-save-integrity.md` Task 16
- Design: `docs/superpowers/specs/2026-07-18-save-integrity-design.md` §20

## Implemented contract

- Plot/Synopsis snapshot을 originating project id/path에 고정하고 A ACK 뒤 B를 직렬 drain한다.
- 동일 field id의 buffered input도 project scope 전환 시 old callback으로 unmount flush한다.
- 신규 scope는 hydration 전 편집을 잠그며 generation과 load-start pending snapshot으로 stale load를 차단한다.
- component unmount 뒤 failed parent mutation은 detached registry에서 ACK까지 유지한다.
- preload autosave는 single-flight queue-empty drain, failure retention, same-key latest sequence를 사용한다.
- quit renderer ACK는 requestId, sender, payload shape를 검증하고 renderer/main 실패는 retry/cancel/explicit skip으로 결정한다.
- Cmd/Ctrl+S 실패는 error toast와 logger에 함께 남긴다.

## TDD and review

초기 및 두 차례 review follow-up RED에서 project cross-save, input callback 재바인딩, hydration overwrite, unmount loss, preload false ACK/overlap, sticky dirty, renderer late ACK, main flush false-success를 재현했다. 최종 code review와 test/SSOT review는 모두 `Production-ready`, Critical/Important 0이다.

## Verification

- Focused final: 3 files / 36 tests PASS
- Task 8~16 storage regression: 19 files / 167 tests PASS
- Electron-as-Node DB recovery: 2 files / 2 tests PASS
- Task files ESLint: PASS
- `git diff --check`: PASS
- `tsc6 --noEmit`: Task 16 신규 오류 0; 사용자 dirty `BinderSidebarPanelBody.tsx:102` 기존 TS2322 1건

## Not certified here

- 사용자 dirty `NotionDocumentView` 500ms timer
- project-wide revision 확대
- world mutation automatic backoff
- save latency P95 / 95% confidence artifact
