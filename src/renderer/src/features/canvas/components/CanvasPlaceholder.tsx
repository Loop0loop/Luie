/**
 * Phase 0a 임시 진입 화면.
 *
 * 캔버스 feature 갈아엎기 진행 중 — types/stores/services/hooks 뼈대만
 * 자리잡은 단계. UI는 Phase 0b/1에서 차례로 들어간다. 외부 import
 * (`@renderer/features/canvas/WorldCanvasPanel`)가 깨지지 않도록 placeholder를
 * 둔다.
 */
export function CanvasPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-app text-muted">
      <div className="flex flex-col items-center gap-1 text-[12px]">
        <span className="font-semibold uppercase tracking-wider text-fg/80">
          Canvas
        </span>
        <span>재구성 중</span>
      </div>
    </div>
  );
}
