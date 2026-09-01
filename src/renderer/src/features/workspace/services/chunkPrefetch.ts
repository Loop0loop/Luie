// NOTE: research 패널은 React.lazy 청크다. 첫 클릭이 청크 fetch+파싱을 직렬로 기다리지
// 않게 하려고 사이드바 항목 hover/pointerdown 같은 의도 시점에 미리 깐다. 모듈 import는
// 한 번만 실행되므로 반복 호출이 무해하다.
export const prefetchResearchPanel = (): void => {
  void import("@renderer/features/research/components/ResearchPanel");
};
