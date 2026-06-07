export const enBaseSettingsRecovery = {
      title: "File Recovery",
      refresh: "Check again",
      steps: {
        safeTitle: "Create a safe backup first",
        safeDescription:
          "The current state is copied aside first, so Luie can restore it if anything goes wrong.",
        restoreTitle: "Bring back the latest saved changes",
        restoreDescription:
          "Luie applies recent saved changes that had not been merged into the main file yet.",
        rollbackTitle: "Roll back automatically if there is a problem",
        rollbackDescription:
          "If the integrity check fails, Luie restores the backup automatically.",
      },
      dryRun: "Create a safety backup first",
      run: "Recover recent saved changes",
      running: "Recovering...",
      failed: "Recovery failed.",
      error: "Recovery encountered an error.",
      lastChecked: "Last checked",
      unavailableHint:
        "There is no recent saved change to recover right now. This usually means no .wal file was found.",
      file: {
        database: "Database",
        wal: "WAL Log",
        shm: "Shared Memory",
        present: "Present",
        missing: "Missing",
      },
      hero: {
        checkingBadge: "Checking",
        checkingTitle: "Looking for recoverable recent saved changes",
        checkingDescription:
          "Luie is checking whether there is a recoverable save trace left behind.",
        readyBadge: "Recovery available",
        readyTitle: "Recent saved changes can be brought back",
        readyDescription:
          "Luie found recent saved changes that were not merged into the main file yet. Press the recovery button below and Luie will handle the recovery flow for you.",
        emptyBadge: "Nothing to recover right now",
        emptyTitle: "There is no recent saved change to recover right now",
        emptyDescription:
          "Luie could not find a recoverable .wal trace, so there is nothing to restore at the moment.",
        blockedBadge: "Needs attention",
        dbMissingTitle: "The recovery target file could not be found",
        dbMissingDescription:
          "Luie needs the app database file to be present before it can attempt recovery.",
      },
      dialog: {
        checkingTitle: "Checking for recoverable recent saved changes",
        checkingDescription:
          "Luie is looking for the latest save trace left behind right before the app closed.",
        readyTitle: "Unsaved writing can be brought back",
        readyDescription:
          "Luie found a save trace from right before the unexpected exit. If you recover now, Luie will restore that recent saved version for you.",
        emptyTitle: "There is nothing to recover right now",
        emptyDescription:
          "Luie could not find a recent save trace to restore. You can check again if needed.",
        blockedTitle: "The files needed for recovery are missing",
        blockedDescription:
          "Luie needs the target data file to be present before recovery can run.",
      },
      scope: {
        currentProject: "Currently open manuscript",
        noOpenProject: "No manuscript is open",
        library: "What this affects",
        projectCount: "{{count}} local manuscripts",
        libraryDescription:
          "This recovery affects Luie's local library on this device, not just the currently open project.",
        preview: "Manuscripts currently in that library",
        noProjects: "No local manuscript list is loaded right now.",
        moreProjects: "{{count}} more",
      },
      summary: {
        current: "Current manuscript",
        currentSavedAt: "Current file saved at:",
        recoverable: "Recoverable saved version",
        backupSavedAt: "Recoverable version saved at:",
        preview: "Preview of what will be restored",
        projectChapter: "{{projectTitle}} · {{chapterTitle}}",
        unknownBackup: "Recoverable saved version",
      },
      actionTitle: "When you press recovery, Luie handles the difficult part",
      actionDescription:
        "You do not need to manage database files manually. Luie performs the following steps automatically and rolls back if needed.",
      actions: {
        ignore: "Ignore",
        restore: "Restore from backup",
      },
      resultTitle: "Last Run Result",
      resultBackupOnly: "Safety backup created",
      resultApplied: "Recovery attempt finished",
      technicalTitle: "Technical details",
      technicalDescription:
        "Open this only if you want to inspect file paths, file sizes, or backup locations.",
      fields: {
        path: "Path",
        size: "Size",
        updatedAt: "Updated",
        notFound: "Not found",
        backupDir: "Created backup",
        backupRootDir: "Backup root location",
        latestBackupDir: "Latest created backup",
        checkpoint: "Checkpoint output",
        integrity: "Integrity check",
      },
      messages: {
        backupCreated:
          "A safety backup was created. You can now choose to run the actual recovery.",
        recoveryCompleted:
          "Recovery finished. Luie also completed its integrity check.",
        walMissing:
          "There is no recoverable recent saved change right now. Luie could not find a usable .wal file.",
        walBusy:
          "Another process is still using the recovery files. Fully quit Luie and try again.",
        integrityFailed: "Integrity check reported a problem: {{detail}}",
        statusLoadFailed: "Failed to load recovery status.",
      },
    };
