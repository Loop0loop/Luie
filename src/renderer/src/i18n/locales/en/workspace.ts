import {
  enWorkspaceEntityVisual,
  enWorkspaceToolbar,
  enWorkspaceTextEditor,
  enWorkspaceMainLayout,
  enWorkspaceAnalysis,
  enWorkspaceSlashMenu,
  enWorkspaceEvent,
  enWorkspaceFaction,
  enWorkspaceCharacter,
  enWorkspaceWorld
} from "./workspace/index";

export const enWorkspace = {
  entityVisual: enWorkspaceEntityVisual,
  toolbar: enWorkspaceToolbar,
  textEditor: enWorkspaceTextEditor,
  mainLayout: enWorkspaceMainLayout,
  analysis: enWorkspaceAnalysis,
  slashMenu: enWorkspaceSlashMenu,
  event: enWorkspaceEvent,
  faction: enWorkspaceFaction,
  character: enWorkspaceCharacter,
  world: enWorkspaceWorld,
} as const;
