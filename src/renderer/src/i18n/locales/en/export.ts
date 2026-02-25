export const enExport = {
  "exportPreview": {
    "defaultTitle": "Untitled",
    "alertExport": "Exporting as .{ext} (Coming Soon)",
    "format": {
      "hwpShort": "H",
      "hwp": "HWP",
      "word": "Word"
    },
    "action": {
      "export": "Export"
    },
    "hwp": {
      "appTitle": "HWP 2024",
      "menu": {
        "file": "File",
        "edit": "Edit",
        "view": "View",
        "input": "Input",
        "format": "Format",
        "page": "Page",
        "security": "Security",
        "review": "Review",
        "tools": "Tools"
      },
      "toolbar": {
        "baseStyle": "Body",
        "fontName": "Hamchorom Batang",
        "fontSize": "10"
      },
      "previewNotice": "This is a preview of the HWP style export.",
      "sampleText": "Sample text for the HWP preview.",
      "status": {
        "pageCount": "Page 1/1",
        "column": "1 column",
        "layout": "Layout: Text",
        "insert": "Insert",
        "trackChanges": "Track changes",
        "zoom": "100%"
      }
    },
    "word": {
      "title": "Word",
      "searchPlaceholder": "Search",
      "premium": "PREMIUM",
      "tabs": {
        "file": "File",
        "home": "Home",
        "insert": "Insert",
        "draw": "Draw",
        "layout": "Layout",
        "references": "References",
        "review": "Review",
        "view": "View",
        "help": "Help"
      },
      "undo": "Undo",
      "styles": {
        "standard": "Standard",
        "noSpacing": "No Spacing",
        "heading1": "Heading 1"
      },
      "previewNotice": "This is a preview of the Microsoft Word style export.",
      "sampleText": "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      "status": {
        "pageInfo": "Page 1 of 1",
        "wordCount": "45 words",
        "language": "English",
        "accessibility": "Accessibility: Review needed",
        "view": {
          "read": "Read mode",
          "print": "Print layout",
          "web": "Web layout"
        },
        "zoom": "100%"
      }
    }
  },
  "exportWindow": {
    "title": "Export preview",
    "header": {
      "title": "Export settings",
      "subtitle": "Choose a document format and adjust the style."
    },
    "sections": {
      "format": "File format",
      "page": "Page setup",
      "typography": "Font and line height",
      "header": "Header / Footer"
    },
    "format": {
      "hwp": "HWP document",
      "word": "MS Word",
      "beta": "BETA",
      "hwp_label": "HWP document (.hwp)",
      "docx_label": "Word document (.docx)",
      "txt_label": "Text document (.txt)",
      "word_label": "Word document (.docx)"
    },
    "page": {
      "paperSize": "Paper size",
      "paperOptions": {
        "a4": "A4 (210 x 297 mm)",
        "letter": "Letter (216 x 279 mm)",
        "b5": "B5 (176 x 250 mm)"
      },
      "margins": "Margins (mm)",
      "marginTop": "Top",
      "marginBottom": "Bottom",
      "marginLeft": "Left",
      "marginRight": "Right"
    },
    "typography": {
      "font": "Font",
      "fontOptions": {
        "batang": "Batang",
        "malgun": "Malgun Gothic",
        "nanum": "Nanum Myeongjo"
      },
      "fontHint": "If the font is not available, a similar serif/sans font will be used.",
      "lineHeight": "Line height"
    },
    "headerSettings": {
      "showPageNumbers": "Show page numbers",
      "startPage": "Start number"
    },
    "button": {
      "export": "Export ({format})",
      "exporting": "Exporting..."
    },
    "preview": {
      "label": "Preview",
      "errorTitle": "Error",
      "loading": "Loading chapter..."
    },
    "error": {
      "missingChapterId": "Chapter ID was not provided.",
      "loadFailed": "Failed to load the chapter.",
      "unknown": "An unknown error occurred.",
      "noChapter": "Unable to load chapter information."
    },
    "alert": {
      "success": "Export completed.\nSaved to: {path}",
      "failed": "Export failed.\n{reason}",
      "exception": "An error occurred during export.\n{reason}"
    }
  }
} as const;
