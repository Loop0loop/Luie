import { enWorkspaceWriting } from "./workspace/writing";
import { enWorkspaceWorld } from "./workspace/world";

export const enWorkspace = {
  ...enWorkspaceWriting,
  ...enWorkspaceWorld,
} as const;
