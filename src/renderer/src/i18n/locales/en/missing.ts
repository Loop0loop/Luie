// NOTE: common에 누락된 component key를 deep merge로 보완한다.
export const enMissing = {
  common: {
    close: "Close",
    dismiss: "Dismiss",
    saving: "Saving...",
  },
  canvas: {
    activity: {
      namePrompt: "Enter a name.",
      toggleAll: "Toggle all",
      untitledFile: "Untitled",
      untitledFolder: "New Folder",
    },
    graph: {
      aiSync: "AI Sync",
      chapterUnit: "ch.",
      characterMode: "Character",
      empty: { title: "No graph data" },
      startChapter: "Start chapter",
      endChapter: "End chapter",
      eventMode: "Event",
    },
    node: {
      confirmDelete: "Delete this node from the project?",
      connectedNodes: "Connected nodes",
      delete: "Delete node",
      edges: "Edges",
      nodes: "Nodes",
      openInspector: "Details",
    },
    toolbar: {
      comingSoon: "Coming soon",
      error: {
        noProject: "No open project",
        syncFailed: "Sync failed",
      },
      success: { synced: "Synced" },
    },
  },
  character: {
    noCharacters: "No characters",
    noSelection: "No character selected",
    wiki: { descriptionLabel: "Description" },
  },
  event: { noSelection: "No Event Selected" },
  faction: { noSelection: "No Faction Selected" },
  memo: {
    addTitle: "Add memo",
    noSelection: "No memo selected",
    tags: "Tags",
    title: "Memo",
  },
  world: { term: { noTerms: "No terms" } },
  entityVisual: { toggle: { document: "Document" } },
  research: { title: { map: "Map", plot: "Plot" } },
  editor: {
    autosave: {
      failed: "Autosave failed",
      retryingIn: "Retrying in {{seconds}}s",
    },
    errors: {
      exportNoChapter: "No chapter to export",
      exportOpenFailed: "Failed to open the exported file",
    },
    layoutTitle: "Layout",
  },
  toolbar: { canvas: "Canvas", editor: "Editor" },
  sidebar: {
    section: { settings: "Settings" },
    toggle: { close: "Collapse sidebar", open: "Expand sidebar" },
  },
  snapshot: {
    close: "Close",
    list: { selectChapter: "Select a chapter" },
    noActiveChapter: "No active chapter",
  },
  updater: {
    action: {
      download: "Download update",
      later: "Later",
      restart: "Update now",
      retry: "Check again",
    },
    message: { available: "Current {{current}} → Latest {{latest}}" },
    status: {
      applying: "Applying update...",
      available: "A new version is available",
      checking: "Checking for updates...",
      downloading: "Downloading update",
      error: "Update failed",
      ready: "Update ready to install",
    },
  },
  workspace: {
    offline: {
      title: "You are navigating offline",
      desc: "Changes will be saved locally and synced automatically when network connects.",
    },
    recovery: {
      bannerTitle: "Unsaved changes were recovered",
      defaultDesc: "Luie safely restored your latest work after an unexpected exit.",
      corruptDesc: "The original file was corrupted. Luie used the latest backup.",
      missingDesc:
        "The original .luie file was missing. Luie rebuilt a new package from local data.",
      dismiss: "Dismiss",
    },
  },
  settings: {
    appearance: {
      animations: {
        title: "Enable animations",
        description: "Apply smooth animations when opening and closing panels.",
        on: "On",
        off: "Off",
      },
      entityColors: {
        title: "Worldbuilding element colors",
        description:
          "Set the colors used for worldbuilding elements in the editor and graph.",
      },
    },
    section: {
      letterSpacing: "Letter spacing",
      wordSpacing: "Word spacing",
      paragraphSpacing: "Paragraph spacing",
      systemFonts: "System Fonts",
    },
    letterSpacing: { description: "Adjust the spacing between letters" },
    wordSpacing: { description: "Adjust the spacing between words" },
    paragraphSpacing: { description: "Adjust the spacing between paragraphs" },
    systemFonts: {
      search: "Search fonts…",
      noResults: "No results",
      none: "No system fonts available",
    },
    preview: {
      body1:
        "He sat in a corner of the old study and opened a dusty bundle of manuscript pages. Rain fell beyond the window, and the voices of his characters grew clearer.",
      body2:
        "Writing is, in the end, a vessel for a person's voice. Today, too, one sentence at a time.",
    },
    sync: {
      actions: {
        disconnectGoogle: "Sign out",
        resolveConflicts: "Resolve Conflicts",
        syncing: "Syncing...",
      },
      conflicts: {
        summary:
          "{{total}} conflicts ({{chapters}} chapters · {{memos}} memos · {{memoryCanonical}} memory)",
        allResolved: "All conflicts resolved!",
        chapterCount: "Chapters",
        chapterLabel: "Chapter",
        keepLocal: "Keep Local",
        memoCount: "Memos",
        memoLabel: "Memo",
        memoryLabel: "Memory",
        resolveLater: "Resolve Later",
        totalCount: "Total",
      },
      fields: { lastRun: "Last run" },
      health: {
        connected: "Connected",
        degraded: "Degraded",
        disconnected: "Disconnected",
      },
    },
  },
  ai: {
    sidePanel: {
      open: "Open AI side panel",
      close: "Close AI side panel",
      view: "AI View",
    },
  },
} as const;
