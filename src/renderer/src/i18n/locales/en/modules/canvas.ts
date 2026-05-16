/**
 * Canvas i18n — English tree. Keys grow per phase.
 */
export const enCanvas = {
  workspace: {
    title: "Canvas",
  },
  mode: {
    flowMap: {
      label: "Flow Map",
      description: "Show events and flow of the selected range as nodes.",
    },
    sceneBoard: {
      label: "Scene Board",
      description: "Break chapters into scene cards.",
    },
    timeline: {
      label: "Timeline",
      description: "Show events along a time axis.",
    },
    characterMap: {
      label: "Character Map",
      description: "Show character relationships and presence density.",
    },
    memoryMap: {
      label: "Memory Map",
      description: "Show chunks and entities from the memory engine.",
    },
    comingSoon: "Coming soon",
  },
  sidebar: {
    activity: "Activity",
    expand: "Expand sidebar",
    collapse: "Collapse sidebar",
  },
  binder: {
    title: "Binder",
    expand: "Expand binder",
    collapse: "Collapse binder",
  },
  status: {
    empty: "Nothing to show.",
    loading: "Loading...",
    error: "Could not load the canvas.",
    stale: "Source changed — refresh required.",
  },
  toolbar: {
    fitView: "Fit view",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
  },
} as const;
