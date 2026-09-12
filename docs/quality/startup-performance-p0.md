# P0 시작 성능 측정·테스트 기록

> 2026-09-10 검토 후: 아래는 과거 실행 이력이다. timeout 뒤 늦은 완료가 성공 판정을 덮어쓰는 실행기 결함이 확인되어, 기존 테스트/실측 결과를 현재 승인 근거로 사용하지 않는다. 수정·신규 테스트 로직·관찰 결과·미검증 범위는 [판정 오류 수정 기록](startup-benchmark-outcome-review-2026-09-10.md)을 참조한다. 최종 수용은 사용자 검토 대기다.

상태: **진행 중 — Windows 실기 계측 전.** P0만 수행하며 P1 최적화와 sidecar 비활성화는 아직 구현하지 않는다. ISTQB 관점의 위험 기반 설계·동등 분할·경계값·상태 전이·요구사항 추적을 적용한다. 인증이나 모든 기기의 성능 보장을 뜻하지 않는다.

후속 승인(2026-09-10): Windows 실측을 보류한 채 코드로 입증되는 공통 preview 의존성을 먼저 분리했다. 이 문서는 P0 당시 기록이며, 이후 제품 변경/검증은 [P1-1 기록](startup-performance-p1.md)에 구분한다. P0의 Windows 완료 조건은 여전히 미충족이다.

`qa-agent`의 재현·위험 우선 기준과 `ponytail`의 기존 도구 재사용 원칙을 적용해 제품 코드 대신 테스트 진입점만 추가했다. QA 스킬의 일부 보조 지침 파일은 없어 읽을 수 있는 실행 지침과 저장소 테스트 규칙을 사용했다. graph MCP를 먼저 조회했고, 새 실행기 노드는 아직 반환되지 않아 해당 변경은 소스·직접 실행 테스트로 확인했다.

## 1. 사용자 보고와 가설

| ID | 환경 | 관찰 | 미확정 조건 |
| --- | --- | --- | --- |
| MAC-01 | MacBook Air M4, 16GB, macOS | 약 1초, 원활함 | OS 버전, 당시 artifact/commit, 측정 시작·종료점 |
| WIN-01 | i5-9400F, RX 570, 16GB, SSD, Windows 11 x64 실기 | Wizard·main window 약 3초. portable·개발 실행 모두 비슷함 | GPU 드라이버, Windows 빌드, 앱/Electron 버전, 신규/기존 프로필, 두 창 시간의 개별 정의 |
| VM-01 | Apple CPU로 표시되는 Windows 11 VM, RAM 8GB, SSD | 5초 이상 | VM 제품/버전, host/vCPU, guest OS arch, **실행 앱 arch**, 가상 GPU·가속·공유 메모리 |

모두 사용자의 체감 보고이며 자동 계측값이 아니다. VM ARM64는 추정이므로 확정하지 않는다. `process.arch`는 실행 중 앱의 아키텍처로 기록하며 host/guest 아키텍처를 대신하지 않는다. VM을 Windows 실기 저사양 대표로 사용하지 않는다.

현재 판단: portable와 개발 실행이 비슷하므로 압축 해제 **단독** 원인 가설의 우선순위를 낮춘다. renderer 가설에는 Wizard가 후속 editor 청크까지 정적 의존한다는 코드 근거가 있다. 하지만 main IPC 등록·DB 작업·설정/i18n gate·GPU 합성 비용을 아직 분리하지 못했다. RAM·GC·GPU 중 하나를 확정 원인으로 쓰지 않는다.

## 2. 자동 측정 범위와 왜곡

`pnpm bench:startup`은 설치된 Playwright/Electron과 **production 빌드 JS**를 실행한다. 새 dependency, 제품 sampler, native addon, IPC 채널을 추가하지 않는다. 테스트 전용 `startup-probe.cjs`가 제품 main import 전에 새 임시 userData/sessionData/DB를 설정한다. 사용자의 원고·설정·모델을 복사하거나 지우지 않는다. 증거 디렉터리는 자동 삭제하지 않는다.

통제 조건은 결과 JSON에도 남긴다.

- 실제 `luie://` 연결 보호를 위해 테스트 프로세스의 등록 API만 false로 대체한다. 제품의 등록 실패 경로를 실행한다.
- 기존 `LUIE_DISABLE_SYNC=1` 사용. llmfit 최신 release fetch는 테스트에서 503 응답으로 대체해 자동 바이너리 설치를 막는다. **전체 offline 시뮬레이션이나 제품 sidecar 차단 완료가 아니다.** 모델 다운로드 버튼은 누르지 않는다.
- Playwright inspector 연결과 테스트 wrapper가 있다. portable launcher·release fuse·OS 검사까지 포함한 배포 성능 인증이 아니다. 보안 fuse, sandbox, GPU 가속 설정을 변경하지 않는다.
- fresh는 **새 앱 프로필**이지 OS 파일 캐시 cold가 아니다. repeat는 이번 실행기가 만든 동일 프로필의 **미완료 Wizard 재시작**이지 기존 완료 사용자의 main window 재시작이 아니다.
- 자동화가 heading 표시를 관찰한 시간은 실제 표시 시각의 상한에 가까운 관찰값이다. 최초 OS paint·React commit·입력 가능 시각과 같다고 부르지 않는다. 자동화 연결 이후에야 관찰하므로 실제 OS 창 표시 지연은 외부 녹화/trace가 필요하다.
- schema v2는 `introObservedMs`(DOM 관찰)와 `introOpaqueObservedMs`(heading/조상 opacity 곱 ≥ 0.99)를 분리한다. 다음 화면도 DOM/불투명 관찰값을 따로 남긴다. 투명도 조건은 전환 도중 screenshot을 찍는 오류를 줄이는 보조 조건이지 실제 scanout·대비·가려짐의 증명이 아니다. 화면 애니메이션을 비활성화하지 않는다.
- main mark는 probe 진입 기준, renderer navigation은 renderer의 timeOrigin 기준, 외부 관찰값은 runner 기준이다. 서로 다른 clock의 elapsed 값을 빼거나 병렬 구간을 더하지 않는다. 기존 main 로그의 bootstrap 시작점은 정적 import 이전이 아니다.
- CPU는 1회 호출만으로 비교하지 않는다. model 화면에서 `getAppMetrics()` 메모리 snapshot 1회, 수신된 GPU 상태가 있을 때 feature status만 기록한다. **GPU utilization/VRAM/GC pause/peak RSS 수치가 아니다.** `getGPUInfo('complete')`는 호출하지 않는다.

## 3. 실행 절차

먼저 같은 source/lockfile/빌드 모드인지 확인하고 빌드한다. 기존 Electron용 native dependency 준비 절차를 따른다. 빌드나 ABI 오류는 성능 표본이 아니라 환경 실패로 기록한다.

```sh
pnpm run build
pnpm bench:startup --runs 3 --profile fresh
pnpm bench:startup --runs 3 --profile repeat
```

진단 표본을 늘릴 때 `--runs 20`을 사용한다. 기본 phase timeout 30초는 지원 SLO가 아니라 hang 감지 한도다. `--timeout-ms`는 1000~120000, runs는 1~100만 허용한다. script는 저장소 위치를 기준으로 실행한다.

출력 `P0 evidence: <임시 디렉터리>` 아래 report.json, run별 **Model 화면** screenshot, profile별 DB·설정·앱 로그가 남는다. JSON의 실패 phase/error/fatalError/cleanupError를 먼저 본다. 하나라도 실패하면 exit 1이다. 정상 측정 후에는 원고가 없는 테스트 앱만 `app.exit(0)`으로 끝낸다. **저장·flush·정상 종료는 검증하지 않으며**, repeat도 clean shutdown 인증이 아니다. 종료 이벤트를 10초 안에 받지 못하면 소유한 Electron만 SIGKILL하고 실패로 기록해 후속 반복을 중지한다. 잔여 자식 프로세스 여부는 별도 확인한다.

실행 전 기록을 저장하고 `uncaughtExceptionMonitor`로 launch 내부의 미처리 오류도 남긴다. 런타임의 기본 실패 종료를 억제하지 않는다. 단, SIGKILL/디스크 기록 실패 등에서는 마지막 checkpoint만 남을 수 있다. artifact 검증/CLI 오류처럼 세션 생성 이전 오류는 stderr에 남는다. report의 `passed`는 이 제한된 **관찰 시나리오** 성공이지 성능 SLO 통과가 아니다. raw report와 로그는 로컬 경로/기기 정보를 포함하므로 외부 공유 전 검토한다.

통계: 성공 표본 median과 실패 수를 함께 공개한다. 성공 20개 미만이면 p95는 null이다. 20개 p95도 탐색값이지 인증 기준이 아니다. 실패·timeout을 빠른 표본으로 대체하거나 삭제하지 않는다. 최초 실행을 사후 warm-up이라는 이유로 버리지 않는다.

## 4. 테스트 추적표

| ID | 기법·위험 | 기대 결과 |
| --- | --- | --- |
| P0-CLI-01/02 | 경계값·동등 분할; 잘못된 runs/timeout/profile | 허용 경계 통과, 범위 밖·누락·임의 userData 옵션은 실행 전 거부 |
| P0-STAT-01 | 정상/실패/빈 집합·소표본 | 실패 수 보존, 유효하지 않은 시간 거부, 소표본 p95 미발행 |
| P0-SAFE-01/02 | 프로필 소유권·packaged/relative 입력 | import 전에 userData·DB 격리, OS protocol 미변경; 잘못된 프로필이면 변경 전 실패 |
| P0-RUN-01 | 새 프로필 Intro → 시작 버튼 → Model 상태 전이 | DOM/불투명 heading 관찰, 버튼 처리 후 Model heading, snapshot·증거 보존, 테스트 앱 종료 이벤트 |
| P0-RUN-02 | 미완료 프로필 재시작 | repeat 시 같은 임시 프로필만 재사용, Intro 재표시 |
| P0-RUN-03 | 환경 오류·timeout·종료 실패 | 실패 phase와 원문 오류 보존, 성공으로 집계하지 않음 |
| P0-WIN-01 | 실기 비교 | WIN-01에서 동일 production JS 진단 결과와 실제 portable 외부 시작 trace 확보 |
| P0-MAIN-01 | 완료 사용자 재시작 / Wizard 완료 전환 | 별도 fixture·계정 없는 검증용 프로필로 main 표시·첫 입력·저장 확인; 현재 실행기로 인증하지 않음 |

```sh
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run tests/scripts/startupBenchmark.test.ts
```

Windows PowerShell은 `$env:SKIP_DB_TEST_SETUP="1"` 설정 후 `pnpm exec vitest run ...`을 실행한다. 로컬 pnpm registry 접근 장애가 있으면 **설치된 동일 binary**를 직접 실행한 사실을 결과에 남긴다. 패키지 설치·의존성 업데이트나 native rebuild를 조용히 섞지 않는다.

## 5. 실기·CPU/GPU/메모리 후속 측정

Tier 1은 macOS ARM64·Windows x64의 적극적인 재현/회귀, Tier 2는 Windows ARM64·Linux x64의 기능 호환성, x64-on-ARM과 특수 GPU/저사양은 best effort로 구분한다. 이번 최우선은 MAC-01/WIN-01이다.

실기에서는 실행 요청→native 창→Intro→첫 버튼 처리, 완료 사용자 main 재시작을 각각 기록한다. 전원 모드·AC 여부·해상도/DPI·모니터·OS/GPU 드라이버·SSD 여유·백그라운드 앱·보안 검사 여부를 기록한다. Defender를 끄거나 메모리 trim/강제 GC로 기준선을 만들지 않는다. portable/dev는 같은 commit이라도 빌드·HMR 조건이 다르므로 서로 다른 행으로 둔다.

원인이 좁혀질 때만 Windows WPR/WPA 또는 Chromium trace, macOS Instruments, renderer DevTools Performance/Memory로 한 번씩 추가 진단한다. profiler를 켠 결과와 기본 반복 시간은 섞지 않는다. CPU main/renderer/utility, JS evaluate·IPC 대기·style/layout/paint, GC, hard fault/디스크 대기를 구분한다. CPU throttle은 CPU 부하 실험일 뿐 RX 570·가상 GPU·메모리 압박을 재현하지 않는다. OS별 privateBytes/RSS 등 필드의 의미와 단위를 보존하며 기기 전체 RAM 사용률로 자동 등급을 만들지 않는다.

## 6. 실행 결과·문제·TODO

실행일: 2026-09-09~10 KST. HEAD `4116bcf5` + 이번 테스트/문서 변경. 제품 `src/` diff 없음. 기존 조사에서 74 통과/3 실패했던 ModelStep footer 테스트는 이번 신규 계약의 통과 근거로 재사용하지 않는다.

### 자동 검사

| 검사·실제 명령 | 결과 |
| --- | --- |
| `node node_modules/electron-vite/bin/electron-vite.js build` | 성공. 기존 manuscript 정적/동적 import 혼용 경고 유지 |
| `node --check scripts/benchmark-startup.mjs`, `node --check scripts/startup-probe.cjs` | 통과 |
| `SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run tests/scripts/startupBenchmark.test.ts` | 신규 13개 통과. 최종 수정 후 재실행 통과 |
| 위 명령에 `tests/main/services/startupReadinessService.test.ts tests/main/lifecycle/appReadyDeferredWorker.test.ts tests/dom/startupWizardFlow.test.tsx` 포함 | 4파일 22개 통과 |
| `node scripts/check-render-boot-budget.mjs` | 통과: JS 579.7 KiB / CSS 166.0 KiB. 기존 조사와 다른 시점의 산출물 값이며 성능 개선량이 아님 |
| `node scripts/check-utility-process-boundary.mjs` | 통과 |
| `node scripts/check-target-file-drift.mjs` | exit 0이지만 current-task-packet.json 부재로 **검사 생략**, 검증 통과로 세지 않음 |
| `git diff --check` | 통과 |
| `node node_modules/typescript/bin/tsc6 --noEmit` | 실패: 기존 `src/renderer/src/features/manuscript/components/Sidebar.tsx:157`의 미사용 `handleRenameProject` (TS6133) |
| `node scripts/check-security-profile.mjs` | 실패: 기존 toolbar/constants.ts의 CSS `token` 16개와 locale settingsAdvanced.ts의 `apiKey` 표시 문구 3개를 secret 후보로 탐지. 읽은 값은 CSS 변수·번역 문구이며 실제 비밀 값이라는 근거는 없음. gate 자체는 수정하지 않음 |
| `node scripts/check-no-escape-hatches.mjs` | 실패: 기존 llmfitInstaller/modelDownloader 및 다른 src의 eslint-disable/cast 패턴. 이번 src 수정은 없음. 전역 품질 통과로 보고하지 않음 |

기존 pnpm registry 접근 문제 때문에 설치된 binary를 직접 호출했으며 의존성을 바꾸지 않았다. 최초 typecheck에서 잘못된 `node_modules/typescript6/bin/tsc` 경로를 사용해 MODULE_NOT_FOUND가 났고, 설치된 shim을 확인해 위 실제 `typescript/bin/tsc6` 경로로 재실행했다. `qa:core` 전체/전체 E2E/전체 lint는 이번 범위에서 실행하지 않았다.

### 실행기 검증 및 원시 표본

증거 루트는 이 Mac의 `/var/folders/jh/rqqbpbts0sqfj9qjxr2qr1qm0000gn/T/`다. 아래 디렉터리에 원시 report/설정/DB/로그/screenshot을 보존했다. 임시 OS 경로라 영구 보관을 보장하지 않으며 Windows 결과와 함께 프로젝트 외부의 지정 증거 저장소에 보관할 수 있다.

| 세션 디렉터리 | 조건 | 결과·관찰값 |
| --- | --- | --- |
| `luie-p0-oQoiQF` | 초기 sandbox 실행 | launch 실패. Playwright 내부 미처리 rejection으로 최초 버전은 JSON을 남기지 못함. stderr `Process failed to launch!` 보존 사실을 여기에 기록 |
| `luie-p0-5YDUKd` | GUI 실행 승인, 초기 정상 종료 시도 | Intro DOM 2203ms, 다음 DOM 26ms 관찰 후 종료 확인창/10초 제한으로 **실패**. 성공 통계에 넣지 않음 |
| `luie-p0-KM7OHi` | v1, fresh 3회, 빈 프로필 app.exit | 관찰 시나리오 3/3. Intro DOM **575 / 1359 / 1282ms**; median 1282ms, p95 없음 |
| `luie-p0-LwbST9` | v1, repeat 3회 | 3/3. Intro DOM **1294 / 1275 / 5424ms**. 3회차 probe→app-ready 4349ms. 별도 sandbox 실패 실험이 이 세션 중 겹쳤으므로 **통제 기준선으로 사용하지 않음** |
| `luie-p0-ZEKTgK` | 실패 기록 보완 후 sandbox 재현 | launch 실패/exit 1. report에 failed=1, fatalError 보존 확인 |
| `luie-p0-c3lt0F` | 최종 v2, fresh 3회 순차 실행 | 3/3. Intro DOM **8018 / 6931 / 705ms**, 불투명 관찰 **8048 / 6962 / 930ms**. 다음 DOM **26 / 18 / 91ms**, 다음 불투명 관찰 **287 / 278 / 349ms** |

실제 runtime: Apple M4, 10 logical CPU, RAM 16GiB, Darwin 25.6.0, 앱 arm64, Electron 44.2.0 / Chromium 152.0.7977.76 / Node 24.20.0. GPU compositing enabled는 확인했으나 GPU 사용률/병목은 측정하지 않았다. 각 세션에서 llmfit-release-blocked mark와 installed=false 로그를 확인했고 userData 및 main/cache DB 경로가 해당 임시 profile 안에 있음을 확인했다. 이것으로 모든 sidecar 경로의 미기동을 인증하지 않는다.

**최종 v2의 느린 두 표본은 probe→app-ready가 6974 / 5844ms**, 세 번째는 196ms다. 창 생성 이후 renderer did-finish-load까지는 각 약 105 / 105 / 154ms였다. 같은 main clock 안의 차이이며 Intro 표시 완료를 뜻하지 않는다. 즉 이 Mac 진단에서 관찰한 수초 지연은 renderer 하나만으로 설명할 수 없다. 자동화·OS·선행 module 평가 중 무엇이 원인인지는 미확정이며 Windows 원인으로 전용하지 않는다.

이전 세션은 창 479×697/DPR 2, 최종 세션은 다른 디스플레이 위치의 창 538×760이었다. 전원/열/사용자 동시 작업 및 디스플레이를 고정하지 않은 **실행기 검증 표본**이므로, 위 0.6~8초를 Mac 제품 성능 분포나 최적화 전후 개선량으로 발표하지 않는다. 최종 Model screenshot은 사람이 읽을 수 있는 불투명 상태로 확인했다. Intro 첫 실제 paint는 아직 외부 trace로 확인하지 않았다.

### 발견한 문제와 조치

| ID / 심각도 | 근거·재현 | 조치·남은 검증 |
| --- | --- | --- |
| P0-ISS-01 / Medium | sandbox launch 실패 시 Playwright 내부 rejection이 runner catch 전에 종료 | 실행 전 checkpoint + uncaughtExceptionMonitor로 실패 보존; ZEKTgK에서 재현 확인. Electron 보안 설정을 낮추지 않고 GUI 실행 권한 범위에서 별도 실행 |
| P0-ISS-02 / Medium | Wizard-only 종료에서 mainWindow가 없어 rendererFlushed=false 유지 → `!rendererFlushed`로 확인창. `src/main/lifecycle/shutdown/shutdown.ts:310`, 5YDUKd 로그에 save/flush retry/취소 기록 | P0에서는 빈 프로필 app.exit 정리만 사용. 제품 저장/종료 코드는 바꾸지 않음. P2에서 별도 회귀와 실제 저장 경로 검증 필요 |
| P0-ISS-03 / Medium | KM7OHi screenshot은 Model 전환 중 거의 투명. DOM visibility만으로 최종 표시를 판정할 수 없음 | v2에 조상 opacity 대기와 별도 timestamp 추가. c3lt0F screenshot 재확인. 외부 paint 검증은 남음 |
| P0-ISS-04 / Medium | c3lt0F의 app-ready 이전 수초 편차, 세션 간 디스플레이/동시 실행 조건 차이 | 빠른 표본만 선택하지 않음. 안정된 환경의 반복과 OS/Electron main trace가 필요. Windows renderer 병목으로 단정하지 않음 |
| P0-ISS-05 / Low | unpackaged 실행 로그의 Electron CSP 경고 및 기존 품질 gate 실패 | 원래 보안 설정 유지. release 보안 검증과 기존 gate 정리는 별도 추적; 이번 측정기 통과와 구분 |

- [x] 신규 단위 테스트, 구문 검사, 관련 정책 gate 실행 결과 기록(실패/생략 포함).
- [x] MAC-01 실행기 동작·프로필 격리·llmfit 차단·빈 프로필 종료 확인. 정상 저장/종료 인증은 제외.
- [ ] MAC-01 고정 디스플레이·전원·동시 작업 조건에서 안정된 기준선과 app-ready 이전 trace 확보.
- [ ] WIN-01 동일 계측과 artifact/드라이버/Windows 빌드 기록.
- [ ] VM-01 guest OS/app arch와 가상 GPU 상태 확정. 실기와 별도 비교.
- [ ] 완료 사용자 main 경로 및 외부 시작→실제 화면 표시 trace 보완.
- [ ] 지배 구간의 근거를 얻은 후에만 P1의 가장 작은 변경 선택.

P0 완료 조건은 스크립트 존재나 Mac 통과가 아니라 **같은 조건의 Mac/Windows 증거로 지배 구간을 설명할 수 있음**이다. Windows 결과가 없는 동안 P0 전체 완료로 표시하지 않는다. P4는 Deferred를 유지한다.
