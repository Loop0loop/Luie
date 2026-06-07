import {
  jaWorkspaceEntityVisual,
  jaWorkspaceToolbar,
  jaWorkspaceTextEditor,
  jaWorkspaceMainLayout,
  jaWorkspaceAnalysis,
  jaWorkspaceSlashMenu,
  jaWorkspaceEvent,
  jaWorkspaceFaction,
  jaWorkspaceCharacter,
  jaWorkspaceWorld
} from "./workspace/index";

export const jaWorkspace = {
  entityVisual: jaWorkspaceEntityVisual,
  toolbar: jaWorkspaceToolbar,
  textEditor: jaWorkspaceTextEditor,
  mainLayout: jaWorkspaceMainLayout,
  analysis: jaWorkspaceAnalysis,
  slashMenu: jaWorkspaceSlashMenu,
  event: jaWorkspaceEvent,
  faction: jaWorkspaceFaction,
  character: jaWorkspaceCharacter,
  world: jaWorkspaceWorld,
} as const;
