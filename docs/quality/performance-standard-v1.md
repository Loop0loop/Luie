# Luie 성능 기준 v1 — 저사양 Windows 타깃

작성일: 2026-09-09. 상태: **v1 확정**. 하드 게이트 수치는 실제 저사양 하드웨어(eMMC/N4020급) 실측 전 잠정값이며, L synthetic profile 측정 인프라(§8) 구축 후 재검증한다.

범위 원칙: **renderer 중심, Windows 환경 우선.** 다른 OS의 구조 변경은 본 문서의 플랜에 포함하지 않는다(별도 상의). 근거 조사: [renderer 감사(2026-09-08)](performance-audit-2026-09-08/renderer.md), [main/플랫폼 감사(2026-09-08)](performance-audit-2026-09-08/main-platform.md), [시작 파이프라인 해부](../architecture/startup-pipeline-dissection.md), Electron/React 계층 추가 조사(2026-09-09, 본문 §7~§8).

---

## 1. 타깃 기기 등급

일반 사용자의 "저사양 노트북"을 시판 기기 기준으로 정의한다. VM이 아니라 실제 사용자 기기가 기준이다.

| 등급 | 대표 하드웨어 | RAM | 저장장치 | GPU | 디스플레이 |
|---|---|---|---|---|---|
| **L-min (최소 지원)** | Intel N4020급, 구형 i3-8130U | 8GB | eMMC/HDD 또는 저가 SATA SSD | 내장(UHD 600급). 드라이버 상태에 따라 GPU 기능 비활성/소프트웨어 경로 가능 | 1080p, 배율 125~150% |
| **L-typical** | Intel N100급, Ryzen 3 | 8GB | 저가 NVMe/SATA SSD | 내장(UHD급) | 1080p |
| **M (표준)** | 12세대 i5, Ryzen 5 | 8~16GB | NVMe SSD | 내장 최신세대 | 1080p~1440p |
| H | 그 이상 | 16GB+ | NVMe | dGPU 포함 | 고해상도 |

- **최소 지원 선 = L-min(N4020급)** 로 명시한다. N100 통과를 최소사양 통과로 오인하지 않도록 테스트 기준 머신을 L-min/L-typical로 분리한다(§8).
- L-min의 병목 4요소: ① 저장장치(eMMC 읽기 100~200MB/s + packaged portable 자가 추출 + Defender), ② CPU 단일 스레드(현세대 대비 ~1/4 — SmartLink 실측 144ms/키가 400~700ms로 확대), ③ GPU 차단/드라이버(Chromium이 GPU 기능을 비활성하거나 소프트웨어 경로로 진입 가능. 자동 SwiftShader WebGL 폴백은 deprecated — 이제 WebGL 컨텍스트 생성 실패가 기본), ④ RAM 압박(8GB에서 Windows 4~5GB 선점 → 스와핑 시 전체 UI 정지).
- 지원 범위 밖: 2GB RAM, 32bit — 미지원을 명시한다.

## 2. 성능 예산 — 목표와 하드 게이트의 분리

**원칙**: 목표값은 최적화 방향을 정하고, 하드 게이트만 CI/릴리스 실패 조건이다. 실측 전 단계에서 목표값을 게이트로 걸면 방향이 왜곡된다.

| 지표 | L 하드 게이트 | L 목표 | M 목표 | 측정 정의 |
|---|---|---|---|---|
| 첫 visible paint | **≤1.5s** | ≤1.0s | ≤0.6~0.8s | 콜드 스타트 → 스켈레톤/위저드 첫 프레임 |
| 첫 상호작용 가능 | **≤2.5s** | ≤1.8s | ≤1.2s | 첫 클릭 응답 |
| 에디터 입력 가능 | **≤3.0s** | ≤2.5s | ≤1.8s | 첫 키 입력 반영 |
| 키→paint p95 | **≤50ms** | ≤40ms | ≤33ms | 성능 트레이스 |
| 앱 JS per-key p95 | **≤6ms** | ≤4ms | ≤4ms | main-thread 작업량 |
| 애니메이션 프레임 | **p95 ≤33.3ms** | 30fps 이상 | p95 ≈20ms 이하 | rAF 샘플링 |
| 심각한 frame stall | **>100ms 거의 0회** | 동일 | 동일 | long task 관측 |
| 앱 메모리 | **aggregate private bytes ≤450MB** | ≤350~400MB | ≤350MB | §5 측정 방법 |

L-min의 per-key ≤6ms가 의미하는 것: SmartLink 제거 후에도 남은 모든 keystroke 작업(통계 직렬화 복사 등)의 합계가 6ms 안에 들어와야 한다. 큰 문서에서 getText 전체 복사 하나로도 예산 초과라 R8 정리는 필수다.

## 3. 런타임 등급 판정 설계

기기의 **기본 성능 등급(`data-perf`)**과 현재 **전력/열 상태(`data-power`)**를 분리한다. 사용자의 `data-animations` 설정(on/off)은 최상위 존중 대상.

```html
<html data-perf="h|m|l" data-power="normal|reduced" data-animations="on|off">
```

### 3.1 등급 판정 신호

| 신호 | 방법 | 비고 |
|---|---|---|
| GPU 상태 | main: `app.once('gpu-info-update')` 후 `app.getGPUFeatureStatus()`. `gpu_compositing`이 `disabled_software`/`unavailable_software`/`disabled_off`/`unavailable_off` 계열이면 degraded | `enabled*` 4종 이외는 degraded 처리. **gpu-info-update 이전 호출은 무효**. WebGL 폴백 deprecated로 "WebGL 컨텍스트 생성 실패" 경로도 커버 |
| RAM | main: `os.totalmem()/1024**3 < 10` → lowMemory | `navigator.deviceMemory`는 fingerprinting 방지 뭉개진 값이므로 **사용하지 않는다**. main에서 판정해 IPC로 전달 |
| CPU | renderer: `navigator.hardwareConcurrency` ≤ 4 + 첫 프레임 미세 벤치마크(≤50ms 프루브) | 보조 신호 |
| CPU 스로틀 | main: `powerMonitor.on('speed-limit-change', ({limit}) => limit < 80 → data-power="reduced")` | **이벤트명 주의: `speed-limit-change`** (d.ts:11019, payload `{limit}` 퍼센트). `thermal-state-change`는 macOS 전용이라 Windows 타깃에서 사용 불가. 배터리 자체(on-battery)는 등급에 영향 없음 — 충전기 분리로 UI가 갑자기 저하되면 오히려 이상하다 |
| 런타임 FPS | 상호작용 시작 후 10초 window, p95 frame > 33ms 또는 100ms+ stall 반복 → 강등 후보. **연속 2~3 window 나쁨 → 강등(hysteresis)**. 초기 5초는 부팅 몰림으로 오판 위험 → 참고 데이터만 | 한 번 나빴다고 바로 강등하지 않는다 |

### 3.2 등급별 동작 매트릭스

| 항목 | H/M | L (`data-perf="l"`) |
|---|---|---|
| backdrop-filter(유리 효과 66곳) | 유지 | plain 배경으로 교체 — 개별 클래스를 때리지 말고 **CSS 변수 단일 관문**으로: `:root { --glass-blur: blur(20px) }` → `html[data-perf="l"] { --glass-blur: none }` |
| transition-all / flex-grow 패널 전환 | 유지 | 필요 속성 명시 + 즉시 전환 |
| 위저드 리사이즈 애니메이션 | 재생 | 스킵(기존 skip 경로: `ipcWindowHandlers.ts:371`) |
| reactflow 가상화(culling) | on | on (공통) |
| spellcheck | on | 기본 off 제안 (§6 상의 항목) |
| 로컬 LLM sidecar | 허용 | §6 정책 |

`data-power="reduced"`는 `data-perf`와 독립적으로 transition/animation을 일시 축소한다. 등급 자체를 바꾸지 않는다.

## 4. 부팅 진단 요약 — 왜 첫 UI가 늦은가

근거: startup-pipeline-dissection.md, renderer 감사 R10, 부트 조사(2026-09-09).

1. **첫 paint가 i18n 번들(ko 80.7KB 청크) + settings IPC(`getEditor`) 완료까지 전면 대기** — `main.tsx:74-88`, `setup.ts:118`. 테마 시드는 이미 동기 적용되므로 즉시 그릴 수 있음에도 "loading" 텍스트조차 못 그리는 구간이 존재.
2. **부팅 중 `settings.getEditor` 3중 호출** — `setup.ts:118` / `useProjectInit.ts:29→editorStore.ts:69-70` / `useStartupWizardState.ts:43`.
3. **useProjectInit이 모든 windowMode에서 실행** — `App.tsx:133`이 조기 return들보다 앞. 위저드/export 창도 프로젝트 목록+설정 로드.
4. **메인 창 이중 게이트** — main deferShow(did-finish-load) + BootstrapGate(isReady). isReady는 main readiness(Supabase 세션 확인 최대 5초 타임아웃 + DB integrity)에 묶여 있어 **renderer만으로 메인 창 "진짜 UI 1초"는 불가능** — main readiness 분리는 상의 항목(P2-B).
5. **부트 번들 580KB/18파일 + CSS 163KB** — 예산(600/170KB) 이내. radix-ui 파생(33KB)/chapterStore(19.6KB)/lucide 전체(63.8KB)가 부트에 포함된 낭비는 있으나 지배 원인 아님.
6. **dev 모드**: DevTools 자동 오픈(`windowManager.ts:220`, 보조 창 포함) + Vite 콜드 변환(과거 실측 29.5s). **packaged 모드**: portable %TEMP% 자가 추출 + Defender 실시간 검사.
7. **보조 창(main/export/world graph/wizard)이 같은 index.html 풀 번들**을 각 renderer 프로세스로 로드. Electron에서 창=별도 프로세스는 구조적 한계(`affinity`는 Electron 14 제거, WebContentsView도 프로세스 공유 아님).

## 5. 메모리 측정 정의

- **지표명: Electron app aggregate private bytes.** `app.getAppMetrics()` → `ProcessMetric[].memory.privateBytes`(win32 전용, KB) 합산 / 1024 = MB. `workingSetSize`·`peakWorkingSetSize`는 별도 관찰값.
- `process.getProcessMemoryInfo()`는 호출 프로세스 단위라 전체 게이트로 부적합.
- 주의: `getAppMetrics()`의 CPU 필드는 호출 간격을 main의 다른 코드와 공유하므로 **CPU 폴링과 메모리 폴링은 별도 주기**로. `type` 필드(Browser/Utility/GPU)로 프로세스별 분해 집계.
- LLM sidecar 프로세스는 게이트에서 제외하되 별도 관찰(§6).

## 6. 로컬 LLM sidecar 정책 (8GB 이하)

**"자동 다운로드 중단"이 아니라 "자동 상주 금지 + 완전 lazy"가 원칙.** 디스크에 모델 1.9GB가 있는 것은 RAM 문제가 아니다. 위험한 것은 Electron+renderer+sidecar+Windows가 합쳐 8GB를 넘어 pagefile 스와핑이 시작되는 순간이다.

```
8GB 이하 (data-perf="l" 또는 lowMemory):
앱 시작 → sidecar 시작 X, 모델 로드 X
  → 사용자가 AI 기능 사용 시도
  → (필요 시) 모델 다운로드 안내
  → 메모리 여유 확인
  → sidecar lazy start
사용 종료/idle → 기존 idle stop 정책 유지 + 적극 적용
```

상의 필요: 8GB에서 로컬 LLM 자체를 허용할지(경고 후 허용 등), 다운로드 자체를 사용자 행동 이후로 미룰지의 UI 문안.

## 7. 조사 발견 요약 (수정 대상)

### 7.1 타이핑 (목표: 글이 따라오는 느낌)

| 우선순위 | 발견 | 근거 | 수정 방향 |
|---|---|---|---|
| 1 | **SmartLink 매 keystroke 원고 전체 재스캔** (265k자 실측 144ms/키, store 무관 변경에도 재스캔, 에디터 수 곱셈) | `SmartLink.ts:32-35,55-60`, `smartLinkService.ts:52-57,118-150` | typing은 `tr.mapping`으로 기존 decoration 위치 갱신 + 변경 textblock만 재스캔. store 구독은 엔티티 이름 집합 변경 시에만 invalidate |
| 2 | DiffExtension이 selection 트랜잭션에도 전체 diff 재계산(캐시 0) — 45k자 실측 2.3s | `DiffExtension.ts:67-125` | 문서/비교본 revision 캐시, worker화는 P2 |
| 3 | 통계 worker: 전체 문자열 복사 + 응답 식별 없음(에디터 H개면 H회 전역 set) | `useEditorStats.ts:20-43` | requestId + 활성 에디터만 commit |
| 4 | 900ms 경계 getHTML+getText 2회 전체 직렬화 + 마지막 900ms 유실창 | `Editor.tsx:160-172` | raw dirty/version을 저장 registry에 연결 |
| 5 | CanvasMarkdownEditor 매 키 getText + forceUpdate | `CanvasMarkdownEditor.tsx:139-151` | lazy fallback + useEditorState |
| 6 | spellcheck: true + 언어 미지정(Windows hunspell 사전 필요 시 CDN 다운로드) | `windowChrome.ts:176` | `setSpellCheckerLanguages(['ko'])` 명시, 다운로드 타이밍 첫 paint 이후로 |

키 입력 자체는 React 리렌더를 만들지 않는다(TipTap 3 기본 off). React 쪽 리렌더 낭비는 아래 7.3.

### 7.2 부팅/창 (§4 진단에 대응하는 수정)

| 우선순위 | 수정 | 위치 |
|---|---|---|
| 1 | root.render 즉시 호출 — i18n/설정 배경 hydrate | `main.tsx`, `setup.ts` |
| 2 | settings.getEditor 1회 캐시 | 위 3곳 |
| 3 | useProjectInit을 app 모드 전용으로 | `App.tsx:133` |
| 4 | 보조 창 경량 엔트리(manualChunks 분리돼 있어 rollup input 추가만 가능) | `electron.vite.config.ts` |
| 5 | dev DevTools 자동 오픈 플래그화 | `windowManager.ts:220` |
| 6 | GPU 상태 관측 로그 추가(동작 변경 없음 — 게이트 미달 머신 원인 분리용) | main 부트 |
| 7 | AUTO_SAVE 동일 내용 early-return 앞당김(현재 미러 쓰기 이후) | `autoSaveManager.ts:186-188` |
| 8 | handler barrel startup-critical 채널만 즉시 등록(+259~431ms 실측) | `appReady.ts:312-314` |
| 9 | portable → NSIS 일반 배포 전환(portable은 %TEMP% 자가 추출 구조) | `electron-builder.json` — 배포 정책이라 상의 |

### 7.3 애니메이션/렌더링 + React

| 우선순위 | 발견 | 근거 | 수정 |
|---|---|---|---|
| 1 | **ToastContext value 매 렌더 새 객체** — 토스트 1건마다 App 아래 전체 재렌더 | `Toast.tsx:34` | useMemo 1줄 (효율 1위) |
| 2 | canvas-glass-node 등 backdrop-filter 66곳 | `canvas.css:209` 등 | §3.2 CSS 변수 관문 + data-perf |
| 3 | EditorToolbar(520줄)/EditorBubbleMenu 미memo — 900ms 경계·리사이즈 프레임마다 reconcile | `EditorToolbar.tsx`, `EditorBubbleMenu.tsx` | memo화(props 이미 안정) 또는 Compiler 위임 |
| 4 | useElementWidth ResizeObserver가 리사이즈 프레임마다 setState → EditorLayout→Ribbon→Toolbar 연쇄 | `EditorLayout.tsx:192`, `MainLayout.tsx:121` | rAF 스로틀/측정값 소비처 분리 |
| 5 | flex-grow transition(8개 레이아웃 그룹) + transition-all 103건 중 레이아웃 속성 애니메이션 | `global.behaviors.css:120`, `Editor.tsx:369` 등 | 필요 속성 명시 + L등급 즉시 전환 |
| 6 | reactflow 가상화 미사용 + 노드 전면 유리 효과 | `GraphSurface.tsx`, `BaseCanvasViewport.tsx` | `onlyRenderVisibleElements` on |
| 7 | ResearchPanel 숨김 탭이 CSS hidden으로 구독/DOM 유지(R13) | `ResearchPanel.tsx:217/245/273` | **React 19.2 내장 `<Activity mode="hidden">`** — 추가 설치 불필요, 상태 보존+Effect 언마운트 |
| 8 | StatusFooter가 유일한 zustand 전체-store 구독 | `StatusFooter.tsx:11` | selector 분리 |
| 9 | EntityGallery 검색 필터 동기 전체 재계산 | `EntityGallery.tsx:166` | `useDeferredValue` + 검색 텍스트 사전 계산 |
| 10 | MessageList delta마다 전체 재렌더+smooth scroll(R11) | `MessageList.tsx:34-149` | 행 memo + react-virtuoso(이미 설치) + delta rAF 배치 |
| 11 | Suspense fallback이 빈 "loading" 화면 | `App.tsx:405-409` | 레이아웃 형태 스켈리턴 |
| 12 | 위저드 리사이즈 16ms setTimeout으로 setBounds 매 프레임(800ms) | `ipcWindowHandlers.ts:117-157` | rAF 정렬 + L등급 스킵 |

### 7.4 Electron 계층 (문서 확인 완료 사항)

- Chromium 코드 캐시는 file:// 로드에서 **이미 기본 동작**(2회차 부트 수혜). 커스텀 프로토콜 전환 시 오히려 꺼짐 — 전환 시 `codeCache: true` 필요.
- `module.enableCompileCache()`(Node 24 내장) main 부트 1줄 시도 가능 — 단일 번들이라 이득 소폭(추정).
- `affinity` 제거됨(E14), BrowserView deprecated(E30+) — 창=별도 프로세스는 구조 확정.
- `backgroundThrottling`은 **기본값(true) 유지** — false 전환 비권장.
- `speed-limit-change` 구독은 로그/`data-power` 용도로만. `thermal-state-change`는 macOS 전용.
- 메뉴 불필요 시 `Menu.setApplicationMenu(null)`은 이미 적용(`windowChrome` 경로).

### 7.5 React Compiler 도입 판정

- **React Compiler v1.0 안정(2025-10)**. React 19.2.8 조건 충족. Vite 8/rolldown 경로: `@rolldown/plugin-babel` + `reactCompilerPreset()`(`@vitejs/plugin-react` v6에서 내장 Babel 제거됨).
- `eslint-plugin-react-hooks` v7.1.1 이미 설치 → compiler 규칙 프리셋(`recommended-latest`) 전환 가능. 위반 컴포넌트는 컴파일러가 스킵만 하므로 점진 도입 안전(`"use no memo"` 탈출구 존재).
- 기대 효과: 7.3의 수동 memo 작업(EditorToolbar/리스트 행 등)을 자동화. 리스크: 빌드 시간 증가(추정 수 초~십수 초), `check:version-pins`/`check:deps` 규칙에 맞춘 신규 devDeps 3개 핀, `forceUpdate` 패턴(R6) 재검토.
- 판정: **점진 도입** — 7.3 수동 수정과 병행하되, 장기적으로 memo 유지보수를 컴파일러로 이관.

## 8. 검증 방법 — L synthetic CPU/GPU profile

**한계 명시**: CDP CPU throttle은 CPU slowdown factor만 적용한다. eMMC 랜덤 I/O, Defender 검사, 8GB 메모리 압박/pagefile, 구형 iGPU 드라이버, 발열 스로틀링은 CI에서 재현 불가 → VM 프로필과 실기 canary가 보완한다.

### CI 프로필 (매 빌드)

| 프로필 | 구성 | 판정 |
|---|---|---|
| L-cpu | CDP `Emulation.setCPUThrottlingRate(4)` | typing p95 < 50ms, per-key JS < 6ms |
| L-gpu-disabled | `--disable-gpu` 실행 | frame p95 ≤ 33.3ms + **data-perf="l" 자동 판정 확인** |
| L-swiftshader | `--use-gl=angle --use-angle=swiftshader` | **테스트 전용.** 소프트웨어 래스터 스트레스 |

### VM 프로필 (릴리스 후보) — 기존 8GB VM을 "Luie-L"로

| 프로필 | 구성 | 판정 |
|---|---|---|
| L1 CPU | 8GB 고정, 2 vCPU + `Set-VMProcessor -Maximum`(호스트별 캘리브레이션 — 앱 microbenchmark로 N4020급 스케일 맞춤), 1080p/150%, GPU 정상 | typing p95, per-key |
| L2 GPU worst | L1 + `--disable-gpu` | frame p95, data-perf 동작 |
| L3 memory pressure | 8GB, sidecar 실제 실행, 큰 문서 오픈, 타이핑+화면 전환 | aggregate private ≤450MB, UI stall 없음, pagefile 관찰 |
| L4 cold storage | Defender ON(제외 없음), 캐시 삭제, 콜드 부트, portable/NSIS 각각 | 첫 paint ≤1.5s 하드게이트(목표 1.0s) |

- Hyper-V 고정 RAM: `Set-VMMemory -VMName "Luie-L" -DynamicMemoryEnabled $false -StartupBytes 8GB`.
- 개발 VM의 Defender 제외(node_modules/out)는 **개발 속도용**이며, 실사용자 재현(L4)에는 제외 없이 돌린다.
- 실기: N4020/8GB 중고 노트북 1대를 최종 현실 검증용으로 — synthetic이 못 잡는 eMMC 지연·실제 드라이버·발열 확인. 개발 단계 필수 아님.
- 하드 게이트 판정은 기존 `check:render-boot-budget`(정적 페이로드)에 더해, 상기 런타임 지표를 스크립트 게이트화하는 방향.

## 9. 실행 플랜 요약

| 단계 | 항목 | 상의 필요 |
|---|---|---|
| **P0** | §7.2-1~5(첫 paint 비게이트, IPC 중복 제거, 모드 전용 초기화, DevTools 플래그), §7.1-1(SmartLink), §7.3-1(Toast useMemo) | 불요 |
| **P1** | data-perf/data-power 판정+CSS 변수 관문, reactflow culling, 툴바 memo/리사이즈 스로틀, Activity 전환, 위저드 리사이즈 rAF, R1/R6/R8 정리, spellcheck 언어 명시, GPU 관측 로그, 보조 창 경량 엔트리 | 작은 설계 결정 1~2개 |
| **P2** | main readiness 분리(메인 창 진짜 UI 1초의 필수 조건 — M03), 위저드 전용 경량 엔트리, NSIS 전환, manuscript barrel 정리, diff worker화, React Compiler 본격 도입 | **필요** |

Windows 전용 원칙: 판정·등급·정책 로직은 플랫폼 분기로 Windows에만 적용 가능하도록 하고, macOS/Linux 공통 경로의 구조 변경은 별도 상의한다.
