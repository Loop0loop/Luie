export const enBaseSettingsSync = {
      title: "Sync & Connections",
      description:
        "Connect your Google account and sync project data with Supabase.",
      connected: "Connected",
      disconnected: "Disconnected",
      fields: {
        connection: "Connection",
        email: "Account",
        lastSyncedAt: "Last synced",
        mode: "Mode",
        autoSync: "Auto sync",
      },
      status: {
        idle: "Idle",
        connecting: "Connecting",
        syncing: "Syncing",
        error: "Error",
      },
      actions: {
        connectGoogle: "Connect Google",
        reconnectGoogle: "Sign in again",
        disconnect: "Disconnect",
        syncNow: "Sync now",
      },
      conflicts:
        "Conflicts: {{total}} total (chapters {{chapters}} / scrap {{memos}})",
      toast: {
        connectStarted: "Complete Google sign-in in your browser.",
        connected: "Google account connected successfully.",
        connectFailed: "Failed to connect Google.",
        staleCallback:
          "This login callback was already handled. Keeping the current connection.",
        stateMismatch: "OAuth state validation failed. Please sign in again.",
        callbackExpired: "Login request expired. Please sign in again.",
        disconnectFailed: "Failed to disconnect.",
        disconnected: "Disconnected successfully.",
        syncFailed: "Sync failed.",
        synced: "Sync completed.",
        autoSyncFailed: "Failed to update auto-sync.",
      },
    };
