# Luie Renderer 엔터프라이즈 전환 설계서

문서 작성일: 2026-02-01  
대상 모듈: `src/renderer` 전체  
목표: 상용 배포 가능한 수준의 안정성, 확장성, 성능 확보 및 유지보수 용이성 증대

---

## 0. 현재 상태 진단 (AS-IS)

- **구조**: 로직과 UI가 `Editor.tsx` 등 거대 컴포넌트에 강하게 결합됨.
- **의존성**: 컴포넌트 내부에서 `window.api` 직접 호출 (테스트 불가능).
- **안정성**: Global Error Boundary 부재로 부분 에러가 앱 전체 크래시 유발.
- **성능**: 메인 스레드에서 무거운 작업(단어 수 계산 등) 수행, 가상화 미적용.
- **상태 관리**: Local/Global State 혼재, 데이터 일관성 관리 미흡.

---

## 1. 아키텍처 및 디자인 패턴 (Architecture)

### 1.1 IPC 계층 추상화 (Repository Pattern)
**AS-IS**
- 컴포넌트/Store에서 `window.api.xxx` 직접 호출.
- 브라우저 환경 독립 실행 불가, 단위 테스트 난해.

**TO-BE**
- **Service Layer 도입**: `src/renderer/src/services/api/` 정의.
- `IProjectService` 등 인터페이스 정의 및 `ElectronProjectService` 구현체 작성.
- Mocking이 용이한 구조로 변경하여 UI 테스트 가능성 확보.

### 1.2 비즈니스 로직 분리 (Custom Hooks)
**AS-IS**
- `Editor.tsx` (God Component)가 렌더링, 저장, 통계, 스타일링 모두 담당.

**TO-BE**
- **Domain Logic 분리**:
  - `useEditorAutosave`: 저장 로직 및 상태(Saving/Saved/Failed) 관리.
  - `useEditorStats`: 통계 계산 로직 (Worker 연동).
  - `useEditorConfig`: 폰트, 테마 등 설정 관리.
- View(Component)는 오직 렌더링만 담당.

### 1.3 디렉토리 구조 재편 (Feature-Sliced Design 지향)
**AS-IS**
- `components/`, `stores/`, `hooks/` 등 기술적 분류.

**TO-BE**
- **도메인 중심 분류**:
  - `features/editor/`: 에디터 관련 UI, Model, Logic 응집.
  - `features/project/`: 프로젝트 관리 관련.
  - `shared/ui/`: 재사용 가능한 순수 UI 컴포넌트.

---

## 2. 안정성 및 에러 처리 (Stability & Resilience)

### 2.1 계층적 에러 바운더리 (Error Boundaries)
**AS-IS**
- 에러 발생 시 흰 화면(White Screen) 노출.

**TO-BE**
- **GlobalErrorBoundary**: 앱 전체 래핑, 치명적 오류 시 "안전 모드" 또는 "재시작" 제공.
- **FeatureErrorBoundary**: 에디터, 사이드바 등 주요 섹션별 격리. 에디터가 멈춰도 사이드바에서 데이터 백업 가능하도록 보장.

### 2.2 저장 신뢰성 확보 (Reliability)
**AS-IS**
- `void Promise.resolve(onSave)` 형태의 Fire-and-Forget. 실패 시 사용자 인지 불가.

**TO-BE**
- **Visual Feedback**: 저장 상태(저장 중, 완료, 실패)를 상태바/Toast로 명확히 표시.
- **Retry Policy**: 저장 실패 시 지수 백오프(Exponential Backoff)로 자동 재시도.
- **Offline Support**: 네트워크/IPC 단절 시 로컬 스토리지 임시 백업 고려.

---

## 3. 성능 최적화 (Performance)

### 3.1 메인 스레드 부하 분산 (Web Workers)
**AS-IS**
- `countWords` 등 연산 집약적 작업이 UI 스레드 블로킹 유발.

**TO-BE**
- **Worker 도입**: 텍스트 통계, 문법 검사 등은 Web Worker로 오프로딩.
- UI 반응성(Typing Latency) 최우선 보장.

### 3.2 대용량 데이터 가상화 (Virtualization)
**AS-IS**
- 챕터 목록, 검색 결과 등 전체 렌더링.

**TO-BE**
- **React-Window / Virtuoso**: 보이는 영역만 렌더링하여 DOM 노드 수 최소화.
- 메모리 점유율 감소 및 스크롤 성능 향상.

### 3.3 렌더링 최적화
**AS-IS**
- Store 전체 구독으로 인한 불필요한 리렌더링.

**TO-BE**
- **Selector Pattern**: `useStore(state => state.specific)` 형태로 구독 최소화.
- **React.memo**: 비용이 높은 컴포넌트에 선별적 적용.

---

## 4. 품질 및 테스트 (Quality & Testing)

### 4.1 테스트 전략
**TO-BE**
- **Unit Test**: 유틸리티 함수, Custom Hooks (Vitest).
- **Integration Test**: Service Layer Mocking을 통한 주요 흐름 검증.
- **E2E Test**: Playwright/Spectron 활용, 실제 앱 구동 시나리오 검증 (추후).

### 4.2 입력 버퍼링 일관성
**AS-IS**
- Input/TextArea 간 디바운스 정책 상이.

**TO-BE**
- `useBufferedInput` 공통 훅으로 통일.
- `beforeunload` 이벤트 훅킹으로 종료 직전 잔여 데이터 Flush 보장.

---

## 5. 실행 계획 (Roadmap)

### Phase 0 — 안전망 구축 (Day 1-2)
- [ ] Global Error Boundary 적용.
- [ ] 저장 실패 시 UI 피드백(Toast) 구현.
- [ ] `BufferedTextArea` 디바운스 및 강제 저장 로직 추가.

### Phase 1 — 구조 개선 (Day 3-5)
- [ ] Service Layer 인터페이스 정의 및 `window.api` 호출 캡슐화.
- [ ] `Editor.tsx` 로직 Custom Hooks로 분리.
- [ ] Web Worker 기본 설정 및 단어 수 계산 이관.

### Phase 2 — 고도화 (Week 2)
- [ ] 가상 스크롤(Virtualization) 적용.
- [ ] 디렉토리 구조 리팩토링 (Feature-based).
- [ ] 주요 로직 단위 테스트 작성.

---

## 6. 결론

본 설계서는 Luie Renderer가 토이 프로젝트 수준을 넘어 엔터프라이즈급 안정성과 품질을 갖추기 위한 필수적인 기술적 부채 해결과 아키텍처 개선 방향을 제시합니다. **Phase 0(안전망)**부터 즉시 착수하여 사용자 경험의 치명적인 결함을 제거하는 것이 최우선입니다.
