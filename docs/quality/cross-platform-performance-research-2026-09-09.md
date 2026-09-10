# 크로스플랫폼 성능 사전조사 — 2026-09-09

상태: 사전조사 완료 / **P0 계측 구현 진행 중**. 조사 소스 기준 `bbc2842d`. 현재 세션 기기는 사용자 제공 정보 기준 MacBook Air M4, 16GB다. 후속 보고: Windows 11 x64 실기(i5-9400F, RX 570, 16GB, SSD)는 Wizard·main window 약 3초이며 portable·개발 실행 모두 비슷하다. Apple CPU로 표시된 Windows 11 VM(8GB, SSD)은 5초 이상이며 guest OS/app arch와 가상 GPU는 아직 미확정이다. Mac 약 1초를 포함해 모두 같은 조건의 계측값은 아니다. 실행 방법·ISTQB 관점 테스트·실패·미검증 항목은 [P0 테스트 기록](startup-performance-p0.md)에 계속 기록한다.

**후속 사용자 결정 — 아래의 기존 sidecar 운용·모델 예산 제안보다 우선한다:** 모든 지원 OS/아키텍처에서 생성용 LLM sidecar와 **BGE-M3 임베딩용 sidecar를 모두 비활성화할 예정**이다. RAG·Memory Engine 및 이를 담당하는 기존 utility process는 유지한다. 이번 변경은 문서 기록이며 제품 코드에서 비활성화를 실행한 상태가 아니다. 임베딩 없는 검색 범위·RAG 응답 생성 경로는 별도 검증하고, 외부 API로 자동 전환하거나 기존 모델·벡터·원고 데이터를 삭제하지 않는다. 상세 범위와 완료 조건은 §11을 따른다.

**실행 범위:** P0~P3만 활성 계획이다. P4는 **Deferred**이며 완료를 위한 필수 단계가 아니다. 제품에는 CPU/RAM 기반 자동 튜닝·기기 등급·상시 자원 sampler를 추가하지 않는다. §11.3~11.5는 플랫폼 사실, OS 이벤트, 명시적 진단, 기존 job 규칙만 정의한다. 이전 빌드/테스트 결과는 조사 기준선이며 이 설계의 구현 검증 결과가 아니다.

**2026-09-10 후속 구현:** Windows 실기 접근 전에도 공통 경로를 개선하라는 사용자 승인으로 preview 2개의 lazy 로딩을 적용했다. 첫 Wizard 정적 JS 범위 1,540,157→708,060 bytes; Windows 성능 개선은 미검증이다. 세부 전후 표본·테스트·기존 실패·트레이드오프는 [P1-1 기록](startup-performance-p1.md)을 따른다. P0 전체 완료로 표시하지 않는다.

**P1-2 모션 후속:** Wizard의 800ms/16ms native resize 보간을 제거하고 목표 bounds를 0~1회 적용하도록 변경했다. Intro·전체 preview fade 제거, 일반 단계는 200ms opacity-only. 회귀 테스트·실행 결과와 수동 resize/Windows 미검증 경계는 [P1 §6](startup-performance-p1.md#6-p1-2--위저드-애니메이션프로그램-리사이즈-비용-축소)에 기록한다.

**현재 resize 정책:** 후속 사용자 요청에 따라 macOS만 Electron 기본 창 애니메이션을 사용한다(앱 애니메이션 off 또는 OS 동작 줄이기 on이면 즉시 적용). Windows는 실측 전까지 즉시 적용을 유지하며 JS 보간은 복원하지 않는다. [P1 §7의 정책·추가 검증](startup-performance-p1.md#7-p1-2-조정--macos-창-전환만-애니메이션-허용)을 우선한다.

**배경 전환 추가:** 위저드 resize 중에는 배경만 렌더하고, macOS `resized` 완료(누락 시 2초 안전 복구) 후 다음 preview를 마운트한다. Windows는 별도 이벤트 대기 없이 진행한다. 새 채널 없이 기존 IPC를 사용하며 오류·닫힘·중복 요청을 정리한다. [P1 §8의 테스트·Mac 실측](startup-performance-p1.md#8-p1-2-조정--resize-중-배경만-표시하고-완료-후-preview-마운트)이 최신 완료 대기 계약이다.

**최신 Windows 정책:** 사용자 요청으로 Windows에도 200ms/최대 13단계의 제한된 창 보간을 활성화했다. 배경만 표시한 뒤 최종 bounds 적용 후 preview를 마운트한다. Mac은 native 유지, OS 동작 줄이기/rich-animation 비권장/앱 off는 즉시 적용한다. [P1 §9](startup-performance-p1.md#9-windows-애니메이션-활성화--작업-예산과-lifecycle-제한)가 앞선 Windows 즉시 적용 정책을 대체하며, Windows 실기 성능은 여전히 미검증이다.

메인 조사와 서브에이전트 3개가 시작 경로, 최신 스택, OS 자원, IPC/utility를 분담했다. 기존 [성능 기준 v1](performance-standard-v1.md), [IPC 감사](performance-audit-2026-09-08/ipc.md), [main/플랫폼 감사](performance-audit-2026-09-08/main-platform.md), [시작 파이프라인 문서](../architecture/startup-pipeline-dissection.md)를 현재 소스와 대조했다. 최초 조사 이후 code-review-graph MCP를 CLI로 연결하고 HEAD까지 갱신하여, 같은 3개 조사 영역을 그래프 우선으로 재검증했다. 그래프의 누락·모호한 연결은 소스·새 production 빌드·기존 테스트로 보완했다(§10). §1~10 사전조사 당시에는 제품 코드·의존성·OS 설정 변경이나 앱 실행·실기 벤치마크를 하지 않았다. 후속 P0에서는 테스트 전용 실행기를 추가해 Mac 계측을 시작했으며 그 결과/실패는 별도 P0 문서에 기록한다. MCP 연결 설정은 별도 선행 작업이다.

## 1. 결론과 버전 기준

우선순위는 **동일 조건의 시작 시간 측정 → 첫 화면 이전 작업 축소 → 기존 작업의 실행량·수명 관리 → 실기 회귀 검증**이다. GPU/메모리 진단은 원인 구분에 사용하며 기기별 자동 정책으로 연결하지 않는다. 현재 근거로 Windows의 5초를 GPU, GC, Defender 또는 네트워크 하나의 문제라고 확정할 수 없다.

| 항목 | 저장소 선언 및 로컬 설치 확인 | 공식 공개 자료 확인 |
| --- | --- | --- |
| Electron | 44.2.0 | 최신 stable 44.3.0, 2026-09-08 공개 |
| Chromium / 내장 Node | 44.2.0의 공개 조합: 152.0.7977.76 / 24.20.0 | 44.3.0: 152.0.7977.78 / 24.20.0 |
| Electron 42 계열 | 사용자가 언급한 버전, 실제 Windows 바이너리는 미확인 | 유지보수 42.11.3: Chromium 148 / Node 24.19.0 |
| React / React DOM | 19.2.8 | 공식 19.2.8 릴리스 확인 |
| Tailwind CSS | 4.3.3 | 공식 latest 4.3.3 확인 |
| Vite / electron-vite | 8.2.2 / 5.0.0 | 이번 조사에서 최신 여부 별도 판정하지 않음 |

근거: [Electron stable 목록](https://releases.electronjs.org/release?channel=stable), [React 19.2.8](https://github.com/react/react/releases/tag/v19.2.8), [Tailwind 릴리스](https://github.com/tailwindlabs/tailwindcss/releases). 로컬 버전은 `package.json`과 설치 패키지의 `package.json`을 읽어 확인했다. 내장 Chromium/Node는 릴리스 표의 조합이며 실제 프로세스의 `process.versions`를 실행해 검증한 값은 아니다.

42와 44는 엔진이 다르므로 서로 다른 버전의 Mac/Windows 결과를 OS 차이로 해석하지 않는다. 먼저 현재 44.2.0 기준선을 만들고, 동일 소스의 44.3.0 비교를 별도 실험으로 둔다. 업그레이드만으로 5초 문제가 해결된다는 근거는 없다.

추가 확인: 44.3.0은 일부 Windows 시스템에서 `app.getGPUInfo('complete')`가 GPU process를 수초간 멈추게 하는 문제를 수정했다. 로컬 `src/main`, `src/preload`, `src/renderer/src`, `scripts` 검색에서는 해당 API의 직접 호출을 찾지 못했다. 따라서 현재 증상의 원인으로 확정하지 않으며, 새 진단 코드가 이 호출을 부트에 추가하지 않도록 제한한다. 의존성 내부 호출까지 없다는 증명은 아니다. [44.3.0 릴리스](https://releases.electronjs.org/release/v44.3.0)

## 2. 현재 StartupWizard 경로에서 확인한 사실

```text
외부 실행 요청
  → [portable 사용 시 launcher·압축 해제·OS 검사]
  → Electron 시작·main 모듈 평가
  → app ready / DB bootstrap 시작 / 전체 IPC 등록
  → 첫 사용자: 위저드 창 생성(show: true), readiness는 별도 진행
  → renderer 정적 모듈 평가
  → i18n + settings.getEditor 완료 대기
  → root.render → Suspense fallback
  → StartupWizard 동적 import와 그 정적 의존성 평가
  → IntroStep 표시 → 시작 버튼 입력 → ModelStep 표시

기존 완료 사용자: 전체 readiness 완료 → 위저드 또는 메인 창 생성
위저드 완료: readiness/설정 저장 → 메인 창 생성·로드 → 표시 후 위저드 닫기
```

이는 논리적 의존 순서다. DB 초기화, 네트워크, renderer 로드는 일부 겹치며 `async` 함수 안의 동기 작업은 main 이벤트 루프를 계속 점유할 수 있다.

| 발견 | 현재 근거 | 의미 / 검증할 가설 |
| --- | --- | --- |
| 첫 사용자의 위저드는 readiness보다 먼저 생성됨 | `src/main/lifecycle/app-ready/appReady.ts:324`, `window/windowStartupWizard.ts:161` | 새 설치 첫 IntroStep의 5초를 readiness 네트워크 timeout으로 바로 설명할 수 없음 |
| 창 생성 전에 전체 IPC 등록을 기다림 | `appReady.ts:312` | handler import·등록과 동시 bootstrap의 CPU/I/O 비용 측정 필요 |
| React 렌더 전에 i18n과 설정 IPC 대기 | `src/renderer/src/app/main.tsx:74`, `app/setup.ts:118` | 네이티브 배경이나 빈 창이 보여도 실제 위저드는 아직 없을 수 있음 |
| 위저드 모듈이 모든 단계를 정적 import | `features/startup/components/StartupWizard.tsx:5` | 첫 intro에 불필요한 후속 단계 코드가 동적 import 완료를 늦출 후보 |
| 테마·레이아웃 단계가 실제 Editor를 정적 의존 | `steps/ThemeStep.tsx:8` → `preview/WizardEditor.tsx:2` → `features/editor/components/Editor.tsx`; `LayoutStep` → `LayoutLivePreview`도 합류 | 그래프·소스·새 빌드에서 확인. intro에서 Editor가 mount되는 것은 아니지만 editor 코드가 wizard 정적 의존성에 포함됨 |
| 공통 프로젝트 초기화가 windowMode와 무관 | `app/App.tsx:133`, `features/project/hooks/useProjectInit.ts:22` | bootstrap ready 후 위저드에서도 설정/프로젝트 조회와 구독 경쟁. graph/export의 실제 필요 데이터는 따로 확인하고 좁혀야 함 |
| 설정 조회 경로가 여러 개 | `app/setup.ts:118`, `useProjectInit` → editor store, `useStartupWizardState.ts:43` | 중복 조회 후보. 실제 횟수는 창 모드·bootstrap·개발 StrictMode에 따라 달라짐 |
| 기존 사용자는 전체 readiness를 기다림 | `appReady.ts:342`, `startupReadinessService.ts:139` | 기존 사용자 재시작 지연은 첫 intro와 별도 원인 분석 필요 |
| readiness는 동기 integrity 검사와 조건부 5초 HTTP 검사를 포함 | `startupReadinessService.ts:223`, `:356` | 로그인 연결/userId/token/config가 없으면 HTTP 검사는 실행되지 않음. 동기 DB 검사는 별도 main CPU/I/O 후보 |
| Windows 배포 타깃은 portable | `electron-builder.json`의 `win.target` | `nsis` 설정 블록이 있어도 현재 설치본 배포를 뜻하지 않음 |
| 임베딩 상태 바 초기화는 상태 조회 | `features/startup/stores/modelInstallStore.ts:39` | 이 코드 자체가 자동 다운로드·모델 로드를 시작한다고 단정하지 않음. 다운로드는 `startDownload`에서 요청 |
| DB bootstrap 뒤 llmfit 설치 확인을 비차단 호출 | bootstrap의 `triggerLlmfitInstall` → `src/main/infra/llm/llmfitInstaller.ts:125` | 지원 플랫폼에서 기존 설치 상태보다 release 네트워크 조회가 먼저다. 필요시 다운로드·압축 해제까지 시작되어 첫 화면과 자원 경쟁 가능. 모델 자동 로드나 readiness의 직접 await와는 다름 |
| DB 시작 작업이 integrity 검사에 한정되지 않음 | `src/main/database/main/databaseService.ts:73`, `databaseSchemaBootstrap.ts:195` | migration·legacy 보정·FTS/backfill·native SQLite 및 sqlite-vec 로드를 분리 계측. 새 DB/현재 DB/구버전 DB의 비용이 다름 |

### 새 production 빌드로 확인한 로딩 범위

동일 HEAD에서 기존 electron-vite를 임시 출력 경로로 빌드했다. 생성 JS의 정적 import/re-export만 재귀 추적하고 파일을 중복 제거한 결과다. 동적 import는 별도 진입점으로 취급했다.

| 범위 | 고유 파일 수 | 비압축 산출물 크기 |
| --- | ---: | ---: |
| HTML에서 시작하는 부트 JS의 정적 의존성 | 17 | 586,895 bytes / 573.1 KiB |
| HTML CSS | 1 | 170,001 bytes / 166.0 KiB |
| StartupWizard 청크의 정적 의존성 전체 | 30 | 1,533,397 bytes / 1,497.5 KiB |
| 부트 JS 대비 wizard 추가 JS | 13 | 946,502 bytes / 924.3 KiB |

wizard 의존성에 부트 JS 17개가 모두 포함되므로 두 집합의 합집합도 1,497.5 KiB다. 추가분의 큰 항목은 ProseMirror 349,124 bytes, TipTap 263,591 bytes, `useShortcuts` 100,555 bytes, workspace vendor 82,958 bytes, `EditorToolbar` 43,209 bytes다. 기존 부트 게이트는 JS 600 KiB/CSS 170 KiB 이내로 **통과**하지만 wizard 추가분은 판정하지 않는다.

이는 모듈 로딩 범위의 증거이지 Windows에서 실제 읽은 전송량·평가 시간·상주 메모리 또는 5초 원인의 확정이 아니다. locale·추가 동적 import·이미지·폰트는 JS 집계 밖이다. intro의 조건부 JSX는 Editor를 mount하지 않으므로 editor 인스턴스·통계 worker까지 첫 화면에서 생성된다고 확대하지 않는다.

빌드에서 `domains/manuscript/index.ts`의 dynamic import가 다른 static import 때문에 분리되지 않는 경고도 확인했다. 해당 경계는 산출물을 확인해야 하며, 이 경고만으로 모든 lazy layout이 eager라고 판단하지 않는다.

첫 번째 작은 최적화 후보는 **첫 intro에 필요한 모듈과 설정만 로드하는 것**이다. 설정 캐시의 초기 표시, 작은 번역 리소스, 후속 단계 lazy import를 검토한다. `root.render`만 앞당겨 번역 키 노출·테마 깜빡임·사용자 설정 덮어쓰기를 만들면 완료된 개선이 아니다. 시작 버튼부터 다음 단계까지의 시간도 함께 측정해 지연을 다음 클릭으로 옮겼는지 확인한다.

## 3. 기존 문서의 정정·조건부 항목

| 기존 서술 | 새 판단 |
| --- | --- |
| renderer 중심·Windows 전용 | 이번 요청은 main/preload/utility/OS와 macOS 회귀까지 포함. 공통 작업량 감소와 OS API 차이를 구분해 계획 |
| 모든 시작이 full readiness로 차단됨 | 현재 첫 사용자 위저드는 먼저 생성. 기존 완료 사용자·완료 전환 경로와 분리 |
| readiness 캐시가 없음 / utility가 부팅 즉시 시작 | 현재 TTL+in-flight 병합, 요청 기반 utility lazy 시작이 있음. 새로 구현할 작업으로 중복 산정하지 않음 |
| RAG/utility에 취소가 전혀 없음 | RAG QA는 ask/stop IPC와 AbortController가 이미 있음. 일반 생성·임베딩·컨텍스트 준비 단계의 signal 전파 공백으로 범위를 좁힘 |
| 위저드를 먼저 닫아 창 0개 간극 발생 | 현재 main 표시 후 wizard를 닫는 `wizardClosePending` 경로가 있음 |
| 위저드에 800ms+650ms 고정 대기 | 현재 650ms 대기는 handler 완료 await로 바뀜. 800ms 피드백 대기는 남아 있으나 첫 intro 표시 지연은 아님 |
| 위저드에도 DevTools 자동 오픈 | 현재 확인한 자동 오픈은 main 및 일부 secondary 경로. wizard 생성 경로에는 없음 |
| 정적 부트 JS 예산 이내이므로 번들이 지배 원인이 아님 | `check-render-boot-budget.mjs`는 index HTML의 script/preload/CSS 합계. 그 뒤 첫 intro까지 필요한 wizard 동적 의존성은 별도이므로 이 결론을 보장하지 못함 |
| `file://` JS 코드 캐시는 기본 활성 | 최신 Electron session 문서는 기본 http(s)만 명시. 확정 철회; 실제 버전의 캐시 생성/hit 검증 필요 |
| Node compile cache는 main 한 줄로 해결 | 최초 캐시 생성 비용이 있고 이미 평가된 자기 번들에 소급 적용되지 않음. 후속 import와 warm 시작에 대한 조건부 실험 |
| Toast value memo가 전체 트리 재렌더 해결·효율 1위 | context 소비자 갱신과 후손 렌더 범위를 측정해야 함. 새 value 객체는 확인됐지만 효과 순위는 미검증 |
| Activity hidden으로 숨김 탭 메모리까지 해결 | DOM/state 보존, Effect 정리, 낮은 우선순위 렌더. 메모리 해제와 다름; 미방문 탭 lazy mount와 구분 |
| Research 탭 lazy·통계 worker 재사용·SmartLink Map을 새로 도입 | 미방문 탭 lazy mount, 통계 worker lazy singleton, 엔티티 Map 조회가 이미 있음. 방문 후 숨김 Effect·worker 응답 소유권·전체 문서 재스캔을 검토 |
| culling/Compiler/메모화를 일괄 적용 | 각각 작은/큰 데이터와 화면에서 비용·정확성 비교 후 채택. 첫 main 초기화·IPC 대기를 해결하는 기능은 아님 |
| main의 resize timer를 rAF로 바꾸면 해결 | main에는 Window rAF가 없음. renderer 매 프레임 IPC 도입은 새 비용. 기존 최종 bounds·완료 응답을 보존하며 빈도/애니메이션 생략 A/B부터 |
| GPU status·RAM·스레드 수로 성능 등급 확정 | 기기 등급과 CPU/RAM 자동 튜닝은 이번 범위에서 제외. 메타데이터와 성능 측정만 유지하고 부트 합성 벤치마크는 추가하지 않음 |
| 450MB·1.5초를 모든 환경의 즉시 하드 게이트로 사용 | 실기·시나리오·시작점이 확정되기 전에는 잠정 목표. 기존 정적 CI 게이트는 유지하고 런타임 게이트를 별도 확정 |

API 근거: [Electron code cache](https://www.electronjs.org/docs/latest/api/session#sessetcodecachepathpath), [Node compile cache](https://nodejs.org/docs/latest-v24.x/api/module.html#module-compile-cache), [React context](https://react.dev/reference/react/useContext), [Activity](https://react.dev/reference/react/Activity). 오래된 문서는 과거 증거로 보존하며 위 표를 현재 조사 기준으로 사용한다.

추가 주의: Windows/Linux spellchecker 언어는 `availableSpellCheckerLanguages`와 실제 사전 가용성을 확인해 선택한다. `['ko']`를 무조건 지정하거나 저사양이라는 이유만으로 사용자 기능을 끄는 정책을 확정하지 않는다. macOS native spellchecker와 같은 동작이라고 가정하지 않는다. [Electron spellchecker](https://www.electronjs.org/docs/latest/tutorial/spellchecker)

## 4. 가장 먼저 보완할 측정

### 4.1 현재 로그의 사각지대

- main `startupStartedAtMs`는 `src/main/index.ts:18`에서 설정된다. portable launcher와 Electron 자체 초기화, 그 지점 이전의 정적 모듈 평가는 포함하지 않는다.
- `index.ts`의 lifecycle 정적 import와 barrel의 re-export도 위 시각보다 앞선 평가 후보다. 그래프의 barrel import 0건을 비용 0으로 해석하지 않는다.
- renderer 시작 시각도 `app/main.tsx:16`으로 정적 import 평가 이후다. main의 시간과 서로 다른 시작점을 가진다.
- `root.render()` 직후의 “root mounted” 로그는 React commit 완료 신호가 아니다. 다음 rAF의 “first frame painted”도 paint 이전 callback이며 wizard 대신 Suspense fallback일 수 있다. [React createRoot](https://react.dev/reference/react-dom/client/createRoot), [rAF](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- `did-finish-load`, `ready-to-show`, native `show`, FCP, 위저드 콘텐츠 표시, 버튼 반응을 동일 지표로 취급하지 않는다.
- 위저드 완료 전환은 main의 `did-finish-load` 또는 8초 fallback에 따라 진행된다. 창 겹침 보호가 있다고 main 콘텐츠의 상호작용 준비까지 보장되는 것은 아니다.
- preload의 requestId가 main에 전달되지 않아 main handler 로그와 사용자 대기를 동일 요청으로 연결하기 어렵다. `ipc.md` I04가 현재도 해당된다.

### 4.2 수집 계약

| 구간/필드 | 방법과 판정 |
| --- | --- |
| 실행 요청 → OS 프로세스 생성 → main 진입 | 외부 launch harness 시각 + OS trace. portable launcher와 실제 Electron PID 구분 |
| main → 창 생성 | 기존 checkpoint 재사용, bootstrap/handler import/등록 구간 분리 |
| navigation → FCP → IntroStep commit | PerformanceObserver paint entry + 컴포넌트 commit 표식. FCP는 위저드 완료 표시의 대리값으로 쓰지 않음 |
| 위저드가 실제 보임 | Chromium frame/screenshot trace와 foreground 상태를 대조. commit→rAF는 보조 신호 |
| 입력 → ModelStep 표시 | 실제 클릭 이벤트부터 다음 화면 반영까지. 단순 버튼 존재·enabled 검사만으로 종료하지 않음 |
| IPC 왕복/작업 | 같은 요청 식별자, 호출자 전체 duration, main 실행 duration, payload 규모·대기량. 프로세스별 performance.now 절대값을 직접 빼지 않음 |
| 재현 메타데이터 | commit/artifact hash, process.versions, host/process/native addon/sidecar arch, OS build, GPU/driver, 디스크, RAM, 전력 상태, 화면/DPI/Hz, 실행 모드, 사용자 상태 |

proposal: warm 재실행 20회 이상에서 개별값·median·p95·max를 보관한다. 재부팅 후 첫 실행은 우선 5회 개별값·median·max로 조사하고, 적은 표본의 p95를 확정 게이트로 쓰지 않는다. 최초 설치, 재부팅 후 실행, warm 재실행, dev Vite cold/warm을 다른 시나리오로 둔다. 앱 캐시 삭제는 OS 파일 캐시 cold를 보장하지 않는다.

새 테스트 userData와 synthetic DB로 로그인·설정·모델·캐시 상태를 통제한다. 기존 E2E helper의 DB URL 분리만으로 userData 전체 격리가 된다고 가정하지 않는다. 프로파일러를 켠 진단 실행과 일반 production의 시간 인증 실행을 분리한다.

### 4.3 도구 선택

| 계층 | 우선 도구 | 한계/용도 |
| --- | --- | --- |
| Chromium 전체 프로세스 | Electron contentTracing | app ready 이후 사용. JS/layout/paint/GC/IPC 관련 trace를 필요한 범위만 수집 |
| app ready 이전 | OS trace + 대상 Electron에서 검증한 Chromium startup tracing | `--trace-startup` 계열은 실제 배포 바이너리에서 동작 확인 후 사용 |
| React 19.2 | React Performance Tracks / 별도 profiling 빌드 | scheduler·컴포넌트 작업 분석; 계측 오버헤드가 있어 시간 인증은 일반 production |
| Node main/utility | perf_hooks eventLoopUtilization, monitorEventLoopDelay, PerformanceObserver gc | 실제 내장 Node 24 API 사용. Node 26.5의 samplePerIteration 옵션은 사용 전제에 넣지 않음 |
| Windows | WPR/WPA, 필요한 경우 ProcMon·GPUView·Defender analyzer | CPU 실행과 thread wait, 파일 접근, page fault, DWM/GPU 대기 분리 |
| macOS | Instruments Time Profiler/Hangs/Thread State Trace/Allocations | Electron helper를 포함하고 CPU busy와 대기 상태 구별 |

근거: [contentTracing](https://www.electronjs.org/docs/latest/api/content-tracing/), [Chromium startup tracing](https://www.chromium.org/developers/how-tos/trace-event-profiling-tool/recording-tracing-runs/), [React Performance Tracks](https://react.dev/reference/dev-tools/react-performance-tracks), [Node 24 perf_hooks](https://nodejs.org/docs/latest-v24.x/api/perf_hooks.html), [WPR](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/windows-performance-recorder), [Apple Instruments](https://developer.apple.com/tutorials/Instruments/getting-started-with-hang-analysis).

Electron 43+의 `contentTracing.enableHeapProfiling()`은 실험 API로 native allocation 추가 조사 후보이며 로컬 44.2.0 타입에도 존재한다. 42에는 같은 API가 있다고 가정하지 않는다. 기존 `build:debug-profile`은 sourcemap 생성과 minify 해제이지 React profiling alias 활성화가 아니다. release fuse가 Node options/CLI inspector를 제한하므로 계측을 위해 제품 보안을 해제하는 방식은 기본 계획에 넣지 않는다.

## 5. OS·기기별 최적화 방향

| 환경 | 먼저 확인할 병목 | 측정 후 적용할 작은 변경 |
| --- | --- | --- |
| Windows x64 native | portable 전개, Defender, main 동기 I/O, 모듈 평가, DPI/DWM | 같은 artifact의 portable vs unpacked/설치 형태 A/B, 반복 파일 작업·초기 import 축소 |
| Windows ARM64 native | 앱/.node/sidecar의 실제 아키텍처, Adreno/가상 GPU, native asset 지원 | 아키텍처 일치·지원 기능 점검, GPU backend와 CSS/resize 비용 비교 |
| Windows ARM 위 x64 | Prism 에뮬레이션 + 위 항목 | native ARM64와 비교하되 native Intel/AMD x64 인증으로 사용하지 않음 |
| M4 Air 16GB | 현재 빠른 경로 회귀, 장시간 CPU/전력/메모리 압박 | 동일 공통 최적화 적용 전후 비교, AC/battery·열 상태·다중 창 검사 |
| Windows 저사양 8GB | 저장장치·pagefile·낮은 단일 스레드 처리량·iGPU | 공통 background 실행량 제한과 화면 효과 A/B. 생성/BGE-M3 sidecar는 기기와 무관하게 비활성화 |
| Linux 배포 지원 | Wayland/X11·GPU backend·keyring·native addon | 공통 시작 흐름 유지, OS 기능 가능 여부 처리·기본 부팅/저장 회귀 |

### CPU와 OS API

Windows의 visible/foreground/occluded 상태는 QoS에 영향을 줄 수 있다. 실제 사용처럼 foreground 창으로 기준선을 측정한다. 제품은 idle polling·동시 작업량을 줄이는 데 한정한다. EcoQoS, native `SetProcessInformation`, CPU affinity·process priority·timer resolution 직접 제어는 이번 구현 범위 밖이며 P4의 묵시적 후속 작업으로도 잡지 않는다. [Windows QoS](https://learn.microsoft.com/en-us/windows/win32/procthread/quality-of-service)

`powerMonitor`의 `speed-limit-change`는 macOS/Windows, `thermal-state-change`는 macOS에서 사용한다. 배터리 여부 자체를 저사양 판정으로 바꾸기보다 작업 경쟁·열/속도 제한을 관측한다. 이벤트 미발생은 throttling 부재의 증거가 아니다. [powerMonitor](https://www.electronjs.org/docs/latest/api/power-monitor/)

### GPU와 화면

`gpu-info-update` 이후 필요할 때 `getGPUFeatureStatus()`를 확인하고 식별 정보가 더 필요하면 `getGPUInfo('basic')`을 조회한다. 첫 유효 조회는 1회로 시작하고 같은 정보의 중복 요청을 병합한다. `getGPUInfo('complete')`는 명시적 상세 진단에서만 허용하고 기본 부트/제품 이벤트 처리에서는 호출하지 않는다(§1의 44.3.0 수정 참고). OS 이름으로 D3D/Metal/Vulkan 사용을 단정하지 않으며 수집 자료에 없으면 backend는 미확인으로 기록한다. `gpu_compositing` 하나로 처리량이나 메모리 압박을 판정하지 않는다. [Electron GPU API](https://www.electronjs.org/docs/latest/api/app/)

기본 가속 → native resize 애니메이션 생략 → blur/투명 효과 축소를 한 항목씩 A/B한다. JS가 짧은데 화면이 늦으면 raster/compositor/DWM/GPU 큐를 확인한다. 효과의 개수보다 화면 면적·중첩·DPI·반복 repaint가 중요하다. 적합한 애니메이션은 transform/opacity를 쓰되 모든 노드에 will-change를 붙여 layer 메모리를 늘리지 않는다. [GPUView](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/using-gpuview), [애니메이션 성능](https://web.dev/articles/animations-guide)

`--disable-gpu`와 SwiftShader는 진단용이며 기본 배포 최적화가 아니다. SwiftShader의 OpenGL ES 드라이버 모드와 unsafe WebGL fallback은 구별한다. 자동 fallback의 deprecation을 모든 버전에서의 제거로 확대하지 않는다. WebGL 실패와 일반 DOM/CSS 합성 실패도 다르다. [Chromium SwiftShader](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md)

### 저장장치·배포·ARM

ProcMon에서 launcher/Electron 프로세스와 TEMP, app.asar, native addon, DB, locale 파일 작업의 횟수·시간을 확인한다. Defender는 켠 상태에서 분석기로 검사 기여도를 측정한다. 배포 형태 변경의 판단 근거는 같은 소스·서명 조건·설정의 A/B이며 현재 portable이 원인이라는 확정은 아니다. [ProcMon](https://learn.microsoft.com/en-us/sysinternals/downloads/procmon), [Defender 분석기](https://learn.microsoft.com/en-us/defender-endpoint/tune-performance-defender-antivirus)

Windows ARM에서 x64 실행에는 에뮬레이션이 개입한다. 호스트 CPU, OS arch, Electron process.arch, native addon, 외부 sidecar를 따로 기록한다. `src/main/infra/llm/sidecarConstants.ts`에는 win32-arm64 자산 키가 없고 Windows x64 자산은 CPU 빌드다. 모델 단계 지원 공백이며 첫 IntroStep 지연과는 별도로 다룬다. GPU layer 설정만 바꿔 GPU 지원 바이너리가 생기지는 않는다. [Windows ARM 에뮬레이션](https://learn.microsoft.com/en-us/windows/arm/apps-on-arm-x86-emulation)

이 공백은 llama sidecar 매핑에 대한 것이다. 별도 `llmfitConstants.ts`는 win32-arm64 자산을 지원하므로 AI 관련 바이너리 전체를 미지원으로 묶지 않는다. `scripts/rebuild-electron-if-needed.mjs`의 host Electron probe 성공 후 조기 반환도 cross-arch 산출물 인증이 아니다. 패키지가 잘못됐다는 증거는 아니며, 대상 Windows에서 native addon 로드와 sidecar 실행을 따로 검증해야 한다.

## 6. 메모리·GC·CPU 관찰 계약

| 범위 | 수집할 값 / 해석 |
| --- | --- |
| Windows Electron | app.getAppMetrics의 PID별 privateBytes 합계·peak, workingSet 별도. KB→MiB 환산. system commit/available RAM/hard faults/pagefile I/O 병행 |
| macOS | 프로세스별 private/footprint, system memory pressure·압축·swap 변화. Windows private bytes와 동일 수치 게이트로 비교하지 않음 |
| Linux | smaps_rollup의 PSS/private/swap, RSS 별도. 공유 메모리 단순 중복 합산 주의 |
| V8 main/renderer/utility | heap 증가·할당률·GC 횟수/시간, external·ArrayBuffer, DOM/detached node 등 |
| native/GPU/sidecar | SQLite·이미지·GPU·llama 프로세스를 구분. Electron 합계와 기기 전체 소비를 모두 보고 |

근거: [Electron MemoryInfo](https://www.electronjs.org/docs/latest/api/structures/memory-info), [Electron process](https://www.electronjs.org/docs/latest/api/process), [Linux proc](https://www.kernel.org/doc/html/latest/filesystems/proc.html), [Node memoryUsage](https://nodejs.org/docs/latest-v24.x/api/process.html#processmemoryusage).

`arrayBuffers`는 Node `external`에 포함되며 따로 더하면 중복이다. worker_threads의 RSS는 프로세스 전체라 worker별 합산하지 않는다. `getAppMetrics()`는 **하나의 sampler**에서 읽어 CPU·메모리 소비자에 나눈다. 서로 다른 주기의 독립 호출은 CPU의 이전 호출 기준 평균 구간을 바꾸므로 v1의 “CPU/메모리 폴링 분리”를 이 방식으로 구체화한다. PID 재사용을 고려해 creationTime도 기록하고 Utility type만으로 앱 자체 utility와 Chromium 네트워크 서비스를 혼동하지 않는다. [ProcessMetric](https://www.electronjs.org/docs/latest/api/structures/process-metric)

GC는 OS별 별도 collector를 선택하는 문제가 아니다. Electron에 내장된 V8의 할당·객체 수명·CPU 경쟁과 OS 메모리 압박을 연결해 본다. 긴 원고의 전체 문자열 복사, IPC DTO, 취소되지 않은 요청, 로그 큐의 증가와 GC pause가 겹치는지 먼저 확인한다. renderer는 DevTools allocation/Performance, main/utility는 GC observer로 나눠 측정한다. 강제 GC·heap 한도 증가·working-set trim을 성능 개선의 출발점으로 삼지 않는다. [Node GC 분석](https://nodejs.org/en/learn/diagnostics/memory/using-gc-traces), [Chrome 메모리 분석](https://developer.chrome.com/docs/devtools/memory-problems)

후속 결정에 따라 생성용 LLM과 BGE-M3 sidecar의 기기별 상주/허용 정책은 구현 대상에서 제외한다. 대신 새 정책 적용 후 해당 프로세스가 직접 요청·자동 재시도·fallback으로 시작되지 않는지 확인한다. RAG·Memory Engine용 utility와 검색/DB 메모리는 계속 측정한다. 다운로드 파일 크기와 실행 중 resident memory는 다르며, 기존 모델 파일 보존과 프로세스 미기동도 다른 조건이다.

## 7. IPC·utility 최적화 범위

| 현재 확인 | 우선 변경 후보 | 완료 확인 |
| --- | --- | --- |
| preload timeout은 대기만 종료, read 최대 1회 재시도 | 동일 read 병합·취소·중복 억제 | 느린 요청과 재시도가 무제한으로 겹치지 않음 |
| 일반 utility 요청은 timeout 후 pending 삭제만 하고 작업 생존 가능 | 기존 RAG 취소를 재사용하되 일반 생성·임베딩·컨텍스트 준비까지 signal 연결, 실행/대기 상한 | timeout 뒤 실제 provider 종료, queue 상한, 사용자 요청 진행. 기존 RAG stop을 새 기능으로 재구현하지 않음 |
| utility status/stop도 DB ready 뒤 처리 | DB 불필요 control 경로를 ready await 앞에서 처리 | DB 초기화 Promise 대기에 종속되지 않음. 같은 event loop의 동기 SQL/CPU 작업은 이 순서 변경만으로 선점할 수 없음 |
| logger는 batch 크기만 제한, 실패 시 개별 invoke 확대 | 진행 중 flush Promise에 합류·항목/byte 상한·반복 로그 제한, main sink까지 backpressure 점검 | shutdown은 진행 중 flush와 잔여 큐를 기다려야 함. 단순 `if (inFlight) return` 금지. IPC 성공 응답을 디스크 영속화로 간주하지 않음 |
| main/preload 요청 ID 불일치 | 검증되는 공통 trace metadata | UI action부터 DB/응답까지 한 요청을 추적 |
| derived worker 500ms idle polling | idle backoff·enqueue wakeup·필요 없는 조회 생략 | idle CPU/wakeup 감소, 새 작업 시작과 종료 안정성 유지 |
| derived worker stop은 5초 뒤 tick이 남아도 반환 가능 | idle 최적화와 종료 수명 관리를 별도 처리 | DB close 전에 작업 완료·실제 취소 또는 복구 가능한 재큐잉 보장. timeout만 줄이는 변경 금지 |
| readiness TTL이 검사 시작 시각 기준 | 완료 시각 기준 TTL + 기존 무효화 보존 | 검사 시간이 TTL보다 길어도 즉시 재검사하지 않음 |
| sidecar running이 health-ready보다 빠름 | 기존 코드의 관찰로 보존. 후속 결정에 따라 sidecar 활성 운용 최적화는 보류 | 대신 생성/BGE-M3 sidecar의 모든 시작 경로 차단 검증(§11) |
| provider가 이전 인증 closure를 재사용할 수 있음 | 최신 인증 resolver 갱신 또는 가벼운 wrapper 재생성 | 토큰 갱신 후 이전 인증 실패 재시도 부하 방지 |

소스: `src/preload/index.ts:190,227,276`, `src/main/handler/core/ipcHandler.ts:53`, `services/features/utility/utilityProcessBridge/internal/core.ts:338`, `utility/process/utilityProcessMain.ts:246`, `utility/llm/textGeneration.ts:49`, `services/features/derivedJobs/derivedJobWorker.ts:107`, `services/features/startup/startupReadinessService.ts:96`, `utility/llm/sidecarSupervisor.ts:131,225`, `utility/llm/runtimeMaterializer.ts:93`. main 이하 축약 경로는 `src/main/` 기준이다. 과거 감사의 mock 재현 수치는 이번 세션의 성능 실측으로 재사용하지 않았다.

RAG의 기존 취소 경로는 `preload/api/projectApi.ts` → `ipcRagQaHandlers.ts` → bridge ask/stop → utility dispatch → `ragQaWorker.ts`의 AbortController → 생성 signal이다. 컨텍스트 준비의 embedding callback과 일반 `textGeneration.ts`는 별도 점검 대상이다. 로그 종료 경로는 preload `completeAppFlush` → flush 대기 → `APP_FLUSH_COMPLETE`까지 보존하고, main logger의 비동기 파일 쓰기 완료는 별도 확인한다.

프로세스 선택은 다음 범위로 제한한다.

| 작업 | 경계 |
| --- | --- |
| 창·OS API·IPC 라우팅 | main 유지 |
| 순수 renderer CPU 계산 | 표준 Web Worker 후보; DOM은 renderer |
| 반복 Node CPU 계산 | 계측 후 재사용 worker_threads 후보 |
| RAG·Memory Engine | 기존 lazy utility 유지. 생성용 LLM/BGE-M3 sidecar 비활성화와 구분 |
| 비동기 파일·네트워크 I/O | 기존 비동기 API 우선 |
| 긴 DB 스캔 | main blocking을 확인한 후 전용 worker/기존 utility 적합성 검토. DB 소유권·migration·stop 경로 경쟁 먼저 설계 |

`async` IPC는 main의 동기 SQLite 실행을 다른 스레드로 옮기지 않는다. worker마다 메모리·초기화 비용이 있어 작업마다 새 프로세스를 만들지 않는다. [Node worker_threads](https://nodejs.org/docs/latest-v24.x/api/worker_threads.html), [Electron utilityProcess](https://www.electronjs.org/docs/latest/api/utility-process)

큰 IPC는 먼저 전송 횟수·필드·본문 복사·중복 결과를 줄인다. 지속 스트림에 필요가 입증되면 MessagePort를 검토한다. Electron postMessage의 transfer 계약이 MessagePort라는 점을 확인하고 ArrayBuffer의 무조건 zero-copy를 가정하지 않는다. contextBridge 격리와 main의 schema validation, 저장 순서·durable ack·shutdown flush를 보존한다. [ipcRenderer](https://www.electronjs.org/docs/latest/api/ipc-renderer), [MessagePorts](https://www.electronjs.org/docs/latest/tutorial/message-ports)

## 8. React 19·Tailwind 4 적용 순서

Tailwind 4의 빠른 CSS 빌드는 개발/빌드 생산성이다. packaged 실행 중에는 생성된 CSS의 layout/paint/합성 비용을 측정한다. Windows ARM용 Oxide/Rolldown 패키지 문제를 production 렌더 지연과 바로 연결하지 않는다. [Tailwind 설치/동작](https://tailwindcss.com/docs/installation/using-postcss), [v4 빌드 성능](https://tailwindcss.com/blog/tailwindcss-v4)

React는 초기 모듈 그래프와 설정 gate를 먼저 줄이고, Performance Tracks로 업데이트 비용을 찾는다. Compiler는 현재 Vite 구성에서 공식 설치 경로를 사용할 수 있지만 추가 빌드 의존성과 정확성 검증이 필요한 별도 변경이다. React 밖의 SmartLink 전체 스캔이나 동기 diff는 알고리즘/worker 범위이며 Compiler로 해결되지 않는다. `useDeferredValue`는 입력 우선순위를 조정할 뿐 필터 총 연산량을 없애지 않는다. [Compiler 설치](https://react.dev/learn/react-compiler/installation), [Compiler 최적화 범위](https://react.dev/learn/react-compiler/introduction), [useDeferredValue](https://react.dev/reference/react/useDeferredValue)

숨김 탭은 미방문 lazy mount, 방문 후 state 보존, 완전 해제를 구분한다. blur·culling·Toolbar memo·store selector는 실제 큰 데이터 및 일반 데이터에서 입력 지연·메모리를 함께 비교한다. 한국어 IME 조합·커서·선택·자동저장 정확성은 최적화 전후 동일해야 한다.

그래프에서 연결한 뒤 소스로 좁힌 실제 변경 후보는 다음과 같다. 이들은 intro 로딩과 별도 사용자 시나리오다.

| 영역 | 이미 있는 처리 | 남은 측정/개선 대상 |
| --- | --- | --- |
| SmartLink | 엔티티 lookup은 Map 사용 | 초기 scan, docChanged/강제 갱신, 4개 store 변경에서 전체 문서 scan. lookup 자료구조를 다시 만드는 대신 scan 호출·범위부터 측정 |
| DiffExtension | 비교값이 없으면 반환, 텍스트 합계 50,000 초과 시 diff 생략 | cap 전에 전체 텍스트·mapping·HTML 변환이 발생. 모든 타이핑이 diff를 실행한다고 가정하지 말고 비교 활성 시 비용과 revision 캐시 필요성 확인 |
| Editor 통계 | 900ms 직렬화 debounce, 추가 120ms 통계 debounce, lazy singleton worker | getHTML/getText와 worker 전송의 전체 문자열 비용, 다중 editor의 requestId/editorId 없는 응답 공유. worker 신규 도입보다 정확성과 복사량 우선 |
| ResearchPanel | 방문한 primary tab만 mount, 이후 CSS hidden으로 보존 | 미방문 탭 최적화는 유지하고 방문 후 숨김 Effect의 실제 부하에 한해 Activity/해제 검토 |
| Toast | callback 안정화는 있음 | Provider value 객체와 실제 context 소비자 렌더를 측정. 기존 sidebar 재렌더 테스트를 Toast 효과의 증거로 쓰지 않음 |

## 9. 검증 매트릭스와 실행 계획

### 최소 기기 매트릭스

| 프로필 | 역할 |
| --- | --- |
| 사용자 보고 Windows 기기 | 5초 증상의 최우선 재현, 실행 조건 확정 |
| M4 Air 16GB native ARM64 | 현재 Mac 기준선·공통 변경 회귀·전력/열 장시간 검사 |
| Windows Intel/AMD x64 16GB NVMe | native x64 기준선 |
| Windows ARM64 기기 | native ARM64 기준선, 같은 기기의 x64는 별도 에뮬레이션 실험 |
| Windows 8GB 저사양 | L 예산 확정. N100 결과로 N4020 지원을 인증하지 않음 |
| Linux x64 | 배포 지원에 맞춰 Wayland/X11·keyring·저장 기본 회귀 |

M4의 Windows VM, CDP CPU throttle 4배, GPU 비활성화는 보조 스트레스 실험이다. 실제 x64/ARM CPU, eMMC/Defender, 저가 iGPU/Adreno, pagefile, 열 특성을 재현한다고 가정하지 않는다. 프로필 이름은 실제로 제한한 자원만 표현한다.

시나리오는 새 사용자 intro, 기존 사용자 재시작, 위저드 완료 전환, 인증 네트워크 지연, 첫 프로젝트 입력, 큰 원고 IME/저장, 다중 창, 10분 idle/AI background 부하로 나눈다. 처음부터 모든 조합을 돌리지 않고 보고 기기와 M4의 시작 경로부터 확정한다.

### 단계별 계획

| 단계 | 작업 | 다음 단계로 넘어갈 증거 |
| --- | --- | --- |
| P0 측정 계약 | 실제 Windows 환경·artifact 식별, 외부 시작점/intro 표시/입력 표식, 기존 IPC/checkpoint 연결 | 5초 중 어느 구간이 지배적인지 보이는 같은 조건의 Mac/Windows trace |
| P1 첫 위저드 | 후속 preview 정적 의존 분리, 설정/i18n gate·불필요 프로젝트 초기화·handler 작업 축소. 모델 단계/llmfit은 §11.2의 비활성화 범위와 정합화 | intro 의존성 924.3 KiB 추가분의 감소와 intro/다음 클릭 runtime 개선을 각각 확인; 테마·언어·오류 UI 유지 |
| P1 별도 배포 실험 | portable vs unpacked/설치 형태 비교, 44.2 vs 44.3 별도 비교 | launcher와 앱 내부 개선량 구분. 배포 변경 여부 결정 가능 |
| P2 main/IPC | readiness TTL/검사 분리, 취소·큐 상한·로그 부하·idle polling, 동기 DB 병목 축소 | event-loop 지연·pending·idle CPU·메모리 감소, 저장/종료/인증 정상 |
| P3 renderer/GPU/GC | 큰 원고 알고리즘·복사량, blur/resize/culling/hidden 탭 실험, 필요시 Compiler | 입력/frame/GC와 메모리의 동시 개선, IME·접근성 회귀 없음 |
| P4 기기 적응 정책 — **Deferred** | 이번 구현·완료 기준에서 제외. baseline 학습·hysteresis·resource state engine·제품 CPU/RAM polling을 설계하지 않음 | P0~P3 이후 고정 작업 규칙으로 해결되지 않는 실기 문제가 남고 사용자가 별도 범위를 승인할 때만 재개 |

P0는 OS별 별도 시작 파이프라인이나 새 성능 프레임워크를 만들 필요가 없다. 기존 로그, performance timer, IPC 계약, utility memory snapshot을 확장하는 정도부터 시작한다. Ponytail 원칙에 따라 기존 구현 재사용과 측정 가능한 작은 변경을 우선했다.

v1의 1.5초 첫 표시·2.5초 상호작용·450MB는 새 매트릭스에서 재평가할 잠정 후보로 보관한다. source/정적 payload 게이트와 실기 runtime 게이트를 분리하고, OS별 기준선·제품 체감 목표·반복 측정의 변동폭을 근거로 회귀 허용 폭을 정한다. “100ms 이상 거의 0회” 같은 문구는 시나리오 길이와 허용 횟수를 정한 뒤 게이트로 바꾼다.

### 기존 검증 재사용

- 정적 payload: `scripts/check-render-boot-budget.mjs`. 새 빌드 기준으로 실행하며 wizard 첫 intro까지의 후속 청크를 별도 관찰한다.
- readiness/utility: `tests/main/services/startupReadinessService.test.ts`, `utilityProcessBridgeProtocol.test.ts`, `utilitySidecarSupervisor.test.ts`에 변경별 최소 회귀 사례를 추가한다.
- wizard/저장: `tests/dom/startupWizardFlow.test.tsx`, `startupWizardModelStep.test.tsx`, `preloadAutoSaveQueue.test.tsx`와 실제 Electron 입력 검증을 조합한다.
- 기존 utility의 30초 memory snapshot은 시작 5초 분석에 불충분하므로 진단 모드에서만 짧은 구간 계측을 보완한다.
- 구현 시 해당 변경에 맞춰 `typecheck`, `lint`, `qa:core`, `check:ipc-*`, `check:utility-process-boundary`, `check:main-service-boundaries`, 정적 부트 예산 등 저장소 필수 게이트를 수행한다. source 문자열/mock 테스트의 통과를 Windows 실기 성능 인증으로 제시하지 않는다.

이번 조사에서 확정하지 않은 것은 Windows 5초의 실제 원인·개선량·새 하드 게이트다. 다음 구현 단위는 **P0 시작 계측과 Windows 재현 조건 고정**이며, 그 결과에 따라 P1의 첫 수정 지점을 선택한다.

## 10. 그래프 재검증 최종 리뷰

### 10.1 Overall Verdict

**Risky — OS별 성능 개선을 인증할 단계는 아니다.** 사전조사는 완료했으며, 첫 화면의 불필요한 정적 의존성은 빌드까지 확인했다. Windows 5초의 지배 구간은 실기 trace가 없어 미확정이다. 이번 평가는 조사 대상 경로와 최적화 계획에 한정되며 제품 전체의 보안/품질 인증이 아니다.

code-review-graph를 CLI MCP로 초기화하고 `build_or_update_graph_tool`로 HEAD에 맞췄다. 조사 시점 그래프는 **9,169 nodes / 111,826 edges / 1,690 files / 18 communities**였다. 메인은 구조·영향·새 빌드를, 서브에이전트 3개는 renderer, main/OS, IPC/utility 경로를 다시 대조했다. `semantic_search_nodes_tool`, `query_graph_tool`, `get_architecture_overview_tool`, `list_communities_tool`, `get_impact_radius_tool`, `get_review_context_tool`, `detect_changes_tool`, `get_affected_flows_tool`을 사용했다.

### 10.2 Critical Issues (Must Fix)

여기서 Must Fix는 **성능 개선을 완료했다고 판정하기 전 충족할 조건**이다. 제품 코드를 이번 조사에서 수정했다는 의미가 아니다.

| 우선 | 확인한 문제 | 완료 판정 조건 |
| --- | --- | --- |
| P0 | 첫 표시·native show·React commit·입력 반응을 섞은 측정으로 OS 차이를 설명할 수 없음 | 동일 artifact/사용자 상태의 외부 실행→IntroStep 표시→ModelStep 입력 trace |
| P0 | 모델 단계 테스트 3개와 현재 UI 계약 불일치 | 하단 바를 숨기는 현재 의도와 테스트 기대를 정합화하고 전체 흐름 재검증. 실패 assertion을 단순 삭제해 통과시키지 않음 |
| P1 | Intro가 사용하지 않는 editor/preview가 wizard 정적 의존성에 포함 | 산출물에서 경계 분리 확인 후 첫 화면과 후속 단계 runtime을 함께 비교 |
| P2 | flush/stop 최적화를 잘못 적용하면 종료 ACK 이후 작업·로그가 남을 위험 | 공유 flush Promise 합류·잔여 큐 배출·DB close 전 작업 수명 보장. 성능을 위해 저장/종료 보장을 축소하지 않음 |

### 10.3 Structural Problems

| 경로 | 그래프/소스 판정 | 최적화 경계 |
| --- | --- | --- |
| StartupWizard → ThemeStep / LayoutStep → WizardEditor → Editor | 실제 정적 의존성이며 production 청크에서도 확인 | intro/model과 후속 preview 경계를 분리. 모든 단계용 새 framework는 불필요 |
| App → useProjectInit → 설정/프로젝트 store | windowMode 분기 이전 공통 hook, 조회는 bootstrap ready 이후 | wizard에 필요한 구독/설정은 보존하고 불필요 조회만 좁힘 |
| main bootstrap → DB / 전체 handler / llmfit | await·비차단 호출·동기 작업이 섞임 | dependency gate와 단순 동시 자원 경쟁을 구분; OS별 bootstrap 복제 금지 |
| utility dispatch → ensureReady → status/stop | control 요청이 초기화 대기에 결합 | ready await 분리와 동기 작업 취소 가능성을 다른 문제로 처리 |
| preload flush → APP_FLUSH_COMPLETE → main logger sink | 요청 완료와 파일 쓰기 완료는 다른 경계 | existing shutdown 계약을 따라 backpressure와 완료 의미를 검증 |

그래프 결과의 사용 한계도 직접 확인했다.

- `tests_for`는 StartupWizard 등에서 0건이지만 `imports_of(tests/dom/startupWizardFlow.test.tsx)`는 실제 StartupWizard import를 반환한다. 0건을 테스트 부재로 해석하지 않았다.
- `rootShell/index.ts`, lifecycle barrel은 `imports_of`가 0건이어도 소스에 re-export가 있다. type-only import도 런타임 비용에서 제외해야 한다.
- `get_affected_flows`는 조사한 startup 파일의 상대/절대 경로 모두 0건이었다. 이벤트·JSX·IPC를 포함한 전체 경로를 보장하지 않으므로 수동 경계 대조가 필요했다.
- `getReadiness`, `embed`, `stop`처럼 이름이 같은 메서드는 서로 다른 receiver의 호출이 섞일 수 있었다. 함수명 검색 결과만으로 프로세스 간 직접 호출을 만들지 않았다.
- StartupWizard depth 1 영향 결과는 23 nodes/추가 12 files였지만 dependency를 포함한 연결 범위다. 실제 변경 소비자 수나 로딩 시간으로 환산하지 않는다.
- 제품 코드 diff가 없으므로 `detect_changes`의 변경 함수/risk 0은 자연스럽다. 런타임 안전성 판정도, 조사한 가설의 부정도 아니다. 릴리스·OS API 사실은 이 그래프가 아니라 §1/§4~6의 공식 자료 근거를 유지한다.

### 10.4 Practical/Production Concerns

새 production 빌드는 성공했고, 같은 임시 출력물에 기존 부트 예산 검사를 실행해 `RENDER_BOOT_BUDGET_OK`를 확인했다. 정적 청크 분석은 설치된 TypeScript parser로 최상위 import/re-export를 추적했으며 parse 오류 없음·상대 경로 해석·중복 제거·합집합 bytes 불변식을 검사했다. 제품 출력 경로와 의존성은 변경하지 않았다.

| 로컬 검증 | 결과 | 보장하지 않는 것 |
| --- | --- | --- |
| electron-vite production build | 성공; manuscript 경계 ineffective dynamic import 경고 | Electron 앱 실행·Windows packaging·실제 시작 시간 |
| 기존 render boot budget | JS 573.1 KiB / CSS 166.0 KiB 통과 | 후속 wizard 924.3 KiB 추가분 및 runtime |
| utility/materializer/sidecar/bridge + preload 자동저장/계약 5개 파일 | 32개 테스트 통과 | 실제 sidecar health 경쟁·토큰 갱신·로그 sink/취소 신규 사례 |
| wizard/project/SmartLink/readiness/deferred worker/llmfit 8개 파일 | 42개 통과, 3개 실패 | Windows 실기 성능·native DB 초기화 비용 |
| 실패한 모델 단계 파일 단독 재실행 | 동일 3개 실패, 1개 통과 | 실패가 다른 파일 병렬 실행에서만 생긴다는 설명을 지지하지 않음 |

중복 재실행을 제외하면 **13개 파일, 77개 테스트 중 74개 통과·3개 실패**다. 실패는 `tests/dom/startupWizardModelStep.test.tsx:174,209,245`의 하단 다운로드/완료 바·원본 오류 문자열 기대다. 현재 `StartupWizard.tsx`는 `step !== "model"`일 때만 `EmbeddingModelStatusBar`를 렌더하고, `ModelStep.tsx`는 중앙 진행률·완료 안내·일반 오류 문구를 표시한다. 직접적인 실패 원인은 이 UI/테스트 기대 불일치이며, 추가 `act(...)` 경고도 관찰했다. 제품 코드를 변경하지 않은 기준선 결과로 기록하고, 제품 의도를 임의로 바꾸거나 테스트를 완화하지 않았다.

검증 명령은 설치된 로컬 실행기를 사용했다. 최초 pnpm 테스트 실행은 supply-chain 검증 중 registry DNS 제한으로 진행되지 않아 중단했고, 의존성 설치나 검증 정책 설정 변경 없이 같은 로컬 Vitest를 직접 실행했다. 이는 프로젝트 전체 필수 게이트를 통과했다는 뜻이 아니다.

```sh
# 임시 산출물: 이번 실행 경로이며 재현 시 새 임시 디렉터리를 사용한다.
node node_modules/electron-vite/bin/electron-vite.js build --outDir /private/tmp/luie-graph-review.PsK21U/out
node --input-type=module -e 'process.chdir("/private/tmp/luie-graph-review.PsK21U"); await import("/Users/user/Luie/scripts/check-render-boot-budget.mjs")'

SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run \
  tests/main/services/utilityRuntimeMaterializer.test.ts \
  tests/main/services/utilitySidecarSupervisor.test.ts \
  tests/main/services/utilityProcessBridgeProtocol.test.ts \
  tests/dom/preloadAutoSaveQueue.test.tsx \
  tests/scripts/preloadContractRegression.test.ts

SKIP_DB_TEST_SETUP=1 node node_modules/vitest/vitest.mjs run \
  tests/dom/startupWizardFlow.test.tsx \
  tests/dom/startupWizardModelStep.test.tsx \
  tests/dom/projectInitOperationalScenarios.test.tsx \
  tests/dom/smartLinkInitialScan.test.tsx \
  tests/renderer/smartLinkEntityLookup.test.ts \
  tests/main/services/startupReadinessService.test.ts \
  tests/main/lifecycle/appReadyDeferredWorker.test.ts \
  tests/main/services/llmfitInstaller.test.ts
```

### 10.5 Improvements (Actionable)

1. **기준선 고정:** 모델 단계 테스트 계약을 정리하고 Windows 환경/실행 형태를 확정한다. P0 계측은 기존 로그·IPC를 확장하며 새 프레임워크를 만들지 않는다.
2. **첫 화면 작업량 축소:** preview 단계의 import 경계를 작게 분리한다. 설정 gate와 useProjectInit은 호출 횟수/대기 측정 후 좁힌다. 모델 단계·llmfit 동작은 §11.2의 비활성화 결정과 함께 정리한다.
3. **작업 수명부터 보장:** 유지할 RAG/Memory 작업의 취소·저장·종료를 검증한 다음 기존 batch/queue/polling 규칙을 보강한다. readiness TTL·인증 resolver는 별도 회귀 사례로, 생성/BGE-M3 sidecar는 cold 최적화 대신 미기동 검증으로 분리한다.
4. **실기 trace에 따라 개선 선택:** I/O가 지배하면 배포/native DB, CPU가 지배하면 모듈/연산, 화면 대기가 지배하면 resize/합성, 메모리 증가가 지배하면 할당/보존 객체를 조사한다. 이를 OS별 자동 튜닝 엔진으로 연결하지 않는다.

### 10.6 Optional Improvements

React Compiler·Activity는 해당 renderer 병목이 확인될 때만 별도 평가한다. native QoS·WASM 자원 모니터·새 daemon·적응형 스케줄러는 이번 범위 밖이다. 별도 DB worker나 MessagePort 전환도 자동 후속 작업으로 잡지 않는다. 기존 lazy utility·통계 worker·Map lookup·미방문 탭 mount 제어를 재구현하지 않는다. senior-code-reviewer 기준으로 실패/종료 경계를 검토하고, Ponytail 원칙으로 기존 구조의 작은 변경을 우선했다.

## 11. 후속 결정: 작가 에디터 범위와 sidecar 비활성화

이 절은 이전 절의 조사 시점 코드 설명은 보존하되, 충돌하는 향후 구현 제안을 대체한다.

### 11.1 확정 범위

- `bootstrapMac`/`bootstrapWindows`로 분리하지 않는다. 공통 시작 체인을 유지하고 실제 OS 차이가 있는 경계에서만 분기한다.
- 플랫폼 정보와 동적 성능 관찰은 분리한다. 단일 책임 원칙(SRP)으로 설계하며, SPA 화면 구조와 프로세스/모듈 책임 분리는 서로 다른 축이다.
- 이 최적화를 위해 새 native addon, Go/Rust 성능 daemon, 별도 감시 utility process를 추가하지 않는다. 기존 Electron/Node API와 기존 프로세스를 사용한다. 외부 OS 진단 도구는 개발/실기 조사에만 사용한다.
- **생성용 LLM sidecar와 BGE-M3 임베딩용 sidecar를 모든 지원 OS/아키텍처에서 비활성화할 예정이다.** 고사양·AC 전원에서도 자동 활성화하지 않는다.
- **RAG·Memory Engine·관련 utility process는 유지한다.** sidecar 비활성화를 utility 전체 종료나 메모리 기능 제거로 구현하지 않는다.
- 기존 모델 파일·벡터·원고 데이터는 삭제하지 않는다. 외부 provider 사용·데이터 전송·새 모델 도입은 이 결정에 포함하지 않는다.

### 11.2 sidecar 비활성화 TODO와 완료 조건

현재 `src/main/utility/llm/runtimeMaterializer.ts`에는 생성용 `utilitySidecarSupervisor.ensureStarted`와 임베딩용 `utilityEmbeddingSidecarSupervisor.ensureStarted`가 별도로 있다. BGE-M3도 같은 llama-server 계열 실행 경로를 사용하므로 생성 경로만 차단해서는 충분하지 않다.

- [ ] 직접 시작 IPC뿐 아니라 route 선택 → materializer → supervisor, 자동 재시도/fallback, background 작업의 간접 시작까지 조사해 두 sidecar 모두 차단한다.
- [ ] 생성 모델/BGE-M3의 자동 다운로드·설치/재시작 유도 UI를 비활성화 정책과 맞춘다. 기존 모델 파일을 지우는 방식으로 막지 않는다. llmfit 추천/설치도 남길 소비자가 없다면 실행하지 않도록 범위를 확인한다.
- [ ] RAG·Memory Engine의 수집·저장·조회·취소·종료 기능이 유지되는지 검사한다. 임베딩이 필요한 작업은 무한 재시도·대기열 누적 없이 명시적 상태로 처리한다.
- [ ] 현재 embedding resolver의 FTS-only/deterministic fallback이 실제 검색·색인·응답 생성 경로에서 무엇을 보장하는지 검증한다. 이름이나 fallback 반환만으로 의미 검색 품질·정상 RAG 답변을 보장한다고 주장하지 않는다. 가짜 임베딩을 정상 벡터로 저장하지 않는다.
- [ ] 기존 벡터와 새 provider의 차원·모델 의미를 섞지 않는다. 대체 provider/벡터 재생성은 별도 결정하며, 현재 작업에서 클라우드로 조용히 전환하지 않는다.
- [ ] Mac/Windows x64/ARM64에서 위저드·프로젝트 열기·RAG·background 작업·재시도 후 두 sidecar의 spawn 및 관련 자동 다운로드가 0회인지 검증한다. utility는 필요한 기능 요청 시 정상 동작해야 한다.

### 11.3 최소 경계: 플랫폼 사실 / OS 이벤트 / 명시적 진단

`resourceMonitor` 런타임 서비스 제안을 철회한다. 아래는 책임 경계와 파일명 후보이지 새 framework/서비스 계층 3개를 먼저 만들라는 지시가 아니다. 기존 모듈에 같은 책임이 있으면 재사용한다.

| 책임 | 입력/출력 | 하지 않는 일 |
| --- | --- | --- |
| `platform.ts` | OS 식별자·OS 버전·현재 process arch를 1회 확인 | 기기 등급·GPU 탐색·job 정책 |
| `resourceSignals.ts` | Electron 전원/lifecycle 이벤트 → 지원 여부와 확인된 상태 | 타이머 polling·CPU/RAM 판단·job 실행 |
| `performanceDiagnostics.ts` | 명시적으로 시작/중지하는 CPU·메모리·GPU 진단 | 제품 정책에 snapshot 공급·자동 실행·새 프로세스 생성 |
| 기존 job 서비스 | 자신이 소유한 요청/queue 상태 → 다음 batch 시작 여부 | 전역 resource manager·OS별 scheduler |
| `index.ts` | 위 모듈과 기존 lifecycle의 연결·정리 등록 | 표본 처리·임계값 판정·GPU 조회 완료 대기 |

의존 방향은 `index → platform / signals / diagnostics / 기존 lifecycle`이다. signals는 platform 정보가 필요하면 주입받지만 platform은 다른 모듈을 import하지 않는다. diagnostics 결과는 보고서/로그로만 가고 job 정책 입력으로 흐르지 않는다. renderer에는 필요한 기능 결과만 기존 preload 계약으로 전달한다. import만으로 이벤트/타이머가 등록되지 않게 한다.

**플랫폼 값:** `process.arch`는 호스트 CPU 판별값이 아니다. 필드명을 `processArch`로 구분하고 알 수 없는 OS/arch를 임의로 x64/Linux로 치환하지 않는다. 표시 이름 변환이 필요해도 raw 값은 보존한다. 지원 타깃 검증과 OS 버전 문자열 기록을 분리하고, `version`/`osVersion`처럼 계약 이름이 어긋나는 예제를 실제 타입으로 채택하지 않는다.

**OS 이벤트:** suspend/resume을 공통 수명 신호로, battery/AC·speed-limit을 지원 OS에서, thermal state를 macOS에서 받는다. 이벤트 수신 전/미지원은 `unknown`이다. 가능한 초기 상태만 Electron getter로 확인하고, 반복 동일 이벤트는 중복 작업을 만들지 않는다. Windows에 thermal 이벤트가 없다고 정상 온도로 간주하지 않고, Linux도 모든 신호를 일괄 미지원 처리하지 않는다. OS별 수집 분기는 이 adapter에 제한하되 창·업데이트 등의 기존 기능별 OS 분기까지 여기로 이동시키지는 않는다. [powerMonitor](https://www.electronjs.org/docs/latest/api/power-monitor)

**진단 수명과 비용:** 제품 CPU/메모리 polling은 추가하지 않는다. 기존 utility의 30초 메모리 로그는 현행 비용으로 별도 기록하고 중복 sampler를 붙이지 않는다. 진단 세션이 필요할 때만 단일 소유자가 `getAppMetrics()`를 읽고, 종료·suspend·진단 시간 만료 시 타이머/리스너를 정리한다. 재시작/복귀 시 CPU 기준점을 다시 잡고 놓친 tick을 몰아 실행하지 않는다. `500ms / 최대 15초`는 짧은 시작 진단의 실험 입력 예일 뿐 제품 기본값이 아니다. 제품용 `5초/30초` 감시 설계는 삭제한다.

CPU 평균 구간·PID+creationTime·측정 시각·미지원 필드를 보존한다. 첫 CPU 표본은 기준점이며 Windows의 idleWakeups 0은 API 제약이다. `privateBytes`와 다른 OS의 메모리를 동일 값으로 강제 정규화하지 않는다. 매 표본 renderer broadcast·원고 포함 로그·동기 파일 기록은 하지 않고 진단 기록은 시간/개수 상한을 둔다. 계측 OFF/ON의 CPU·wakeup·메모리·로그/IPC·시작/입력 지연을 함께 비교한다. 비용을 재기 전에는 오버헤드 0이나 일정 ms 이하를 보장하지 않는다. [CPUUsage](https://www.electronjs.org/docs/latest/api/structures/cpu-usage), [MemoryInfo](https://www.electronjs.org/docs/latest/api/structures/memory-info)

**GPU:** §5처럼 feature status → 필요한 경우 basic 조회를 사용하고 complete는 명시적 상세 진단에서만 허용한다. native addon은 필요하지 않지만 정확한 GPU utilization/VRAM pressure를 제공하는 계약은 아니다. 앱 수준의 새 resource IPC는 만들지 않으며 Electron 내부 IPC/OS 조회까지 비용 0이라고 표현하지 않는다.

### 11.4 제품 정책: 기존 작업의 시작·완료 경계만 강화

기기 등급, 전역 `idle/normal/overloaded`, CPU/RAM 자동 튜닝, baseline 학습, hysteresis 엔진은 구현하지 않는다. 상수는 **우리 작업의 batch 크기·동시성·queue 상한·timeout·재개 지연**에만 둔다. 제안 예시의 `100/1500ms/30초/50`을 검증 없이 새 기본값으로 복사하지 않는다. 기존 상수를 재사용하고 바꾸는 값마다 대상 작업·근거·회귀 테스트를 연결한다.

현재 `derivedJobWorker.ts:148`에는 `running/inTick` 중복 방지와, 비-stress 모드에서 `autoSaveManager.getPendingSaveCount()`가 양수일 때 tick을 미루는 처리가 이미 있다. 따라서 기존 규칙의 공백을 보강하는 작업이지, 우선순위 시스템을 처음 도입하는 작업이 아니다. 저장 대기 수는 모든 입력·실행 중 저장·사용자 RAG 요청의 상태를 대신하지 못한다.

| 상황 | 기존 서비스에 추가/검증할 규칙 | 안전 조건 |
| --- | --- | --- |
| 사용자 저장·검색/RAG 요청 수락 | 같은 자원을 쓰는 다음 비필수 background batch 시작을 미룸 | UI 입력을 새 전역 queue에 넣지 않음. 사용자 요청의 완료/취소/실패 경계를 사용 |
| 이미 background batch 실행 중 | 안전한 batch 경계에서 양보; 지원되는 작업만 실제 취소 | 동기 SQL/JS를 즉시 선점한다고 보장하지 않음. 단일 작업이 길면 별도 hotspot 개선 |
| foreground 요청 여러 개 | 해당 소유자에서 모두 정리될 때까지 보류 사유 유지 | 단일 boolean로 첫 완료 시 조기 재개하지 않음. 오류/창 종료/취소 시 누락·이중 해제 방지 |
| foreground 완료 | 다른 보류 사유가 없으면 기존 bounded batch 재개 | 필요성이 입증된 재개 지연만 사용. 재개 전 상태를 다시 확인하고 영구 기아 여부 검사 |
| queue 상한 도달 | 실행 중/메모리 적재량 제한, 합칠 수 있는 파생 요청만 병합 | durable job·원고 저장을 drop하지 않음. 저장소 backlog와 메모리 queue를 구분 |
| timeout/취소 | 실제 종료 또는 안전한 중단을 확인한 뒤 실행 슬롯 해제 | Promise timeout을 작업 종료로 간주하지 않음. 미종료 작업 위에 재시도 중첩 금지 |
| suspend/resume·종료 | suspend는 새 비필수 작업 시작 억제, resume은 기존 상태 확인 후 재개 | suspend에 무제한 flush를 기대하지 않음. 기존 저장/DB close 순서 보존, missed tick 폭주 금지 |
| thermal critical 등 명확한 OS 제한 | 실제 소비자가 있는 비필수 작업의 새 batch만 보류 | AC/battery만으로 과부하 판정하지 않음. 회복 신호 하나가 foreground/종료 보류를 해제하지 않음 |

**프로세스 경계:** derived worker는 `appReady.ts`가 main에서 시작하고 RAG 실행은 utility dispatch로 간다. 따라서 전체 작업을 utility 내부에서만 조절할 수 있다고 가정하지 않는다. 먼저 main이 이미 관찰하는 요청 수락/완료와 저장 상태로 main의 다음 batch를 제어하고, utility 내부 경쟁은 그 소유자 안에서 처리한다. 추가 연결이 정말 필요하면 기존 요청 식별/수명 계약을 확장하고 경계 검사를 수행한다. CPU·메모리 표본을 보내는 주기 IPC나 전역 resource-pressure protocol은 만들지 않는다. 클라이언트 timeout으로 실제 utility 작업 완료를 추정하지 않는다.

이 정책은 실행 순서 보장이지 모든 노트북의 반응 시간을 보장하는 장치가 아니다. 느린 단일 batch·SQLite lock 대기·긴 renderer 계산이 남으면 P0~P3의 해당 병목을 줄인다. 입력 없이 읽는 시간을 기기 idle로 간주해 background 작업량을 늘리지 않는다.

### 11.5 구현 전 설계 체크와 종료 기준

§11.1~11.2는 확정 결정이고, 아래는 아직 실행하지 않은 검증 TODO다. 구조를 단순화해도 작업의 종료/데이터 계약은 생략하지 않는다.

- [ ] **작업 목록:** 남길 RAG/Memory 작업별로 소유 프로세스·실행 경로·유효 provider·durable queue·실제 취소 가능 지점·최대 한 번의 batch 범위를 기록한다. 특히 sidecar가 필요한 작업을 계속 enqueue한 뒤 매 tick 실패시키지 않는다.
- [ ] **비활성 기능의 사용자 계약:** 생성/BGE-M3가 필요한 작업은 비활성/대체 가능 여부를 명시한다. 로컬 텍스트 검색·저장 보존을 의미 검색/생성 품질 유지로 표현하지 않는다. 기존 외부 provider 설정은 자동 변경하지 않고, 신규 외부 전송/모델 선택은 별도 승인 대상으로 둔다.
- [ ] **기존 규칙 테스트:** foreground 겹침·실패·취소·창 종료, background 실행 중 foreground 도착, timeout 뒤 작업 생존, queue 가득 참, 재개/기아, suspend 중 종료를 검증한다. 즉시 선점이나 데이터 drop을 통과 조건으로 삼지 않는다.
- [ ] **신호 adapter 테스트:** 지원 OS·unknown·초기 상태·중복 이벤트·listener 정리·복수 보류 사유를 검사한다. 실제 native 이벤트/가속은 mock 통과와 별도로 Mac/Windows에서 확인한다.
- [ ] **진단 경계 테스트:** 기본 실행에 새 sampler timer/상세 GPU 조회가 없고, 명시적 진단도 시간 만료/종료 후 호출·로그·리스너가 남지 않는지 검사한다. collector를 새 utility로 옮기지 않는다.
- [ ] **실기 완료 판정:** P0 측정 계약으로 위저드·입력/IME·저장·사용자 검색·idle·종료를 전후 비교하고, 두 sidecar 미기동/자동 다운로드 차단과 기존 데이터 보존을 확인한다. 이전의 74 통과/3 실패는 이 신규 계약을 검증한 결과가 아니다.

P0~P3으로 목표와 회귀 기준을 충족하면 여기서 종료한다. P4는 고정 작업 규칙으로 해결되지 않는 구체적 실기 문제가 남고, 추가 계측/정책의 이득·비용·롤백 조건과 사용자 승인이 갖춰질 때만 다시 연다. 새 native/WASM/Go/Rust 자원 관리 구성요소는 자동으로 따라오는 선택지가 아니다.

VS Code에서 참고할 것은 지연 초기화·프로세스 경계·성능 mark·실기 검증이다. extension host·대규모 DI·추가 daemon·적응형 기기 관리 구조는 복제하지 않는다. 작가 에디터의 목표는 빠른 위저드, 한국어 입력/읽기 흐름, 저장 안정성, 조용한 idle이다.
