export const enWorkspaceAnalysis = {
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
  };
