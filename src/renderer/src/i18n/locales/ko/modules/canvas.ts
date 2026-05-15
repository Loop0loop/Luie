/**
 * Canvas i18n 한국어 트리.
 *
 * 캔버스 feature 갈아엎기 진행 중. 이전 키들은 컴포넌트와 함께 폐기됐고,
 * Phase별로 사용 가능한 키가 들어온다. 키 구조는 PRD §6/§7/§8을 따른다:
 *
 *   workspace.{title,scope}
 *   mode.{flowMap,sceneBoard,timeline,characterMap,memoryMap}
 *   preset.{currentChapter,arcView,conflictView,foreshadowView}
 *   focus.{character,event,location,foreshadow,conflict}
 *   layer.{scene,character,event,memo,aiHint}
 *   action.{refresh,openInEditor,exportSnapshot}
 *   binder.{scope,projectTree,currentFocus,selection,projection}
 *   status.{empty,loading,ready,error,stale}
 */
export const koCanvas = {} as const;
