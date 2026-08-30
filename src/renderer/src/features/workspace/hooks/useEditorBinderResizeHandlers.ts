import type { PanelSize } from "react-resizable-panels";
import {
  getEditorLayoutPanelSurface,
  type LayoutSurfaceId,
} from "@renderer/shared/constants/layoutSizing";
import type { BinderTab } from "@renderer/domains/manuscript";
import { useLayoutSurfaceResizeCommit } from "./useLayoutSurfaceResizeCommit";

type LayoutSurfaceRatioSetter = (surface: LayoutSurfaceId, ratio: number) => void;
type LayoutSurfaceRatioCommitter = (surface: LayoutSurfaceId, ratio: number) => void;

/**
 * editor 레이아웃의 binder 탭 리사이즈 commit 정책의 단일 소스.
 *
 * character/event/faction/world/scrap은 물리적으로 하나의 패널(`editor.panel.research`)을
 * 공유한다(docs 레이아웃과 동일 정책). 이 맵이 호출부마다(예: 레거시 rail형 BinderSidebar와
 * hover형 BinderBarCompactHover) 따로 구현되면 탭 간 폭 동기화가 다시 갈라진다.
 */
export function useEditorBinderResizeHandlers(
  setLayoutSurfaceRatio: LayoutSurfaceRatioSetter,
  onCommit?: LayoutSurfaceRatioCommitter,
): Record<BinderTab, (panelSize: PanelSize) => void> {
  const researchHandler = useLayoutSurfaceResizeCommit(
    getEditorLayoutPanelSurface("character"),
    setLayoutSurfaceRatio,
    { onCommit },
  );
  const analysisHandler = useLayoutSurfaceResizeCommit(
    getEditorLayoutPanelSurface("analysis"),
    setLayoutSurfaceRatio,
    { onCommit },
  );
  const snapshotHandler = useLayoutSurfaceResizeCommit(
    getEditorLayoutPanelSurface("snapshot"),
    setLayoutSurfaceRatio,
    { onCommit },
  );
  const trashHandler = useLayoutSurfaceResizeCommit(
    getEditorLayoutPanelSurface("trash"),
    setLayoutSurfaceRatio,
    { onCommit },
  );
  const canvasHandler = useLayoutSurfaceResizeCommit(
    getEditorLayoutPanelSurface("canvas"),
    setLayoutSurfaceRatio,
    { onCommit },
  );

  return {
    character: researchHandler,
    event: researchHandler,
    faction: researchHandler,
    world: researchHandler,
    scrap: researchHandler,
    analysis: analysisHandler,
    snapshot: snapshotHandler,
    trash: trashHandler,
    canvas: canvasHandler,
  };
}
