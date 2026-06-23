import { koWorkspaceWriting } from "./workspace/writing";
import { koWorkspaceWorld } from "./workspace/World";

export const koWorkspace = {
  ...koWorkspaceWriting,
  ...koWorkspaceWorld,
} as const;
