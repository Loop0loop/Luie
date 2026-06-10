# Challenge Report — SPA 상태 보존 및 FloatingView Portal 잔존 여부 검증

## Challenge Summary

**Overall risk assessment**: HIGH

`floatingView` 모드는 사용자가 원고(Manuscript/Editor)를 작성하는 동시에 최상위에 플로팅된 미니 대화 윈도우를 확인하고 제어하기 위해 설계된 멀티태스킹 기능입니다. 그러나 현재 코드베이스 구조상, `AnalysisSection` 컴포넌트는 오직 'Analysis' 탭이 활성화되어 있을 때만 React 트리에 마운트되고, 다른 탭(Editor, Manuscript 등)으로 전환되면 완전히 언마운트(unmount)되는 구조를 띠고 있습니다.

React Portal은 부모 컴포넌트의 생명주기에 종속적이므로, 부모(`AnalysisSection`)가 언마운트되면 `document.body` 최상위 포털에 마운트되어 있던 floatingView 윈도우 또한 즉각 소멸합니다. 탭을 나갔다가 다시 Analysis 탭으로 돌아왔을 때 Zustand 스토어의 전역 상태 덕분에 자동으로 복구(재렌더링)는 되지만, **탭이 전환되어 있는 도중에는 화면에서 완전히 소멸하는 구조적 한계**가 입증되었습니다. 이는 멀티태스킹 집필 환경이라는 본래 기획 의도에 위배되므로 위험도를 **HIGH**로 산정합니다.

---

## Challenges

### [High] Challenge 1: 탭 전환 시 FloatingView Portal 즉시 소멸 현상

- **Assumption challenged**: React Portal(`createPortal`)을 사용하여 `document.body`에 렌더링하면 부모 컴포넌트의 마운트 상태나 탭 전환 여부와 무관하게 화면에 항상 잔존하여 정상 유지될 것이라는 암묵적 가정.
- **Attack scenario**:
  1. 사용자가 Analysis 탭에서 `floatingView` 모드를 활성화하여 미니 대화창을 띄움.
  2. 원고 편집을 위해 다른 탭(예: Manuscript/Editor)으로 전환함.
  3. `ScrivenerLayout.tsx` 및 `ResearchPanel.tsx`에서 `activeTab` 변경으로 인해 `AnalysisSection` 컴포넌트가 언마운트됨.
  4. Portal 또한 자동으로 제거되어 화면에 떠 있던 미니 대화창이 소멸함.
- **Blast radius**: 사용자가 타 탭에서 원고를 집필하는 동안 분석창을 띄워둘 수 없게 되며, 탭을 이동할 때마다 대화창이 닫혀 분석 흐름이 끊기게 됩니다.
- **Mitigation**:
  - `floatingView`로 동작하는 미니 대화창 컴포넌트(`FloatingWrapper`와 콘텐츠 영역)를 `AnalysisSection` 내부가 아닌, **최상위 공통 레이아웃(`EditorRoot.tsx` 또는 `MainLayout.tsx`) 레벨**로 마운트 위치를 격상시켜야 합니다.
  - 최상위 레벨에서 `useAnalysisStore`의 `viewMode` 전역 상태를 구독하여, `viewMode === "floatingView"`일 때 직접 `document.body` 최상위에 포털을 마운트하도록 구현합니다.
  - 탭 내의 기존 `AnalysisSection` 컴포넌트는 `viewMode === "fixView"`일 때만 본래 콘텐츠를 렌더링하고, `floatingView` 모드일 때는 "플로팅 뷰 활성화됨 (고정 뷰로 돌아가기)"와 같은 플레이스홀더만 표시하게 하여 중복 렌더링 및 상태 충돌을 방지합니다.

---

## Stress Test Results

- **Scenario 1: `AnalysisSection` 단독 마운트 시 `viewMode` 토글 동작 검증**
  - Expected behavior: `fixView`에서는 컴포넌트 내부 렌더링, `floatingView` 전환 시 `document.body` 하위로 포털 마운트 및 원본 컨테이너 이탈.
  - Actual/Predicted behavior: 토글 버튼 클릭 시 `document.body`에 직접 마운트됨을 확인.
  - Status: **PASS**

- **Scenario 2: 탭 전환(언마운트) 시 floatingView 포털 잔존 검증 (신규 테스트 케이스)**
  - Expected behavior: Analysis 탭에서 다른 탭으로 이동(컴포넌트 언마운트)하더라도 `document.body`에 마운트된 Portal이 소멸하지 않고 정상 유지되어야 함.
  - Actual/Predicted behavior: `AnalysisSection`이 언마운트되는 즉시 `document.body` 하위의 포털 엘리먼트(`analysis-section-content`)가 DOM에서 함께 제거되어 소멸함.
  - Status: **FAIL** (스펙 위배 및 구조적 한계 입증)

- **Scenario 3: Analysis 탭으로 복귀(재마운트) 시 floatingView 모드 복구 검증 (신규 테스트 케이스)**
  - Expected behavior: 탭을 전환했다가 다시 Analysis로 복귀 시, Zustand 전역 스토어 상태 보존에 의해 추가 조작 없이 자동으로 floatingView Portal이 마운트되어야 함.
  - Actual/Predicted behavior: 스토어의 `viewMode` 상태가 보존되므로 컴포넌트가 다시 마운트될 때 자동으로 Portal을 통해 대화창이 정상 렌더링됨.
  - Status: **PASS** (Zustand 스토어의 일관성 확인)

---

## Unchallenged Areas

- **AI 런타임 API 서버 연동 및 쿼타 제한** — API 응답 지연이나 실패 시 UI의 복구 상태 및 로딩 폴백 동작에 관한 분석은 본 마운트 잔존성 평가 범위 외이므로 다루지 않았습니다.

---

## Attack Surface

- **Hypotheses tested**:
  - React Portal의 부모 생명주기 종속 가설: 부모 컴포넌트가 언마운트되면 Portal 또한 즉시 DOM에서 소멸함을 `tests/dom/analysisViewMode.test.tsx` 내에 추가한 `unmounts the floating view portal when AnalysisSection is unmounted during tab transition` 테스트를 통해 입증함.
  - 전역 스토어 기반의 상태 보존 가설: 탭 전환으로 컴포넌트가 언마운트되었다가 다시 마운트되더라도, Zustand 전역 상태에 기반해 동일한 뷰 모드가 복구됨을 `restores the floatingView mode when switching back to the Analysis tab via store state preservation` 테스트를 통해 검증함.
- **Vulnerabilities found**:
  - `AnalysisSection` 컴포넌트 내부에 직접 `createPortal`이 선언되어 있어, 탭의 생명주기 스위칭에 따라 포털이 소멸하는 치명적 아키텍처적 종속성 발견.
- **Untested angles**:
  - 사용자가 스플릿 뷰나 다중 패널 상태에서 각각 AnalysisSection을 동시에 마운트할 때 발생할 수 있는 스토어 갱신 레이스 컨디션 및 포털 엘리먼트 중복 마운트 리스크.

---

## Loaded Skills

- **Source**: `/Users/user/Luie/.agents/skills/qa-agent/SKILL.md`
- **Local copy**: `/Users/user/Luie/.agents/teamwork_preview_challenger_2/skills/qa-agent/SKILL.md`
- **Core methodology**: 컴포넌트 생명주기와 상태 저장소의 분리로 발생하는 불일치(In-Between State)를 시나리오 기반의 DOM 통합 테스트 추가 설계를 통해 정밀 실증하고 분석 리포트를 도출함.
