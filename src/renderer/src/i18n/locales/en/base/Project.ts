export const enBaseProject = {
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
  };
