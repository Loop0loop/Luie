import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import type { PlotCreateInput, PlotUpdateInput } from "../../../shared/types/index.js";
import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import { plotCreateSchema, plotIdSchema, plotUpdateSchema, projectIdSchema } from "../../../shared/schemas/index.js";
import { z } from "zod";
import type { LoggerLike } from "../core/types.js";

type PlotServiceLike = {
  createPlot: (input: PlotCreateInput) => Promise<unknown>;
  getPlot: (id: string) => Promise<unknown>;
  getAllPlots: (projectId: string) => Promise<unknown>;
  updatePlot: (input: PlotUpdateInput) => Promise<unknown>;
  deletePlot: (id: string) => Promise<unknown>;
};

export function registerPlotIPCHandlers(logger: LoggerLike, plotService: PlotServiceLike): void {
  registerIpcHandlers(logger, [
    {
      channel: IPC_CHANNELS.PLOT_CREATE,
      logTag: "PLOT_CREATE",
      failMessage: "Failed to create plot",
      argsSchema: z.tuple([plotCreateSchema]),
      handler: (input: PlotCreateInput) => plotService.createPlot(input),
    },
    {
      channel: IPC_CHANNELS.PLOT_GET,
      logTag: "PLOT_GET",
      failMessage: "Failed to get plot",
      argsSchema: z.tuple([plotIdSchema]),
      handler: (id: string) => plotService.getPlot(id),
    },
    {
      channel: IPC_CHANNELS.PLOT_GET_ALL,
      logTag: "PLOT_GET_ALL",
      failMessage: "Failed to get plots",
      argsSchema: z.tuple([projectIdSchema]),
      handler: (projectId: string) => plotService.getAllPlots(projectId),
    },
    {
      channel: IPC_CHANNELS.PLOT_UPDATE,
      logTag: "PLOT_UPDATE",
      failMessage: "Failed to update plot",
      argsSchema: z.tuple([plotUpdateSchema]),
      handler: (input: PlotUpdateInput) => plotService.updatePlot(input),
    },
    {
      channel: IPC_CHANNELS.PLOT_DELETE,
      logTag: "PLOT_DELETE",
      failMessage: "Failed to delete plot",
      argsSchema: z.tuple([plotIdSchema]),
      handler: (id: string) => plotService.deletePlot(id),
    },
  ]);
}
