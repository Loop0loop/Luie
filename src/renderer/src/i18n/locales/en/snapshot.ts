export const enSnapshot = {
  "snapshot": {
    "list": {
      "loading": "Loading snapshots...",
      "loadFailed": "Failed to load snapshots.",
      "retry": "Retry",
      "empty": "No snapshots found.",
      "manualButton": "Create manual snapshot",
      "confirmRestore": "Restore this snapshot? Current changes will be overwritten.",
      "restoreSuccess": "Restored.",
      "restoreFailed": "Restore failed.",
      "chapterNotFound": "Chapter not found.",
      "memoPrompt": "Enter a snapshot memo",
      "manualDescription": "Manual Snapshot",
      "createFailed": "Failed to create manual snapshot.",
      "manualCreated": "Manual snapshot created.",
      "manualBadge": "Manual",
      "compareTitle": "Compare",
      "restoreTitle": "Restore",
      "autoDescription": "Auto Saved Snapshot"
    },
    "viewer": {
      "restoreConfirm": "Restore this snapshot? Current content will be overwritten.",
      "restoreSuccess": "Snapshot restored.",
      "restoreFailed": "Failed to restore snapshot.",
      "unknownDate": "Unknown date",
      "applyConfirm": "Apply the selected changes to the current manuscript?",
      "applySuccess": "Selected changes applied.",
      "applyFailed": "Failed to apply selected changes.",
      "header": "Snapshot: {date}",
      "restoreButton": "Restore",
      "changesHeader": "Changes only in snapshot",
      "applySelected": "Apply selection",
      "diffSkipped": "Content is too long; diff comparison was skipped.",
      "noAdditions": "No additions found.",
      "selectTitle": "Select",
      "formatOnly": "(formatting only)",
      "applySingle": "Apply"
    },
    "diff": {
      "title": "Compare snapshots",
      "snapshotPast": "Snapshot (past)",
      "currentVersion": "Current version",
      "editingNow": "Editing now",
      "deleted": "Deleted",
      "added": "Added",
      "close": "Close"
    }
  }
} as const;
