# Prisma → Drizzle ORM Migration Plan (src/main)

> **Scope**: `src/main` 전체 (database, services, manager, handler, lifecycle, tests, scripts, schema/packaging)
> **Goal**: Prisma를 완전히 제거하고 Drizzle ORM으로 대체
> **Non-Goal**: Renderer/UI 변경, pnpm → Bun 전환 (후순위)
> **Rollback**: 각 Phase는 `feature/drizzle-migration` 브랜치에서 진행. Dual Mode 기간 중(Phase 0~5)에는 언제든지 Prisma로 롤백 가능.

---

## Executive Summary

| 항목 | 수량 | 비고 |
|------|------|------|
| Prisma 직접 사용 파일 (src/main) | ~45개 | services(30) + database(9) + manager(1) + lifecycle(3) + handler(0) |
| 수정 필요 테스트 | 24개 | REAL DB 8개 + MOCKED 15개 + Cache DB 1개 (각 Phase에 분산) |
| 수정 필요 스크립트 | 4개 | sync/verify/check-security/check-deps |
| 삭제 파일 | 10개+ | **Phase 7에서만 최종 삭제**. Phase 0~6에서는 deprecated 처리만 |
| 신규 생성 파일 | 10개+ | drizzle config, schemas, migrations, verify script, FTS5 SQL, migration path resolver, test helpers |
| 예상 기간 | 6~8주 | 1인 전담 기준, 테스트/검증 포함 |

**핵심 전략**: Dual Mode 점진적 마이그레이션
- Phase 0~5: `getClient()`는 **Prisma를 계속 반환**, `getDrizzleClient()`를 신규 추가
- 각 서비스는 `getDrizzleClient()`로 점진적 전환
- Phase 6: 모든 서비스 전환 완료 후 `getClient()`를 Drizzle로 최종 교체
- Phase 7: Prisma 의존성/파일/스크립트 최종 삭제
- **Phase 1에서 Prisma 파일을 삭제하면 Dual Mode가 깨짐** → 삭제는 Phase 7로 통일

---

## Phase 0: Drizzle 인프라 추가 (Week 0)

**목표**: Drizzle 인프라 구축, Prisma와 병행 운영 가능한 상태 만들기. **앱은 여전히 Prisma로 100% 동작**.

### 0.1 의존성 설치
- `drizzle-orm`, `drizzle-kit` 설치 (`better-sqlite3`는 이미 존재)
- `@prisma/client`, `@prisma/adapter-better-sqlite3`, `prisma`는 **아직 제거하지 않음** (Phase 7에서 최종 제거)

### 0.2 Schema 변환
- `prisma/schema.prisma` 14개 모델 → `src/main/database/schema.ts` (Drizzle table definitions)
- `prisma-cache/schema.prisma` 3개 모델 → `src/main/database/cacheSchema.ts`
- 인덱스, relation, defaults, soft-delete 필드 모두 Drizzle 문법으로 명시
- **Prisma `@unique`, `@@unique`, `@@index`를 Drizzle schema에 1:1 반영**
- **upsert 대상 필드가 실제 SQLite UNIQUE/PRIMARY KEY로 존재하는지 검증**
- **FTS5 가상 테이블**: Drizzle schema에 포함 불가 → 별도 `src/main/database/fts5Schema.sql`로 분리

### 0.3 Drizzle Config
- `drizzle.main.config.ts`, `drizzle.cache.config.ts` 생성 (SQLite, better-sqlite3 driver)
- Migration 폴더 분리: `drizzle/main/`, `drizzle/cache/`
- `drizzle-kit generate`로 초기 migration SQL 생성
- **테이블명/컬럼명 naming strategy 고정**:
  - Drizzle `sqliteTable()`의 첫 번째 인자는 **기존 Prisma가 만든 실제 SQLite table name과 동일하게** 유지
  - 컬럼명도 기존 DB 컬럼명과 동일하게 유지
  - snake_case/camelCase 임의 변경 금지
  - 예: Prisma `model Project` → SQLite 테이블명 확인 후 `sqliteTable("Project", ...)` 또는 `sqliteTable("projects", ...)`로 정확히 매칭

### 0.4 Database Service Refactoring (Dual Mode) — **핵심**
- `src/main/database/index.ts`:
  - 기존 `getClient()` → **Prisma client 그대로 반환 (변경 없음)**
  - `getDrizzleClient()` → **신규 추가**, Drizzle client 초기화 및 반환
  - `initialize()` 순서 명시:
    1. SQLite 파일 경로 확정
    2. Drizzle raw connection 생성
    3. PRAGMA 적용 (`journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`)
    4. Drizzle migration/bootstrap 실행
    5. Prisma client 생성
    6. 서비스 layer 사용 가능 상태로 전환
  - `$disconnect()` → Prisma disconnect 유지, Drizzle client close 추가
- `src/main/database/cacheDb.ts`:
  - 기존 `getClient()` → Prisma client 그대로 반환 (변경 없음)
  - `getDrizzleClient()` → 신규 추가 (캐시 DB용 Drizzle client)
  - 동일한 initialize 순서 적용
- **서비스 레이어는 아직 Prisma를 계속 사용 (중단 없음)**

### 0.5 Migration 런타임 전략
- **선택**: `drizzle-orm/better-sqlite3`의 `migrate(db, migrationsFolder)` 사용 (권장)
- **핵심 추가**: `src/main/database/migrationPathResolver.ts` 생성
  - dev/prod/test/packaged 환경별 `migrationsFolder` 절대 경로 반환
  - main DB는 `drizzle/main`, cache DB는 `drizzle/cache`로 분리
  - packaged app: `process.resourcesPath` 기준으로 `drizzle/{main,cache}` 탐색
  - dev: `path.resolve("drizzle/{main,cache}")`
- `src/main/database/databaseSchemaBootstrap.ts`: 기존 raw SQL → `migrate(db, migrationsFolder)` 호출로 교체
- `src/main/database/cacheSchemaBootstrap.ts`: 동일하게 `migrate()` 호출 + FTS5 SQL 별도 실행

### 0.6 Build 설정 (Partial)
- `electron-builder.json`: Drizzle migration SQL 포함 경로 추가 (`drizzle/**/*`)
- `electron.vite.config.ts`:
  - `mainExternal`에 `drizzle-orm`, `better-sqlite3` 추가 (번들링 최적화)
  - `@prisma-cache/client` external은 **아직 제거하지 않음** (Phase 7에서 제거)

### 0.7 테스트 Helper 생성
- `tests/helpers/drizzleMock.ts` 생성:
  - `mockSelectOne()`, `mockSelectMany()`, `mockInsert()`, `mockUpdateReturning()`, `mockDelete()`, `mockTransaction()`
  - Prisma mock 구조(`{ project: { findUnique } }`)에서 Drizzle 체이닝 mock으로 전환
- **권장**: mock보다 in-memory/temp SQLite REAL DB 테스트로 전환
  - projectService, chapterService, snapshotService, syncLocalApply, searchService, projectImportTransaction, projectExportEngine 등 복잡한 서비스는 REAL DB가 더 가치 있음

### 0.8 Schema Parity Test — **핵심**
- 기존 Prisma가 생성한 SQLite DB와 Drizzle schema의 동등성 검증
- `PRAGMA table_info(table)`로 컬럼명/타입/nullable/default 비교
- `PRAGMA index_list(table)`로 인덱스 비교
- `PRAGMA foreign_key_list(table)`로 외래키 비교
- **확인 항목**:
  - nullable 여부 (`.notNull()` 누락 여부)
  - default value (`default(now())`, `default("")`, `default(0)` 등)
  - enum-like string (Prisma enum → Drizzle `text` 처리)
  - cascade delete/relation 동작
  - `@updatedAt` 자동 갱신 대체 전략 (Drizzle에서는 직접 `updatedAt: new Date()` 설정)
  - DateTime 저장 형식 (integer timestamp vs text ISO)
  - Boolean 저장 (SQLite integer boolean 매핑)
  - JSON field 저장 형식 (text vs blob/json mode)
  - soft-delete 필드 (`deletedAt` nullable)
- 누락된 column/default/index/foreign key가 있으면 Phase 0에서 수정

**완료 기준**:
- [ ] `drizzle-kit generate`로 migration SQL 생성 가능
- [ ] `db.getDrizzleClient()`로 Drizzle 쿼리 실행 가능
- [ ] `db.getClient()`는 여전히 Prisma 반환 (기존 서비스/테스트 전부 통과)
- [ ] `migrate()` 함수로 DB bootstrap 정상 동작
- [ ] migrationPathResolver로 dev/packaged 경로 모두 정상
- [ ] **Schema Parity Test 통과 (기존 Prisma DB와 Drizzle schema 100% 동등)**

---

## Phase 1: Drizzle Runtime Integration & Bootstrap Migration (Week 1)

**목표**: Drizzle runtime 연결 및 bootstrap/seed만 전환. **Prisma는 여전히 유지**. 삭제는 없음.

### 1.1 삭제 대상 — **없음** (Phase 7에서만 삭제)
- `databaseRuntime.ts`, `databaseTypes.ts`, `packagedSchema.ts`, `cachePackagedSchema.ts`는 **deprecated 표시만** (`// TODO: Remove in Phase 7`)
- Dual Mode 기간 중 Prisma client 생성/타입/bootstrap 코드는 여전히 필요함

### 1.2 수정 대상
- `src/main/database/index.ts`:
  - `getDrizzleClient()` 안정화 (이미 Phase 0에서 추가)
  - Drizzle client 초기화 시 `PRAGMA journal_mode=WAL` 적용
  - `getClient()` → **Prisma client 그대로 반환 (변경 없음)**
- `src/main/database/cacheDb.ts`:
  - `getDrizzleClient()` 안정화 (캐시 DB용)
  - `getClient()` → Prisma client 그대로 반환
- `src/main/database/databaseSchemaBootstrap.ts`:
  - `PACKAGED_SCHEMA_BOOTSTRAP_SQL` → `migrate(db, migrationsFolder)` 호출
  - `migrationPathResolver` 사용
- `src/main/database/cacheSchemaBootstrap.ts`:
  - `CACHE_PACKAGED_SCHEMA_BOOTSTRAP_SQL` → `migrate(db, migrationsFolder)` 호출
  - FTS5 shadow table 정리 로직 유지 (raw SQL)
- `src/main/database/seedDefaults.ts`:
  - `prisma.project.count()` → Drizzle `db.select({ count: count() }).from(projects)` (getDrizzleClient 사용)
  - `prisma.project.create()` → Drizzle `db.insert(projects).values(...)`

### 1.3 Existing DB Baseline — **핵심**
- **문제**: 기존 Prisma 기반 `.luie` DB를 가진 유저가 Drizzle 초기 migration을 실행하면 `table already exists` 오류 발생
- **해결 전략**:
  - 기존 DB인지 신규 DB인지 판별: `Project`/`projects` 테이블 존재 여부 + `__drizzle_migrations` 테이블 부재 확인
  - 기존 Prisma DB라면: 현재 schema를 Drizzle initial migration이 이미 적용된 것으로 간주 (`markInitialMigrationAsApplied`)
  - 신규 DB라면: Drizzle migration 전체 적용 (`migrate(db, { migrationsFolder })`)
- **구현 방향**:
  ```typescript
  const hasProjectTable = checkTableExists(sqlite, "Project"); // 또는 "projects"
  const hasDrizzleMigrations = checkTableExists(sqlite, "__drizzle_migrations");
  if (hasProjectTable && !hasDrizzleMigrations) {
    // 기존 Prisma DB: baseline 처리
    markInitialMigrationAsApplied();
  } else {
    migrate(db, { migrationsFolder });
  }
  ```
- **패키징된 앱에서 기존 `.luie` 열기 테스트** 추가

### 1.4 테스트 (Phase 1에서 함께)
- `tests/main/prismaEnv.test.ts` → Drizzle 환경 변수 테스트로 변경
- `tests/main/database/cacheDbPrismaPush.test.ts` → Drizzle migration push 테스트로 변경
- `tests/main/services/startupReadinessService.test.ts` → Drizzle `db.execute()` mock으로 변경
- **새 테스트**: 기존 Prisma DB → Drizzle baseline migration 테스트
- **새 테스트**: 신규 DB → Drizzle migration 전체 적용 테스트

**완료 기준**:
- [ ] Bootstrap/seed가 Drizzle로 정상 동작
- [ ] `getClient()`는 여전히 Prisma 반환 (Dual Mode 유지)
- [ ] Database 관련 테스트 3개 통과
- [ ] **기존 Prisma DB baseline migration 통과**
- [ ] **신규 DB Drizzle migration 통과**
- [ ] Prisma 파일 하나도 삭제되지 않음

---

## Phase 2: Simple CRUD Services — World Layer (Week 1~2)

**목표**: 가장 단순한 서비스들부터 Drizzle로 전환. `getDrizzleClient()` 사용.

**대상**: World services (난이도 🟢 쉬움)
- `src/main/services/world/characterService.ts`
- `src/main/services/world/termService.ts`
- `src/main/services/world/eventService.ts`
- `src/main/services/world/factionService.ts`
- `src/main/services/world/worldEntityService.ts`

**변환 패턴** (공통):
- `db.getClient().character.create()` → `db.getDrizzleClient().insert(characters).values(...)`
- `db.getClient().character.findUnique()` → `db.getDrizzleClient().select().from(characters).where(eq(characters.id, id)).limit(1)`
- `db.getClient().character.findMany()` → `db.getDrizzleClient().select().from(characters).where(eq(characters.projectId, projectId))`
- `db.getClient().character.update()` → `db.getDrizzleClient().update(characters).set(...).where(eq(characters.id, id))`
- `$transaction([entityRelation.deleteMany, character.updateMany])` → `db.getDrizzleClient().transaction(async (tx) => { ... })`
- `P2025` 에러 분기 → `NotFoundError` catch (아래 규칙 적용)

**P2025 대체 규칙**:
- `findUnique` 계열: `select().limit(1)` 결과 `length === 0`이면 `NotFoundError`
- `update/delete` 계열: `returning()` 또는 `changes === 0`이면 `NotFoundError`
  - **주의**: Drizzle `returning()`은 SQLite 환경에서 실제 동작 확인 필요. Electron native module 환경에서는 런타임 검증 필수
  - `returning()` 불안정 시 `run()`의 `changes` 기반으로 판단
- `updateMany/deleteMany` 계열: 0건이 정상인 경우와 에러인 경우를 서비스별로 구분

**특이사항**:
- `getWorldDbClient()` export 유지 (world 서비스들의 DB 진입점)
- soft-delete 패턴: `where: { deletedAt: null }` → `isNull(characters.deletedAt)`
- **getClient()는 여전히 Prisma 반환** (Dual Mode). 서비스만 getDrizzleClient()로 변경.

### 2.1 테스트 (Phase 2에서 함께)
- `tests/main/services/entityRelationService.test.ts` → Drizzle mock 구조로 재작성
- `tests/main/services/worldReplicaService.test.ts` → Drizzle `db.transaction()` mock으로 변경
- `tests/main/services/manuscriptAnalysisService.test.ts` → Drizzle mock 구조로 재작성
- `tests/main/services/autoExtractService.test.ts` → findMany mock 구조 유지

**완료 기준**:
- [ ] 5개 world service의 모든 Prisma API 호출 제거
- [ ] `getDrizzleClient()` 사용 확인
- [ ] 해당 서비스의 테스트 통과 (mock 재작성 포함)

---

## Phase 3: Core CRUD + Export/Import (Week 2~3.5)

**목표**: 핵심 도메인 서비스 전환. `include`, `upsert`, `createMany`가 주요.

**대상**: Core services (난이도 🟡 ~ 🟠)
- `src/main/services/core/projectService.ts` (include 6개, CRUD)
- `src/main/services/core/chapterService.ts` ($transaction reorder, P2025)
- `src/main/services/core/project/projectExportEngine.ts` (include 8개)
- `src/main/services/core/project/projectImportTransaction.ts` ($transaction + createMany 8개)
- `src/main/services/core/project/projectAttachmentStore.ts` (upsert, deleteMany)
- `src/main/services/core/project/projectLocalStateStore.ts` (upsert)
- `src/main/services/core/chapterKeywords.ts` (findMany + update)
- `src/main/services/core/project/projectImportOpen.ts` (findUnique)

**핵심 변환**:

### 3.1 `include` 대체 전략 (3종류)

| 관계 유형 | 권장 방식 | 예시 |
|---|---|---|
| **1:1 관계** | `leftJoin` 또는 별도 `select` | `projectSettings` |
| **1:N 소량 관계** | Drizzle relational query 또는 별도 `select` | `chapters` (1개 프로젝트의 챕터들) |
| **1:N 대량 관계** | 명시적 batch `select` 후 JS에서 grouping | `characters`, `terms` (export/import 시) |
| **sync/snapshot 대량 데이터** | 테이블별 `select` 후 묶기 | `syncBundleHelpers`의 7개 include |

**주의**: `Promise.all` 병렬 쿼리는 better-sqlite3(동기 드라이버)에서는 실제 병렬 I/O가 아니므로, 1:1/1:N 소량은 `leftJoin`이 더 효율적일 수 있음.

### 3.2 `upsert` → `insert().onConflictDoUpdate()`
- **필수 선행**: 대상 필드가 실제 SQLite `UNIQUE`/`PRIMARY KEY`인지 검증
- composite unique key는 `onConflictDoUpdate` target 배열로 명시
- 예: `.onConflictDoUpdate({ target: [projectAttachments.projectId], set: { projectPath } })`

### 3.3 `createMany` → `insert().values(array)`
- Drizzle도 배열 삽입 지원

### 3.4 `$transaction` → `db.transaction()`
- 구조 유사, 타입만 `Prisma.TransactionClient` → Drizzle `Transaction`으로 변경

### 3.5 `P2025` → `NotFoundError`
- chapterService, projectService의 에러 분기 재작성 (Phase 2의 P2025 대체 규칙 적용)

### 3.6 타입 마이그레이션 (Core Layer)
- Prisma 생성 타입(`Prisma.Project`, `Prisma.Chapter` 등) → Drizzle `$inferSelect<typeof projects>`
- 서비스 인터페이스 변경 시 handler/test의 타입 연쇄 수정
- `noImplicitReturns`, `noUnusedLocals` strict 설정에서 타입 불일치 즉시 노출됨

### 3.7 테스트 (Phase 3에서 함께)
- `tests/main/services/projectService.test.ts` (REAL DB) → Drizzle client reuse 검증
- `tests/main/services/chapterService.test.ts` (REAL DB) → 챕터 CRUD + 스트레스 테스트
- `tests/main/services/projectService.validation.test.ts` → Drizzle mock 구조로 재작성
- `tests/main/services/projectService.pathSafety.test.ts` → Drizzle mock 구조로 재작성
- `tests/main/services/projectImportTransaction.test.ts` → `$transaction` → `db.transaction()` mock
- `tests/main/services/projectImportOpen.test.ts` → Drizzle mock 구조로 재작성
- `tests/main/services/projectExportEngine.test.ts` → Drizzle mock 구조로 재작성
- `tests/main/services/projectService.packageAttachment.test.ts` → Drizzle mock 구조로 재작성
- `tests/main/services/projectService.immediateDurability.test.ts` → Drizzle mock 구조로 재작성

**완료 기준**:
- [ ] 8개 core service 전환 완료
- [ ] `getDrizzleClient()` 사용 확인
- [ ] projectService.test.ts, chapterService.test.ts 통과
- [ ] 타입 오류 0개

---

## Phase 4: Complex Features — Snapshot / Sync / Graph (Week 3.5~5)

**목표**: 복합 트랜잭션과 대량 데이터 처리가 있는 고난이도 서비스 전환.

**대상**: Features services (난이도 🟠 ~ 🔴)
- `src/main/services/features/snapshot/snapshotService.ts` (6종 트랜잭션)
- `src/main/services/features/snapshot/snapshotImportFromFile.ts` (대량 import 트랜잭션)
- `src/main/services/features/snapshot/snapshotArtifacts.ts` (orphan 정리)
- `src/main/services/features/sync/syncLocalApply.ts` (9테이블 순회 upsert/delete — **가장 복잡**)
- `src/main/services/features/sync/syncBundleApplier.ts` (syncLocalApply 래퍼 트랜잭션)
- `src/main/services/features/sync/syncBundleHelpers.ts` (include 7개)
- `src/main/services/features/sync/syncPackagePersistence.ts` (findUnique + include)
- `src/main/services/features/graphPlugin/apply.ts` (deleteMany + createMany)
- `src/main/services/features/worldReplicaService.ts` (upsert + deleteMany + createMany)

**핵심 전략**:
- syncLocalApply의 9테이블 순회 로직은 Drizzle transaction으로 그대로 옮기되, 각 모델별 upsert 헬퍼를 분리
- snapshotService의 6종 트랜잭션은 더 작은 단위로 분리 가능한지 검토 (복잡성 감소)
- graphPlugin/apply의 "전체 삭제 후 재생성"은 `db.transaction()`으로 동일하게 구현

### 4.1 테스트 (Phase 4에서 함께)
- `tests/main/services/snapshotService.test.ts` (REAL DB) → 스냅샷 CRUD Drizzle 검증
- `tests/main/services/snapshotResilience.test.ts` (REAL DB) → WAL/체크포인트 Drizzle 검증
- `tests/main/services/snapshotService.packageBehavior.unit.test.ts` → Drizzle mock 구조로 재작성
- `tests/main/services/syncLocalApply.test.ts` → Prisma client mock → Drizzle transaction mock
- `tests/main/services/syncService.test.ts` → `$transaction` mock → `db.transaction()` mock
- `tests/main/services/dbRecoveryService.test.ts` → Drizzle mock 구조로 재작성
- `tests/main/services/luieDbLossRecovery.test.ts` (REAL DB) → DB 복구 흐름 유지

**완료 기준**:
- [ ] snapshotService.test.ts, snapshotResilience.test.ts 통과
- [ ] sync 관련 테스트 통과
- [ ] `getDrizzleClient()` 사용 확인

---

## Phase 5: Cache & Search (Week 5)

**목표**: 캐시 DB 서비스를 Drizzle로 전환. **cacheDb 자체는 Dual Mode 유지**.

**대상**:
- `src/main/services/world/appearanceCacheService.ts` (캐시 DB, deleteMany 6종)
- `src/main/services/features/chapterSearchCacheService.ts` (**캐시 DB + 메인 DB 혼합**, FTS5 raw SQL)
- `src/main/services/features/searchService.ts` (메인 DB, findMany 4개)

**핵심 전략**:
- 캐시 DB 서비스는 `cacheDb.getDrizzleClient()` 사용
- `$executeRawUnsafe` / `$queryRawUnsafe` (FTS5) → Drizzle `sql` template literal 또는 `db.run()`
- `bm25` 가중치 검색은 Drizzle에서도 raw SQL로 유지
- 캐시 DB는 재구축 가능하므로, migration 실패 시 bootstrap fallback 로직 간소화

### 5.1 테스트 (Phase 5에서 함께)
- `tests/main/services/searchService.test.ts` (REAL DB + Cache DB) → Cache DB Drizzle 검증
- `tests/main/services/appearanceCacheIsolation.test.ts` (REAL Cache DB) → cacheDb Drizzle 검증

**완료 기준**:
- [ ] searchService.test.ts, appearanceCacheIsolation.test.ts 통과
- [ ] FTS5 검색 기능 정상 동작
- [ ] `getDrizzleClient()` 사용 확인

---

## Phase 6: getClient() 최종 교체 + Manager/Lifecycle (Week 5~6)

**목표**: **모든 서비스 전환 완료 후**, `getClient()`를 Prisma → Drizzle로 최종 교체.

**대상**:
- `src/main/database/index.ts`:
  - `getClient()` → **Drizzle client 반환으로 최종 교체**
  - `getDrizzleClient()` → `getClient()`와 동일하게 동작하도록 변경 (또는 alias)
  - Prisma client 완전 제거 (private 메서드에서만)
- `src/main/database/cacheDb.ts`:
  - 동일하게 `getClient()`를 Drizzle로 교체
  - `@prisma-cache/client` 참조 제거
- `src/main/manager/autoSaveManager.ts` (line 220-224: `db.getClient().chapter.findUnique` 직접 호출)
  - → `chapterService.getChapter()`로 이전하여 manager의 DB 의존성 제거
  - (이미 Drizzle로 전환된 chapterService 사용)
- `src/main/lifecycle/bootstrap.ts`:
  - `db.initialize()` → Drizzle client 초기화로 확정
- `src/main/lifecycle/appReady.ts`:
  - snapshotService.pruneSnapshotsAllProjects, projectService.reconcileProjectPathDuplicates
  - 이미 서비스를 통해 접근하므로 서비스 전환 완료 시 자동 해결
- `src/main/lifecycle/shutdown.ts`:
  - `db.disconnect()` → Drizzle close로 확정
- `src/main/services/features/startupReadinessService.ts`:
  - `db.initialize()`, `db.getClient()` → Drizzle 버전으로 확정

**완료 기준**:
- [ ] `getClient()`가 Drizzle client 반환
- [ ] autoSaveManager에 DB 직접 호출 없음
- [ ] 앱 시작/종료 시 DB 초기화/종료 정상
- [ ] startup readiness 통과
- [ ] `qa:core` 전체 통과
- [ ] **앱 시작 후 project/chapter/snapshot/search/cache 기능 smoke test 통과**

---

## Phase 7: Prisma 완전 제거 + Packaging/Build Cleanup (Week 6~7)

**목표**: Prisma 흔적을 완전히 제거하고 Drizzle 기준 패키징 확정.

### 7.1 삭제 (이 Phase에서만 삭제)
- `prisma/schema.prisma`
- `prisma-cache/schema.prisma`
- `prisma/` 디렉토리 (migrations가 있으면 보존, 없으면 삭제)
- `src/main/database/databaseRuntime.ts` (Prisma client 로더, CLI runner)
- `src/main/database/databaseTypes.ts` (PrismaClient 타입 alias)
- `src/main/database/packagedSchema.ts` (raw SQL → Drizzle migration으로 대체 완료)
- `src/main/database/cachePackagedSchema.ts` (raw SQL → Drizzle migration으로 대체 완료)
- `scripts/sync-prisma-client.mjs`
- `scripts/verify-packaged-prisma.mjs` (대체 스크립트로 교체)

### 7.2 스크립트 수정 (4개)
- `scripts/sync-prisma-client.mjs` → **삭제**. Drizzle은 생성물 동기화 불필요.
- `scripts/verify-packaged-prisma.mjs` → `scripts/verify-packaged-drizzle.mjs`로 대체
  - Drizzle runtime 파일(migration SQL, schema.js) 존재 확인
  - `migrationPathResolver`의 packaged 경로 검증 포함
- `scripts/check-security-profile.mjs`:
  - `prisma-unsafe-raw` rule → Drizzle `sql` template literal / `db.run()` 탐지로 확장
- `scripts/check-deps.mjs`:
  - `ALLOWED_GENERATED_PACKAGES`에서 `@prisma-cache/client` 제거

### 7.3 Build 설정 최종 정리
- `package.json`:
  - `dependencies`: `@prisma/client`, `@prisma/adapter-better-sqlite3` 제거
  - `devDependencies`: `prisma` 제거
  - `scripts`: `generate:prisma`, `generate:prisma-runtime`, `migrate`, `push` 제거
  - `scripts`: `db:generate`, `db:push`, `db:migrate`, `db:studio` 추가
- `electron-builder.json`:
  - `@prisma/client`, `@prisma-cache/client`, `@prisma/client-runtime-utils` extraResources 제거
  - `drizzle/migrations/*.sql` extraResources 추가
- `electron.vite.config.ts`:
  - `mainExternal`의 `@prisma-cache/client` 제거
  - `drizzle-orm`, `better-sqlite3` external 유지

### 7.4 통합 검증
- `pnpm run build:mac:arm64` (또는 `bun run build:mac:arm64`)
- 패키징된 앱에서 DB 초기화/CRUD/검색 정상 동작 확인
- `.luie` 파일 export/import 정상 확인
- `qa:core` 전체 통과

**완료 기준**:
- [ ] `package.json`에 Prisma 의존성 없음
- [ ] 빌드 산출물에 Prisma runtime 없음
- [ ] 패키징된 앱 정상 동작
- [ ] `qa:core` 통과
- [ ] 모든 스크립트 정상 동작

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| syncLocalApply의 9테이블 트랜잭션 복잡도 | 🔴 높음 | Phase 4에서 헬퍼 함수 분리, 단위 테스트 강화 |
| FTS5 가상 테이블 Drizzle 미지원 | 🟡 중간 | 별도 `fts5-init.sql`로 분리, bootstrap에서 raw SQL 실행 |
| `include` → join 변환 시 N+1 | 🟡 중간 | 3종류 전략(1:1 leftJoin, 1:N 소량 select, 1:N 대량 batch+grouping) |
| Native addon (better-sqlite3) 호환성 | 🟢 낮음 | 이미 Prisma adapter에서 사용 중이므로 ABI 변경 없음 |
| 패키징 시 migration SQL 누락 | 🔴 높음 | Phase 7에서 `verify-packaged-drizzle.mjs`로 검증 |
| Drizzle migration 런타임 적용 | 🟡 중간 | `migrate(db, migrationsFolder)` 함수 사용 (Drizzle 공식 권장) |
| Electron packaged app에서 migrationsFolder 경로 | 🔴 높음 | Phase 0에서 `migrationPathResolver.ts` 추가, `process.resourcesPath` 기준 |
| Prisma → Drizzle 타입 연쇄 | 🟡 중간 | Phase 1, 3에서 타입 마이그레이션 전략 명시, strict TS 설정 활용 |
| getClient() 변경 시 미전환 서비스 깨짐 | 🔴 높음 | **Dual Mode로 해결**: getClient()=Prisma 유지, getDrizzleClient()로 점진적 전환. Phase 6에서만 최종 교체 |
| 테스트 24개 한꺼번에 수정 | 🔴 높음 | **분산 해결**: 각 Phase에서 해당 서비스 테스트 함께 수정 |
| Drizzle mock 재작성 비용 | 🟡 중간 | Phase 0에서 `tests/helpers/drizzleMock.ts` 추가, REAL DB 테스트로 전환 권장 |
| upsert unique constraint 불일치 | 🟡 중간 | Phase 0.2에서 Prisma `@unique`를 Drizzle schema에 1:1 반영, upsert 대상 필드 검증 |
| Drizzle update/delete는 NotFoundError 자동 미발생 | 🟡 중간 | Phase 2에서 P2025 대체 규칙 명시: `returning()` 또는 `changes === 0` 체크 |
| Electron main process에서 Drizzle 성능 | 🟢 낮음 | better-sqlite3 동기 드라이버 그대로 사용 |

---

## Appendix: File Inventory

### Database Layer (9 files + 2 신규)
- `src/main/database/index.ts` — 메인 DB singleton
- `src/main/database/cacheDb.ts` — 캐시 DB singleton
- `src/main/database/databaseRuntime.ts` — Prisma 로더/CLI runner (Phase 7 삭제)
- `src/main/database/databaseTypes.ts` — Prisma 타입 alias (Phase 7 삭제)
- `src/main/database/databaseSchemaBootstrap.ts` — raw SQL bootstrap → Drizzle migration
- `src/main/database/cacheSchemaBootstrap.ts` — 캐시 raw SQL bootstrap → Drizzle migration
- `src/main/database/packagedSchema.ts` — 메인 DDL SQL (Phase 7 삭제)
- `src/main/database/cachePackagedSchema.ts` — 캐시 DDL SQL (Phase 7 삭제)
- `src/main/database/seedDefaults.ts` — 기본 데이터 시딩
- `src/main/database/migrationPathResolver.ts` — **신규** (dev/prod/packaged 경로 해결)

### Services (32 files)
- **Core (8)**: projectService, chapterService, projectExportEngine, projectImportTransaction, projectAttachmentStore, projectLocalStateStore, chapterKeywords, projectImportOpen
- **World (8)**: characterService, termService, eventService, factionService, worldEntityService, entityRelationService, worldMentionService, appearanceCacheService
- **Features (8+)**: snapshotService, snapshotImportFromFile, snapshotArtifacts, syncLocalApply, syncBundleApplier, syncBundleHelpers, syncPackagePersistence, worldReplicaService, chapterSearchCacheService, searchService, graphPlugin/apply, autoExtractService, manuscriptAnalysisService

### Manager (1 file)
- `src/main/manager/autoSaveManager.ts` (DB 직접 호출 1곳)

### Lifecycle (3 files)
- `src/main/lifecycle/bootstrap.ts`
- `src/main/lifecycle/appReady.ts`
- `src/main/lifecycle/shutdown.ts`

### Handler (0 files — 변경 불필요)
- 모든 handler는 서비스 위임 구조

### Tests (24 files)
- REAL DB 8개, MOCKED 15개, Cache DB 1개 (각 Phase에 분산)

### Test Helpers (1 file — 신규)
- `tests/helpers/drizzleMock.ts` — Drizzle 체이닝 mock 유틸

### Scripts (4 files)
- sync-prisma-client.mjs, verify-packaged-prisma.mjs, check-security-profile.mjs, check-deps.mjs

### Schema/Packaging (5 files)
- prisma/schema.prisma, prisma-cache/schema.prisma, electron-builder.json, electron.vite.config.ts, package.json
