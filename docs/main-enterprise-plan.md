# Luie Main(Backend) 엔터프라이즈 전환 설계서 (현 구조 반영)

문서 작성일: 2026-02-01  
대상 모듈: src/main 전체  
현 구조 전제: services / handler / manager 유지, shared 및 ipc는 src/shared에 존재

---

## 0. 현재 디렉토리 현실 인식

- src/main
  - core/ (키워드/분석 등 코어 로직)
  - database/ (Prisma 래퍼)
  - handler/ (IPC 핸들러 레이어)
  - manager/ (Window/AutoSave/Settings 관리)
  - services/ (비즈니스 로직)
  - utils/
- src/shared
  - ipc/ (채널/응답 타입)
  - constants/ types/ logger/ schemas/

이 구조를 유지한 채 “레이어 계약/에러/관측성/작업큐”를 강화하는 방향으로 전환합니다.

---

## 1. 아키텍처 및 책임 분리 (현 구조 유지)

### 1.1 handler 레이어 표준화
**AS-IS**
- `registerIpcHandler`는 단순 래핑
- 입력 스키마 검증 부재

**TO-BE**
- handler에서 입력 DTO 검증(Zod) 도입 (src/shared/schemas 활용)
- 표준 응답 메타(요청 ID, 처리시간, 에러 코드) 포함
- 공통 실패 메시지/로깅 규칙 문서화

---

### 1.2 services 레이어 공통 규약
**AS-IS**
- 서비스마다 에러 처리/로깅 방식 상이

**TO-BE**
- `ServiceError` 도입 (code, message, cause)
- `ErrorCode` 매핑 테이블과 에러 분류 규칙 명문화
- 서비스 로깅: `logger.info/warn/error`의 스키마 통일

---

### 1.3 database 레이어 안정화
**AS-IS**
- Prisma Client 직접 사용

**TO-BE**
- `db.getClient()` 사용 범위를 서비스 내부로 제한
- 트랜잭션 정책 문서화
- 마이그레이션/스키마 변경 절차 문서화

---

## 2. 안정성 및 복구

### 2.1 프로세스 안정화
**AS-IS**
- `uncaughtException`, `unhandledRejection` 로깅만 수행

**TO-BE**
- 치명 오류 시 안전 종료 플로우 정의
- `before-quit`에서 `autoSaveManager.flushAll()` 호출
- 비정상 종료 시 마지막 저장 시점 복구 전략

---

### 2.2 AutoSave / Snapshot 신뢰성
**AS-IS**
- 큐 기반 처리만 존재

**TO-BE**
- Retry 정책(지수 백오프) 도입
- 스냅샷 실패 기록 및 복구 경로 제공
- 스냅샷 파일/DB 상태 불일치 점검 루틴

---

## 3. 성능 최적화

### 3.1 FS/Zip 작업 분리
**AS-IS**
- 패키징/압축 작업이 메인 프로세스에서 수행됨

**TO-BE**
- `services` 내부에 JobQueue(비동기 작업 큐) 도입
- 긴 작업은 이벤트로 상태 알림

---

### 3.2 대규모 프로젝트 최적화
**AS-IS**
- Export/Rebuild 시 CPU 부하 증가

**TO-BE**
- 작업 배치 처리
- 프로젝트 규모에 따라 백그라운드 처리로 분리

---

## 4. 보안 및 데이터 무결성

- IPC 입력 검증 강화 (경로/스키마)
- Zip Slip 방지(현재 구현 유지 + 테스트 추가)
- 임시 파일/백업 파일 정리 정책 통일

---

## 5. 운영/관측성

- 요청 ID 기반 로그 표준화
- IPC 처리 시간 측정
- 환경별 로그 레벨 분리

---

## 6. 실행 계획 (Roadmap)

### Phase 0 — 안정화(즉시)
- `before-quit`에서 `autoSaveManager.flushAll()` 실행
- handler 입력 검증(핵심 채널부터)
- 서비스 에러 타입 표준화

### Phase 1 — 구조 강화(단기)
- 서비스/핸들러 공통 규약 문서화
- JobQueue 도입(Export/FS)

### Phase 2 — 성능/관측성(중기)
- IPC 처리 시간/에러 메트릭 수집
- 대규모 작업 백그라운드 처리 강화

---

## 7. 즉시 적용 후보

1) `before-quit`에 `autoSaveManager.flushAll()` 추가
2) Zod 스키마 기반 IPC 입력 검증
3) `ServiceError` 도입 및 `ErrorCode` 매핑 강화
4) Export/Zip 작업 큐화 설계

---

## 8. 다음 액션

- Phase 0 코드 적용 여부 결정
- 우선순위/일정 확정
