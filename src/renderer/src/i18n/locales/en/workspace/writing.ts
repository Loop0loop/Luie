export const enWorkspaceWriting = {
  entityVisual: {
    toggle: {
      wiki: "Wiki",
      visual: "Visual",
    },
    graph: {
      title: "Relations",
      ragPending: "RAG integration pending",
    },
    identity: {
      title: "Identity",
      summarySuffix: "one-line summary",
      isVerb: " is ",
      endingParticle: ".",
    },
    related: {
      title: "Connected",
      empty: "None",
    },
    kind: {
      character: "Character",
      event: "Event",
      faction: "Faction",
    },
  },
  toolbar: {
    ribbon: {
      home: "Home",
      insert: "Insert",
      draw: "Draw",
      view: "View",
      paste: "Paste",
      style: {
        normalText: "Normal text",
        title: "Title",
        heading1: "Heading 1",
        heading2: "Heading 2",
      },
    },
    font: {
      defaultLabel: "Nanum Gothic",
      options: {
        arial: "Arial",
        inter: "Inter",
        roboto: "Roboto",
      },
    },
    tooltip: {
      undo: "Undo",
      redo: "Redo",
      bold: "Bold",
      italic: "Italic",
      underline: "Underline",
      strikethrough: "Strikethrough",
      textColor: "Text Color",
      highlight: "Highlight",
      alignLeft: "Align Left",
      alignCenter: "Align Center",
      alignRight: "Align Right",
      bulletList: "Bulleted list",
      orderedList: "Numbered list",
      addComment: "Add Comment",
      toggleMobileView: "Toggle mobile view",
      openWorldGraph: "Open world graph",
      fontSizeIncrease: "Increase font size",
      fontSizeDecrease: "Decrease font size",
      view: {
        mobile: "Mobile View",
        desktop: "PC View",
      },
    },
    view: {
      mobile: "Mobile",
      desktop: "Desktop",
      graph: "Graph",
    },
    layout: {
      default: "Default layout",
      scrivener: "Scrivener (3-pane)",
      docs: "Google Docs style",
      focus: "Focus mode",
    },
  },
  textEditor: {
    placeholder: {
      body: "Start writing...",
    },
    status: {
      saving: "Saving...",
      saved: "Saved",
    },
    actions: {
      save: "Save",
    },
    suffix: {
      char: "chars",
      word: "words",
    },
    ruler: {
      firstLineIndent: "First-line indent",
      leftMargin: "Left margin",
      rightMargin: "Right margin",
    },
  },
  mainLayout: {
    tooltip: {
      sidebarCollapse: "Collapse sidebar",
      sidebarExpand: "Expand sidebar",
      contextCollapse: "Collapse panel",
      contextExpand: "Expand panel",
    },
  },
  analysis: {
    title: "Editor's Desk",
    selectChapter: "Chapter to review",
    startButton: "Get feedback",
    analyzing: "Reading your manuscript...",
    emptyState:
      "Hello, writer.\nPlace the chapter you want reviewed on the desk.\nI will read it and share my thoughts.",
    disclaimer:
      "We analyze your manuscript using characters and terms.\nAnalysis results are not saved and are discarded when the session ends.",
    disclaimerLink: "Learn more",
    disclaimerDetailTitle: "Data processing policy",
    disclaimerDetailBody:
      "1. Purpose of use\n- Your manuscript data is used only for AI analysis.\n- It is not used for any other purpose.\n\n2. Storage and disposal\n- Data sent for analysis is not stored permanently.\n- It is processed in volatile memory and deleted when the session ends.\n\n3. No third-party sharing\n- Data is never shared with third parties or used for AI training without consent.\n\nFocus on writing with confidence.",
    result: {
      reaction: "Reader notes",
      contradiction: "Review notes",
      empty: "No feedback available.",
    },
    actions: {
      reset: "Reset",
      reanalyze: "Analyze again",
      moveToContext: "Go to context",
    },
    toast: {
      start: "Starting analysis...",
      error: "An error occurred during analysis.",
      apiKeyMissing:
        "Gemini API key is missing. Please check your environment variables.",
      quotaExceeded: "Gemini API quota exceeded. Please try again later.",
      networkError:
        "A network error occurred. Please check your internet connection.",
      unknown: "An unknown error occurred.",
      navigateChapter: 'Moving to "{title}".',
      navigateFallback:
        "Moving to the referenced context. (context: {contextId})",
    },
  },
  slashMenu: {
    header: "Basic blocks",
    description: {
      h1: "Chapter or major section",
      h2: "Mid-level section",
      h3: "Subsection",
      bullet: "Simple bullet list",
      number: "Numbered list",
      check: "Track progress with checkboxes",
      toggle: "Collapsible section",
      quote: "Emphasize a quote",
      callout: "Note/callout box",
      divider: "Scene divider",
    },
    label: {
      h1: "Heading 1",
      h2: "Heading 2",
      h3: "Heading 3",
      bullet: "Bulleted list",
      number: "Numbered list",
      check: "Task list",
      toggle: "Toggle",
      quote: "Quote",
      callout: "Callout",
      divider: "Divider",
    },
    toggleTitle: "Toggle title",
    calloutContent: "Callout content",
  },
} as const;
