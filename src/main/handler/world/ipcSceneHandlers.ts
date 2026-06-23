import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { SceneCreateInput, SceneUpdateInput } from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import { projectIdSchema, sceneCreateSchema, sceneIdSchema, sceneUpdateSchema } from "../../../shared/schemas/index.js";
import { z } from "zod";
import type { LoggerLike } from "../core/types.js";

type SceneServiceLike = {
  createScene: (input: SceneCreateInput) => Promise<unknown>;
  getScene: (id: string) => Promise<unknown>;
  getAllScenes: (projectId: string) => Promise<unknown>;
  updateScene: (input: SceneUpdateInput) => Promise<unknown>;
  deleteScene: (id: string) => Promise<unknown>;
};

export function registerSceneIPCHandlers(logger: LoggerLike, sceneService: SceneServiceLike): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.SCENE_CREATE,
      logTag: "SCENE_CREATE",
      failMessage: "Failed to create scene",
      argsSchema: z.tuple([sceneCreateSchema]),
      handler: (input: SceneCreateInput) => sceneService.createScene(input),
    },
    {
      channel: IPC_CHANNELS.SCENE_GET,
      logTag: "SCENE_GET",
      failMessage: "Failed to get scene",
      argsSchema: z.tuple([sceneIdSchema]),
      handler: (id: string) => sceneService.getScene(id),
    },
    {
      channel: IPC_CHANNELS.SCENE_GET_ALL,
      logTag: "SCENE_GET_ALL",
      failMessage: "Failed to get scenes",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (projectId: string) => sceneService.getAllScenes(projectId),
    },
    {
      channel: IPC_CHANNELS.SCENE_UPDATE,
      logTag: "SCENE_UPDATE",
      failMessage: "Failed to update scene",
      argsSchema: z.tuple([sceneUpdateSchema]),
      handler: (input: SceneUpdateInput) => sceneService.updateScene(input),
    },
    {
      channel: IPC_CHANNELS.SCENE_DELETE,
      logTag: "SCENE_DELETE",
      failMessage: "Failed to delete scene",
      argsSchema: z.tuple([sceneIdSchema]),
      handler: (id: string) => sceneService.deleteScene(id),
    },
  ]);
}
