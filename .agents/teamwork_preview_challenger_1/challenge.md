## Challenge Summary

**Overall risk assessment**: HIGH

## Challenges

### [High] Challenge 1: CSS Transition 충돌로 인한 드래그 버벅임(Jitter) 및 프레임 드랍

- **Assumption challenged**: 인라인 스타일 `transform`과 CSS `transition-all` 클래스가 공존해도 브라우저가 성능 저하 없이 부드러운 드래그(Liquid UI)를 보장할 것이라는 가정.
- **Attack scenario**: 사용자가 미니 대화창을 마우스로 잡고 빠르게 드래그할 때, `handlePointerMove`는 포인터 위치에 맞춰 `transform: translate(...)` 값을 즉시 갱신합니다. 그러나 컨테이너에 지정된 `transition-all duration-300` 속성으로 인해 브라우저는 매 프레임의 위치 변화마다 300ms 동안 애니메이션 보간(transition)을 시도합니다. 이는 렌더링 파이프라인의 연쇄 무효화를 일으켜 심각한 드래그 래그(Lag) 및 프레임 드랍(Jitter)을 유발하고 포인터와 창의 동기화를 깨트립니다.
- **Blast radius**: 플로팅 뷰 전환 시 드래그 반응성이 저하되어 사용자 경험(UX)이 크게 훼손되며, 특히 고주사율 디스플레이 환경에서 화면 끊김이 명확하게 관찰됩니다. 드래그 중인 미니 대화창이 마우스 포인터의 실제 속도를 따라오지 못하고 고무줄처럼 늦게 따라오는 현상이 나타납니다.
- **Mitigation**: 드래그 진행 중(`isDragging.current === true`)에는 transition 속성을 비활성화(`transition: none` 또는 클래스 분기 처리)하고, 드래그가 끝난 시점(`pointerup`)에 다시 transition을 켜도록 개선해야 합니다. 또는 transition 대상에서 `transform`을 제외하고 배경색/테두리 등에만 한정해야 합니다.

### [High] Challenge 2: 뷰포트 경계 제약(Boundary Clamp) 부재로 인한 UI 화면 영구 이탈

- **Assumption challenged**: 사용자가 윈도우 뷰포트 밖으로 마우스를 끌어도 포인터 캡처가 유지되므로 창을 항상 안전하게 제어할 수 있을 것이라는 가정.
- **Attack scenario**: `handlePointerMove` 내에서 새로운 좌표 `newX`, `newY`를 결정할 때 화면의 크기나 경계선에 대한 최소/최대 제한(Clamping) 처리가 전혀 존재하지 않습니다. 사용자가 미니 대화창을 화면 바깥쪽(예: 브라우저나 Electron 창 외부)으로 강하게 던지듯 드래그하거나 창 밖으로 드래그한 상태에서 포인터를 놓으면, `transform: translate(...)` 값이 화면 좌표계를 초과하여 음수나 매우 큰 값으로 고정됩니다.
- **Blast radius**: 대화창의 헤더 영역이 뷰포트 경계 밖으로 완전히 벗어나게 되며, 사용자는 더 이상 헤더를 클릭하거나 드래그할 수 없게 됩니다. 결과적으로 대화창을 화면 내부로 되돌릴 방법이 없어져 **UI 영구 유실(UI Loss of Control)** 상태에 빠지게 됩니다.
- **Mitigation**: `handlePointerMove`에서 `newX`와 `newY`를 계산할 때, 뷰포트의 크기(`window.innerWidth`, `window.innerHeight`)와 플로팅 창의 크기(`380px`, `520px`)를 고려하여, 창 전체 혹은 헤더의 일부가 항상 화면 내에 유지될 수 있도록 `Math.max`와 `Math.min`을 이용한 좌표 클램핑(Boundary Clamping) 로직을 추가해야 합니다.

### [Medium] Challenge 3: lostpointercapture 이벤트 미처리로 인한 끈적임 드래그(Sticky Drag) 오동작

- **Assumption challenged**: 드래그 드롭 중 포인터 캡처 해제는 오직 사용자의 `pointerup` 이벤트에 의해서만 직접 제어될 것이라는 가정.
- **Attack scenario**: 시스템 포커스 강제 이동(Alt+Tab), OS 수준의 제스처 동작(macOS Mission Control), ESC 키 입력 등 브라우저 포커스가 상실되거나 윈도우 이벤트가 방해받는 상황이 발생하면 브라우저는 포인터 캡처를 강제 해제하고 `lostpointercapture` 이벤트를 발생시킵니다. 하지만 현재 컴포넌트에는 이에 대한 리스너가 존재하지 않습니다.
- **Blast radius**: 포인터 캡처가 이미 강제 해제되었음에도 React 내부 레프인 `isDragging.current`는 여전히 `true` 상태를 유지합니다. 이로 인해 사용자가 마우스 버튼을 뗀 상태에서도 포인터가 컴포넌트 헤더 위에 다시 진입하거나 움직일 때, 창이 마우스를 자석처럼 따라다니는 **끈적임 드래그(Sticky Drag / Phantom Drag)** 현상이 발생합니다.
- **Mitigation**: 헤더 엘리먼트에 `onLostPointerCapture` 이벤트를 바인딩하여 포인터 캡처가 유실되는 즉시 `isDragging.current = false`로 상태를 리셋해주는 안전 장치가 필요합니다.

### [Low] Challenge 4: 헤더 내 인터랙션 요소(토글 버튼)와 드래그 이벤트 간의 오동작 위험

- **Assumption challenged**: `(e.target as HTMLElement).closest("button")` 처리가 모든 상황에서 드래그 이벤트 오작동을 차단해 줄 것이라는 가정.
- **Attack scenario**: 사용자가 미니 대화창 내의 뷰 모드 토글 버튼(`<button data-testid="view-mode-toggle">`)을 빠르게 클릭하는 과정에서 미세하게 마우스를 미끄러뜨리거나(Swipe), 터치 패드로 터치 및 드래그 동작이 겹치는 경우, 버튼 클릭 방지 조건과 드래그 트리거 조건이 충돌합니다.
- **Blast radius**: 토글 버튼 클릭이 무시되고 드래그 동작이 우선 시작되어 창이 엉뚱한 위치로 흔들리거나, 반대로 사용자가 창을 고정하려고 할 때 의도하지 않게 뷰 모드 전환이 일어날 수 있는 사소한 UX 불편이 발생합니다.
- **Mitigation**: 버튼 자체에 `onPointerDown={(e) => e.stopPropagation()}`을 명시적으로 부여하여 부모의 드래그 핸들러로 포인터 이벤트가 버블링되는 것을 원천 차단하는 것이 구조적으로 더 안전합니다.

## Stress Test Results

- **Scenario 1: 드래그 중 마우스가 윈도우 외부로 완전히 나가는 경우**
  - Expected behavior: 포인터 캡처 덕분에 윈도우 밖에서도 드래그가 정상 트래킹되나, 창이 화면 밖으로 완전히 사라지지 않도록 경계면에서 멈추어야 함.
  - Actual/predicted behavior: 포인터 캡처는 유지되나 바운더리 클램핑이 전혀 없어, 마우스가 창 밖으로 멀리 나갈 경우 대화창이 뷰포트 영역 밖으로 100% 이탈하여 소실됨. (Fail)
  
- **Scenario 2: 드래그 속도가 아주 빠를 때 (Pointer Velocity Stress)**
  - Expected behavior: 빠른 속도에서도 끊김 없이 1:1로 즉각 반응해야 함 (Liquid UI 본연의 특성).
  - Actual/predicted behavior: `transition-all duration-300`의 렌더링 방해로 인해, 순간 속도가 빨라질수록 창이 심하게 버벅거리며 프레임이 깨지고 포인터를 늦게 쫓아가는 고무줄 래그가 발생함. (Fail)

- **Scenario 3: 드래그 진행 중 Alt+Tab 또는 시스템 제스처로 포커스가 탈출할 때**
  - Expected behavior: 드래그 상태가 즉각적으로 해제되고 마우스를 뗀 후에는 창이 더 이상 반응하지 않아야 함.
  - Actual/predicted behavior: `lostpointercapture` 이벤트 미처리로 인해 내부 `isDragging.current` 플래그가 여전히 `true`로 고착되어, 포커스 복귀 후 마우스 클릭을 하지 않았는데도 마우스를 대면 창이 멋대로 끌려 다니는 Sticky Drag 현상이 발생함. (Fail)

- **Scenario 4: 드래그와 뷰 모드 전환 버튼을 동시에 번갈아가며 연타/동시 조작할 때**
  - Expected behavior: 뷰 모드가 일관되게 고정 뷰/미니 뷰로 안전하게 전환되어야 하며, 드래그 상태가 풀려야 함.
  - Actual/predicted behavior: 뷰 전환 시 React state가 변경되고 DOM 구조가 Portal에서 일반 Node로 재생성(`unmount` -> `mount`)되는데, 이 과정에서 포인터 캡처 관련 참조(ref)가 불안정해져 드래그 흔적이 남거나 스타일이 초기화되지 않고 비정상적인 위치에 붕 뜨는 오동작 우려가 있음. (Pass/Fail 경계 - React 렌더링 타이밍에 종속적)

## Unchallenged Areas

- **Backend API Integration** — 본 태스크는 순수 클라이언트 렌더러 UI 상호작용 및 포인터 이벤트 제어에 초점을 맞춘 태스크이므로, RAG Chat 등의 백엔드 통신 로직 및 데이터 전송 상태는 챌린지 범위에서 제외되었습니다.
- **Multi-Touch Gestures (모바일/태블릿 터치 디바이스)** — Electron 데스크톱 앱 타깃 사양으로 개발되어 멀티터치 제스처에 대한 한계 분석은 생략되었습니다.
