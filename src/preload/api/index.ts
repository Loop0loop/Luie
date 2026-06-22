import type { RendererApi } from "../../shared/api/index.js";
import { createProjectApi } from "./projectApi.js";
import { createSystemApi } from "./systemApi.js";
import type { PreloadApiModuleContext } from "./types.js";
import { createWindowApi } from "./windowApi.js";
import { createWorldApi } from "./worldApi.js";

export function createRendererApi(
  context: PreloadApiModuleContext,
): RendererApi {
  return {
    ...createProjectApi(context),
    ...createWindowApi(context),
    ...createSystemApi(context),
    ...createWorldApi(context),
  };
}
