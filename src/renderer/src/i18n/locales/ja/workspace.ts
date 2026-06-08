import { jaWorkspaceWriting } from "./workspace/writing";
import { jaWorkspaceWorld } from "./workspace/world";

export const jaWorkspace = {
  ...jaWorkspaceWriting,
  ...jaWorkspaceWorld,
} as const;
