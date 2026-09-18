import { create } from "zustand";

/**
 * Windows 인앱 창 버튼(WindowsWindowControls)의 배치를 레이아웃이 제어한다.
 *
 * 버튼은 App 셸에 하나만 마운트되지만, 레이아웃마다 우상단에 두는 레이아웃 고유
 * UI(AI 뷰 토글·캔버스 인스펙터 토글·docs 우측 패널 헤더)가 달라 충돌이 다르다.
 * macOS가 레이아웃에서 setTrafficLightVisibility로 네이티브 트래픽 라이트를 제어하듯,
 * Windows는 레이아웃이 이 스토어로 인앱 버튼을 제어한다. 레이아웃은 unmount 시
 * 반드시 resetPlacement로 되돌려야 한다(안 되면 다른 화면에 값이 새어 나간다).
 */
interface WindowsWindowControlsPlacement {
  /** 표시 여부. EditorLayout은 툴바 hover 때만 노출한다(macOS 트래픽 라이트 패리티). */
  visible: boolean;
  /** 우측에서 띄울 px. 레이아웃 고유 우상단 UI 폭에 맞춘다. */
  rightInset: number;
  /** 상단에서 내릴 px. 헤더 높이에 세로 정렬할 때 쓴다. */
  topInset: number;
}

const DEFAULT_PLACEMENT: WindowsWindowControlsPlacement = {
  visible: true,
  rightInset: 0,
  topInset: 0,
};

interface WindowsWindowControlsState extends WindowsWindowControlsPlacement {
  setPlacement: (placement: Partial<WindowsWindowControlsPlacement>) => void;
  resetPlacement: () => void;
}

export const useWindowsWindowControlsStore = create<WindowsWindowControlsState>(
  (set) => ({
    ...DEFAULT_PLACEMENT,
    setPlacement: (placement) => set(placement),
    resetPlacement: () => set(DEFAULT_PLACEMENT),
  }),
);
