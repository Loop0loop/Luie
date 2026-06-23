export const jaBaseCore = {
  home: "ホーム",
  share: "共有",
  loading: "読み込み中...",
  back: "戻る",
  delete: "削除",
  undo: "元に戻す",
  clear: "クリア",
  exit: "終了",
  menu: {
    file: "ファイル",
    edit: "編集",
    view: "表示",
    insert: "挿入",
    format: "書式",
    tools: "ツール",
    extensions: "拡張機能",
    help: "ヘルプ",
    link: "リンク",
    image: "画像",
  },
  ui: {
    modal: {
      confirm: "確認",
      cancel: "キャンセル",
    },
  },
  bootstrap: {
    fetchFailed: "アプリ起動状態の取得に失敗しました。",
    initializing: "ワークスペースを初期化しています...",
    retry: "再試行",
    quit: "終了",
    deleteManuscriptConfirm: "この原稿を削除しますか？",
  },
  errorBoundary: {
    title: "アプリの起動に失敗しました。",
    description: "アプリを再起動してください。",
    reload: "アプリを再読み込み",
  },
  project: {
    defaults: {
      projectTitle: "無題のプロジェクト",
      newProjectTitle: "新規プロジェクト",
      chapterTitle: "第1章",
      untitled: "無題",
      noteTitle: "新しいメモ",
    },
    toast: {
      recoveredFromDb:
        "ファイルが破損していたため、ローカルキャッシュから復元しました。",
      recoveredMissingPackage:
        "元の .luie ファイルが見つからなかったため、ローカルデータから新しいパッケージを復元しました。",
      dbNewerSynced:
        "ローカルキャッシュが新しいため、プロジェクトファイルを更新しました。",
      pathMissing:
        "ローカル .luie 接続を利用できないため、ローカルデータで開きます。",
      missingAttachment:
        "接続された .luie ファイルが見つからないため、ローカルデータで開きます。",
      invalidAttachment:
        "接続された .luie パスが無効なため、ローカルデータで開きます。",
      legacyUnsupportedAttachment:
        "このアプリは旧 package .luie をもうサポートしていません。",
    },
    templateDescription: "{templateId} テンプレートで作成",
  },
  sidebar: {
    title: "PROJECT BINDER",
    menu: {
      openBelow: "下に開く",
      openRight: "右に開く",
      rename: "名前を変更",
      duplicate: "複製",
      delete: "削除",
    },
    defaultProjectTitle: "プロジェクト",
    binderTitle: "PROJECT BINDER",
    section: {
      manuscript: "原稿",
      research: "リサーチ",
      trash: "ゴミ箱",
      snapshot: "スナップショット",
    },
    item: {
      characters: "登場人物",
      world: "世界観",
      scrap: "資料スクラップ",
      synopsis: "あらすじ",
    },
    action: {
      new: "新しい章を追加",
    },
    addChapter: "新しい章を追加...",
    trashEmpty: "空です",
    snapshotEmpty: "章を選択してください。",
    settingsLabel: "設定",
    prompt: {
      renameTitle: "新しいタイトル",
      renameProject: "プロジェクト名を入力してください。",
      deleteConfirm: "本当に削除しますか？",
    },
    tooltip: {
      renameProject: "プロジェクト名を変更",
      refresh: "更新",
    },
    expand: "展開",
  },
  context: {
    tab: {
      synopsis: "あらすじ",
      characters: "キャラクター",
      terms: "用語",
    },
    synopsisHeader: "プロジェクト概要",
    detail: {
      description: "説明",
      category: "カテゴリ",
    },
    placeholder: {
      search: "検索...",
      synopsis: "ここにあらすじを書いてください...",
    },
  },
  memo: {
    sectionTitle: "MEMOS",
    empty: "メモを選択してください",
    placeholder: {
      search: "検索...",
      tags: "タグを追加（カンマ区切り）...",
      title: "タイトル",
      body: "メモを入力してください...",
    },
    defaultNotes: [
      {
        id: "1",
        title: "参考資料: 中世衣装",
        content:
          "リンク: https://wiki...\n\n中世の貴族衣装は思った以上に華やかだった...",
        tags: ["資料", "衣装"],
      },
      {
        id: "2",
        title: "アイデアの断片",
        content:
          "- 主人公が実は悪役だったら？\n- ループ前の記憶が歪んでいたら？",
        tags: ["アイデア", "プロット"],
      },
    ],
  },
  startupWizard: {
    title: "ワークスペースを初期化しています...",
    subtitle: "必要な構成を確認しています。しばらくお待ちください。",
    status: {
      configuring: "ワークスペースを初期化しています...",
      launching: "ワークスペースを初期化しています...",
      failed: "起動準備に失敗しました。",
    },
    actions: {
      retry: "再試行",
    },
    onboarding: {
      introTitle: "Luie へようこそ",
      introBody:
        "Luie は長編創作のためのローカルファーストな執筆アプリです。AIセマンティック検索・キャンバス・関係グラフで原稿を支援します。",
      introNext: "はじめる",
      setupTitle: "ローカルAIのインストール",
      setupBody:
        "デバイス上で動作するセマンティック検索用の埋め込みモデルをインストールします。後で設定からインストールすることもできます。",
      recommendTitle: "あなたのPCへのおすすめ",
      skip: "スキップ",
      next: "次へ",
      finishing: "設定を完了しています...",
    },
  },
  toolbar: {
    editor: "エディター",
    canvas: "キャンバス",
  },
  canvas: {
    tab: {
      canvas: "キャンバス",
      timeline: "タイムライン",
      notes: "ノート",
      entity: "エンティティ",
      plugins: "プラグイン",
    },
    action: {
      refresh: "更新",
    },
    create: {
      characterDefaultName: "新しいキャラクター",
      factionDefaultName: "新しい勢力",
      eventDefaultName: "新しい出来事",
      placeDefaultName: "新しい場所",
      conceptDefaultName: "新しい概念",
      ruleDefaultName: "新しいルール",
      itemDefaultName: "新しいアイテム",
      termDefaultName: "新しい用語",
      worldentityDefaultName: "新しい世界観要素",
    },
  },
} as const;
