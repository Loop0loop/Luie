export const jaBaseEditor = {
  editor: {
    layoutTitle: "Luie Editor",
    selectTabPrompt: "← タブを選択してください",
    placeholder: {
      title: "無題",
      body: "書き始めてください... ('/' でコマンドを表示)",
    },
    status: {
      unsaved: "未保存",
      saving: "保存中...",
      saved: "保存済み",
      error: "未保存",
      charLabel: "文字",
      wordLabel: "単語",
      separator: " · ",
    },
    actions: {
      quickExport: "クイック書き出し",
      quickExportTitle: "クイック書き出し",
    },
    errors: {
      exportNoChapter: "書き出す前に章を選択してください。",
      exportOpenFailed: "書き出しウィンドウを開けません。",
    },
  },
  inspector: {
    noSelection: "選択なし",
    tab: {
      synopsis: "あらすじ",
      metadata: "メタデータ",
      notes: "メモ",
      snapshots: "スナップショット",
    },
    synopsis: {
      placeholder: "詳細を入力してください...",
    },
    section: {
      image: "画像",
    },
    image: {
      placeholder: "詳細を入力してください...",
    },
    meta: {
      created: "作成日時",
      modified: "更新日時",
      words: "文字数",
      label: "ラベル",
      status: "ステータス",
    },
    label: {
      none: "なし",
      concept: "コンセプト",
      draft: "ドラフト",
    },
    status: {
      todo: "未着手",
      inprogress: "進行中",
      done: "完了",
    },
    notes: {
      document: "ドキュメントメモ",
      comingSoon: "近日公開",
    },
  },
  scrivener: {
    target: "目標: {{count}} 単語",
    inspector: {
      open: "インスペクターを開く",
      close: "インスペクターを閉じる",
      title: "インスペクター (INSPECTOR)",
      loading: "読み込み中...",
    },
  },
} as const;
