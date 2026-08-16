// NOTE: common에 누락된 component key를 deep merge로 보완한다.
export const jaMissing = {
  common: {
    close: "閉じる",
    dismiss: "閉じる",
    saving: "保存中...",
  },
  canvas: {
    activity: {
      namePrompt: "名前を入力してください。",
      toggleAll: "すべて開閉",
      untitledFile: "無題",
      untitledFolder: "新しいフォルダ",
    },
    graph: {
      aiSync: "AI同期",
      chapterUnit: "話",
      characterMode: "キャラクター",
      empty: { title: "グラフデータがありません" },
      startChapter: "開始チャプター",
      endChapter: "終了チャプター",
      eventMode: "イベント",
    },
    node: {
      confirmDelete: "このノードをプロジェクトから削除しますか？",
      connectedNodes: "接続ノード",
      delete: "ノードを削除",
      edges: "エッジ",
      nodes: "ノード",
      openInspector: "詳細情報",
    },
    toolbar: {
      comingSoon: "近日公開",
      error: {
        noProject: "開いているプロジェクトがありません",
        syncFailed: "同期に失敗しました",
      },
      success: { synced: "同期しました" },
    },
  },
  character: {
    noCharacters: "キャラクターがいません",
    noSelection: "キャラクターが選択されていません",
    wiki: { descriptionLabel: "説明" },
  },
  event: { noSelection: "イベントが選択されていません" },
  faction: { noSelection: "勢力が選択されていません" },
  memo: {
    addTitle: "メモを追加",
    noSelection: "メモが選択されていません",
    tags: "タグ",
    title: "メモ",
  },
  world: { term: { noTerms: "用語がありません" } },
  entityVisual: { toggle: { document: "ドキュメント" } },
  research: { title: { map: "地図", plot: "プロット" } },
  editor: {
    autosave: {
      failed: "自動保存に失敗しました",
      retryingIn: "{{seconds}}秒後に再試行します",
    },
    errors: {
      exportNoChapter: "エクスポートする章がありません",
      exportOpenFailed: "エクスポートしたファイルを開けませんでした",
    },
    layoutTitle: "レイアウト",
  },
  toolbar: { canvas: "キャンバス", editor: "エディタ" },
  sidebar: {
    section: { settings: "設定" },
    toggle: { close: "サイドバーを閉じる", open: "サイドバーを開く" },
  },
  snapshot: {
    close: "閉じる",
    list: { selectChapter: "章を選択してください" },
    noActiveChapter: "アクティブな章がありません",
  },
  updater: {
    action: {
      download: "アップデートをダウンロード",
      later: "後で",
      restart: "今すぐ更新",
      retry: "再確認",
    },
    message: { available: "現在 {{current}} → 最新 {{latest}}" },
    status: {
      applying: "アップデートを適用中...",
      available: "新しいバージョンがあります",
      checking: "アップデートを確認中...",
      downloading: "アップデートをダウンロード中",
      error: "アップデートに失敗しました",
      ready: "アップデートのインストール準備完了",
    },
  },
  workspace: {
    offline: {
      title: "オフラインで作業中です",
      desc: "変更はローカルに保存され、ネットワーク接続時に自動的に同期されます。",
    },
    recovery: {
      bannerTitle: "未保存の変更を復元しました",
      defaultDesc: "予期しない終了後、Luieが最新の作業を安全に復元しました。",
      corruptDesc: "元のファイルが破損していたため、Luieは最新のバックアップを使用しました。",
      missingDesc:
        "元の.luieファイルが見つからなかったため、Luieはローカルデータから新しいパッケージを再構築しました。",
      dismiss: "閉じる",
    },
  },
  settings: {
    appearance: {
      animations: {
        title: "アニメーションを有効化",
        description: "パネルの開閉に滑らかなアニメーションを適用します。",
        on: "オン",
        off: "オフ",
      },
      entityColors: {
        title: "世界観要素の色",
        description: "エディタとグラフで表示される要素の色を設定します。",
      },
    },
    section: {
      letterSpacing: "文字間隔",
      wordSpacing: "単語間隔",
      paragraphSpacing: "段落間隔",
      systemFonts: "システムフォント",
    },
    letterSpacing: { description: "文字と文字の間隔を調整します" },
    wordSpacing: { description: "単語と単語の間隔を調整します" },
    paragraphSpacing: { description: "改行後の段落間の間隔を調整します" },
    systemFonts: {
      search: "フォントを検索…",
      noResults: "検索結果がありません",
      none: "利用可能なシステムフォントがありません",
    },
    preview: {
      body1:
        "彼は古い書斎の片隅に座り、埃をかぶった原稿の束を広げた。窓の外では雨が降っており、登場人物たちの声が次第にはっきりと聞こえてきた。",
      body2:
        "文章とは結局、人の声を盛る器である。今日も一文、また一文と書き進めていく。",
    },
    sync: {
      actions: {
        disconnectGoogle: "ログアウト",
        resolveConflicts: "競合を解決",
        syncing: "同期中...",
      },
      conflicts: {
        summary:
          "競合 {{total}}件（チャプター {{chapters}} · メモ {{memos}} · メモリ {{memoryCanonical}}）",
        allResolved: "すべての競合が解決されました！",
        chapterCount: "チャプター",
        chapterLabel: "チャプター",
        keepLocal: "ローカルを保持",
        memoCount: "メモ",
        memoLabel: "メモ",
        memoryLabel: "メモリ",
        resolveLater: "後で解決",
        totalCount: "合計",
      },
      fields: { lastRun: "最終実行" },
      health: {
        connected: "接続済み",
        degraded: "低下",
        disconnected: "切断",
      },
    },
  },
  ai: {
    sidePanel: {
      open: "AIサイドパネルを開く",
      close: "AIサイドパネルを閉じる",
      view: "AIビュー",
    },
  },
} as const;
