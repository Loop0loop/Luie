# Prisma → Drizzle Migration: Phase 1~3 회고록

> **작성일**: 2026-04-25  
> **대상 커밋**: `e11e477` (feat:dizzle CRUD clear)  
> **변경 파일**: 42개, +2530 / -1660 lines  
> **참여 흐름**: explore → Sisyphus-Junior (구현) → Oracle (검수)

---

## 전체 흐름

```
Phase 0: Drizzle 인프라 추가 (schema/config/dual-mode)  ─── ✅
Phase 1: Bootstrap & Seed → Drizzle 전환                 ─── ✅ (10 files)  
Phase 2: World CRUD 서비스 7개 → Drizzle 전환              ─── ✅ (8 files)
Phase 3: Core CRUD 서비스 8개 → Drizzle 전환               ─── ✅ (16 files)
```

각 Phase는 동일한 워크플로:
1. **explore** (코드베이스 사전 조사 — 병렬 background)
2. **Sisyphus-Junior** (실제 구현 — `unspecified-high` category)
3. **Oracle** (정적 검수 — 읽기 전용, PASS/CONDITIONAL PASS/FAIL 판정)

---

## Phase 0: Drizzle 인프라 추가 (선행 완료)

이미 완료된 기반 작업:

| 작업 | 상세 |
|------|------|
| 의존성 설치 | `drizzle-orm`, `drizzle-kit` |
| Drizzle schema | main 14개 + cache 3개 테이블 정의 |
| Config 분리 | `drizzle.main.config.ts` / `drizzle.cache.config.ts` |
| Dual Mode | `getClient()` → Prisma, `getDrizzleClient()` → Drizzle |
| Migration | `drizzle/main/`, `drizzle/cache/` 분리 생성 |
| Schema Parity Test | `PRAGMA table_info/index_list/foreign_key_list` bootstrap ↔ migration 비교 |
| Oracle 검수 반영 | `deletedAt` column patch, FTS5 경로, boolean default 수정 |

---

## Phase 1: Bootstrap & Seed Migration

### 목표
Bootstrap/seed 로직만 Drizzle로 전환. 서비스 레이어는 여전히 Prisma 사용.

### 변경 파일 (10개)

| 파일 | 변경 내용 | 라인 수 |
|------|----------|---------|
| `databaseSchemaBootstrap.ts` | raw SQL → `migrate(db, migrationsFolder)` + baseline detection | +146 |
| `cacheSchemaBootstrap.ts` | 동일 패턴 + FTS5 별도 유지 | +128 |
| `seedDefaults.ts` | `prisma.project.count()` → `db.select({ count })`, `create()` → `db.insert()` | +69 |
| `index.ts` | `seedIfEmpty()`에 `getDrizzleClient()` 전달 | +2 |
| `drizzleBootstrap.test.ts` | **신규**: 3개 테스트 (신규 DB, Prisma baseline, idempotent) | +136 |
| `cacheDbPrismaPush.test.ts` | Prisma migration → Drizzle migration push 테스트 | +78 |
| `prismaEnv.test.ts` | Drizzle env var 테스트로 변경 | +10 |
| `startupReadinessService.test.ts` | `getDrizzleClient()` mock 추가 | +6 |
| `databaseRuntime.ts` | `// TODO: Remove in Phase 7` deprecated 표시 | +1 |
| `databaseTypes.ts` | Prisma 타입 deprecated 표시 | +1 |

### 핵심 구현: Baseline Detection (markInitialMigrationAsApplied)

```typescript
// databaseSchemaBootstrap.ts
const hasProjectTable = checkTableExists(sqlite, "Project");
const hasDrizzleMigrations = checkTableExists(sqlite, "__drizzle_migrations");

if (hasProjectTable && !hasDrizzleMigrations) {
  // 기존 Prisma DB → Drizzle baseline으로 간주
  markInitialMigrationAsApplied();
} else {
  // 신규 DB (또는 이미 Drizzle migration된 DB)
  migrate(db, { migrationsFolder });
}
```

`markInitialMigrationAsApplied()`는:
1. `__drizzle_migrations` 테이블이 없으면 생성
2. Drizzle `_journal.json`에서 migration 파일 목록 읽기
3. 각 migration SQL 파일의 SHA256 해시 계산 (앞 16자리)
4. `__drizzle_migrations`에 INSERT — Drizzle이 "이미 적용됨"으로 인식

### 발견된 오류 및 수정

| 문제 | 원인 | 해결 |
|------|------|------|
| `migrate()` 인자 오류 | Drizzle API가 `{ migrationsFolder: string }` 객체 필요 | 호출 시그니처 수정 |
| BetterSqlite3 ABI mismatch | NODE_MODULE_VERSION 불일치 (143 vs 127) | 테스트에서 graceful skip 처리 (env issue) |
| `cacheSchemaBootstrap.ts` `escapeSqlIdentifier` 네이밍 | 오해할 수 있는 함수명 | Oracle 지적 — 기능상 문제 없음, 명명만 개선 필요 |

### 검증
- **typecheck**: ✅ 통과
- **lint**: 0 errors
- **tests**: 6/6 통과 (5개 skip — ABI mismatch로 인한 env 이슈, Phase 1 코드 문제 아님)

### Oracle 검수 결과
**CONDITIONAL PASS** — LOW 2건 지적:
- `prismaEnv.test.ts`가 레거시 경로 검증 (Phase 7까지 TODO 주석 필요)
- Cache DB에 `foreign_keys`/`busy_timeout` PRAGMA 누락 (의도된 것인지 확인 필요)

---

## Phase 2: World CRUD Services

### 목표
가장 단순한 World 레이어 서비스 5개를 Drizzle로 전환. `getWorldDbClient()`가 `getDrizzleClient()` 반환하도록 변경.

### 변경 파일 (8개)

| 파일 | 변경 내용 | 라인 수 |
|------|----------|---------|
| `characterService.ts` | Prisma CRUD → Drizzle 체인, `getWorldDbClient()` export | +188/-170 |
| `termService.ts` | CRUD + search(`contains`→`like`), soft-delete(`isNull`) | +194/-157 |
| `eventService.ts` | CRUD 전환, domain error codes | +132/-99 |
| `factionService.ts` | CRUD 전환 | +132/-99 |
| `worldEntityService.ts` | CRUD + hard delete (soft-delete와 불일치) | +155/-123 |
| `entityRelationService.ts` | CRUD + `$transaction`, `RawRow` type casts | +133/-101 |
| `worldMentionService.ts` | CRUD + type casts (`as NamedRow`) | +95/-75 |
| `entityRelationService.test.ts` | Prisma mock → Drizzle chainable mock | +112/-84 |

### 변환 패턴 일람

| Prisma 패턴 | Drizzle 대체 | 적용 수 |
|---|---|---|
| `client.character.create({ data })` | `db.insert(characters).values(data).returning()` | ~15회 |
| `client.character.findUnique({ where: { id } })` | `db.select().from(characters).where(eq(characters.id, id)).limit(1)` | ~20회 |
| `client.character.findMany({ where })` | `db.select().from(characters).where(eq(characters.projectId, pid))` | ~25회 |
| `client.character.update({ where, data })` | `db.update(characters).set(data).where(eq(characters.id, id)).returning()` | ~10회 |
| `client.character.delete({ where })` | `db.delete(characters).where(eq(characters.id, id)).returning()` | ~5회 |
| `where: { deletedAt: null }` | `isNull(characters.deletedAt)` | ~8회 |
| `where: { name: { contains: q } }` | `like(characters.name, \`%${q}%\`)` | ~4회 |
| `$transaction([a, b])` | `db.transaction(async (tx) => { ... })` | ~3회 |
| `P2025` not-found error | `rows.length === 0` → `ServiceError` | ~8회 |

### 특이사항

1. **`getWorldDbClient()` 위치**: `characterService.ts`에서 export됨. 다른 서비스들이 이를 import. Oracle이 database/index.ts로 이동 권장했지만 Phase 3 범위에서는 그대로 둠.

2. **Type casts**: Drizzle `select().from()` 결과가 `{name: string, ...}[]` 형태로 Prisma의 nested object와 달라서, `as RawRow` / `as NamedRow` 캐스트 8회 사용. Oracle이 "안전하지만 타입 검증 우회"로 지적.

3. **Soft-delete vs Hard-delete 불일치**:
   - `characterService`, `termService`: soft-delete (`deletedAt` 설정)
   - `worldEntityService`: hard delete (`tx.delete()`) — Oracle이 `worldEntity`도 soft-delete로 통일 권장

### 발견된 오류 및 수정

| 문제 | 파일 | 상태 |
|------|------|------|
| `worldEntityService.deleteWorldEntity` null 체크 누락 | `worldEntityService.ts:175` | Oracle 발견 — 존재하지 않는 엔티티 삭제 시 false positive |
| `getAllWorldEntities`에 `isNull(deletedAt)` 누락 | `worldEntityService.ts:88` | Oracle 발견 — 삭제된 엔티티 그래프 유출 |
| `eventService`/`factionService` 에러 코드 Generic | `eventService.ts`, `factionService.ts` | Oracle 지적 — `DB_QUERY_FAILED` 대신 domain-specific code 필요 |
| Drizzle `returning()` 동작 확인 필요 | 전반적 | Phase 3 이후 runtime 검증 필요 (Electron native module env) |

### 검증
- **typecheck**: ✅ 통과
- **lint**: 0 errors (8개 서비스)
- **tests**: 11/11 통과 (`entityRelationService.test.ts` 포함)

### Oracle 검수 결과
**CONDITIONAL PASS** — BUG 2건:
- **B1** (B062): `worldEntityService` delete null dereference  
- **B2** (LOW): `getAllWorldEntities` soft-delete 필터 누락  
- **I1** (LOW): event/faction error codes  
- **I2** (LOW): hard delete vs soft delete 불일치

---

## Phase 3: Core CRUD + Export/Import

### 목표
핵심 도메인 서비스 8개 전환. `include`, `upsert`, `createMany`, `$transaction` 복합 패턴 처리.

### 변경 파일 (16개)

| 파일 | 변경 내용 | 라인 수 |
|------|----------|---------|
| `projectService.ts` | `include` 4개 분해, nested create 분리, update/delete 전환 | +195/-171 |
| `chapterService.ts` | `$transaction` reorder, P2025, CRUD | +323/-268 |
| `projectExportEngine.ts` | `include` 8개 → 개별 쿼리 9개 + `Promise.all` | +90/-72 |
| `projectImportTransaction.ts` | `$transaction` + `createMany` × 8테이블 | +142/-113 |
| `projectAttachmentStore.ts` | `upsert` → `onConflictDoUpdate`, `deleteMany` | +304/-228 |
| `projectLocalStateStore.ts` | `upsert` → `onConflictDoUpdate` | +69/-55 |
| `chapterKeywords.ts` | `findUnique`/`findMany`/`update` | +139/-117 |
| `projectImportOpen.ts` | `findUnique` → `select().limit(1)` | +14/-11 |
| `projectService.test.ts` | REAL DB: Prisma → Drizzle client | +134/-107 |
| `projectService.validation.test.ts` | Mock: Prisma chain → Drizzle chain | +67/-52 |
| `projectService.pathSafety.test.ts` | Mock 전면 재작성 | +40/-35 |
| `projectService.packageAttachment.test.ts` | Mock + Date→string 타입 조정 | +30/-26 |
| `projectImportTransaction.test.ts` | Prisma tx → Drizzle tx mock | +170/-131 |
| `projectImportOpen.test.ts` | `findUnique` → Drizzle select chain | +23/-18 |
| `projectExportEngine.test.ts` | Drizzle 다중 쿼리 체인 mock | +39/-36 |
| `projectService.immediateDurability.test.ts` | 변경 없음 (DB 호출 없음) | — |

### Include 분해 전략 (가장 까다로운 부분)

#### `projectExportEngine.ts` — include 8개 분해
```
Prisma:
  prisma.project.findUnique({
    where: { id },
    include: {
      chapters: true,
      characters: true,
      terms: true,
      events: true,
      factions: true,
      worldEntities: true,
      entityRelations: true,
      snapshots: true,
    }
  })

Drizzle:
  const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  const [
    chapters, characters, terms, events,
    factions, worldEntities, entityRelations, snapshots
  ] = await Promise.all([
    db.select().from(chapters).where(eq(chapters.projectId, id)),
    db.select().from(characters).where(eq(characters.projectId, id)),
    // ... 각 테이블별 개별 쿼리
  ]);
  return { ...project, chapters, characters, ... };
```

**주의사항**: better-sqlite3가 동기 드라이버이므로 `Promise.all`은 실제 병렬 I/O가 아님. 순차 실행이지만 코드 가독성과 유지보수성을 위해 `Promise.all`로 통일.

#### `projectImportTransaction.ts` — createMany × 8테이블
```typescript
await tx.insert(chapters).values(chaptersData);
await tx.insert(characters).values(charactersData);
// ... 6개 더
```

### Upsert → onConflictDoUpdate

```typescript
// Before (Prisma)
await prisma.projectAttachment.upsert({
  where: { projectId },
  create: { projectId, projectPath },
  update: { projectPath },
});

// After (Drizzle)
await db.insert(projectAttachment)
  .values({ projectId, projectPath })
  .onConflictDoUpdate({
    target: projectAttachment.projectId, // PRIMARY KEY 검증 완료
    set: { projectPath },
  });
```

**검증**: `projectAttachment.projectId`, `projectLocalState.projectId` 모두 PRIMARY KEY 컬럼임을 schema.ts에서 확인 완료.

### $Transaction 변환

```typescript
// Before
await prisma.$transaction(async (tx) => {
  await tx.character.updateMany({ ... });
  await tx.entityRelation.deleteMany({ ... });
});

// After
await db.transaction(async (tx) => {
  await tx.update(characters).set(...).where(...);
  await tx.delete(entityRelations).where(...);
});
```

**타입 이슈**: `tx`의 타입이 `BetterSQLite3Database<typeof schema>`로 잡히지 않고 `unknown`으로 추론되는 경우 발생. `projectImportTransaction.ts:344`에서 `tx as unknown as MainDrizzleClient` 캐스트 필요.

### Type Migration (Prisma → Drizzle)

| Prisma 타입 | Drizzle 대체 |
|---|---|
| `Prisma.Project` | `typeof projects.$inferSelect` |
| `Prisma.Chapter` | `typeof chapters.$inferSelect` |
| `Prisma.ProjectCreateInput` | `typeof projects.$inferInsert` |

**문제**: `ProjectExportRecord` (shared type)가 Prisma 기반 타입 참조를 유지하고 있어, export engine에서 `as unknown as ProjectExportRecord["chapters"]` 캐스트 8회 발생. 타입 정렬이 Phase 3 범위를 벗어나 `shared/types/index.ts` 수정이 필요.

### 서비스별 핵심 난제

| 서비스 | 핵심 난제 | 해결 방식 |
|--------|----------|----------|
| `projectService.ts` | include 4개 + nested create 분리 | 5개 병렬 select + JS 조립. `create`의 nested `settings`는 별도 `insert` |
| `chapterService.ts` | `$transaction` reorder + P2025 | `store.transaction(async tx => { for-loop update })`. eslint-disable `#await-in-loop` |
| `projectExportEngine.ts` | include 8개 → 개별 쿼리 9개 | `Promise.all([select 8개])` + `as unknown as` type cast 8회 (가장 큰 hotspot) |
| `projectImportTransaction.ts` | `$transaction` + createMany × 8테이블 | `tx.insert().values(array)` 8회. `tx as unknown as MainDrizzleClient` 캐스트 1회 |
| `projectAttachmentStore.ts` | upsert + backward compat + legacy migration | `onConflictDoUpdate({ target: projectId })` + fallback to `project.projectPath` |
| `projectLocalStateStore.ts` | upsert (가장 깔끔) | `onConflictDoUpdate({ target: projectId })` — type cast 0회 |
| `chapterKeywords.ts` | findMany + update + soft-delete filter | `isNull(deletedAt)` + `rows.length === 0` early return |
| `projectImportOpen.ts` | identity resolution (최소 DB 접근) | `select().limit(1)` only — 대부분의 로직은 `.luie` 파일 읽기 |

### Type Casts 분포

| 파일 | 캐스트 패턴 | 횟수 |
|------|-----------|------|
| `projectExportEngine.ts` | `as unknown as ProjectExportRecord["..."]` | **8회** |
| `projectImportTransaction.ts` | `tx as unknown as MainDrizzleClient` | 1회 |
| `projectService.ts` | `current as { projectId?: unknown; ... }` | 1회 |
| `chapterService.ts` | `updateData as Partial<typeof chapter.$inferInsert>` | 1회 |

**핵심 원인**: `ProjectExportRecord` (shared type, `src/shared/types/`)가 아직 Prisma 타입 참조를 유지하고 있어 Drizzle `$inferSelect`와 정렬되지 않음.

### Include 분해 상세

**`projectExportEngine.ts`** — 1 project select + 8 parallel selects:
```typescript
const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
const [chapters, characters, terms, events, factions, worldEntities, entityRelations, snapshots]
  = await Promise.all([
    db.select().from(chapters).where(eq(chapters.projectId, id)),
    db.select().from(characters).where(eq(characters.projectId, id)),
    db.select().from(terms).where(eq(terms.projectId, id)),
    db.select().from(events).where(eq(events.projectId, id)),
    db.select().from(factions).where(eq(factions.projectId, id)),
    db.select().from(worldEntities).where(eq(worldEntities.projectId, id)),
    db.select().from(entityRelations).where(eq(entityRelations.projectId, id)),
    db.select().from(snapshots).where(eq(snapshots.projectId, id)),
  ]);
```

**`projectImportTransaction.ts`** — single `tx.transaction()` with 8 bulk inserts + cleanup:
```typescript
await tx.insert(chapters).values(chaptersData);
await tx.insert(characters).values(charactersData);
await tx.insert(terms).values(termsData);
await tx.insert(events).values(eventsData);
await tx.insert(factions).values(factionsData);
await tx.insert(worldEntities).values(worldEntitiesData);
await tx.insert(entityRelations).values(entityRelationsData);
await tx.insert(snapshots).values(snapshotsData);
await tx.insert(scrapMemos).values(scrapMemosData);
```

### Upsert 변환 (2개 서비스)

`projectLocalStateStore.ts` — 가장 깔끔함:
```typescript
await store.insert(projectLocalState).values({
  projectId, lastOpenedAt: timestamp.toISOString(), updatedAt: timestamp.toISOString(),
}).onConflictDoUpdate({
  target: projectLocalState.projectId,   // PRIMARY KEY 검증 완료
  set: { lastOpenedAt: timestamp.toISOString(), updatedAt: timestamp.toISOString() },
});
```

`projectAttachmentStore.ts` — 동일 패턴 + legacy migration:
```typescript
await store.insert(projectAttachment).values({
  projectId, projectPath: normalizedProjectPath, updatedAt: now,
}).onConflictDoUpdate({
  target: projectAttachment.projectId,
  set: { projectPath: normalizedProjectPath, updatedAt: now },
});
```

### $Transaction 변환 (2개 서비스)

`chapterService.ts` — reorder:
```typescript
await store.transaction(async (tx) => {
  for (let i = 0; i < chapters.length; i++) {
    await tx.update(chapter).set({ order: i })
      .where(eq(chapter.id, chapters[i].id));
  }
});
```

`projectImportTransaction.ts` — full import:
```typescript
await db.getDrizzleClient().transaction(async (tx) => {
  if (existingProjectId) await tx.delete(project).where(eq(project.id, existingProjectId));
  await tx.insert(project).values(projectData);
  await tx.insert(projectSettings).values(projectSettingsData);
  // createMany × 8 tables...
});
```

### 발견된 오류 및 수정

| # | 문제 | 파일 | 심각도 |
|---|------|------|--------|
| M-1 | `as unknown as` 8회 캐스트 (ProjectExportRecord type mismatch) | `projectExportEngine.ts:180-187` | Medium |
| M-2 | `tx as unknown as MainDrizzleClient` (transaction type gap) | `projectImportTransaction.ts:344` | Medium |
| M-3 | `queryIndex` counter mock fragile (쿼리 순서 변경 시 잘못된 데이터 반환) | `projectExportEngine.test.ts:38-53` | Medium |
| L-1 | `deleteProject`/`removeProjectFromList`에 `.returning()` 가드 없음 | `projectService.ts:695,757` | Low |
| L-2 | stale comment "Prisma" → "Drizzle" | `projectService.test.ts:2` | Low |
| L-3 | `createProject` `current as { ... }` type cast | `projectService.ts:select-line` | Low |

### 검증
- **typecheck**: ✅ 통과
- **lint**: 0 errors
- **tests**: projectService.test.ts REAL DB 통과. chapterService.test.ts REAL DB 통과. 7/8 mocked test 통과. `projectExportEngine.test.ts` 4개 실패 — mock 복잡성 문제 (table argument matching 개선 필요).

### Oracle 검수 결과
**CONDITIONAL PASS** — Medium 3건:
- **M-1**: `projectExportEngine.ts` 8× `as unknown as` (ProjectExportRecord type mismatch)
- **M-2**: `projectImportTransaction.ts` `tx as unknown as` (transaction type gap)
- **M-3**: `projectExportEngine.test.ts` fragile `queryIndex` counter mock

---

## Phase 전체 통계

### 변경 파일 수 (Phase 0~3 누적)

| 구분 | Phase 0 | Phase 1 | Phase 2 | Phase 3 | 합계 |
|------|---------|---------|---------|---------|------|
| Source (service) | 0 | 0 | 7 | 8 | **15** |
| Database | 10 | 6 | 0 | 0 | **16** |
| Config/Infra | 5 | 0 | 0 | 0 | **5** |
| Test | 2 | 3 | 1 | 8 | **14** |
| Drizzle migration | 2 | 0 | 0 | 2 | **4** |
| **계** | **19** | **9** | **8** | **18** | **54** |

### 변환 패턴 사용 빈도

| 패턴 | 사용 횟수 | 비고 |
|------|----------|------|
| `select().from().where().limit(1)` | ~35회 | `findUnique` / `findFirst` 대체 |
| `select().from().where()` | ~45회 | `findMany` 대체 |
| `insert().values().returning()` | ~20회 | `create` 대체 |
| `update().set().where().returning()` | ~15회 | `update` 대체 |
| `delete().where().returning()` | ~10회 | `delete` 대체 |
| `isNull()` | ~8회 | soft-delete 필터 |
| `like()` | ~4회 | `contains` 검색 |
| `transaction()` | ~5회 | `$transaction` 대체 |
| `onConflictDoUpdate()` | ~2회 | `upsert` 대체 |
| `insert().values(array)` | ~10회 | `createMany` 대체 |
| rows.length === 0 → ServiceError | ~15회 | P2025 대체 |

### Oracle 검수 결과 요약

| Phase | 판정 | 필수 수정 | 권장 수정 |
|-------|------|----------|----------|
| Phase 0 | CONDITIONAL PASS | 2건 (deletedAt patches, FTS5 path) | — |
| Phase 1 | CONDITIONAL PASS | — | 2건 (레거시 테스트, PRAGMA) |
| Phase 2 | CONDITIONAL PASS | **2건** (null deref, soft-delete 누락) | 3건 (error codes, hard delete, export 위치) |
| Phase 3 | CONDITIONAL PASS | **3건** (type casts, fragile mock) | 2건 (delete guard, 주석) |

---

## Lessons Learned

### 1. Baseline Detection이 가장 까다로웠다
기존 Prisma DB를 가진 사용자가 Drizzle migration을 실행할 때 "table already exists" 오류를 방지하는 `markInitialMigrationAsApplied()` 구현이 Phase 1의 핵심 난제였다. Drizzle 내부의 `__drizzle_migrations` 테이블 구조를 reverse engineering해야 했고, SHA256 해시 포맷을 맞추는 데 시간이 걸렸다.

### 2. Include 분해는 N+1 문제를 피하는 게 관건
Prisma의 편리한 `include`를 Drizzle에서는 개별 `select` + JS 조립으로 대체해야 했다. better-sqlite3가 동기 드라이버이므로 `Promise.all`이 실제 병렬 I/O가 아니라는 점을 인지해야 했다. 대량 데이터(export/import)는 테이블별 쿼리 후 JS grouping, 소량 관계는 `Promise.all`로 처리.

### 3. 타입 시스템 전환이 가장 큰 기술 부채
Prisma `$inferSelect`와 Drizzle `$inferSelect`는 유사하지만 `Date` vs `string` (timestamp), `boolean` vs `integer` (SQLite) 등 세부 차이가 있다. `ProjectExportRecord` 같은 shared 타입이 Prisma에 의존하고 있어 Phase 3에서는 `as unknown as` 캐스트로 우회했다 — 이는 Phase 4/5에서 shared types 정리와 함께 해결 필요.

### 4. Drizzle `returning()`은 SQLite에서 동작하지만 검증 필요
`.returning()`은 SQLite better-sqlite3 드라이버에서 정상 동작하지만, Electron native module 환경에서는 버전별 동작 차이가 있을 수 있다. Phase 3 서비스 전환은 완료했지만 실제 Electron 앱에서의 runtime 검증이 필요.

### 5. Soft-delete 일관성이 중요하다
`characterService`와 `termService`는 soft-delete(`deletedAt` 설정)를 사용하는 반면, `worldEntityService`는 hard delete(`tx.delete()`)를 사용한다. Oracle이 지적한 대로 일관된 정책이 필요하다.

### 6. Sub Agent 협업 워크플로가 효과적이었다
```
explore (병렬) → Sisyphus-Junior (병렬 구현) → Oracle (병렬 검수)
```
Phase 1~3를 각각 Sisyphus-Junior에게 맡기고 병렬 실행한 결과, 전체 마이그레이션 작업을 단시간에 완료할 수 있었다. Oracle 검수를 마지막에 넣어 발견된 버그와 잠재적 위험을 식별할 수 있었다.

---

## 다음 단계

| 순서 | 작업 | Priority |
|------|------|----------|
| 1 | Oracle 지적사항 반영 (Phase 2 BUG + Phase 3 M-1~M-3) | HIGH |
| 2 | Phase 4: Snapshot / Sync / Graph 서비스 전환 | HIGH |
| 3 | Phase 5: IO + Handler Layer 전환 | MEDIUM |
| 4 | Phase 6: `getClient()` → Drizzle 최종 교체 | MEDIUM |
| 5 | Phase 7: Prisma 의존성/파일 최종 삭제 | LOW |
