import { useMemo } from "react";
import {
  getEditorLayoutPanelSurface,
  type LayoutSurfaceId,
} from "@renderer/shared/constants/layoutSizing";
// NOTE: type-only import라 번들에 남지 않는다. feature 경계는 배럴(계약)을 통해 넘는다.
import type { BinderTab } from "@renderer/domains/manuscript";
import {
  useLayoutSurfaceResizeCommit,
  type LayoutSurfaceResizeCommitController,
} from "./useLayoutSurfaceResizeCommit";

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
): Record<BinderTab, LayoutSurfaceResizeCommitController> {
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

  // NOTE: controller들이 stable하므로 이 map도 stable하게 유지한다. 매 렌더 새 객체를
  // 돌려주면 이걸 dependency로 쓰는 호출부의 useCallback이 전부 무효화된다.
  return useMemo(
    () => ({
      character: researchHandler,
      event: researchHandler,
      faction: researchHandler,
      world: researchHandler,
      scrap: researchHandler,
      analysis: analysisHandler,
      snapshot: snapshotHandler,
      trash: trashHandler,
      canvas: canvasHandler,
    }),
    [
      analysisHandler,
      canvasHandler,
      researchHandler,
      snapshotHandler,
      trashHandler,
    ],
  );
}
