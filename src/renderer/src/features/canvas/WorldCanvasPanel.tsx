/**
 * Canvas feature 외부 진입점. 외부 import 시그니처는 변경 금지.
 *
 * 내부는 `CanvasWorkspace`(3-pane shell). 모든 영역의 데이터 흐름은
 * canvas store와 hook을 통해 흘러가며, 외부 feature는 이 컴포넌트만 렌더하면
 * 캔버스 전체가 자기 책임 영역 안에서 동작한다.
 */
import { CanvasWorkspace } from "./components/CanvasWorkspace";

export function WorldCanvasPanel() {
  return <CanvasWorkspace />;
}
