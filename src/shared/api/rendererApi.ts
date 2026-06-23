import type { CoreRendererApi } from "./core.contract";
import type { IoRendererApi } from "./io.contract";
import type { ResearchRendererApi } from "./research.contract";
import type { SettingsRendererApi } from "./settings.contract";
import type { WorldRendererApi } from "./world.contract";

export type RendererApi = CoreRendererApi &
  ResearchRendererApi &
  IoRendererApi &
  SettingsRendererApi &
  WorldRendererApi;
