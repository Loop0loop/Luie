# Startup Pipeline Dissection — OS 중립 경량화 관점 전체 해부

생성: 2026-09-05. 목적: "Windows에서만 느린가?"가 아니라 "Luie가 OS에 상관없이 가볍게 도는 시스템인가?"에 답하기 위해
시작 파이프라인 전체(메인 부트스트랩 → 데이터 계층 → 렌더러 부트 → 백그라운드 시스템)를 사실 기준으로 고정하고,
크로스플랫폼 위험 지도와 단계별 재구성 방향을 정의한다.

규칙: 사실은 파일:라인 근거를, 추측은 `(추측)`으로 명시한다. 이 문서는 즉시 코드 변경을 지시하지 않는다.

---

## 1. 현재 시작 파이프라인 전체 지도 (사실)

### Phase 0 — 프로세스 진입 (`src/main/index.ts`)

| 순서 | 단계 | 근거 | 비고 |
|---|---|---|---|
| 0-1 | dotenv 로드 → Electron import | `index.ts:2-8` | |
| 0-2 | 싱글 인스턴스 락 (실패 시 즉시 exit) | `index.ts:82-84`, `lifecycle/single-instance/singleInstance.ts:16-25` | `E2E_DISABLE_SINGLE_INSTANCE=1` 우회 |
| 0-3 | 파일 로거 구성 (userData/logs) | `index.ts:20-31` | |
| 0-4 | lazy import 7종 Promise.all (prismaEnv, lifecycle, domains/sync 36파일, utility bridge) | `index.ts:94-110` | 이 시점에 sync 도메인 전체가 모듈 그래프에 진입 |
| 0-5 | 크래시 리포트 등록 (로컬 전용, 네트워크 없음) | `index.ts:112`, `lifecycle/crash/crashReporting.ts` | |
| 0-6 | `luie://` 프로토콜 등록 — **settingsManager(electron-store+레거시 마이그레이션)를 lazy import로 당겨옴** | `index.ts:32-75` | darwin `open-url` 등록은 `index.ts:116-121` |
| 0-7 | `registerAppReady` + `onFirstRendererReady` 콜백에 `syncService.initialize()` 결합 | `index.ts:130-146` | |
| 0-8 | `whenReady` 후 유틸리티 프로세스 fork (fire-and-forget) | `index.ts:148-151`, `utilityProcessBridge/core.ts:57-114` | 헬스 ping 5초 타임아웃, 실패 시 lazy 재시작 |

### Phase 1 — `app.whenReady()` 직렬 초기화 (`lifecycle/app-ready/appReady.ts:69-331`)

**사실: 아래 3개 구간이 전부 직렬 await이고, 이것이 끝나야 첫 창이 생성된다.**

1. `ensureBootstrapReady()` (`appReady.ts:73` → `lifecycle/bootstrap/bootstrap.ts:56-95`)
   - `db.initialize()`: 임시 연결로 `ensurePackagedSqliteSchema`(drizzle migrate + 컬럼/인덱스 패치 + **MemoryChunk FTS trigram 재색인 + ChapterBody 백필** — `database/database/main/databaseSchemaBootstrap.ts:219-265`, `memoryChunkFtsMigration.ts:87-146`) → 실서비스 연결 생성(sqlite-vec 로드, PRAGMA 5종) → (packaged) seed
   - 성공 시 `void triggerLlmfitInstall()` — **부팅 직후 GitHub 다운로드(60초 타임아웃) fire-and-forget** (`bootstrap.ts:23-33,78`)
   - 캐시: Promise 병합 + isReady 캐시. 실패 시 재시도 무백오프 (`bootstrap.ts:57-92`)
2. `await registerAllIPCHandlers()` (`appReady.ts:284-285`)
   - `handler/index.ts:2-39`가 analysis/world/project/sync/memory/llm/derivedJobs 등 **수백 모듈을 정적 import** (도메인 퍼사드가 re-export만 하므로 트리셰이킹 없음)
3. `await startupReadinessService.getReadiness()` (`appReady.ts:293`)
   - **8개 검사 전부 순차 await** (`services/features/startup/startupReadinessService.ts:100-111`): safeStorage → userData 쓰기 프루브 → Documents 프루브 → sqlite connect(여기서 **cacheDb 최초 open + migrate**) → **`PRAGMA integrity_check`(readonly 별도 연결, 전체 DB 스캔, better-sqlite3 동기 = 메인 프로세스 블로킹)** (`:178-223`) → WAL/PRAGMA 검증 → Supabase 설정 → **Supabase 세션 네트워크 fetch(5초 타임아웃)** (`:311-425`, timeout 상수 `:27`)
   - **결과 캐시/무효화 정책 없음 — 호출마다 전체 재검사** (`:50-66`)

이후 분기(`appReady.ts:300-307`): `mustRunWizard`이면 위자드 창(즉시 show), 아니면 메인 창(deferShow).

### Phase 2 — 위자드 창 (렌더러 콜드 부트 #1)

- 위자드 창은 `out/renderer/index.html#startup-wizard`를 로드 — **메인 창과 동일한 풀 번들** (`manager/window/windowStartupWizard.ts:171-178`, `windowRouting.ts:51-59`)
- 렌더러 첫 paint는 `Promise.allSettled([initI18n(), setupRenderer()])` 이후 (`app/main.tsx:74-88`)
  - `initI18n`은 **ko/en/ja 3개 로케일 전부 await** (`i18n/index.ts:42-51,79`)
- 위자드 진행 중 `setStartupWizardSize` → 메인에서 600~800ms easeOutCubic 보간, 렌더러는 **650ms 하드 대기** (`useStartupWizardState.ts:142,148` = 피드백 800ms + 확장 650ms, 합계 1.45초 하드코딩)
- 프로젝트 생성은 `project.create → chapter.create → chapter.update → markOpened → completeStartup` **순차 IPC 폭포** (`useStartupWizardState.ts:166-189`)

### Phase 3 — 위자드 완료 → 메인 창 전환

- 렌더러가 `startup.getReadiness` → `startup.completeWizard` IPC (`useStartupWizardState.ts:91,99`)
- `completeWizard()`는 내부에서 **getReadiness 2회** (before/after, `startupReadinessService.ts:81,86`)
- **스타트업당 getReadiness 전체 재검사 최대 4~5회** (appReady 1 + 렌더러 1 + completeWizard 2 + macOS activate 시나리오)
- 전환 순서: `closeStartupWizardWindow()` **→ 그 후** `startMainWindowFlow` → 새 메인 창 생성(`windowManager.ts:133-257`, deferShow) → **`did-finish-load`까지 show 안 함** (렌더러-ready 유실 시 **8초 폴백** `appReady.ts:20,168-173`) → show 후에도 `BootstrapGate` (`app/App.tsx:478-496`)
- 즉 **동일 번들 콜드 부트 2회 + 창 0개 간극 + show 지연 3단** (`window-all-closed`에서 non-darwin은 quit이므로 간극이 짧아야 성립하는 구조 — `shutdown.ts:219-223`)

### Phase 4 — 메인 화면 초기화

- `useProjectInit` 2단 병렬 폭포: `loadProjects()+loadSettings()` → currentProject 확정 후 5종 로드 (`app/../useProjectInit.ts:29,59-65`)
- `markOpened` 성공 시 `loadProjects()` 재호출 (`App.tsx:135-160`), `loadShortcuts()` (`App.tsx:210-213`)

### Phase 5 — show 후 백그라운드 전개 (0~30초)

| 시점 | 작업 | 근거 |
|---|---|---|
| did-finish-load | 메인 창 표시, derivedJobWorker.start(), syncService.initialize() | `appReady.ts:88-117,97-103` |
| sync initialize | connected && autoSync면 **즉시 startup sync run** (SQLite 번들 수집 + Supabase push/pull) | `syncService.ts:107-109` |
| +1.5s | 지연 유지보수(1회성): 미러 풀순회 flush, 스냅샷 프루닝, 고아 아티팩트 재귀 스캔, 경로 정산, 엔티티/파생/임베딩 purge(dry-run+실행 ×2) | `deferredStartupMaintenance.ts:8,13-83` |
| +수 초 | 임베딩 잡 있으면 llama-server 사이드카 spawn(bge-m3 ~418MB, CPU 4스레드) | `utility/llm/sidecarSupervisor.ts:125-246` |
| 영구 | derivedJobWorker **500ms 폴링** — 잡이 없어도 틱당 3~4개 쿼리, **메인 프로세스에서** | `derivedJobs/derivedJobWorker.ts:37-40,110-121` |

### 정리: 시작 경로에 걸려 있는 비용의 성격

사실: 첫 창 도달 전에 발생하는 작업은 ① 전체 마이그레이션+재색인, ② 전체 DB integrity 스캔, ③ 수백 모듈 로드, ④ 네트워크 검사 2종(llmfit은 fire-and-forget이지만 대역 점유, Supabase 세션은 await)이다. 이 중 OS에 따라 증폭되는 것은 디스크 fsync(integrity/마이그레이션/seed), Defender 실시간 검사(임시 DB 연결·프루브 파일·`.luie` 생성), 네트워크 품질이다. — 즉 **병목은 Windows 고유가 아니라 "첫 창 전 필수 작업 과다"라는 구조 문제**이며, Windows가 증폭기 역할을 한다.

---

## 2. OS 분기 지도 (사실)

| 위치 | 분기 | 내용 |
|---|---|---|
| `index.ts:116` | darwin | `open-url` 딥링크 (그 외 OS는 second-instance argv) |
| `menu.ts:9,14,32` | darwin | 앱 메뉴 (non-darwin은 null) |
| `shutdown.ts:220` | non-darwin | window-all-closed → quit |
| `windowChrome.ts:63,81,125,133,145` | darwin / win32 | hiddenInset+trafficLight / titleBarStyle:"hidden" / trafficLight 좌표 재적용 버그 워커라운드 |
| `windowManager.ts:189` 등 | non-darwin | autoHideMenuBar |
| `ipcWindowHandlers.ts:271,288,306` | darwin | simpleFullScreen, setWindowButtonVisibility |
| `llmfitInstaller.ts:120,259`, `sidecarConstants.ts:3-8` | 플랫폼키 | win32-arm64, linux-arm64 사이드카/llmfit 자산 없음 |
| `modelDownloader.ts:370` | win32 | 바이너리 파일명 |
| 경로 정규화 6곳 (`pathValidation.ts:7,12`, `projectPathPolicy.ts:20` 등) | win32 | 대소문자 무시 정규화 |
| `appUpdateFeedUtils.ts:106-108`, `settingsDefaults.ts:133-135` | win32/darwin | 피드 판정, 단축키/메뉴바 기본값 |
| `cacheSchemaBootstrap.ts:66-83` | (환경) | better-sqlite3 로드 실패 시 `node:sqlite` 폴백 |

사실: Linux 명시 분기는 0개 — Linux는 "non-darwin && non-win32" 공통 경로로 흐른다.

---

## 3. 크로스플랫폼 위험 지도 — 재구성 시 건드리면 안 되는 것

1. **safeStorage blocking 검사** (`startupReadinessService.ts:113-126`): Linux keyring 미구성 환경에서 `isEncryptionAvailable()===false` → 위자드 강제. 이 검사를 경량화 명목으로 제거하면 Linux에서 첫 로그인이 조용히 실패한다. syncAuthService에는 fallback이 있지만 readiness와는 별개 (`syncAuthService.ts:98-170`).
2. **딥링크 이중 경로**: macOS `open-url` vs Windows/Linux `second-instance` argv. `registerSingleInstance`가 프로토콜 등록보다 먼저여야 두 경로가 모두 커버된다. Linux는 DE별 `setAsDefaultProtocolClient` 결과 편차 — 현재의 실패-무시 정책(`index.ts:49-62`) 유지 필요.
3. **창 0개 간극**: 위자드 close → 메인 create 사이 창이 0개가 되는 순간, non-darwin은 quit 위험이, darwin은 `activate` 핸들러 개입 위험이 있다 (`appReady.ts:321-331`, `shutdown.ts:219-223`). "먼저 만들고 닫기"로 순서를 바꾸면 macOS activate가 위자드를 재생성할 수 있다 — 간극 제거 설계가 선행돼야 한다.
4. **window-state 복원 + fitWorkArea**: electron-window-state는 메인 창 전용(`windowManager.ts:146,197`), 위자드 완료 직후 `fitWorkArea:true`가 저장된 state를 **의도적으로** 덮어씀(`:165-177`). 이 동작을 유지하지 않으면 전환 후 작은 창 잔존.
5. **macOS trafficLight 좌표 리셋 버그 워커라운드** (`windowChrome.ts:113-130`): 버튼 가시성 토글 경로는 토글 직후 좌표 재적용 필수 (electron#48463 계열).
6. **메뉴 쌍 계약**: non-darwin `Menu.setApplicationMenu(null)` + darwin만 메뉴바 기본 "visible" (`menu.ts:32-34`, `settingsDefaults.ts:135`).
7. **PRAGMA 계약**: bootstrap 임시 연결은 synchronous 미설정, 서비스 연결은 `FULL`(`databaseService.ts:90-94`), `checkSqliteWal`은 FULL(≥2)을 강제(`startupReadinessService.ts:251-256`). 초기화를 병렬화/재순서화하면 이 검증이 오탐한다.
8. **Prisma baseline + FTS tokenizer 재색인 안전망**: 매 부팅 실행이 "안전장치"다(`databaseSchemaBootstrap.ts:214-217`, `memoryChunkFtsMigration.ts:140-146`). 지연/제거 시 완료 플래그로 대체하지 않으면 기존 유저 DB가 영구 불일치.
9. **이중 프로세스 마이그레이션**: 메인 + 유틸리티 프로세스가 같은 WAL DB에 대해 각자 `ensurePackaged*Schema`를 실행(`utilityProcessMain.ts:21-26`) — busy_timeout으로 흡수되지만 유틸리티가 늦게 뜨면 SQLITE_BUSY 위험. 마이그레이션 소유권은 메인 단일화가 안전.
10. **`.luie` 패키지·경로 정책**: `.luie`는 단일 SQLite 컨테이너(`luieSqliteContainer.ts:89`), win32 경로 lowercase 키(`projectPathPolicy.ts:18-21`) — 정책 변경 시 대소문자 충돌 재발.
11. **런타임 바이너리 다운로드**: llama-server/llmfit은 런타임 다운로드(electron-builder extraResources에 LLM 자산 없음, `electron-builder.json:32-58`). macOS quarantine으로 미서명 바이너리 spawn 차단 가능 `(추측)`, 프록시/오프라인 미지원 `(추측)`, **win32-arm64/linux-arm64 자산 갭(확정)**.
12. **wizard 플래시 방지 계약**: 네이티브 backgroundColor `#212123` ↔ CSS `--color-wizard-bootstrap` 값 일치(`windowStartupWizard.ts:163-165`, `global.tokens.css:32-35`), 메인 창 테마 색 ↔ `--bg-app` 일치(`windowChrome.ts:12-32`). 창 생성 옵션을 바꿀 때 플래시 재발.

---

## 4. 진단 — 왜 OS 무관하게 무겁고, Windows가 특히 증폭되는가

사실(구조): 현재 파이프라인은 4가지 아키텍처 성격을 갖는다.

1. **UI-우선 원칙의 부재**: 첫 창 도달 경로에 DB 마이그레이션·전체 integrity 스캔·네트워크 검사·수백 모듈 로드가 직렬로 매여 있다. 첫 창은 "준비성 검사 결과"가 아니라 "그릴 수 있는 HTML"이다 — 그런데 결과가 나와야 그린다.
2. **감사(audit)가 상태가 아님**: getReadiness는 캐시 없이 호출마다 전체 재검사되고, 스타트업당 4~5회 돈다. 무결성·네트워크·fs 프루브는 "한 번의 판단"이지 매번 재수행할 계산이 아니다.
3. **메인 프로세스 만능 구조**: 500ms 폴링 워커, 유지보수 I/O, sync 수집, 패키지 export가 전부 메인 이벤트 루프에서 돈다. 워커 스스로 tick 지연을 warn하는 설계(`derivedJobWorker.ts:69-80`)는 이 경쟁을 이미 인정하고 있는 셈이다.
4. **창 = 프로세스 콜드 부트**: 위자드 닫기 → 메인 창 새로 생성 → did-finish-load 대기. 동일 번들 2회 콜드 파싱 + BootstrapGate 재대기.

의견: 이 4가지가 해결되면 Windows의 증폭기(Defender·fsync·디스크)는 남더라도 체감 임계는 크게 내려온다. 반대로 이 4가지를 안 고치면 Windows 특정 튜닝은 표면만 긁는다.

---

## 5. 목표 — "OS에 상관없이 가볍게 도는" 시스템 설계

### 원칙 (P0~P6)

- **P0 첫-창-우선**: 첫 창 표시 경로에는 DB 쓰기·전체 스캔·네트워크·대형 모듈 로드를 두지 않는다. 첫 창은 설정 스토어(electron-store) 수준의 최소 상태만으로 그린다.
- **P1 준비성은 상태, 반복 감사가 아니다**: readiness는 1회 평가 → 캐시 스냅샷 → 설정/스키마 변경 시에만 무효화. integrity_check는 부팅 경로에서 제거하고 `quick_check` + 완료 플래그 기반 주기적 백그라운드 검사로 이동.
- **P2 창은 자산이다**: 위자드 진행 중 메인 창을 hidden으로 pre-warm하고, 전환은 "닫고 생성"이 아니라 "숨기고 보여주기/교체"다. 렌더러 프로세스·번들 파싱 비용을 1회로 수렴시킨다.
- **P3 작업 3분류 — 대화형 / 백그라운드 / 유지보수**: 메인 이벤트 루프는 대화형 전용. 백그라운드(derived job, 임베딩, sync 수집)와 유지보수(스냅샷 프루닝, purge, export)는 유틸리티 프로세스로. 폴링(500ms)은 이벤트 기반 wake(잡 enqueue 알림)로 대체.
- **P4 부팅 구간 네트워크 격리**: 첫 창 전/직후에는 외부 네트워크 호출(llmfit 설치, Supabase 세션, startup sync run)을 금지하고 idle 스케줄러(+백오프 재시도)로 이동. 오프라인·프록시 환경에서도 동일하게 동작해야 OS 무관성이 성립한다.
- **P5 렌더러 예산제**: 창별 엔트리(선례: `auth-result.html`), 기능 단위 청크 경계, 부트 그래프에서 export 계열 라이브러리(docx/jszip/dompurify/diff) 분리, i18n은 감지 언어 1개 초기 주입. 첫 paint 전 await 체인은 테마 시드 수준으로 최소화.
- **P6 데이터 계층 단일 소유**: 프로세스당 DB 연결 1회 수렴(현재 정상 부팅 기준 메인 DB 3회/캐시 DB 2회 + 유틸리티 2회), 마이그레이션 소유권은 메인 전담, 무거운 백필/재색인은 완료 플래그 기반 1회성 + 이후 지연 작업. 내구성 정책(`synchronous=FULL → NORMAL` + 스냅샷 미러 이중화)은 별도 결정안으로.

### 단계별 실행 계획 (위험 오름차순)

**Phase A — 측정·고정 (동작 변경 없음)**
- `Startup checkpoint` 로그 집계로 실측 병목 확정(Windows/macOS/Linux 각 1대).
- `pnpm build` 후 `out/renderer/assets` 청크 바이트 실측 → 본 문서 (추측) 항목을 사실로 치환.
- 시작 예산(SLO) 정의: `first-window ≤ Xms`, `first-interaction ≤ Yms` — check 스크립트 형태로 회귀 게이트화(기존 `check:writing-loop-regression` 패턴 준용).

**Phase B — 저위험 단순화 (플랫폼 공통, 계약 불변)**
- readiness 캐시+무효화 도입, completeWizard의 2회 재검사 제거.
- 위자드 1.45초 하드코딩 대기 → 애니메이션 완료 이벤트/`data-animations` 연동.
- i18n 감지 언어 1개 초기 로드(`ensureLanguageResources` 경로는 이미 존재 — `i18n/index.ts:32-40`).
- manualChunks 재편: zod를 vendor-data에서 분리, reactflow CSS를 캔버스 청크로 이동.
- cacheDb 초기화를 첫 검사/파생 작업 시점으로 지연(구조적으로 self-hydrate 가능 — `chapterSearchCacheService.ts:350-390`).
- `integrity_check → quick_check` + 주기 백그라운드 검사(완료 플래그).

**Phase C — 창·프로세스 전환 재구성 (macOS/Linux 위험 지도 3~5번 통과 필요)**
- 위자드 중 메인 창 pre-warm(hidden) → 전환 시 show/교체. 창 0개 간극 제거(quit/activate 개입 방지 설계 선행).
- show 트리거를 `did-finish-load` → `ready-to-show`+렌더러 첫 프레임 신호로 앞당김, 8초 폴백 단축.
- `handler/index.ts` 모듈 그래프 lazy 로딩(채널 등록기 경계 유지 — `check:ipc-*` 게이트 통과 필수).
- 유틸리티 프로세스를 요청 기반 lazy start로(현재 whenReady 즉시 fork — 유휴 사용자에게 낭비).

**Phase D — 아키텍처 이행 (migration-guardrails 준용)**
- derivedJobWorker·유지보수 작업을 유틸리티 프로세스로 이동, 잡 큐 이벤트 기반 wake.
- 백필/재색인의 완료 플래그 기반 1회성 전환 + 마이그레이션 메인 전담화.
- 부팅 네트워크 격리(llmfit·sync·세션 체크 idle 이동) + 재시도/백오프.
- 내구성 정책 결정: `synchronous=FULL→NORMAL` + 미러/스냅샷 이중화 근거 문서화.

### 각 단계 공통 게이트

- `pnpm run typecheck`, `pnpm run qa:core`, `check:ipc-*`, `check:utility-process-boundary`, `check:main-service-boundaries` 전부 통과.
- 플랫폼 스모크: Windows(`build:win:x64`), macOS(release-macos 워크플로), Linux(AppImage 빌드) 각 1회 부팅 checkpoint 로그 비교.
- 되돌림 수단: `LUIE_*` env 플래그로 신구 경로 병행(기존 관례: `LUIE_DISABLE_STARTUP_MAINTENANCE` 등).

---

## 5a. 확정 원칙 (2026-09-05 합의 — 이후 작업의 판단 기준)

1. **데이터 형식 불변**: 이 작업은 SQLite 스키마, drizzle 마이그레이션 파일, `.luie` 컨테이너 형식을 절대 변경하지 않는다. 변경 대상은 데이터 절차(초기화 시점, 검사 강도, 내구성 정책, 소유권)에 한정한다. 기존 유저 DB·`.luie`는 업그레이드 후 그대로 사용되어야 한다.
2. **단일 파이프라인 + 어댑터**: 시작 파이프라인 토폴로지는 OS 무관하게 하나다. OS 차이는 기존 어댑터 지점(windowChrome 옵션, sidecarConstants 자산 매핑, pathValidation 정규화 등)과 **기능(capability) 플래그**(safeStorage 가용, 애니메이션 지원, reduced-motion)로만 표현한다. OS 문자열(`win32`/`darwin`) 기반 파이프라인 분기를 새로 만들지 않는다. Windows 특유의 느림은 OS 분기가 아니라 checkpoint 실측 기반 스케줄링(지연, idle 트리거)으로 흡수한다.
3. **UI 디자인 불변**: 첫 paint 이후의 화면 디자인·토큰·컴포넌트는 변경하지 않는다. 변경 가능한 것은 창 전환 타이밍(위자드→메인)과 부트 순서이며, 창 배경색 계약(`--color-wizard-bootstrap` ↔ 네이티브 backgroundColor, `--bg-app` ↔ `resolveWindowBackgroundColor()`), trafficLight 좌표 재적용, window-state 복원, `fitWorkArea` 동작은 보존 계약이다.
4. **롤백 가능성**: 각 동작 변경은 `LUIE_*` env 플래그로 신구 경로 병행(기존 관례: `LUIE_DISABLE_STARTUP_MAINTENANCE` 등 준용)하며, 단계별로 `pnpm run typecheck` + `qa:core` + `check:ipc-*`/`check:utility-process-boundary` 게이트를 통과한다.

## 5b. Phase A 실측 결과 (2026-09-05, Windows 11 — 추측을 사실로 치환)

### 실측 1: 렌더러 부트 페이로드 (`pnpm build` 후 `out/renderer`)

사실: `index.html`이 modulepreload하는 부트 JS는 **18개 파일 1,111.1 KB** + 부트 CSS(index) **162.5 KB**. 위자드 창/메인 창 모두 동일 페이로드를 로드한다.

| 청크 | 크기 | 비고 |
|---|---|---|
| vendor-react | 408.1 KB | **@tiptap/react·@tiptap/core가 포함됨 — 버그** |
| vendor-prosemirror | 340.9 KB | **부트에 정적 preload — 버그** |
| vendor-data | 128.7 KB | zod가 전체 청크(supabase/jszip/docx/dompurify/diff)를 부트로 당김 — 확인됨 |
| index (엔트리) | 61.4 KB | |
| vendor-ui | 57.2 KB | |
| chapterStore/es2015 등 기타 | ~115 KB | |

원인 규명(사실): `electron.vite.config.ts`의 manualChunks에서 `id.includes("/react/")` 매칭이 `node_modules/@tiptap/react/...` 경로와도 일치한다(@tiptap/react가 vendor-react로 편입). @tiptap/react는 @tiptap/core와 prosemirror를 정적 import하므로 vendor-react → vendor-prosemirror 정적 의존 엣지가 생기고, 둘 다 부트 preload에 포함된다. 즉 **에디터를 렌더하지 않는 위자드·export 창도 ~750KB의 에디터 라이브러리를 파싱한다.** (추가: `/i18next` substring 매칭은 i18next-browser-languagedetector까지 vendor-react에 흡수 — 무해하나 segment 단위 매칭이 필요)

### 실측 2: 부팅 checkpoint 로그 (`%APPDATA%\luie\logs\luie.log`, 3회 부팅)

**packaged(2026-09-04, isPackaged:true)** — 구조적 진단과 별개로 이 부팅은 빠르다:
- App ready +77ms → IPC handlers ready +431ms → readiness 평가 +573ms → **위자드 창 요청 +698ms, 렌더러 로드 완료 +868ms**
- 소규모 DB에서는 integrity/migrate 비용이 수십~수백 ms 수준. DB 성장 시 이 구간이 확대된다(정적 분석 결론 유지).

**dev(2026-09-05, pnpm dev)** — 체감 슬로우의 주범은 dev 서버 콜드 변환:
- 위자드 렌더러 로드 완료 **+29.5s / +41.9s** (Vite가 대형 모듈 그래프를 on-demand 변환하는 콜드 비용)
- 로드 후 첫 프레임 painted +794ms (i18n 3-로케일 + setup 대기 — 섹션 1 Phase 2 진단과 일치)
- 위자드 완료 → 메인 창 표시: +2.3s (Vite 웜 상태, 콜드 부트 #2의 정황 증거)
- 그 외 실측: `llmfit install attempted during bootstrap`(부팅 중 네트워크 확인), 유틸리티 프로세스 헬스체크 실패 1회(자동 재시작 없음 — utilityStarted:false), deferred maintenance 20ms(소규모 데이터)

**해석(의견)**: prod 첫 창은 1초 내외로 양호하지만, ① dev 환경 체감 지연은 렌더러 모듈 그래프 규모 문제(=부트 페이로드 문제와 동일 원인)이며, ② prod는 DB/데이터 성장 시 Phase 1 직렬 구간이 확대되는 구조적 노출이 그대로 있다. 부트 페이로드 축소는 dev 콜드 변환 시간도 직접 줄인다.

### SLO 기준안 (Phase A-3, 실측 기반)

| 지표 | 현재 | 1차 목표(Phase B 후) | 게이트 방식 |
|---|---|---|---|
| 부트 JS 페이로드 (modulepreload 합계) | 1,111 KB | ≤ 700 KB (prosemirror/vendor-data 분리 시 예상) | `check:render-boot-budget` 스크립트 |
| 부트 CSS | 162.5 KB | ≤ 120 KB (reactflow CSS 분리 후) | 동일 스크립트 |
| prod: 첫 창 표시 (bootstrap→wizard/main shown) | ~0.9s | ≤ 1.0s 유지 (DB 성장해도) | checkpoint 로그 |
| prod: bootstrap→IPC ready | 354ms | DB 성장 구간 분리 후 소폭 유지 | checkpoint 로그 |
| dev: 위자드 로드 완료 | 29~42s | 모듈 그래프 축소에 비례 감소 | 수동 관측 |
| readiness 전체 재평가 횟수/부팅 | 최대 4~5회 | 1회 + 무효화 | 로그 계수 |

## 5c. Phase B 진행 결과 (2026-09-05)

| 항목 | 상태 | 결과 |
|---|---|---|
| B-1 manualChunks segment 매칭 수정 + zod 분리 | **완료** | 부트 JS 1,111.1 → **573.1 KB(-48%)**. vendor-prosemirror(341KB)·vendor-data(129KB)가 부트 preload에서 제거됨. vendor-react 408→247.7KB(순수 react 스택). `check:render-boot-budget` 예산 600KB로 하향 고정 |
| B-2 i18n 감지 언어 1개 로케일 초기 로드 | **완료** | `initI18n`이 감지 언어+fallback(ko)만 주입(`i18n/index.ts` `loadInitialLocaleResources`). 나머지 로케일은 `ensureLanguageResources` 경로로 지연. `check:i18n-parity` 통과 |
| B-3 readiness 캐시 | **완료** | `startupReadinessService`에 5초 TTL 캐시 + 진행 중 promise 병합 + `setStartupCompletedAt` 시 무효화. 부팅당 전체 재평가 최대 4~5회 → 1~2회 |
| B-4 위자드 리사이즈 블라인드 대기 제거 | **완료** | `WINDOW_SET_STARTUP_WIZARD_SIZE` 핸들러가 애니메이션 완료까지 await해 반환(중단 시 이전 awaiter resolve 보장). 렌더러는 IPC 완료를 직접 대기 — 650ms 블라인드 타이머 제거, 애니메이션 꺼짐 시 즉시 진행. 완료 피드백 800ms는 의도된 UX라 유지 |
| B-5 cacheDb 지연 + quick_check 전환 | 보류 | 데이터 절차 변경 — 별도 배치로 진행(§3 위험 지도 7~9번 검토 후) |

검증: `check:render-boot-budget` 통과(573.1/600KB), `check:i18n-parity` 통과. 
`startupReadinessService`·`ipcWindowHandlers`·`startupWizard*` 테스트의 실패 4건은 stash 기준선에서도 동일한 **사전 존재 실패**로 본 작업과 무관. `typecheck`의 `Sidebar.tsx:157 handleRenameProject` 미사용 에러 1건도 사전 존재(본 작업 파일 아님).

## 5d. Phase C-1/C-2 진행 결과 — 첫-창-우선 (2026-09-05)

사용자 실측: "로딩중... 이 뜰 때까지 5초 이상" — 원인은 위자드 창 생성이 readiness 전체 평가(integrity 스캔 + Supabase 세션 네트워크 최대 5초)까지 직렬 대기하는 구조(§1 Phase 1).

**C-1 첫-창-우선 재구성** (`lifecycle/app-ready/appReady.ts`):
- 위저드 필요 여부를 `isStartupWizardForced() || !completedAt`만으로 1차 판정(cheapNeedsWizard)하고, 참이면 **IPC 핸들러 등록 직후 위자드 창을 즉시 생성**한다. bootstrap·readiness는 백그라운드로 진행되고, 위저드 UI는 기존대로 `startup.getReadiness` IPC(B-3 캐시와 병합)로 결과를 받아 단계를 연다.
- blocking 검사 실패는 이 1차 판정에 위저드를 "추가"할 뿐 반대로 만들지 않으므로, 놓친 실패는 전체 평가와 위저드 완료 게이트가 보정한다. completedAt이 있는 정상 부팅은 기존대로 readiness 평가 후 메인 창 흐름을 유지해 라우팅 의미를 보존했다.
- `triggerFirstRendererReady`는 캡처된 bootstrap 상태 대신 캐시된 `ensureBootstrapReady` promise를 다시 읽어, 창 표시가 bootstrap 완료보다 빠른 위자드 경로에서도 derived job worker 시작이 유실되지 않게 했다.

**C-2 readiness 검사 병렬화** (`startupReadinessService.runChecks`):
- 8개 검사를 직렬 await에서 병렬로 전환. `checkSqliteConnect`(db.initialize = DB 파일 생성) 완료 후 integrity/WAL이 시작되는 체인만 유지해 첫 실행에서 DB 파일이 없는 상태의 integrity 오탐을 방지한다. 반환 순서는 원본 유지(진단 UI 표시 순서 보존). 총 대기 = 합계 → 최댓값(네트워크 5초는 integrity 스캔과 겹침).

**실측(dev, 강제 위자드 부팅)**: Main bootstrap → App ready +75ms → IPC ready +262ms → **위자드 창 생성 +431ms** (기존: readiness 평가가 +0.8s~5.8s를 선행한 뒤에야 창 생성). 백그라운드 readiness 완료 +784ms. 참고: dev에서 렌더러 첫 프레임까지의 잔여 시간은 Vite dev 서버의 모듈 콜드 변환 지배 — B-1의 모듈 그래프 축소가 이 비용도 함께 줄인다.

검증: typecheck 통과(사전 존재 `Sidebar.tsx` 에러 제외), `appReadyDeferredWorker`·`startupReadinessService`·`deepLink` 테스트 6건 통과.

## 5e. Phase C-3/C-4 진행 결과 (2026-09-05)

**C-3 위자드→메인 "교체" 전환** (`appReady.ts`):
- 기존 "위자드 닫기 → 메인 창 생성 → 렌더러 로드 → 표시"는 창 0개 빈 화면 구간을 만들었다(non-darwin quit 위험 + 콜드 부트 동안 공백). 이제 `onWizardCompleted`에서 `wizardClosePending = true` 후 메인 창을 deferShow로 생성하고, **메인 렌더러 준비(did-finish-load 또는 폴백 타이머) 시점에 show와 함께 위자드를 닫는다.** 8초 폴백도 같은 경로를 타므로 렌더러 로드 실패 시에도 위자드가 닫힌다.
- `closeStartupWizardWindow`는 이미 destroyed 가드가 있어 중복 닫기 안전. 위자드↔메인 공존 구간이 생기므로 `ipcWindowHandlers`의 "공존 없음" 주석을 실제 동작에 맞게 갱신(포커스 판정 우선, 위저드 폴백은 차순 — 로직 자체는 변경 없음).

**C-4 유틸리티 프로세스 lazy start** (`index.ts`):
- whenReady 즉시 fork 제거. bridge의 `embed/askRagQa/generateText`는 이미 `start()`를 자체 보장하고 `getSidecarStatus`는 미기동 시 `stopped`를 반환하므로, 첫 LLM/임베딩/RAG 요청 시점에 fork된다. 임베딩·LLM 미사용 부팅에서 fork+헬스체크(≤5s)와 프로세스 상주 제거.

**실측(dev, 정상 부팅)**: App ready +94ms → IPC ready +259ms → readiness 평가 +478ms → 메인 창 요청 +638ms. 로그에 "utility process" 체크포인트가 사라진 것으로 lazy 전환 확인. 참고: dev에서 8초 폴백이 발화한 것은 Vite 모듈 콜드 변환(수십 초) 때문으로, prod의 868ms와는 무관한 dev 전용 현상 — B-1의 부트 그래프 축소가 이 변환량도 줄인다.

검증: typecheck 통과(사전 존재 에러 제외), 관련 테스트 통과(유일 실패 1건은 사전 존재 `INVALID_INPUT malformed chapter id`). 교체 전환의 위자드 전 구간(완료→메인 진입)은 인터랙티브 스모크 권장.

## 6. 열린 질문 (결정 필요)

1. integrity/마이그레이션 안전망을 "완료 플래그"로 바꿀 때, 기존 유저 DB의 어떤 상태를 신뢰할 것인가(버전 마커 기준).
2. `synchronous` 내구성 정책 — 스냅샷 미러를 공식 내구성 계층으로 승격할 것인가.
3. 유틸리티 프로세스로 이동할 작업의 경계(상태 브로드캐스트는 메인 전용이라 sync 수집은 분리 난이도 높음).
4. 위자드를 메인 창 내부 라우트로 통합할 것인가(창 2회 부트 제거의 가장 확실한 방법이지만 window-state/activate 개입 설계 필요).
5. win32-arm64/linux-arm64 사이드카 자산 지원 여부(배포 정책 문제).
