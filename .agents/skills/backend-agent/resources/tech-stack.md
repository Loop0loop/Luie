# Main 도구·위치

버전은 저장소 `package.json`을 확인한다.

Electron main + TypeScript, Drizzle + better-sqlite3/SQLite, Zod, pnpm을 사용한다. 주요 진입점은 `src/main/domains/`, 기반 기능은 `src/main/infra/`, 구현은 기존 services/manager/database에 있다.

IPC 계약은 `src/shared/contracts/`, `src/shared/api/`, `src/shared/ipc/`, `src/shared/schemas/`와 `src/preload/api/`를 잇는다. Supabase 함수는 `supabase/functions/`, 로컬 AI 작업은 `src/main/utility/` 경계를 확인한다.

DB migration은 `drizzle.main.config.ts`, `drizzle.cache.config.ts`와 `generate:drizzle`·`check:drizzle` 명령을 확인한다. 생성과 실사용 DB 적용은 구분한다.
