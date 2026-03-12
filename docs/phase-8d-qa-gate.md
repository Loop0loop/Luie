# Phase 8D QA Gate

## Rule

- Each item passes only when it has both:
  - one automatic evidence source
  - one manual evidence source

## Checklist

| 항목 | 기대 결과 | 자동 증거 | 수동 증거 | 판정 | 메모 |
| --- | --- | --- | --- | --- | --- |
| SQLite-only 정책 일관성 | 새 `.luie` 생성 경로는 항상 `sqlite-v2`를 만든다 | `tests/main/services/luieContainer.test.ts`, `tests/main/services/projectExportEngine.test.ts`, `tests/main/services/projectService.packageAttachment.test.ts` | 새 프로젝트 생성 후 `.luie`를 만들고 `meta.json`의 `container=sqlite`, `version=2` 확인 | Pending | |
| Legacy 차단 명확성 | legacy package `.luie`는 open/attach/read에서 같은 정책으로 거부된다 | `tests/main/services/luieContainer.test.ts`, `tests/main/services/projectService.packageAttachment.test.ts` | legacy package `.luie`를 선택했을 때 동일한 오류 문구가 보이는지 확인 | Pending | |
| Canonical 무결성 | sqlite `.luie` reopen 후 chapter/character/term/snapshot 수가 유지된다 | `tests/main/services/luieDbLossRecovery.test.ts` | 앱 재시작 후 동일 프로젝트를 다시 열어 수량과 내용 확인 | Pending | |
| Replica 손실 복구 | `replica.db` 삭제 후에도 sqlite `.luie`만으로 복구된다 | `tests/main/services/luieDbLossRecovery.test.ts` | 로컬 DB 삭제 후 프로젝트 reopen smoke test | Pending | |
| Single-file 보장 | `.luie-wal`/`.luie-shm`가 생성되지 않는다 | `tests/main/services/luieContainer.test.ts` | Finder 또는 터미널로 sidecar 파일 부재 확인 | Pending | |
| 성능 sanity | reopen/export가 병적으로 느려지지 않는다 | 측정 스크립트 또는 timed smoke run 결과 기록 | small/medium/large 샘플에서 기준 시간 수기 기록 | Pending | 2배 초과 시 원인 분석 필수 |
| UX / 상태 semantics | `attached`, `detached`, `missing`, `invalid`, `unsupported-legacy-container`가 구분된다 | `tests/main/services/projectListStatus.sqliteOnly.test.ts`, `tests/dom/appOperationalScenarios.test.tsx` | 최근 프로젝트 목록에서 배지와 설명 확인 | Pending | |
| 보안 / 경로 검증 | unsafe path, conflict path, unknown file는 명시적으로 실패한다 | 기존 path validation tests + IPC/fs tests | 잘못된 경로 선택 및 legacy 파일 선택 smoke test | Pending | |
