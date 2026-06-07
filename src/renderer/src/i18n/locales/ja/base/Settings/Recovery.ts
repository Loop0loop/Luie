export const jaBaseSettingsRecovery = {
      title: "ファイル復元",
      refresh: "もう一度確認",
      steps: {
        safeTitle: "最初に安全なバックアップを作成します",
        safeDescription:
          "現在の状態を先に別保存するので、問題が起きても元に戻せます。",
        restoreTitle: "直近の保存内容を戻します",
        restoreDescription:
          "メインファイルにまだ反映されていなかった直近の保存内容を Luie が戻します。",
        rollbackTitle: "問題があれば自動で元に戻します",
        rollbackDescription:
          "整合性チェックに失敗した場合は、Luie が自動でバックアップを復元します。",
      },
      dryRun: "先に安全バックアップだけ作る",
      run: "直近の保存内容を復元する",
      running: "復元中...",
      failed: "復元の実行に失敗しました。",
      error: "復元中にエラーが発生しました。",
      lastChecked: "最終確認",
      unavailableHint:
        "今は復元できる直近の保存内容が見つかっていません。通常は .wal ファイルがないときにこの表示になります。",
      file: {
        database: "データベース",
        wal: "WAL ログ",
        shm: "共有メモリ",
        present: "あり",
        missing: "なし",
      },
      hero: {
        checkingBadge: "確認中",
        checkingTitle: "復元できる直近の保存内容を確認しています",
        checkingDescription:
          "Luie が復元可能な保存痕跡が残っているかを自動で調べています。",
        readyBadge: "復元可能",
        readyTitle: "直近の保存内容を戻せます",
        readyDescription:
          "メインファイルへまだ反映されていない直近の保存内容が見つかりました。下の復元ボタンを押せば、Luie が安全に復元を試みます。",
        emptyBadge: "今は復元するものがありません",
        emptyTitle: "今は復元できる直近の保存内容が見つかっていません",
        emptyDescription:
          "復元可能な .wal の痕跡が見つからないため、今は戻せる内容がありません。",
        blockedBadge: "確認が必要",
        dbMissingTitle: "復元対象のファイルが見つかりません",
        dbMissingDescription:
          "復元を試す前に、アプリのデータベースファイルが存在している必要があります。",
      },
      dialog: {
        checkingTitle: "復元できる直近の保存内容を確認しています",
        checkingDescription:
          "Luie が異常終了の直前に残った保存痕跡を探しています。",
        readyTitle: "未保存の原稿を戻せます",
        readyDescription:
          "Luie が異常終了の直前の保存痕跡を見つけました。今すぐ復元すれば、その直近の保存内容を戻せます。",
        emptyTitle: "今は復元できる内容がありません",
        emptyDescription:
          "Luie は復元できる直近の保存痕跡を見つけられませんでした。必要ならもう一度確認できます。",
        blockedTitle: "復元に必要なファイルが見つかりません",
        blockedDescription:
          "復元には対象データファイルが見えている必要があります。この状態では復元を実行しません。",
      },
      scope: {
        currentProject: "現在開いている原稿",
        noOpenProject: "開いている原稿はありません",
        library: "何が対象か",
        projectCount: "ローカル原稿 {{count}} 件",
        libraryDescription:
          "この復元は現在のプロジェクトだけでなく、この端末上の Luie ローカル保管庫全体に影響します。",
        preview: "その保管庫で確認できている原稿",
        noProjects: "ローカル原稿一覧はまだ読み込まれていません。",
        moreProjects: "ほか {{count}} 件",
      },
      summary: {
        current: "現在の原稿",
        currentSavedAt: "現在のファイル保存時刻:",
        recoverable: "復元できる保存内容",
        backupSavedAt: "復元できる保存時刻:",
        preview: "復元される内容のプレビュー",
        projectChapter: "{{projectTitle}} · {{chapterTitle}}",
        unknownBackup: "復元できる保存内容",
      },
      actionTitle: "復元ボタンを押すと、難しい処理は Luie が行います",
      actionDescription:
        "データベースファイルを手作業で扱う必要はありません。Luie が自動で処理し、必要なら元に戻します。",
      actions: {
        ignore: "無視して閉じる",
        restore: "バックアップから復元",
      },
      resultTitle: "直前の実行結果",
      resultBackupOnly: "安全バックアップ完了",
      resultApplied: "復元処理の完了",
      technicalTitle: "技術情報",
      technicalDescription:
        "パス、ファイルサイズ、バックアップ保存先などの詳細を見たいときだけ開いてください。",
      fields: {
        path: "パス",
        size: "サイズ",
        updatedAt: "更新日時",
        notFound: "ファイルなし",
        backupDir: "作成したバックアップ",
        backupRootDir: "バックアップ保存先",
        latestBackupDir: "最近作成したバックアップ",
        checkpoint: "チェックポイント結果",
        integrity: "整合性チェック",
      },
      messages: {
        backupCreated:
          "安全バックアップを作成しました。必要ならこのまま実際の復元を実行できます。",
        recoveryCompleted:
          "復元が完了し、Luie が整合性チェックまで終えました。",
        walMissing:
          "今は復元できる直近の保存内容がありません。利用可能な .wal ファイルが見つかりませんでした。",
        walBusy:
          "別のプロセスがまだ復元ファイルを使用しています。Luie を完全に終了してからもう一度試してください。",
        integrityFailed: "整合性チェックで問題が見つかりました: {{detail}}",
        statusLoadFailed: "復元状態の取得に失敗しました。",
      },
    };
