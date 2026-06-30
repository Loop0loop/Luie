export const enBaseSettings = {
  settings: {
    title: "Display Settings",
    sidebar: {
      section: {
        manuscript: "Manuscript",
        research: "Research",
        snapshot: "Snapshots",
        trash: "Trash",
      },
      item: {
        characters: "Characters",
        world: "World",
        scrap: "Scrap",
        analysis: "Analysis",
      },
      addChapter: "Add chapter",
      snapshotEmpty: "No chapter selected or no snapshots found.",
      trashEmpty: "Trash is empty.",
      tooltip: {
        refresh: "Refresh",
      },
      editor: "Fonts (Editor)",
      appearance: "Theme (Appearance)",
      features: "Features",
      shortcuts: "Shortcuts",
      recovery: "File Recovery",
      sync: "Sync",
      model: "Model",
      language: "Language",
    },
    section: {
      font: "Font",
      optionalFont: "Optional Bundled Font",
      customFont: "Custom Font",
      spellcheck: "Spell Check",
      fontSize: "Font Size",
      lineHeight: "Line Height",
      theme: "Theme",
      uiMode: "UI Mode (Laboratory)",
      language: "Language",
      menuBar: "Menu Bar",
    },
    customFont: {
      description:
        "Enter the font-family name of a font installed on your system.",
      placeholder: 'e.g., "Noto Sans KR", "Pretendard"',
      apply: "Apply",
      active: "Active",
    },
    uiMode: {
      description: "Change the editor toolbar and layout to a familiar style.",
      default: "Default",
      docs: "Google Docs Style",
      editor: "Editor Mode",
      scrivener: "Scrivener Style",
    },
    menuBar: {
      description:
        "On macOS, hide mode switches the window into immersive fullscreen.",
      hide: "Hide menu bar",
      show: "Show menu bar",
      applyHint:
        "Changes apply immediately. (Hide: fullscreen, Show: windowed)",
      applyFailed: "Failed to apply the menu bar mode. Please try again.",
    },
    appearance: {
      baseTheme: {
        title: "Base Theme",
        description: "Choose the baseline brightness and tone.",
      },
      contrast: {
        title: "Contrast",
        description: "Adjust visual sharpness of the interface.",
        soft: "Soft",
        high: "High",
      },
      tone: {
        title: "Tone",
        description: "Choose the color temperature of the theme.",
        cool: "Cool",
        neutral: "Neutral",
        warm: "Warm",
      },
    },
    view: {
      pc: "PC",
      mobile: "Mobile",
    },
    font: {
      systemUi: "System UI",
      serif: "Serif",
      mono: "Mono",
      helper: {
        primary:
          "System fonts are used by default. Inter is available as an optional bundled font.",
        optional:
          "Only installed fonts can be applied. Otherwise, fallback fonts are used.",
      },
    },
    optionalFont: {
      inter: "Inter Variable",
      action: {
        installing: "Loading",
        install: "Use Inter",
        apply: "Apply",
        active: "Active",
      },
    },
    spellcheck: {
      description:
        "Turn Electron's built-in spellcheck underlines and suggestions on or off.",
      on: "On",
      off: "Off",
    },
    theme: {
      light: "Light",
      sepia: "Sepia",
      dark: "Dark",
    },
    sampleText: "Ag",
    language: {
      helper: "Change the language across the app.",
      options: {
        ko: "Korean",
        en: "English",
        ja: "Japanese",
      },
    },
    placeholder: "This feature is coming soon.",
  },
} as const;
