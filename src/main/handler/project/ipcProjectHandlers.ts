import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
} from "../../../shared/types/index.js";
import { registerIpcHandler } from "../core/ipcHandler.js";

type LoggerLike = {
  error: (message: string, data?: unknown) => void;
};

type ProjectServiceLike = {
  createProject: (input: ProjectCreateInput) => Promise<unknown>;
  getProject: (id: string) => Promise<unknown>;
  getAllProjects: () => Promise<unknown>;
  updateProject: (input: ProjectUpdateInput) => Promise<unknown>;
  deleteProject: (id: string) => Promise<unknown>;
};

export function registerProjectIPCHandlers(
  logger: LoggerLike,
  projectService: ProjectServiceLike,
): void {
  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.PROJECT_CREATE,
    logTag: "PROJECT_CREATE",
    failMessage: "Failed to create project",
    handler: (input: ProjectCreateInput) => projectService.createProject(input),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.PROJECT_GET,
    logTag: "PROJECT_GET",
    failMessage: "Failed to get project",
    handler: (id: string) => projectService.getProject(id),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.PROJECT_GET_ALL,
    logTag: "PROJECT_GET_ALL",
    failMessage: "Failed to get all projects",
    handler: () => projectService.getAllProjects(),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.PROJECT_UPDATE,
    logTag: "PROJECT_UPDATE",
    failMessage: "Failed to update project",
    handler: (input: ProjectUpdateInput) => projectService.updateProject(input),
  });

  registerIpcHandler({
    logger,
    channel: IPC_CHANNELS.PROJECT_DELETE,
    logTag: "PROJECT_DELETE",
    failMessage: "Failed to delete project",
    handler: (id: string) => projectService.deleteProject(id),
  });
}
