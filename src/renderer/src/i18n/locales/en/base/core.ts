export const enBaseCore = {
  home: "Home",
  share: "Share",
  loading: "Loading...",
  back: "Back",
  delete: "Delete",
  undo: "Undo",
  clear: "Clear",
  exit: "Exit",
  menu: {
    file: "File",
    edit: "Edit",
    view: "View",
    insert: "Insert",
    format: "Format",
    tools: "Tools",
    extensions: "Extensions",
    help: "Help",
    link: "Link",
    image: "Image",
  },
  ui: {
    modal: {
      confirm: "Confirm",
      cancel: "Cancel",
    },
  },
  bootstrap: {
    fetchFailed: "Failed to fetch app bootstrap status.",
    initializing: "Initializing workspace...",
    retry: "Retry",
    quit: "Quit",
    deleteManuscriptConfirm: "Delete this manuscript?",
  },
  errorBoundary: {
    title: "Failed to start the app.",
    description: "Please restart the application.",
    reload: "Reload Application",
  },
  project: {
    defaults: {
      projectTitle: "Untitled Project",
      newProjectTitle: "New Project",
      chapterTitle: "Chapter 1",
      untitled: "Untitled",
      noteTitle: "New memo",
    },
    toast: {
      recoveredFromDb:
        "The file was corrupted, so we restored it from local cache.",
      recoveredMissingPackage:
        "The original .luie file was missing, so we rebuilt a new package from local data.",
      dbNewerSynced: "Local cache was newer, so the project file was updated.",
      pathMissing:
        "The local .luie attachment is unavailable, so the project opened from local data.",
      missingAttachment:
        "The attached .luie file is missing, so the project opened from local data.",
      invalidAttachment:
        "The attached .luie path is invalid, so the project opened from local data.",
      legacyUnsupportedAttachment:
        "This app no longer supports legacy package .luie files.",
    },
    templateDescription: "Created with {templateId} template",
  },
  sidebar: {
    title: "PROJECT BINDER",
    menu: {
      openBelow: "Open below",
      openRight: "Open to the right",
      rename: "Rename",
      duplicate: "Duplicate",
      delete: "Delete",
    },
    defaultProjectTitle: "Project",
    binderTitle: "PROJECT BINDER",
    section: {
      manuscript: "Manuscript",
      research: "Research",
      trash: "Trash",
      snapshot: "Snapshots",
    },
    item: {
      characters: "Characters",
      world: "World",
      scrap: "Scrap",
      synopsis: "Synopsis",
    },
    action: {
      new: "Add New Chapter",
    },
    addChapter: "Add new chapter...",
    trashEmpty: "Empty",
    snapshotEmpty: "Select a chapter.",
    settingsLabel: "Settings",
    prompt: {
      renameTitle: "New title",
      renameProject: "Enter a project name.",
      deleteConfirm: "Are you sure you want to delete this item?",
    },
    tooltip: {
      renameProject: "Rename project",
      refresh: "Refresh",
    },
    expand: "Expand",
  },
  context: {
    tab: {
      synopsis: "Synopsis",
      characters: "Characters",
      terms: "Terms",
    },
    synopsisHeader: "Project Synopsis",
    detail: {
      description: "Description",
      category: "Category",
    },
    placeholder: {
      search: "Search...",
      synopsis: "Write a synopsis here...",
    },
  },
  memo: {
    sectionTitle: "MEMOS",
    empty: "Select a note to view",
    placeholder: {
      search: "Search...",
      tags: "Add tags (comma separated)...",
      title: "Title",
      body: "Start typing your memo...",
    },
    defaultNotes: [
      {
        id: "1",
        title: "Reference: Medieval clothing",
        content:
          "Link: https://wiki...\n\nNoble clothing in the Middle Ages was more ornate than expected...",
        tags: ["reference", "costume"],
      },
      {
        id: "2",
        title: "Idea fragments",
        content:
          "- What if the protagonist was the villain?\n- What if memories before the loop were distorted?",
        tags: ["idea", "plot"],
      },
    ],
  },
  startupWizard: {
    title: "Initializing workspace...",
    subtitle: "Checking required setup. Please wait a moment.",
    status: {
      configuring: "Initializing workspace...",
      launching: "Initializing workspace...",
      failed: "Startup configuration failed.",
    },
    actions: {
      retry: "Retry",
    },
    onboarding: {
      introTitle: "Welcome to Luie",
      introBody:
        "Luie is a local-first writing app for long-form fiction. It helps your draft with AI semantic search, canvas, and a relationship graph.",
      introNext: "Get started",
      setupTitle: "Install Local AI",
      setupBody:
        "Install the embedding model that powers on-device semantic search. You can also install it later in Settings.",
      recommendTitle: "Recommended for your PC",
      skip: "Skip",
      next: "Next",
      finishing: "Finishing setup...",
    },
  },
  toolbar: {
    editor: "Editor",
    canvas: "Canvas",
  },
  canvas: {
    tab: {
      canvas: "Canvas",
      timeline: "Timeline",
      notes: "Notes",
      entity: "Entities",
      plugins: "Plugins",
    },
    action: {
      refresh: "Refresh",
    },
    create: {
      characterDefaultName: "New Character",
      factionDefaultName: "New Faction",
      eventDefaultName: "New Event",
      placeDefaultName: "New Place",
      conceptDefaultName: "New Concept",
      ruleDefaultName: "New Rule",
      itemDefaultName: "New Item",
      termDefaultName: "New Term",
      worldentityDefaultName: "New World Element",
    },
  },
} as const;
