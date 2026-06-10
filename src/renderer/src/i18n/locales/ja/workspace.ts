import { jaWorkspaceWriting } from "./workspace/writing";
import { jaWorkspaceWorld } from "./workspace/World";

export const jaWorkspace = {
  ...jaWorkspaceWriting,
  ...jaWorkspaceWorld,
} as const;
