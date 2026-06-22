import { lazy } from "react";

export const SettingsModal = lazy(
  () => import("@renderer/domains/settings").then((module) => ({
    default: module.SettingsModal,
  })),
);
export const MainLayout = lazy(
  () => import("@renderer/features/workspace/components/layout/MainLayout"),
);
export const GoogleDocsLayout = lazy(
  () =>
    import("@renderer/features/workspace/components/layout/GoogleDocsLayout"),
);
export const FocusLayout = lazy(
  () => import("@renderer/features/workspace/components/layout/FocusLayout"),
);
export const EditorLayout = lazy(
  () => import("@renderer/features/workspace/components/layout/EditorLayout"),
);
export const ScrivenerLayout = lazy(
  () =>
    import("@renderer/features/workspace/components/layout/ScrivenerLayout"),
);
export const Sidebar = lazy(
  () => import("@renderer/domains/manuscript").then((module) => ({
    default: module.Sidebar,
  })),
);
export const DocsSidebar = lazy(
  () => import("@renderer/domains/manuscript").then((module) => ({
    default: module.DocsSidebar,
  })),
);
export const ScrivenerSidebar = lazy(
  () => import("@renderer/domains/manuscript").then((module) => ({
    default: module.ScrivenerSidebar,
  })),
);
export const CanvasActivityShell = lazy(
  () =>
    import("@renderer/domains/canvas").then((module) => ({
      default: module.CanvasActivityShell,
    })),
);
export const CanvasPane = lazy(
  () => import("@renderer/domains/canvas").then((module) => ({
    default: module.CanvasPane,
  })),
);
export const ContextPanel = lazy(() =>
  import("@renderer/features/workspace/components/panels/ContextPanel")
);
export const WorkspacePanels = lazy(() =>
  import("@renderer/features/workspace/components/panels/WorkspacePanels").then(
    (module) => ({
      default: module.WorkspacePanels,
    }),
  ),
);
export const DataRecoveryBanner = lazy(
  () =>
    import("@renderer/features/workspace/components/banner/DataRecoveryBanner"),
);
export const UpdaterNotification = lazy(
  () => import("@renderer/features/workspace/components/UpdaterNotification"),
);
export const OfflineBanner = lazy(() =>
  import("@renderer/features/workspace/components/banner/OfflineBanner").then(
    (module) => ({
      default: module.OfflineBanner,
    }),
  ),
);
