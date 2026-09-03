import { STORAGE_KEY_PROJECT_LAYOUT, STORAGE_KEY_UI } from "@shared/constants";

// 위저드(#startup-wizard) 부팅 시에만 이전 세션의 persist UI 상태를 지운다.
// 첫 실행·강제 위저드에서 저장된 사이드바 폭·패널 구성·마지막 뷰가 새 온보딩에
// 새어 들어가는 것을 막는다. 일반 실행에서는 저장 상태를 그대로 복원한다.
// 사용자 콘텐츠(luie:world:* 리서치 메모 등)는 대상에서 제외한다.
//
// zustand persist는 스토어 모듈 평가 시점에 동기 rehydrate하므로 이 모듈은
// main.tsx에서 스토어를 끌어오는 import들보다 반드시 먼저 평가되어야 한다.
const WIPED_STORAGE_KEYS = [
  STORAGE_KEY_UI,
  STORAGE_KEY_PROJECT_LAYOUT,
  "luie:research-sidebar-collapsed",
  "luie:theme-seed",
  "luie:wizard-auto-open-project",
] as const;

export function resetPersistedUiStateForWizard(): void {
  if (typeof window === "undefined") return;
  if (window.location.hash !== "#startup-wizard") return;
  for (const key of WIPED_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // storage가 막힌 환경에서는 할 수 있는 것이 없다.
    }
  }
}

resetPersistedUiStateForWizard();
