/**
 * Canvas feature 외부 진입점.
 *
 * 다른 feature(`research/components/world/index.tsx` 등)는 이 모듈을
 * import하므로 export 시그니처는 변경 금지(이름/파일 경로 유지).
 * 내부 구현은 Phase별로 교체된다.
 *
 * 현재 상태: Phase 0a — 뼈대만 자리잡고 placeholder 노출.
 */

import { CanvasPlaceholder } from "./components/CanvasPlaceholder";

export function WorldCanvasPanel() {
  return <CanvasPlaceholder />;
}
