export const jaBaseSettingsSync = {
      title: "同期と連携",
      description:
        "Google アカウントを接続し、Supabase とプロジェクトデータを同期します。",
      connected: "接続済み",
      disconnected: "未接続",
      fields: {
        connection: "接続状態",
        email: "接続アカウント",
        lastSyncedAt: "最終同期",
        mode: "状態",
        autoSync: "自動同期",
      },
      status: {
        idle: "待機",
        connecting: "接続中",
        syncing: "同期中",
        error: "エラー",
      },
      actions: {
        connectGoogle: "Google 接続",
        reconnectGoogle: "再ログイン",
        disconnect: "接続解除",
        syncNow: "今すぐ同期",
      },
      conflicts:
        "競合: 合計 {{total}} 件（原稿 {{chapters}} / スクラップ {{memos}}）",
      toast: {
        connectStarted: "ブラウザで Google ログインを完了してください。",
        connected: "Google アカウントの接続が完了しました。",
        connectFailed: "Google 接続に失敗しました。",
        staleCallback:
          "このログインコールバックは既に処理済みです。現在の接続状態を維持します。",
        stateMismatch:
          "OAuth state の検証に失敗しました。再度ログインしてください。",
        callbackExpired:
          "ログイン要求の有効期限が切れました。再度ログインしてください。",
        disconnectFailed: "接続解除に失敗しました。",
        disconnected: "接続を解除しました。",
        syncFailed: "同期に失敗しました。",
        synced: "同期が完了しました。",
        autoSyncFailed: "自動同期設定の更新に失敗しました。",
      },
    };
