# 테스트 선택과 격리

Vitest는 `main/`, `renderer/`, `dom/`, `shared/`, `scripts/` 테스트에 사용한다. Playwright는 `e2e/`와 `playwright.config.ts`의 smoke/e2e/stress/visual 프로젝트를 사용한다.

## 실행 환경

- `vitest.config.ts`는 `tests/setup.ts`를 공통 실행하고 `tests/dom/**/*.test.tsx`에 jsdom을 지정한다. `.test.ts`나 다른 위치에서 DOM이 필요하면 해당 테스트의 명시적 환경 설정도 확인한다.
- 공통 setup은 worker별 `drizzle/.tmp/vitest-<id>`에 main/cache DB와 userData를 지정하고 각 테스트 전에 데이터를 비운 뒤 종료 시 정리한다.
- DB를 사용하지 않는 테스트는 `SKIP_DB_TEST_SETUP=1 pnpm exec vitest run <test-path>`로 실행한다. DB 동작을 검증할 때는 setup을 생략하지 않는다.
- native ABI 오류는 Node 테스트와 Electron 실행의 ABI를 구분한다. 기존 `pnpm test`/rebuild 명령의 동작을 확인하고, 재빌드가 실행 환경을 바꿨다면 보고한다.
- `tests/e2e/_helpers/electronApp.ts`는 임시 DB를 사용하지만 환경을 상속하고 override를 허용한다. userData·설정·sync·네트워크·원고 경로까지 격리됐는지 해당 suite에서 확인한 후 실행한다.

## 검증 기준

버그 재현·실패 시 데이터 보존·계약 경계를 검증한다. 구현을 그대로 복제한 테스트나 임의 coverage 목표는 추가하지 않는다. 타이밍 버그에는 관련 event/flush 순서를 제어하는 기존 도구를 활용한다.

관련 검사가 통과하면 새 근거 없이 전체 suite나 benchmark를 반복하지 않는다. shared 계약·여러 도메인 변경에는 범위를 넓히고, 품질 게이트 수정은 대응 `tests/scripts/`를 갱신한다. 실패를 피하기 위해 assertion·검증·환경 경계를 약화하지 않는다.

제품 오류, 기존 worktree 오류, 테스트 환경 오류를 구분해 명령과 결과를 보고한다. mock·임시 DB·실제 Electron에서 확인한 범위를 각각 명시한다.
