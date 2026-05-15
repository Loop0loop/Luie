export const enCanvas = {
  sidebar: {
    scope: {
      title: "Scope",
      currentLabel: "Current",
      preset: {
        all: "All",
        currentEpisode: "Current",
        episodeRange: "Range",
      },
      describe: {
        currentEpisode: "Ep. {{episode}}",
        episodeRange: "Ep. {{from}}–{{to}}",
        all: "Whole work",
        none: "Range",
      },
    },
    outline: {
      title: "Outline",
      empty: "No nodes yet.",
      groups: {
        episodes: "Episodes",
        characters: "Characters",
        events: "Events",
        places: "Places",
        notes: "Notes",
      },
    },
    display: {
      title: "Display",
    },
    advanced: {
      title: "Advanced",
    },
    activity: {
      view: "View",
      outline: "Outline",
      search: "Search",
    },
    view: {
      title: "View",
    },
    search: {
      title: "Search",
      placeholder: "Search nodes / relations",
      empty: "Type to search.",
      noResults: "No results.",
    },
    layers: {
      title: "Layers",
      canonical: { label: "Canonical", hint: "Confirmed structure" },
      derived: { label: "Derived", hint: "Auto-detected candidates" },
      timeline: { label: "Timeline overlay" },
      relationStrength: { label: "Relation strength" },
      conflict: { label: "Conflict markers" },
      foreshadowing: { label: "Foreshadowing" },
    },
    filters: {
      title: "Filters",
      episode: "Episodes",
      character: "Characters",
      event: "Events",
      place: "Places",
      note: "Notes",
      relation: "Relations",
    },
  },
  toolbar: {
    addNode: "Node",
    addNote: "Note",
    connect: "Connect",
    group: "Group",
    autoLayout: "Auto layout",
    fitView: "Fit view",
    searchPlaceholder: "Search",
  },
  binder: {
    inspector: {
      title: "Inspector",
      empty: "Select a node.",
      field: {
        type: "Type",
        id: "ID",
        firstAppearance: "First appearance",
        subType: "Subtype",
        description: "Description",
      },
      type: {
        node: "Node",
        edge: "Edge",
      },
    },
    related: {
      title: "Related",
      empty: "No related items.",
    },
    suggestions: {
      title: "Suggestions",
      empty: "No pending candidates.",
    },
    agent: {
      title: "Agent",
      summarizeScope: "Summarize current scope",
      processCandidates: "Process candidates",
      checkTimeline: "Check timeline",
      edgeConflict: "Check relation conflicts",
      summarizeNode: "Summarize this node",
      findRelated: "Find related manuscript",
    },
  },
  empty: {
    error: "Could not load the canvas.",
    retry: "Retry",
  },
  node: {
    kind: {
      episode: "Episode",
      character: "Character",
      event: "Event",
      place: "Place",
      note: "Note",
    },
    derived: "Derived",
  },
} as const;
