import { CanvasLayout } from "./layout/CanvasLayout";
import { CanvasSidebar } from "./sidebar/CanvasSidebar";
import { CanvasToolbar } from "./stage/CanvasToolbar";
import { CanvasStage } from "./stage/CanvasStage";
import { CanvasBinderBar } from "./binder/CanvasBinderBar";

/**
 * Canvas 진입점.
 *
 * 기존 외부 import 경로(`./canvas/WorldCanvasPanel`)는 그대로 유지한다.
 * 내부 구조는 새로 작성됐으며, Obsidian 풍 3분할 레이아웃으로 동작한다.
 *
 * 본 단계는 셸. 노드/엣지 데이터 연결, Inspector 채우기, Suggestions
 * 후보 처리, Agent 호출은 다음 단계에서 점진적으로 채운다.
 */
export function WorldCanvasPanel() {
  return (
    <CanvasLayout
      sidebar={<CanvasSidebar />}
      main={
        <>
          <CanvasToolbar />
          <CanvasStage nodes={[]} edges={[]} />
        </>
      }
      binder={<CanvasBinderBar />}
    />
  );
}
