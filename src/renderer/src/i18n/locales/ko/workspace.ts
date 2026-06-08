import { koWorkspaceWriting } from "./workspace/writing";
import { koWorkspaceWorld } from "./workspace/world";

export const koWorkspace = {
  ...koWorkspaceWriting,
  ...koWorkspaceWorld,
} as const;
