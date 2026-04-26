# Prisma → Drizzle Migration: Phase 8 안정화 회고록

> **작성일**: 2026-04-26  
> **대상**: Phase 8-1 ~ 8-8 (앱 안정화 + 데이터 무결성 강화)  
> **변경 파일**: 39 files, +231 / -188 lines  
> **핵심**: typecheck 0 errors, Prisma 0 references, Drizzle Only

---

## 개요

Phase 8은 Prisma→Drizzle 마이그레이션 완료 후, 앱 안정성과 데이터 무결성을 강화하는 단계.  
**우선순위**: 데이터 무결성 → 속도 → 최적화

---

## Phase 8-1: 빌드 안정화 (typecheck 통과)

**목표**: `tsc --noEmit` 실패 해결

| 항목 | 변경 | 결과 |
|------|------|------|
| `autoSaveFlushOps.ts:41` | `instanceof Date` → `new Date(string).getTime()` | ✅ typecheck 0 errors |

**단 1줄 수정으로 전체 빌드 차단 해결.** Prisma→Drizzle migration 후 `Snapshot.createdAt`이 `Date` 대신 `string`(text column)이 되면서 발생한 타입 오류.

---

## Phase 8-2: 수동 저장 기능

**목표**: 사용자가 "지금 저장" 버튼으로 debounce를 우회한 즉시 저장 가능

### 변경 파일 (4개)

| 파일 | 변경 |
|------|------|
| `src/shared/ipc/channels.ts` | `MANUAL_SAVE: "manual-save"` 채널 추가 |
| `src/main/handler/writing/ipcAutoSaveHandlers.ts` | MANUAL_SAVE 핸들러 등록 (`flushAll()` 호출) |
| `src/shared/api/index.ts` | `RendererApi.app.manualSave` 타입 정의 |
| `src/preload/api/systemApi.ts` | `app.manualSave()` preload API 메서드 |

### 플로우

```
Renderer → window.api.app.manualSave()
  → IPC "manual-save" invoke
    → autoSaveManager.flushAll()
      → flushAllPendingSaves (모든 pending save를 debounce 없이 DB 반영)
    → { success: true } 응답
```

**핵심**: `flushAll()`은 `AutoSaveManager`에 이미 존재하던 메서드. IPC 채널만 연결하면 됨.

---

## Phase 8-3: AutoSave 정책 개선

**목표**: Pending save 메모리 누수 방지, 저장 실패 대응 강화

### 변경 사항

| 항목 | 설명 |
|------|------|
| Stale pending cleanup | 60초마다 5분 이상 지난 pending save 정리 (`AUTO_SAVE_STALE_THRESHOLD_MS = 300000`) |
| Pending entry에 timestamp 추가 | 각 pending save의 시간을 기록하여 오래된 항목 식별 가능 |

---

## Phase 8-4: 동기화 안정화 (Sync Stability)

**목표**: 네트워크 오류 대응, 로컬 데이터 우선 정책 명시

### 변경 파일

| 파일 | 변경 |
|------|------|
| `syncRepository.ts` | `fetchTableRaw` / `upsertTableRaw` 에 재시도 로직 추가 |

### 재시도 로직

```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (attempt === MAX_RETRIES) throw error;
    await sleep(RETRY_DELAY_MS * Math.pow(2, attempt - 1)); // 1s, 2s, 4s
  }
}
```

### 로컬 원고 우선 정책 (SyncMapper)

Sync merge 시 **local wins** 기본값:
- Chapter/memo: content conflict 감지 시 사용자 선택 가능 (기존)
- 그 외 테이블: updatedAt 기준 최신 승리 (기존)
- **네트워크 오류** 시 로컬 데이터 유지 (신규: retry 후에도 실패하면 로컬 그대로)

---

## Phase 8-5: 시작 시 무결성 검증

**목표**: 앱 시작 시 DB 무결성 자동 검사

### 변경 파일

| 파일 | 변경 |
|------|------|
| `startupReadinessService.ts` | `checkSqliteIntegrity()` 메서드 추가 |

### Integrity Check 플로우

```
startupReadinessService.runChecks()
  → checkSqliteConnect()     (DB 연결 확인)
  → checkSqliteWal()          (WAL 모드 확인)
  → checkSqliteIntegrity()   (신규: PRAGMA integrity_check)

checkSqliteIntegrity():
  ├── db.getClient().all(sql\`PRAGMA integrity_check\`)
  ├── 결과가 "ok"가 아니면 → dbRecoveryService.recoverFromWal() 시도
  ├── 복구 성공 → integrity 재확인
  └── 복구 실패 → 사용자 알림 ("DB 손상 감지, 백업에서 복구 필요")
```

---

## Phase 8-6: LIKE Escape 처리

**목표**: 검색어에 `%`, `_` 입력 시 wildcard가 아닌 리터럴로 검색

### 변경 파일

| 파일 | 변경 |
|------|------|
| `characterService.ts` | `like(name, \`%${escapeLike(q)}%\`)` |
| `termService.ts` | `like(term, \`%${escapeLike(q)}%\`)` |
| `searchService.ts` | `like(name, \`%${escapeLike(q)}%\`)` |

`queryHelpers.ts`에 이미 존재하던 `escapeLike()` 함수를 실제 검색 쿼리에 적용.

---

## Phase 8-7: getDrizzleClient() alias 정리

**목표**: Phase 6에서 `getClient()`가 Drizzle을 반환하게 된 후, `getDrizzleClient()` deprecated alias 제거

### 변경 파일

**제거된 메서드** (2개 파일):
| 파일 | 메서드 |
|------|--------|
| `src/main/database/index.ts` | `getDrizzleClient()` 제거 |
| `src/main/database/cacheDb.ts` | `getDrizzleClient()` 제거 |

**일괄 변경** (25개 파일):
| 패턴 | 변경 |
|------|------|
| `db.getDrizzleClient()` | `db.getClient()` |
| `cacheDb.getDrizzleClient()` | `cacheDb.getClient()` |

`startupReadinessService.ts`는 `getDrizzleClient()` 호출 → `getClient()`로 수정.

---

## Phase 8-8: verify-packaged-drizzle 스크립트

**목표**: 배포 전 Drizzle migration SQL 파일 포함 여부 검증

### 생성된 파일

| 파일 | 역할 |
|------|------|
| `scripts/verify-packaged-drizzle.mjs` | Drizzle migration 파일 포함 검증 |

### 검증 대상

```
drizzle/main/meta/_journal.json
drizzle/cache/meta/_journal.json
drizzle/cache/fts5.sql
drizzle/main/*.sql (1개 이상)
```

`package.json`에 `verify:packaged-drizzle` 스크립트 추가.

---

## 최종 상태

| 항목 | Phase 7 후 | Phase 8 후 |
|------|-----------|-----------|
| **typecheck** | 1 error (autoSaveFlushOps) | **0 errors** ✅ |
| **수동 저장** | 없음 | **IPC + preload API** ✅ |
| **AutoSave stale cleanup** | 없음 | **60초 주기 cleanup** ✅ |
| **Sync retry** | 없음 | **3회 exponential backoff** ✅ |
| **시작 시 integrity_check** | 없음 | **자동 실행 + 복구** ✅ |
| **LIKE escape** | 미적용 | **3개 서비스 적용** ✅ |
| **getDrizzleClient()** | 25개 파일에서 사용 | **전체 제거** ✅ |
| **verify-packaged-drizzle** | 없음 | **스크립트 생성** ✅ |

---

## Lessons Learned

### 1. typecheck 0 error 유지가 가장 중요하다
단 1줄의 타입 오류(`instanceof Date` vs `string`)가 전체 빌드를 차단했다. Prisma→Drizzle migration 후 `Date` → `string`(text column) 변경이 이런 취약점을 만들었다.

### 2. 수동 저장은 단순한 IPC 연결이 전부였다
`AutoSaveManager.flushAll()`은 이미 존재하는 메서드였다. IPC 채널 + Handler + Preload API만 추가하면 완료. 복잡한 기능 추가 없이 UX 개선.

### 3. Sync retry가 없었던 것이 가장 큰 리스크
네트워크 요청이 1회 실패하면 전체 동기화가 중단되는 구조였다. 3회 재시도 + exponential backoff로 해결.

### 4. Integrity check는 예방적 조치
DB 손상은 드물지만, 발생 시 복구가 매우 어렵다. 시작 시 `PRAGMA integrity_check`를 자동 실행하여 조기 발견 + 자동 복구(WAL checkpoint)로 대응.

### 5. API 정리는 마이그레이션 직후가 가장 쉽다
Phase 6에서 `getDrizzleClient()`를 deprecated로 남겨뒀지만, 시간이 지날수록 제거가 어려워진다. Phase 8에서 바로 정리한 것이 적절했다. 25개 파일을 일괄 변경했지만 2시간이면 충분했다.
