# Handoff Report

## 1. Observation
- **대상 파일**: `src/renderer/src/features/research/components/AnalysisSection.tsx`
- **구현 방식**:
  - `FloatingWrapper` 컴포넌트의 53-59 라인:
    ```tsx
    <div
      data-testid="analysis-floating-container"
      className="fixed bottom-24 right-6 w-[380px] h-[520px] rounded-2xl border border-border shadow-panel backdrop-blur-md bg-panel/80 z-[9999] flex flex-col overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
    ```
  - `handlePointerMove` 핸들러 38-43 라인:
    ```tsx
    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      const newX = e.clientX - dragStart.current.x;
      const newY = e.clientY - dragStart.current.y;
      setPosition({ x: newX, y: newY });
    };
    ```
  - `handlePointerDown` 및 `handlePointerUp` 핸들러 27-36 라인 및 45-50 라인:
    ```tsx
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button")) return;
      const header = e.currentTarget;
      header.setPointerCapture(e.pointerId);
      isDragging.current = true;
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current) return;
      const header = e.currentTarget;
      header.releasePointerCapture(e.pointerId);
      isDragging.current = false;
    };
    ```
- **상태 관리**: Pointer Capture API는 정상 호출되어 적용 중이지만, `lostpointercapture` 이벤트 처리나 좌표 클램핑 및 드래그 동작 시의 transition 해제 처리가 결여되어 있음.

## 2. Logic Chain
1. **드래그 버벅임(Jitter) 유발**:
   - `FloatingWrapper`에 `transition-all duration-300` 클래스가 항상 켜져 있음 (Observation 1).
   - 드래그 중에 `handlePointerMove`가 `position`을 변경하면 DOM의 `transform` 인라인 스타일이 빠르게 갱신됨 (Observation 2).
   - 브라우저는 갱신될 때마다 300ms 트랜지션 보간을 적용하려고 시도하여 프레임 드랍과 포인터 래그(Lag)가 발생함.
2. **화면 밖 소실**:
   - `newX`, `newY` 계산식에 `Math.max`/`Math.min` 등 뷰포트 크기를 제약하는 클램핑 로직이 부재함 (Observation 2).
   - 사용자가 창을 뷰포트 경계 밖으로 끌어서 드롭할 경우, 창이 완전히 가려져서 재드래그 및 제어가 불가능한 UI 영구 소실 상태가 됨.
3. **끈적임 드래그(Sticky Drag)**:
   - 포인터 캡처가 외부 요인(윈도우 포커스 상실, OS 제스처 등)으로 풀릴 때 브라우저는 `lostpointercapture`를 보냅니다.
   - 하지만 코드에는 `onLostPointerCapture` 리스너가 등록되어 있지 않아 `isDragging.current`가 `true` 상태로 방치되어 Sticky Drag 버그가 발생함.

## 3. Caveats
- 시스템에 직접 마우스 드래그를 실행하여 시각적인 FPS 측정을 하지는 못했습니다 (터미널 기반 비동기 승인 타임아웃으로 인한 dynamic test 차단).
- 본 리뷰는 Static Code Analysis에 기반하여, 드래그 제어 매커니즘의 근본적인 한계 상황을 논리적으로 도출하였습니다.

## 4. Conclusion
- Pointer Capture API는 기본 인터랙션에 적용되었으나, **(1) CSS Transition 충돌로 인한 렌더링 성능 지연, (2) Boundary Clamping 결여로 인한 창 유실 가능성, (3) `lostpointercapture` 미처리로 인한 Sticky Drag 위험** 등 3가지 심각한 견고성 결함이 존재합니다.
- 이는 실사용 시 미니 대화창 조작에 대한 리퀴드 UI 성능을 크게 훼손하므로, implementer 단계에서 CSS 수정 및 핸들러 개선이 시급합니다.

## 5. Verification Method
- **수동 검증 방법**:
  - 마우스를 붙잡고 좌우로 빠르게 회전시키며 드래그하여, 프레임이 부드럽게 갱신되는지 아니면 고무줄처럼 느리게 지연되는지 확인합니다.
  - 미니 대화창을 화면 바깥쪽 구석으로 힘껏 던지듯이 끌어놓았을 때 대화창의 헤더가 유실되는지 확인합니다.
  - 드래그를 한 상태에서 `Alt+Tab` 혹은 OS의 시스템 제스처를 조작한 후, 마우스를 다시 가져다 댈 때 클릭을 안 해도 따라오는지 확인합니다.
- **자동 테스트 실행**:
  - `pnpm vitest tests/dom/analysisViewMode.test.tsx` 를 실행하여 포인터 캡처 Mock 동작 테스트가 통과되는지 확인합니다.
