# P1 — Wizard preview 지연 로딩·모션 비용 축소

날짜: 2026-09-10 KST. 상태: **공통 경로의 첫 변경 구현·로컬 검증, Windows 효과 미검증.** 사용자 승인으로 Windows P0 실측을 기다리지 않고 코드·산출물로 입증되는 의존성부터 줄였다. P0 전체 완료나 P1 전체 완료를 의미하지 않는다.

## 변경과 트레이드오프

`ThemeStep`의 `WizardEditor`, `LayoutStep`의 `LayoutLivePreview`만 모듈 최상위 `React.lazy`로 바꿨다. 두 step 자체와 선택/이전/다음 버튼은 그대로 두고, 이미 있던 `Suspense`·`PreviewBoundary`·fallback을 재사용했다. OS별 bootstrap, 새 의존성, IPC, 자원 sampler는 추가하지 않았다.

`vercel-react-best-practices`의 조건부 로딩과 `ponytail`의 기존 경계 재사용을 적용했다. React 문서에 따라 lazy 선언은 렌더 함수 밖에 두며, Promise 실패는 기존 오류 경계에 맡긴다. [React lazy](https://react.dev/reference/react/lazy), [Suspense](https://react.dev/reference/react/Suspense).

트레이드오프는 editor 준비 비용이 없어지는 것이 아니라 **테마/레이아웃 preview를 처음 여는 시점으로 이동**한다는 점이다. 그동안 기존 배경 fallback이 보이고 dock은 유지된다. 동기 JS 평가 중에도 입력 지연이 전혀 없다는 보장은 아니다. 실패 시 기존 preview fallback으로 진행할 수 있으나, 실패한 lazy import의 자동 재시도는 추가하지 않았다. prefetch/상시 warming도 이번 범위 밖이다.

## 1. 빌드 전후 결과

동일 HEAD `4116bcf5`, 동일 설치 의존성과 production 빌드에서 비교했다. 기준선은 P0 문서의 오래된 숫자가 아니라 **이번 변경 직전 재빌드**다.

| emitted 정적 JS 집합 | 변경 전 | 변경 후 |
| --- | ---: | ---: |
| HTML boot 정적 closure | 17파일 / 593,655 bytes | 18파일 / 594,234 bytes |
| Wizard 정적 closure | 30파일 / 1,540,157 bytes | 21파일 / 708,060 bytes |
| boot 밖 Wizard 추가분 | 13파일 / 946,502 bytes | 3파일 / 113,826 bytes |
| boot ∪ Wizard | 30파일 / 1,540,157 bytes | 21파일 / 708,060 bytes |

첫 Wizard 정적 범위는 **832,097 bytes, 약 54.0% 감소**했다. boot 자체는 청크 분할에 따라 **579 bytes 증가**했으며 기존 600KiB 예산 안이다. JS 580.3KiB/CSS 166.0KiB로 boot gate 통과. ProseMirror·TipTap·EditorToolbar는 첫 정적 closure에서 빠지고 후속 preview 경로에 남는다.

이는 중복 제거한 비압축 JS 파일 크기다. 패키지 전체 용량·RSS·네트워크 전송량·OS 실행 시간이 54% 감소했다는 뜻이 아니다. 다른 동적 경로에서 같은 editor를 불러올 가능성은 별도 runtime trace로 확인해야 한다.

새 `pnpm check:startup-wizard-bundle`은 build 후 HTML+Wizard의 정적 import/re-export를 AST로 재귀 추적하고 editor 청크가 재유입되면 실패한다. `--report`는 기준선 기록용이며 gate 통과 명령이 아니다. import cycle·공유 청크는 한 번만 센다. 빌드 청크 이름을 바꾸면 검사도 재검토해야 하며, ProseMirror 기준 청크 자체가 없어도 실패하도록 했다. arbitrary byte 예산은 새로 만들지 않았다.

## 2. Mac 실행 관찰

기존 P0 실행기로 새 임시 프로필 3회씩 순차 실행했다. M4 16GB, arm64, Electron 44.2.0, 창 479×697, DPR 2. 사용자 설정/DB는 격리하고 llmfit release 503·sync off·protocol 등록 false·측정 후 빈 앱 app.exit 통제 조건을 유지했다. 저장/정상 종료 인증은 아니다.

| 관찰값(ms), 표본 순서 유지 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 외부 launch 요청 → Intro DOM 관찰 | 1745 / 1284 / 1280 | 970 / 498 / 514 |
| → Intro 불투명 관찰 | 1776 / 1312 / 1310 | 1225 / 754 / 772 |
| 클릭 요청 → Model DOM 관찰 | 34 / 19 / 18 | 86 / 81 / 79 |
| → Model 불투명 관찰 | 300 / 296 / 296 | 347 / 330 / 349 |

Intro DOM median **1284 → 514ms**, 불투명 관찰 median **1312 → 772ms**다. 반면 다음 화면 불투명 관찰 median은 **296 → 347ms**로 늘었다. 빠른 첫 화면 숫자만 골라 전체 반응성이 개선됐다고 주장하지 않는다. 애니메이션·자동화 actionability/관찰 시점·OS 캐시가 포함된 각 3표본 탐색 결과이며, p95·Windows 개선율·고정 SLA는 발표하지 않는다. 테마/레이아웃의 최초 실제 preview paint는 이번 실행기 범위 밖이다.

증거 루트: `/var/folders/jh/rqqbpbts0sqfj9qjxr2qr1qm0000gn/T/`.

- 변경 전: `luie-p0-NXj5Bp/report.json`, 3/3 관찰 성공.
- 변경 후: `luie-p0-xdDufu/report.json`, 3/3 관찰 성공.
- report와 함께 profile별 로그·DB·Model screenshot 보존. 임시 디렉터리의 영구 보관은 보장하지 않는다.

시도한 renderer Resource Timing JS 목록은 세 실행 모두 **목록 전체가 0개**였다. 따라서 빈 editor 목록을 “editor가 runtime에서 안 로드됨”의 증거로 사용하지 않았다. 유효하지 않은 collector는 최종 실행기에 남기지 않았다. 현재 입증한 것은 emitted 정적 의존성 분리와 제한된 UI 관찰값이다.

## 3. ISTQB 관점의 테스트 계약

`qa-agent`의 위험 기반·재현 가능한 판정을 적용한다. 기능/오류 상태 전이를 먼저 검증하고 performance 수치는 별도 판정한다.

| ID | 위험·기법 | 통과 조건 |
| --- | --- | --- |
| P1-BUNDLE-01 | import/re-export/dynamic import/문자열 동등 분할 | 정적 의존성만 파싱, 잘못된 JS 거부 |
| P1-BUNDLE-02 | cycle·공유 import·정적 회귀·출력 밖 경로 | 중복 합산 없음, eager editor 탐지, 출력 밖 참조 거부 |
| P1-DOM-01 | 모듈 미사용→pending→resolve 상태 전이 | step 모듈만 import하면 preview factory 미실행; theme 렌더 시에만 실행; pending에도 테마 선택·이전·다음 callback 유지; 완료 후 preview 표시 |
| P1-DOM-02 | pending→reject 실패 주입 | 실제 PreviewBoundary가 실패를 받으며 layout dock·이전·완료 callback 유지 |
| 기존 startupWizardFlow | 정상 전체 흐름 | Intro→Model→Theme→Layout→Prepare→completeWizard, 테마 반영·설정 저장 계약 유지 |

신규 DOM 테스트에서는 preview 모듈을 제어 가능한 Promise로 대체해 로딩·실패를 재현한다. 기존 flow 테스트는 실제 컴포넌트와 mock IPC를 사용한다. 기존 테스트의 preview 사전 import 및 일부 조건부 assertion 때문에 그것만으로 cold import/모든 preview 기능을 증명하지 않으며 신규 테스트와 빌드 gate를 함께 사용한다.

```sh
pnpm run build
pnpm check:startup-wizard-bundle
pnpm check:render-boot-budget
SKIP_DB_TEST_SETUP=1 pnpm exec vitest run tests/scripts/startupWizardBundle.test.ts tests/dom/startupPreviewLazy.test.tsx tests/dom/startupWizardFlow.test.tsx
pnpm bench:startup --runs 3 --profile fresh
```

실제 로컬 실행은 기존 registry 문제를 피하기 위해 설치된 binary를 직접 호출했다. 예: `node node_modules/electron-vite/bin/electron-vite.js build`, `SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run ...`. 의존성 설치/업데이트는 하지 않았다.

## 4. 실행 결과·문제 기록

- production build 전/후 성공. 변경 전 manuscript ineffective dynamic import 경고가 있었고 변경 후 해당 경고는 관찰되지 않았다. 경고 제거를 일반 성능 개선량으로 계산하지 않는다.
- 신규 script/DOM 4개 통과. 관련 7파일 31개 실행에서 **28 통과 / 3 기존 실패**. 포함 파일: startupPreviewLazy, startupWizardFlow, startupWizardModelStep, startupPreviewResearchReset, wizardFreshBoot, startupWizardBundle, startupBenchmark.
- 변경 전 startupWizardFlow+startupWizardModelStep: 10개 중 7 통과/3 실패. 변경 후 동일 ModelStep `:174/:209/:245`의 footer 다운로드/완료/raw503 기대 실패가 유지됐다. 이 변경 때문에 생긴 실패로 분류하거나 통과하도록 assertion을 약화하지 않았다. 관련 act 경고도 남는다.
- 신규 DOM 테스트 최초 실행은 `document is not defined`로 2개 실패했다. 설치된 Vitest 환경에서 glob 설정만으로 jsdom이 적용되지 않아, 기존 DOM 테스트처럼 `@vitest-environment jsdom`을 명시한 뒤 4개 재실행 통과했다.
- 변경한 ThemeStep/LayoutStep 대상 ESLint 통과. renderer-store-usage, utility-process-boundary, boot budget, 신규 bundle gate, diff 공백 검사 통과.
- typecheck는 기존 `src/renderer/src/features/manuscript/components/Sidebar.tsx:157`의 미사용 handleRenameProject(TS6133)로 실패. 범위 밖 코드는 변경하지 않았다.
- renderer 금지 패턴 확인에서 ThemeStep의 기존 색온도 hex 3개가 검색됐다. 새 hex/스타일/Node·Electron 접근은 추가하지 않았다. CSS 보조 지침 경로가 없어 현재 DESIGN/renderer 규칙을 적용했다.
- P0에 기록한 전역 security/escape-hatch gate 실패는 해결한 것으로 간주하지 않는다. 전체 qa:core/전체 E2E/IME·원고 저장 실기는 미실행이다.
- 작업 중 측정 파일이 초기 버전으로 변경되어 잠시 편집을 멈췄고, 사용자 계속 진행 승인 후 schema v2의 실패 보존·불투명 관찰·빈 앱 종료를 복구했다. 결과 JSON의 script hash로 실제 실행 버전을 구분한다.
- 복구 후 startupBenchmark/startupWizardBundle/startupPreviewLazy/startupWizardFlow **4파일 23개 재실행 통과**. 최종 smoke `luie-p0-jsFrFJ/report.json`도 1/1 성공, schema 2·Intro DOM 968ms/불투명 1212ms·empty-profile-app-exit 확인. 이 smoke는 다른 디스플레이의 538×760 창이라 위 A/B 표본에 합치지 않았다. 포맷·구문·diff 검사도 통과했다.

## 5. 다음 TODO와 종료 경계

- [x] 첫 Wizard 정적 그래프에서 editor preview 분리.
- [x] import 회귀 gate, pending/rejected 제어부 회귀 테스트, 제한된 Mac 전후 관찰.
- [ ] 테마/레이아웃 최초 preview 표시·오류·뒤로 이동을 실제 Electron 창에서 추가 확인. 느리면 실측 후 prefetch 필요성만 별도 판단.
- [ ] Windows 실기 사용 가능 시 같은 변경을 측정. 그 전까지 3초/5초 해결 선언 금지.
- [ ] P0에서 남은 app-ready 이전 지연 및 main window 별도 경로 조사.
- [ ] 생성 LLM/BGE-M3 비활성화, 공통 초기화/설정 IPC 축소는 별도 후속 변경. 이번 코드로 처리됐다고 간주하지 않음.

롤백은 ThemeStep/LayoutStep의 두 preview import만 정적으로 복원하고 gate 실패를 재확인하면 된다. 데이터 migration이나 OS 설정 복원은 필요 없다. P4와 native/resource manager는 계속 Deferred다.

## 6. P1-2 — 위저드 애니메이션·프로그램 리사이즈 비용 축소

> 아래는 모든 OS에서 즉시 적용했던 최초 변경 기록이다. 이후 사용자 요청으로 **macOS만 기본 창 애니메이션을 허용**했으며, 현재 정책과 추가 검증은 §7을 우선한다. 최초 smoke 수치를 변경된 정책의 실측으로 재사용하지 않는다.

2026-09-10 KST. **공통 코드 구현 및 제한된 Mac smoke 완료, Windows·수동 창 리사이즈 성능은 미검증.** `ponytail`의 반복 작업 삭제, React 성능 지침의 불필요한 전환 축소, `qa-agent`의 위험 기반 테스트를 적용했다. graph 조회에서 resize 심벌이 검색되지 않아 실제 IPC handler와 세 호출 지점을 직접 추적했다.

### 원인과 변경 범위

`ipcWindowHandlers.ts`는 animate=true일 때 **800ms 동안 16ms 간격**으로 창 위치·크기를 보간해 `setBounds()`를 호출했다. 초기 호출도 포함하므로 고정 50회라고 단정할 수 없고, OS 스케줄링에 따라 횟수가 달랐다. 단계 전환 중 불필요한 native 창 변경 요청을 만드는 경로인 것은 코드로 확인했지만 **Windows 최초 3~5초의 원인이라고 입증한 것은 아니다.** 첫 Intro 표시에는 이 resize가 호출되지 않는다.

- 보간 함수·타이머·진행 중 Promise 완료 상태를 삭제했다. 최종 bounds와 현재 bounds가 같으면 0회, 다르면 `setBounds(target, false)` 1회만 호출한다. 사라진 창은 false 응답, API 예외는 기존 IPC 오류 경계를 이용한다.
- 기존 `(width, height, animate)` 인자 및 schema·preload API는 유지한다. animate는 호환용 인자로 남지만 위저드 native resize에는 적용하지 않는다. compact/preview/workArea 계산과 모니터 선택은 그대로다.
- Intro의 300ms fade/slide를 없앴다. 나머지 일반 단계는 200ms opacity-only로 축소했다. Theme/Layout의 전체 preview fade도 없앴으며 `key={uiMode}`와 오류 경계는 유지한다.
- 앱의 기존 애니메이션 off / reduced-motion CSS는 변경하지 않는다. 완료 알림 인지를 위한 800ms 대기는 창 보간과 다른 UX 계약이므로 유지한다.

Electron의 `setBounds` animate 옵션은 macOS 전용이다. 이번에는 OS별 대체 애니메이션 없이 false로 통일한다. **IPC 성공은 적용 요청 완료이지 OS paint나 레이아웃 안정화 완료가 아니다.** 단일 API 호출이 단일 렌더 프레임이나 GPU 비용 0을 뜻하지도 않는다. [Electron BrowserWindow.setBounds](https://www.electronjs.org/docs/latest/api/browser-window#winsetboundsbounds-animate).

트레이드오프: 창이 부드럽게 커지는 효과 대신 크기가 즉시 바뀐다. 최초 preview 준비 비용, 일반 OS 창 드래그, main editor의 ResizeObserver·레이아웃, dock blur/개별 버튼 효과는 이번 변경으로 제거하지 않았다. GPU 비활성화·will-change 상시 적용·별도 resize scheduler는 추가하지 않았다.

### 테스트 설계와 실제 결과

| ID | 위험·기법 | 확인 결과 |
| --- | --- | --- |
| P1-RESIZE-01 | animate true/false 동등 분할, 같은 크기 재요청 | 각 1회 적용, 재요청은 추가 호출 없음, fake timer 0개 |
| P1-RESIZE-02 | 빠른 연속 요청의 상태 전이 | 두 응답 완료, 마지막 크기 유지, 지연된 덮어쓰기 타이머 없음 |
| P1-RESIZE-03 | 창 없음/파괴됨, native 예외 실패 주입 | false 또는 기존 IPC 오류 응답; 파괴된 창에는 setBounds 미호출 |
| P1-RESIZE-04 | compact(-1)/preview(1300)/workArea(4096), 음수 모니터 원점 | 기존 좌표·크기 계산 유지 |
| P1-RESIZE-05 | NaN/Infinity/잘못된 boolean 입력 | schema에서 INVALID_INPUT, native API 미호출 |
| P1-MOTION-01 | Intro→Model DOM 상태 전이 | Intro animate-in 없음, Model fade-in·duration-200 유지, slide 제거 |
| P1-SMOKE-02 | 격리 프로필 실제 Electron 실행 | Intro→Model 1/1 성공; native 단계 확장 실기는 범위 밖 |

리사이즈 12개 사례는 기존 main IPC 테스트의 Electron 창·screen mock을 확장하여 검증한다. OS 창 관리자를 재현한 테스트는 아니므로 DPI·최소 크기 제약·실제 frame 비용까지 검증했다고 해석하지 않는다. DOM 테스트 역시 실제 CSS 합성 성능이 아닌 클래스 계약을 확인한다.

재현 명령(설치된 binary 사용, dependency 변경 없음):

```sh
SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run tests/main/handler/ipcWindowHandlers.test.ts tests/dom/startupWizardFlow.test.tsx tests/dom/startupPreviewLazy.test.tsx tests/scripts/startupBenchmark.test.ts tests/scripts/startupWizardBundle.test.ts
node node_modules/electron-vite/bin/electron-vite.js build
node scripts/check-startup-wizard-bundle.mjs
node scripts/check-render-boot-budget.mjs
node scripts/check-ipc-contract-map.mjs
node scripts/check-ipc-handler-schemas.mjs
node scripts/check-preload-contract-regression.mjs
node_modules/.bin/tsc6 --noEmit
node scripts/benchmark-startup.mjs --runs 1 --profile fresh
```

- 관련 **5파일 48개 중 47 통과 / 1 실패**. 신규 resize 12개와 DOM/preview/benchmark/bundle 테스트는 통과했다. 실패는 기존 export 테스트 `returns INVALID_INPUT response for malformed chapter id`가 non-UUID ID를 거부할 것으로 기대하나 성공 응답을 받는 항목이다. 이번 수정은 export handler/schema를 바꾸지 않았고, assertion을 통과시키려고 입력 검증을 변경하지 않았다. 기존 P1-1 ModelStep 실패 3개는 이번 선택 실행에 포함하지 않았다.
- 신규 연속 요청 테스트 최초 실행은 IPC 응답의 기존 `meta`까지 완전 동등 비교하여 실패했다. 의도한 success/data 계약과 bounds·timer 검증은 유지하면서 meta를 허용하도록 수정 후 통과했다.
- production build, boot budget(JS 580.3KiB / CSS 165.9KiB), Wizard 정적 의존 gate(707,993 bytes, eager editor 없음), IPC schema/preload gate 통과.
- IPC 계약맵 gate 최초 실행은 줄 번호 drift로 실패하며 `ipc-contract-map.json`을 재생성했다. 변경은 생성 시각·이 handler의 줄 번호뿐이며 재실행은 225채널 OK다.
- 변경 production 파일 및 main 테스트 ESLint 통과. DOM flow 파일 lint는 기존 미사용 `useTermStore`로 실패한다. 범위 밖 테스트 정리는 하지 않았다.
- typecheck는 앞서 기록한 Sidebar.tsx:157 TS6133이 유지된다. 처음 시도한 native-preview 경로는 설치되어 있지 않아 실행 자체가 실패했으며, 실제 package script의 `tsc6`로 재실행해 확인했다. 여러 명령을 한 shell에서 실행하면 마지막 명령 성공이 앞선 실패를 가릴 수 있어 각 출력으로 판정했다.
- Mac smoke 증거: `/var/folders/jh/rqqbpbts0sqfj9qjxr2qr1qm0000gn/T/luie-p0-DXNrQN/report.json`. Electron 44.2.0 arm64, 창 538×760, DPR 1. Intro DOM **967ms**, 불투명 관찰 **996ms**, 클릭→Model DOM **54ms**, 불투명 관찰 **216ms**. 각 1표본이며 이전 DPR 2 표본과 조건이 달라 개선율로 계산하지 않는다. GPU feature status는 수집했지만 utilization·VRAM·GC 감소는 측정하지 않았다.

### 남은 resize 실기 TODO와 판정 경계

- [x] 위저드 프로그램 resize의 타이머 반복 제거, 동일 bounds 중복 방지, 회귀 테스트.
- [x] Intro/전체 preview 진입 애니메이션 제거, 일반 단계 opacity-only 축소.
- [ ] Mac 실제 창에서 Model→Theme→Layout→Prepare 및 뒤로 이동: 표시·버튼 clipping·focus·창 경계 확인. 애니메이션 on/off와 OS reduced-motion 각각 확인.
- [ ] main editor 수동 resize: 동일 문서·레이아웃·창 시작 크기로 10초 드래그를 3회 반복하는 **진단 실험**. renderer Performance trace에서 layout/style/paint·long task·ResizeObserver 호출·React commit을 보고, 한 시점 memory snapshot 대신 유휴→드래그→유휴 구간을 비교한다. main/native resize 경로와 renderer 작업을 분리하고, hotspot이 입증된 callback만 coalescing/중복 갱신 제거 대상으로 삼는다. 임의 전역 debounce·CPU 등급은 만들지 않는다.
- [ ] Windows x64 i5-9400F/16GB/RX570/SSD에서 같은 빌드·문서·DPI·전원 조건으로 확인. ARM VM 결과는 호스트·가상 GPU 불명 조건을 별도 표기하고 실기와 합산하지 않는다. portable/dev 결과도 분리 보관한다.

실기 기록은 OS/arch/앱 버전·CPU/GPU·RAM·DPI·전원·창 크기·문서/레이아웃·실행 방식·실패 여부를 함께 남긴다. 입력/저장/IME 정상 여부도 확인한다. 수동 resize와 Windows 실측이 남아 있으므로 “전체 애니메이션·resize 최적화 완료” 또는 “P1 완료”로 표시하지 않는다. P4는 계속 Deferred다.

## 7. P1-2 조정 — macOS 창 전환만 애니메이션 허용

> 이후 배경 전환 요청으로 IPC 완료 대기 계약을 보강했다. 아래의 “native 호출 반환 기준”과 “GUI 미실행”은 당시 기록이며, 현재 동작·실행 결과는 §8을 우선한다.

2026-09-10 KST 사용자 요청: macOS의 부드러운 창 크기 전환은 유지하고, Windows는 실측 후 재검토한다. **JS 보간 루프를 복원하지 않고 기존 resize handler의 최종 setBounds 옵션만 분기**했다. `ponytail`의 OS 기본 기능 재사용을 적용했으며 새 platform 서비스·native addon·타이머·의존성을 추가하지 않았다.

| 조건 | native resize 옵션 |
| --- | --- |
| macOS + 앱 애니메이션 on + OS 동작 줄이기 off | `setBounds(target, true)` |
| macOS + 앱 애니메이션 off 또는 OS 동작 줄이기 on | `setBounds(target, false)` |
| Windows / Linux | 앱 설정과 무관하게 `setBounds(target, false)` |

Electron의 macOS 전용 animate 옵션과 `systemPreferences.getAnimationSettings().prefersReducedMotion`을 사용한다. OS 설정 조회는 **실제로 크기가 달라지는 macOS의 animate=true 요청에서만 1회** 수행하며 polling/cache/추가 IPC는 없다. 동일 bounds 요청 생략, 파괴된 창 보호, 기존 오류 경계와 인자 검증은 유지한다. [BrowserWindow.setBounds](https://www.electronjs.org/docs/latest/api/browser-window#winsetboundsbounds-animate), [systemPreferences.getAnimationSettings](https://github.com/electron/electron/blob/main/docs/api/system-preferences.md#systempreferencesgetanimationsettings).

기존 800ms cubic 전환과 동일한 속도·곡선을 보장하지 않으며 macOS 기본 애니메이션에 맡긴다. OS 보간도 renderer layout/paint를 유발할 수 있으므로 비용 0이나 프레임 향상은 주장하지 않는다. 응답은 native 호출 반환 기준이며, 애니메이션 완료를 기다리는 추가 상태 머신은 없다. 빠른 연속 요청의 실제 OS 중단·전환 모양은 실기 확인 대상으로 남긴다.

이번 요청은 **창 크기 전환**에 적용했다. Intro/전체 preview fade 제거와 일반 단계의 200ms opacity-only는 유지한다. 수동 창 드래그 및 Windows 애니메이션 자동 활성화는 변경하지 않았다.

### 테스트와 문제 기록

`qa-agent`의 결정 테이블 방식으로 기존 2개 animate 사례를 OS·앱 설정·reduced-motion 조합 6개로 확장했다. 실제 OS를 실행하는 대신 handler 로드 후 `process.platform`을 임시 대체하고 finally에서 원래 descriptor를 복원한다. Electron 설정과 bounds는 mock이므로 **Windows 호환성이나 macOS 애니메이션 체감 검증을 대신하지 않는다.**

- OS/설정 조합별 true/false 전달, setBounds 1회, 동일 bounds 재요청 생략, JS timer 0개를 검증했다. Windows/Linux/앱 off에서는 OS 설정 조회도 0회다.
- `SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run tests/main/handler/ipcWindowHandlers.test.ts -t 'wizard resize work budget'`: **16 통과 / 범위 밖 13 제외**.
- 같은 파일 전체 + startupWizardFlow/startupPreviewLazy: **3파일 37개 중 36 통과 / 1 실패**. 실패는 §6의 기존 export ID 기대 불일치이며 수정하거나 건너뛰지 않았다.
- production build, 변경 main/hook/test ESLint, IPC schema·preload·계약맵(225채널), Wizard bundle·boot 예산 검사 통과.
- `node_modules/.bin/tsc6 --noEmit`: 기존 Sidebar.tsx:157 미사용 handleRenameProject(TS6133)로 실패. 이번 변경의 전체 typecheck 통과를 선언하지 않는다.
- 이번 조정 후 실제 Electron GUI의 native resize는 **미실행**. §6의 Intro→Model smoke는 resize 경로를 호출하지 않아 이번 native animation 검증 자료가 아니다.

남은 수동 확인: macOS에서 Model→Theme, Theme→Model, Layout→Prepare를 앱 애니메이션 on/off·OS 동작 줄이기 on/off로 확인하고, 빠른 앞/뒤 전환에서 최종 bounds·버튼 clipping·focus를 기록한다. Windows는 계속 즉시 적용하며 사용 가능한 실기에서 동일 흐름을 확인한 뒤에만 활성화 여부를 별도 결정한다.

## 8. P1-2 조정 — resize 중 배경만 표시하고 완료 후 preview 마운트

> Windows 즉시 적용은 이 절 작성 당시 정책이다. 이후 Windows 애니메이션도 켜 달라는 사용자 요청으로 §9의 제한된 보간을 추가했다. 배경/preview 마운트 및 오류 재시도 계약은 그대로 유지한다.

2026-09-10 KST 사용자 승인으로 구현했다. **macOS native 애니메이션은 유지하되, 위저드 전환 중 무거운 화면을 마운트하지 않는다.** `ponytail`의 기존 IPC 재사용과 `vercel-react-best-practices`의 조건부 마운트 원칙을 적용했다. 새 IPC 채널·OS 서비스·반복 프레임 타이머·의존성은 추가하지 않았다. 아래는 §6~7의 완료 대기 계약을 대체한다.

### 동작과 비용 경계

- Model→Theme, Theme→Model, 완료 알림→Prepare의 세 resize 지점을 기존 hook의 단일 요청 상태로 모았다. React commit으로 내용이 제거된 뒤 effect에서 IPC를 보낸다. 전환 중 `aria-busy=true`의 단색 배경만 렌더하므로 이전/다음 preview·dock·footer가 뒤에서 레이아웃을 계산하는 overlay 방식이 아니다.
- 배경은 **전환 전 단계의 테마**를 유지한다. Model은 기존 dark bootstrap, Theme/완료 알림은 현재 선택한 테마의 `bg-app`이다. 다음 단계 진입 시 원래 테마 적용 규칙을 따른다. 배경 paint의 정확한 시점까지 React commit이 보장하는 것은 아니다.
- macOS animate=true는 setBounds **호출 전에** `resized`/`closed` listener를 연결한다. 완료 이벤트에서 응답하고 listener·안전 타이머를 제거한다. 빠른 새 요청은 이전 대기를 false로 정리하고 새 요청을 적용한다. [Electron resized 이벤트](https://www.electronjs.org/docs/latest/api/browser-window#event-resized-macos-windows).
- 이벤트가 오지 않으면 **2,000ms 안전 타이머**에서 목표 크기를 애니메이션 없이 적용하고 대기를 종료한다. 정상 애니메이션 길이나 성능 SLA가 아니며, 프레임 polling도 아니다. 정상 요청은 setBounds 1회, 누락 fallback은 최대 1회 추가다. native API가 실패하면 기존 IPC 오류로 반환한다. JS event loop 자체가 멈춘 경우 벽시계 기준 2초를 보장하지 않는다.
- Windows/Linux·앱 애니메이션 off·OS 동작 줄이기 on은 완료 이벤트나 2초 타이머를 기다리지 않는다. renderer에서는 짧은 IPC 왕복 동안 배경이 보일 수 있으나 인위적인 대기 시간은 없다. 같은 bounds도 즉시 응답한다.
- renderer는 성공 응답과 true 결과를 확인한 뒤에만 다음 단계를 연다. 오류·false·Promise 거부는 기존 오류 화면으로 복귀하며, 재시도는 **실패한 resize**를 반복한다(completeWizard로 건너뛰지 않는다). unmount 후 늦은 응답은 무시한다. 기존 preload의 15초 IPC timeout도 유지되어 main 응답 자체가 없는 상황을 처리한다.
- 요청 처리 중 중복 클릭은 새 요청을 만들지 않는다. 완료 알림의 기존 800ms UX 대기는 유지한다. **실제 Writer/main window의 수동 resize에는 적용하지 않는다.** 위저드 preview의 편집 DOM은 재마운트되지만 테마·레이아웃 선택은 상위 hook에 유지한다.

트레이드오프: 애니메이션과 editor 초기화의 경쟁을 줄이지만 editor 준비 시간이 없어지지는 않는다. 완료 후 lazy chunk/초기화가 느리면 기존 preview fallback이 더 오래 보인다. screenshot 복제·prefetch·새 scheduler는 추가하지 않았다. native animation도 OS/GPU 작업을 하므로 GPU/GC/RSS 감소율을 주장하지 않는다.

### ISTQB 관점 테스트 계약

| ID | 기법/위험 | 검증 |
| --- | --- | --- |
| P1-BG-01 | 상태 전이 / 이중 클릭 | 배경 DOM commit 후 IPC 호출, 응답 전 버튼·editor·다음 단계 없음, 중복 호출 없음 |
| P1-BG-02 | 역방향 / 완료 경로 | Theme→Model 축소 시 선택 테마 유지, 완료→Prepare는 resize 응답 전 input 미마운트 |
| P1-BG-03 | 실패 주입 | IPC 오류 응답·false·Promise reject에서 blank 종료; retry는 같은 resize, completeWizard 미호출 |
| P1-BG-04 | lifecycle | 대기 중 unmount 후 늦은 완료 무시 |
| P1-BG-05 | native 이벤트 / 경계값 | resized·closed·새 요청·fallback·fallback 예외, 1,999ms 미완료 / 2,000ms 안전 복구, listener/timer 정리 |
| P1-BG-06 | OS 결정 테이블 | 기존 macOS/Windows/Linux, 앱 설정/reduced-motion 조합 유지; 동기 resized에도 정상 완료 |

main 테스트는 Node EventEmitter로 실제 once/removeListener 동작을 사용하되 창/API 자체는 mock이다. DOM flow는 resize Promise를 제어하고 기존 전체 흐름도 유지한다. 기존 flow/ModelStep mock의 undefined 응답은 실제 IPC `{success, data}` envelope로 바로잡았다. 오류 assertion을 약화하지 않았다.

실행 명령:

```sh
SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run tests/main/handler/ipcWindowHandlers.test.ts -t 'wizard resize work budget'
SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run tests/main/handler/ipcWindowHandlers.test.ts tests/dom/startupWizardFlow.test.tsx tests/dom/startupPreviewLazy.test.tsx tests/dom/startupWizardModelStep.test.tsx tests/scripts/startupBenchmark.test.ts tests/scripts/startupWizardBundle.test.ts
node node_modules/electron-vite/bin/electron-vite.js build
node scripts/check-startup-wizard-bundle.mjs
node scripts/check-render-boot-budget.mjs
node scripts/check-ipc-contract-map.mjs
node scripts/check-ipc-handler-schemas.mjs
node scripts/check-preload-contract-regression.mjs
node_modules/.bin/tsc6 --noEmit
node scripts/benchmark-startup.mjs --runs 1 --profile fresh --scenario resize
```

- main resize 집중 실행 **21 통과 / 범위 밖 13 제외**. 관련 전체 선택 실행은 **6파일 67개 중 63 통과 / 기존 4 실패**(export ID 1, ModelStep footer/raw503 기대 3). flow 11개·preview 2개는 통과했다. 기존 ModelStep act 경고도 유지되며 전체 QA 통과로 표시하지 않는다.
- production build 및 변경 production/main test ESLint 통과. boot JS 580.3KiB / CSS 165.9KiB, Wizard 정적 closure 708,618 bytes, eager editor 없음. IPC schema·preload·계약맵(225채널) 통과; map 첫 실행의 handler 줄 번호 drift는 재생성 후 재검사했다.
- typecheck는 기존 Sidebar.tsx:157 TS6133이 그대로다. 이전 §6의 전역/DOM lint 문제를 해결한 것으로 간주하지 않는다. renderer 변경에 새 hardcoded color·!important·console 출력은 없다.
- graph는 삭제된 보간 함수가 남은 오래된 스냅샷을 반환해 실제 소스와 호출부를 대조했다. 보조 CSS 지침과 QA examples/self-check가 없어 기존 DESIGN·실행 프로토콜·체크리스트와 직접 회귀 검증을 사용했다.

### 실제 Mac 관찰과 재현성

기존 격리 실행기의 **선택 옵션 `--scenario resize`**로 Intro→Model→Theme까지 진행한다. 기본 `--scenario intro`는 종전 범위를 유지한다. CLI 유효/무효 시나리오 테스트를 추가했다. 테스트 중에만 MutationObserver로 busy/editor DOM의 상태 변화(최대 16개), main의 resized 시각, 전후 bounds를 수집한다. 원고 저장/정상 종료 인증은 아니며 기존 빈 임시 프로필·자동 다운로드 차단·sync off 통제를 유지한다. 최종 screenshot은 resize 시나리오에서 Theme 화면이다. 시나리오별 snapshot 지점이 다르므로 메모리 숫자를 직접 합산/비교하지 않는다.

실행 증거: `/var/folders/jh/rqqbpbts0sqfj9qjxr2qr1qm0000gn/T/luie-p0-58eaJP/report.json`, `run-1.png` 및 profile 로그. **1/1 성공**, Electron 44.2.0 arm64, M4, DPR 2, OS 동작 줄이기 off. 창 479×697→1402×879.

| busy 배경 DOM 관찰 기준 | 상대 시각 |
| --- | ---: |
| 배경만 표시, editor DOM 없음 | 0ms |
| main resized 이벤트 | +353ms |
| busy 해제, editor DOM 아직 없음 | +361ms |
| editor DOM 나타남 | +688ms |

프리뷰 DOM이 resize 완료 **뒤에** 생겼고 busy 중 editor가 함께 관찰되지 않았다. 완료 화면 screenshot에서 본문·테마 dock·이전/다음 버튼 표시를 확인했다. native 완료 후에도 editor 준비 약 335ms가 남았다는 점을 숨기지 않는다. MutationObserver/Date.now 기반 관찰이며 정확한 paint/frame-time 계측이나 안정적인 p95가 아니다. Intro DOM 1,562ms/불투명 1,592ms의 이번 한 표본도 이전 표본과 합쳐 개선율로 발표하지 않는다.

남은 TODO: Mac 실제 역방향 축소·Prepare 확장·키보드 focus·reduced-motion/off 조합, Windows 실기, 실제 수동 resize의 renderer/CPU/GPU trace. fallback과 오류/연속 요청은 자동 mock 테스트로 검증했으며 실제 OS 실패 주입으로 인증한 것은 아니다. P0~P3 경계를 유지하고 P4는 열지 않는다.

## 9. Windows 애니메이션 활성화 — 작업 예산과 lifecycle 제한

2026-09-10 KST 사용자 요청으로 **Windows에서도 위저드 창 전환을 애니메이션으로 처리**한다. macOS용 `setBounds(..., true)`는 Windows에서 지원되지 않으므로 같은 옵션만 켜는 것으로 구현하지 않았다. [Electron setBounds](https://www.electronjs.org/docs/latest/api/browser-window#winsetboundsbounds-animate).

`ponytail` 원칙에 따라 별도 성능 엔진 없이 `src/main/manager/window/windowStartupWizardResize.ts`에 기존 bounds 계산·완료 대기와 Windows 보간을 모았다. IPC handler는 기존 인자 검증 후 이 함수를 호출한다. renderer·preload·채널·bootstrap은 이번 조정에서 바꾸지 않았다. **배경만 표시한 뒤 완료 응답 후 preview를 마운트하는 구조는 유지**한다.

### 현재 OS 정책

| 조건 | 처리 |
| --- | --- |
| macOS, 애니메이션 허용 | 기존 native animate, resized 완료 / 누락 시 2초 안전 복구 |
| Windows, 애니메이션 허용 | nominal 200ms ease-out cubic, 16ms 간격 요청, 최대 13단계 |
| 앱 애니메이션 off / OS 동작 줄이기 on / rich animation 비권장 | 즉시 적용 |
| Linux | 기존 즉시 적용 유지 |

OS 권고는 요청 시작 시 `getAnimationSettings()` **1회**만 읽는다. `prefersReducedMotion` 및 `shouldRenderRichAnimation`을 존중한다. 후자는 원격 세션·접근성 등의 OS 판단이며 CPU/RAM 기기 등급이 아니다. off·미지원 OS·동일 bounds 경로에는 불필요한 조회/타이머가 없다. [Electron animation settings](https://www.electronjs.org/docs/latest/api/system-preferences#systempreferencesgetanimationsettings).

### Windows 비용·완료 계약

- 과거 800ms 보간을 그대로 복원하지 않았다. 200ms·최대 13단계는 **이 전환의 작업 예산**이며 전체 컴퓨터 성능을 분류하는 상수가 아니다. 실기 trace 후 조정할 수 있도록 창 관리 파일에 모았다.
- 첫 0% bounds 쓰기는 생략한다. 반올림 결과가 직전 요청과 같으면 native 호출도 생략한다. 정상 완료까지 `setBounds`는 **최대 13회**, 매 단계 `animate=false`로 전달한다. native API가 스스로 수행하는 OS 작업 횟수를 뜻하지는 않는다.
- `performance.now()`의 단조 시간으로 진행률을 계산하고 단일 재예약 timeout만 사용한다. 늦어진 프레임은 건너뛰며 밀린 단계의 catch-up 루프는 없다. 마지막 단계는 계산 오차 없이 목표 bounds를 사용하고, 적용 호출이 반환된 뒤 IPC를 완료한다. Windows의 `resized` 이벤트를 기다리지는 않는다.
- 창 닫힘/파괴, 새 요청, native 호출 예외에서는 pending Promise와 timer/listener를 정리한다. setBounds 호출 도중 closed가 발생해도 다음 timer를 다시 만들지 않는다. 새 요청은 이전 목표를 뒤늦게 덮어쓰지 않으며 현재 bounds에서 다시 시작한다.
- macOS와 Windows는 완료/취소/오류 정리를 공유한다. Windows에는 native 이벤트 누락용 2초 타이머를 추가하지 않는다. frame timer 하나로 진행·완료하고, IPC 통신 자체의 timeout은 기존 preload가 담당한다.

**제약:** 타이머와 setBounds는 OS 스케줄링에 영향을 받으므로 실제 60fps나 정확히 200ms를 보장하지 않는다. macOS native와 Windows의 easing/속도가 완전히 같지도 않다. GPU/compositor 비용이 없어지는 것은 아니며, Windows 최초 3~5초 지연이 이 애니메이션 때문이었다는 증거도 아직 없다. 특히 Intro 진입 자체는 이 resize를 호출하지 않는다. Windows 프레임 비용·CPU/GPU/GC 개선율은 실기 미측정이다.

### ISTQB 검증과 파일 분리

기존 QA 결정 테이블에 Windows 애니메이션 on, reduced-motion, rich-animation 비권장 사례를 추가했다. fake timer와 가짜 platform은 **실제 Windows 실행이 아니라 정책·lifecycle 검증**이다.

- 정상: 199ms에는 미완료, 200ms에 최종 bounds/완료, 호출 수 ≤13, 완료 후 timer/listener 0개.
- 지연: 첫 callback이 600ms 시점에 실행된 상황에서 중간 단계를 따라잡지 않고 최종 bounds 1회 적용.
- 반올림: 1px 차이에서 같은 정수 bounds를 반복 적용하지 않음.
- 중단: closed, 이벤트 없는 destroyed, 진행 중 새 animated 요청, frame API 예외, setBounds 중 동기 closed. 이후 가상 시간 3초를 진행해도 추가 쓰기 없음.
- Mac 완료/닫힘/fallback/예외, 기존 bounds 계산·입력 검증, renderer 배경/재시도 테스트는 유지했다.

추가 검사에서 누적된 테스트가 500줄 제한을 넘는 것이 확인되어 **resize 테스트를 `tests/main/handler/ipcWindowResize.test.ts`, `tests/dom/startupWizardResize.test.tsx`로 이동**했다. 기존 IPC/flow 테스트의 assertion을 삭제하지 않았다. 분리한 파일을 `qa:core` 명령에도 포함했다. resize main 462줄 / DOM 328줄, 남은 기존 파일 406줄 / 479줄로 이 작업의 초과를 해소했다. 테스트 설정 분리 중 제거된 mock의 reset이 남아 기존 IPC 13개가 일시 실패했으며, 해당 잔여 reset을 제거하고 다시 실행했다.

재현 명령(§8의 과거 파일명 선택 실행보다 아래를 우선):

```sh
SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run tests/main/handler/ipcWindowResize.test.ts tests/dom/startupWizardResize.test.tsx tests/dom/startupWizardFlow.test.tsx
SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run tests/main/handler/ipcWindowHandlers.test.ts tests/main/handler/ipcWindowResize.test.ts tests/dom/startupWizardFlow.test.tsx tests/dom/startupWizardResize.test.tsx tests/dom/startupPreviewLazy.test.tsx tests/dom/startupWizardModelStep.test.tsx tests/scripts/startupBenchmark.test.ts tests/scripts/startupWizardBundle.test.ts
node node_modules/electron-vite/bin/electron-vite.js build
node scripts/check-startup-wizard-bundle.mjs
node scripts/check-render-boot-budget.mjs
node scripts/check-ipc-contract-map.mjs
node scripts/check-ipc-handler-schemas.mjs
node scripts/check-preload-contract-regression.mjs
node scripts/check-source-loc.mjs
node scripts/check-core-complexity.mjs
node_modules/.bin/tsc6 --noEmit
node scripts/benchmark-startup.mjs --runs 1 --profile fresh --scenario resize
```

실행 결과:

- resize main **32개 통과**, 분리 후 main resize+DOM resize+flow **3파일 43개 통과**.
- 최종 관련 **8파일 78개 중 74 통과 / 기존 4 실패**. export ID 기대 불일치 1개와 ModelStep footer/raw503 기대 3개만 남으며, 분리 중 발생한 13개 mock 오류는 재실행에서 해소됐다. assertion은 유지했다.
- production build, 변경 main/새 manager/resize 테스트 ESLint, IPC schema·preload·계약맵(225채널), Wizard 정적 의존 및 boot 예산 검사 통과. Wizard 708,618 bytes, boot JS 580.3KiB / CSS 165.9KiB로 renderer 산출물 크기는 이번 조정 전과 같다.
- `check-source-loc`은 이번 두 테스트 초과를 해소한 뒤에도 범위 밖 **16개** 위반으로 실패한다. `check-core-complexity`는 통과하되 기존 GoogleDocsLayout의 길이/복잡도 권고 2개가 있다.
- typecheck는 기존 Sidebar.tsx:157 TS6133이 유지된다. 전체 qa:core/전체 E2E 통과로 표시하지 않는다. graph가 오래된 상태여서 실제 소스·실행 결과를 우선했으며 없는 QA 보조 문서에 대한 이전 fallback도 유지했다.
- Mac 회귀 smoke: `/var/folders/jh/rqqbpbts0sqfj9qjxr2qr1qm0000gn/T/luie-p0-Xf9cxY/report.json`, 1/1 성공. M4 arm64 / Electron 44.2.0 / DPR 2, 479×697→1402×879. busy 시작 대비 native resized +352ms, busy 해제 +357ms, editor DOM +690ms. 단일 표본이며 Windows 효과나 성능 향상률로 해석하지 않는다.

다음 실기 확인은 Windows x64 i5-9400F/16GB/RX570/SSD에서 동일 resize 시나리오와 앞/뒤 전환·IME/저장 확인이다. CPU/GPU trace와 native 호출 지연을 보고 예산을 조정한다. ARM VM은 별도 조건으로 기록한다. 수동 Writer resize·새 resource manager·native addon은 이번 범위에 추가하지 않는다.
