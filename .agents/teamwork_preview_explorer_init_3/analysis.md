# React Portal 및 미니 대화창 드래그 & 리퀴드 UI 구현 방안 분석 보고서

이 보고서는 최상위 레이어에 미니 대화창을 띄우기 위한 React Portal 활용 방법, 헤더 드래그 기능 구현 방안 및 프로젝트 내 선례 분석, 그리고 ChatGPT/Gemini 스타일의 리퀴드 UI 적용에 필요한 CSS/Tailwind 클래스와 패키지 구성을 분석한 결과입니다.

---

## 1. React Portal을 사용한 최상위 레이어 마운트 방안
React v19 및 `react-dom`의 `createPortal`을 사용하여 미니 대화창이 부모 컴포넌트의 CSS 스타일(예: `overflow: hidden`, `z-index`, `transform`)의 제약을 받지 않고 최상위 레이어에 독립적으로 마운트되도록 구성합니다.

### 구현 방식
- **Target Container**: 최상위 루트 노드인 `document.body`를 타겟으로 지정합니다.
- **포커스 및 접근성**: 미니 대화창이 최상위에 배치되더라도 스크린 리더 및 키보드 네비게이션이 유효하도록 접근성 설정을 고려해야 합니다.
- **프로젝트 내 선례**:
  - `src/shared/ui/Toast.tsx`와 `src/shared/ui/GlobalDragContext.tsx`에서 `createPortal(ReactNode, document.body)` 형태의 패턴이 일관적으로 사용되고 있습니다. 이 구조를 준수하여 구현하는 것이 자연스럽습니다.

```tsx
import { createPortal } from "react-dom";

interface MiniChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MiniChatWindow({ isOpen, onClose }: MiniChatWindowProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9000] pointer-events-none">
      {/* 실제 미니 대화창 콘텐츠 (이벤트 활성화) */}
      <div className="pointer-events-auto absolute bottom-6 right-6 w-96 h-120 bg-panel/80 border border-border/40 rounded-shell shadow-modal backdrop-blur-md">
        {/* 대화창 내부 구조 */}
      </div>
    </div>,
    document.body
  );
}
```

---

## 2. 헤더 영역 드래그 기능 구현 방안
대화창의 자유 드래그(Floating Drag)를 구현하기 위해 프로젝트 내부 도구와 이벤트 처리 방식을 검토하였습니다.

### 프로젝트 내 라이브러리 및 선례 분석
1. **Framer Motion**: 프로젝트 `package.json` 확인 결과, `framer-motion` 패키지는 설치되어 있지 않습니다.
2. **@dnd-kit**: `@dnd-kit/core`, `@dnd-kit/sortable` 등이 설치되어 있으나, 주로 리스트 정렬(`useTermDragDrop.ts`)이나 영역 간 드롭(`GlobalDragContext.tsx`)에 특화되어 사용됩니다. 화면 위에서 미니 대화창을 자유롭게 드래그하는 절대 좌표 이동 기능에는 설정이 복잡하고 무거울 수 있습니다.
3. **포인터 캡처 API 활용 직접 구현 (권장)**:
   - `src/renderer/src/features/workspace/components/BinderBarCompactHover.tsx` 에서 리사이징 처리를 위해 포인터 이벤트(`onPointerDown`, `onPointerMove`, `onPointerUp`)와 포인터 캡처 API(`setPointerCapture`)를 직접 사용하여 드래그를 처리한 선례가 있습니다.
   - 드래그 중 마우스가 대화창 영역을 빠르게 이탈해도 포인터 트래킹을 잃지 않도록 `setPointerCapture`를 적용하는 직접 구현 방식이 가장 효율적이고 경량화되어 있습니다.

### 드래그 훅 구현 예시 (Pointer Capture API 사용)
```typescript
import { useState, useRef, useCallback } from "react";

export function useDraggableWindow(initialX = 100, initialY = 100) {
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const dragStateRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // 헤더 영역에서 발생한 포인터 이벤트인 경우 캡처 시작
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    const deltaX = e.clientX - dragStateRef.current.startX;
    const deltaY = e.clientY - dragStateRef.current.startY;
    setPosition({
      x: dragStateRef.current.posX + deltaX,
      y: dragStateRef.current.posY + deltaY,
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragStateRef.current = null;
  }, []);

  return { position, handlePointerDown, handlePointerMove, handlePointerUp };
}
```

---

## 3. 리퀴드 스타일 UI 구현을 위한 스타일링 분석
ChatGPT, Gemini 앱 스타일의 부드럽고 유기적인(Liquid) 느낌을 주기 위해 현재 프로젝트 환경에서 사용 가능한 Tailwind v4 및 CSS 기법을 정리합니다.

### 1) 프로젝트 환경 및 기존 설정 활용
- **Tailwind CSS v4 (v4.3.0) & PostCSS (v8.5.15)**: 최신 Tailwind v4의 네이티브 기능을 적용할 수 있습니다.
- **둥근 모서리 변수**: `tailwind.config.js`에 설정된 `rounded-shell` (1rem = 16px)이나 표준 `rounded-2xl` (16px), `rounded-3xl` (24px) 클래스를 사용하여 둥글고 친근한 외형을 잡습니다.
- **그림자 효과**: `shadow-modal` 또는 `shadow-2xl`을 적용하여 깊이감을 극대화하고 부유하는 레이어임을 보여줍니다.

### 2) 핵심 CSS/Tailwind 클래스 구성
- **블러 배경 (Glassmorphism)**: 
  - `bg-panel/75 backdrop-blur-md` 또는 `bg-panel/80 backdrop-blur-lg`
  - 반투명 패널 배경과 블러 필터를 조합하여 하단 레이어가 은은하게 비치도록 처리합니다.
- **미세 테두리**: 
  - `border border-border/40`
  - 투명도가 가미된 얇은 테두리로 경계를 선명하게 구분합니다.
- **트랜지션 및 부드러운 애니메이션 (Liquid Motion)**:
  - 별도 라이브러리 없이 Tailwind v4의 내장 트랜지션 클래스를 통해 고성능 애니메이션을 유도합니다:
    `transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1)`
    - *참고: `cubic-bezier(0.16, 1, 0.3, 1)`는 초반에 빠르게 시작했다가 마지막에 부드럽게 마무리되는 전형적인 모던 리퀴드 트랜지션 곡선입니다.*
  - 진입/퇴출 시 스케일과 페이드인 효과 조합:
    `scale-95 opacity-0` (진입 전) → `scale-100 opacity-100` (활성화 시)

### 3) 추가 패키지 도입에 대한 검토
- **Framer Motion (`pnpm add framer-motion`)**:
  - 만약 물리 기반의 스프링 애니메이션(Spring Physics)이나 복잡한 레이아웃 공유 전환(Layout Transitions)이 명확히 수반되어야 한다면 Framer Motion 도입이 권장됩니다.
  - 단순 대화창 열기/닫기 및 선형 드래그 수준에서는 추가 패키지 없이 CSS 트랜지션과 포인터 이벤트 제어가 성능 및 Electron의 리소스 소비 관점에서 유리합니다.
- **Radix UI Primitives (기설치)**:
  - `package.json`에 `radix-ui`가 설치되어 있으므로 Dialog나 Popover의 WAI-ARIA 접근성 규칙, 포커스 트랩(Focus Trap), 포탈 마운트를 쉽고 정확하게 지원받을 수 있습니다.
