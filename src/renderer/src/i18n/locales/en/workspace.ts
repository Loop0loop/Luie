import { enWorkspaceWriting } from "./workspace/writing";
import { enWorkspaceWorld } from "./workspace/World";

export const enWorkspace = {
  ...enWorkspaceWriting,
  ...enWorkspaceWorld,
} as const;
