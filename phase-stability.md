# Phase 8: 앱 안정화 및 데이터 무결성 강화

> **목표**: Prisma→Drizzle 마이그레이션 완료 후, 안정성/데이터 무결성/성능 최적화  
> **우선순위**: 데이터 무결성 → 속도 → 최적화

---

## 현재 상태 진단

### 데이터 무결성 현황

| 계층 | 메커니즘 | 상태 |
|------|---------|------|
| 실시간 | WAL 모드 (auto checkpoint) | ✅ |
| 자동 저장 | Mirror → DB → .luie 3중 저장 | ✅ |
| Crash 대비 | Emergency snapshot + fsync | ✅ |
| 종료 | Critical flush + 다단계 플러시 | ✅ |
| 시작 | 7단계 헬스체크 (DB, WAL, 디스크) | ✅ |
| 무결성 검사 | integrity_check pragma | ⚠️ 수동 복구 시에만 |
| 스냅샷 복구 | 3중 아티팩트 저장 | ✅ |
| Import 롤백 | Transaction + 삭제 롤백 | ✅ |
| Sync 충돌 해결 | baseline + 사용자 선택 | ✅ |

### 미해결 리스크

| 리스크 | 심각도 | 설명 |
|--------|--------|------|
| `autoSaveFlushOps.ts` type error | HIGH | `instanceof` 사용 불가 (`tsc --noEmit` 실패) |
| 시작 시 자동 integrity_check 없음 | MEDIUM | DB 손상 감지가 수동 복구에만 의존 |
| Sync network retry 없음 | MEDIUM | fetchTableRaw 재시도 없음 (일시적 네트워크 오류 대응 불가) |
| 수동 저장 버튼 없음 | MEDIUM | 사용자가 "지금 저장" 불가, debounce만 의존 |
| LIKE escape 미처리 | LOW | 검색어에 %, _ 입력 시 wildcard 동작 |
| getDrizzleClient() alias 잔여 | LOW | deprecated API 코드에 남아 있음 |

---

## Phase 구성

### Phase 8-1: 빌드 안정화

**목표**: `tsc --noEmit` 실패 해결, CI 통과 가능 상태

| 작업 | 파일 | 난이도 |
|------|------|--------|
| `autoSaveFlushOps.ts` type error 수정 | `autoSaveFlushOps.ts:41` | 🟢 |
| `pnpm run typecheck` 통과 확인 | 전체 | 🟢 |

---

### Phase 8-2: 수동 저장 기능

**목표**: 사용자가 명시적으로 "지금 저장"할 수 있는 IPC 채널 + UI 추가

| 작업 | 설명 |
|------|------|
| IPC 채널 추가 | `MANUAL_SAVE` 채널 (`src/shared/ipc/channels.ts`) |
| Handler 등록 | `ipcAutoSaveHandlers.ts` 에 `forceSave()` bypass debounce |
| Preload API | `systemApi.ts` 에 `manualSave()` 추가 |
| Renderer binding | Renderer Context/Hook에서 호출 가능하도록 |

---

### Phase 8-3: AutoSave 정책 개선

**목표**: 데이터 무결성 강화, 저장 실패 시 대응 명확화

| 작업 | 설명 |
|------|------|
| Pending save 메모리 누수 방지 | 주기적 stale pending 정리 |
| 저장 실패 시 재시도 정책 명확화 | 최대 재시도 횟수, exponential backoff |
| AutoSave 상태 UI | Renderer에 "저장 중..." 표시 |
| `shouldDebouncePackageExport` 검토 | debounce 되는 reason 목록 검증 |

---

### Phase 8-4: 동기화 안정화

**목표**: Sync 충돌 해결 강화, 로컬 원고 우선 정책 명시

| 작업 | 설명 |
|------|------|
| Chapter/memo 외 테이블도 content 충돌 감지 | 기본적으로 updatedAt 기준, content 차이도 확인 |
| **로컬 우선 정책 명시화** | 동기화 merge 시 local wins 기본값, remote는 사용자 선택 시에만 |
| Sync network retry 추가 | `syncRepository.fetchTableRaw` 에 재시도 로직 (3회, exponential backoff) |
| Sync 상태 UI 개선 | 마지막 동기화 결과 표시, 실패 사유 명시 |

---

### Phase 8-5: 시작 시 무결성 검증 강화

**목표**: 앱 시작 시 DB 무결성을 자동 검사하고 문제 발견 시 복구

| 작업 | 설명 |
|------|------|
| `startupReadinessService.ts` 에 integrity_check 추가 | DB 초기화 후 `PRAGMA integrity_check` 실행 |
| 손상 발견 시 `dbRecoveryService` 호출 | 자동 WAL 복구 시도 |
| 복구 실패 시 사용자 알림 | "DB 손상 감지 → 백업에서 복구" 안내 |

---

### Phase 8-6: LIKE escape 처리

**목표**: 검색어에 특수문자(%, _) 입력 시 정확한 검색

| 작업 | 파일 | 설명 |
|------|------|------|
| `escapeLike` helper 적용 | `searchService.ts`, `characterService.ts`, `termService.ts` | `like(col, \`%${escapeLike(q)}%\`)` |
| 기존 `like()` 호출 검토 | 전체 서비스 | 패턴 일관성 확인 |

---

### Phase 8-7: getDrizzleClient() alias 정리

**목표**: `getDrizzleClient()` → `getClient()` 로 통일

| 작업 | 설명 |
|------|------|
| `src/main/services/` 전체 grep | `getDrizzleClient()` 호출 → `getClient()` 로 변경 |
| `getDrizzleClient()` 메서드 제거 | deprecated alias 삭제 |

---

### Phase 8-8: verify-packaged-drizzle 스크립트

**목표**: 배포 전 Drizzle migration SQL 포함 여부 검증

| 작업 | 설명 |
|------|------|
| `scripts/verify-packaged-drizzle.mjs` 생성 | migration SQL, _journal.json, FTS5 SQL 존재 확인 |
| `package.json` 에 `verify:packaged-drizzle` 추가 | build 스크립트에 포함 |

---

## 실행 순서

```
Phase 8-1: 빌드 안정화 (type error 수정)        ← FIRST (CI 통과)
Phase 8-2: 수동 저장 기능                        ← HIGH (사용자 요구)
Phase 8-3: AutoSave 정책 개선                     ← HIGH (데이터 무결성)
Phase 8-4: 동기화 안정화 + 로컬 우선 정책         ← HIGH (데이터 정합성)
Phase 8-5: 시작 시 무결성 검증 강화               ← MEDIUM
Phase 8-6: LIKE escape 처리                       ← LOW
Phase 8-7: getDrizzleClient() alias 정리           ← LOW
Phase 8-8: verify-packaged-drizzle 스크립트       ← LOW (배포 전)
```

---

## 우선순위 표

| 순위 | Phase | 이유 |
|------|-------|------|
| P0 | 8-1 | `pnpm run typecheck` 실패 — build 차단 |
| P1 | 8-2 | 사용자가 "지금 저장" 불가 — UX 문제 |
| P1 | 8-3 | 저장 실패 시 데이터 손실 가능성 |
| P1 | 8-4 | Sync 데이터 정합성 — 로컬 원고 우선 정책 |
| P2 | 8-5 | DB 손상 감지 — 예방적 무결성 |
| P3 | 8-6 | 검색 정확도 — 사용자 경험 |
| P3 | 8-7 | API 일관성 — 코드 품질 |
| P3 | 8-8 | 배포 안정성 — 패키징 검증 |
