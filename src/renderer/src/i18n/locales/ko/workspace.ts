import {
  koWorkspaceEntityVisual,
  koWorkspaceToolbar,
  koWorkspaceTextEditor,
  koWorkspaceMainLayout,
  koWorkspaceAnalysis,
  koWorkspaceSlashMenu,
  koWorkspaceEditor,
  koWorkspaceEvent,
  koWorkspaceFaction,
  koWorkspaceCharacter,
  koWorkspaceWorld
} from "./workspace/index";

export const koWorkspace = {
  entityVisual: koWorkspaceEntityVisual,
  toolbar: koWorkspaceToolbar,
  textEditor: koWorkspaceTextEditor,
  mainLayout: koWorkspaceMainLayout,
  analysis: koWorkspaceAnalysis,
  slashMenu: koWorkspaceSlashMenu,
  editor: koWorkspaceEditor,
  event: koWorkspaceEvent,
  faction: koWorkspaceFaction,
  character: koWorkspaceCharacter,
  world: koWorkspaceWorld,
} as const;
