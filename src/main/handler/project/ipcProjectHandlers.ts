import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
} from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import {
  projectCreateSchema,
  projectUpdateSchema,
  projectIdSchema,
} from "../../../shared/schemas/index.js";
import { z } from "zod";

type ProjectServiceLike = {
  createProject: (input: ProjectCreateInput) => Promise<unknown>;
  openLuieProject: (packagePath: string) => Promise<unknown>;
  getProject: (id: string) => Promise<unknown>;
  getAllProjects: () => Promise<unknown>;
  updateProject: (input: ProjectUpdateInput) => Promise<unknown>;
  deleteProject: (id: string) => Promise<unknown>;
  removeProjectFromList: (id: string) => Promise<unknown>;
};

export function registerProjectIPCHandlers(
  logger: LoggerLike,
  projectService: ProjectServiceLike,
): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.PROJECT_CREATE,
      logTag: "PROJECT_CREATE",
      failMessage: "Failed to create project",
      argsSchema: z.tuple([projectCreateSchema]),
      handler: (input: ProjectCreateInput) => projectService.createProject(input),
    },
    {
      channel: IPC_CHANNELS.PROJECT_OPEN_LUIE,
      logTag: "PROJECT_OPEN_LUIE",
      failMessage: "Failed to open .luie package",
      argsSchema: z.tuple([z.string()]),
      handler: (packagePath: string) => projectService.openLuieProject(packagePath),
    },
    {
      channel: IPC_CHANNELS.PROJECT_GET,
      logTag: "PROJECT_GET",
      failMessage: "Failed to get project",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (id: string) => projectService.getProject(id),
    },
    {
      channel: IPC_CHANNELS.PROJECT_GET_ALL,
      logTag: "PROJECT_GET_ALL",
      failMessage: "Failed to get all projects",
      handler: () => projectService.getAllProjects(),
    },
    {
      channel: IPC_CHANNELS.PROJECT_UPDATE,
      logTag: "PROJECT_UPDATE",
      failMessage: "Failed to update project",
      argsSchema: z.tuple([projectUpdateSchema]),
      handler: (input: ProjectUpdateInput) => projectService.updateProject(input),
    },
    {
      channel: IPC_CHANNELS.PROJECT_DELETE,
      logTag: "PROJECT_DELETE",
      failMessage: "Failed to delete project",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (id: string) => projectService.deleteProject(id),
    },
    {
      channel: IPC_CHANNELS.PROJECT_REMOVE_LOCAL,
      logTag: "PROJECT_REMOVE_LOCAL",
      failMessage: "Failed to remove project from list",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (id: string) => projectService.removeProjectFromList(id),
    },
  ]);
}
