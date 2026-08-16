export const enBaseEditor = {
  editor: {
    layoutTitle: "Luie Editor",
    selectTabPrompt: "← Select a tab",
    placeholder: {
      title: "Untitled",
      body: "Start writing... (type '/' to see commands)",
    },
    status: {
      unsaved: "Unsaved",
      saving: "Saving...",
      saved: "Saved",
      error: "Not Saved",
      charLabel: "Characters",
      wordLabel: "Words",
      separator: " · ",
    },
    actions: {
      quickExport: "Quick export",
      quickExportTitle: "Quick export",
    },
    errors: {
      exportNoChapter: "Select a chapter before exporting.",
      exportOpenFailed: "Unable to open the export window.",
    },
  },
  inspector: {
    noSelection: "No Selection",
    tab: {
      synopsis: "Synopsis",
      metadata: "Metadata",
      notes: "Notes",
      snapshots: "Snapshots",
    },
    synopsis: {
      placeholder: "Enter details...",
    },
    section: {
      image: "Image",
    },
    image: {
      placeholder: "Enter details...",
    },
    meta: {
      created: "Created",
      modified: "Modified",
      words: "Words",
      label: "Label",
      status: "Status",
    },
    label: {
      none: "None",
      concept: "Concept",
      draft: "Draft",
    },
    status: {
      todo: "To Do",
      inprogress: "In Progress",
      done: "Done",
    },
    notes: {
      document: "Document Notes",
      comingSoon: "Coming Soon",
    },
  },
  scrivener: {
    target: "목표: {{count}} 단어",
    inspector: {
      open: "인스펙터 열기",
      close: "인스펙터 닫기",
      title: "인스펙터 (INSPECTOR)",
      loading: "불러오는 중...",
    },
  },
} as const;
