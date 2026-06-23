export const jaWorkspaceWriting = {
  entityVisual: {
    toggle: {
      wiki: "ウィキ",
      visual: "ビジュアル",
    },
    graph: {
      title: "関係図",
      ragPending: "RAG 連携予定",
    },
    identity: {
      title: "アイデンティティ",
      summarySuffix: "一行要約",
      isVerb: "は ",
      endingParticle: " である。",
    },
    related: {
      title: "関連項目",
      empty: "なし",
    },
    kind: {
      character: "人物",
      event: "事件",
      faction: "勢力",
    },
  },
  toolbar: {
    ribbon: {
      home: "ホーム",
      insert: "挿入",
      draw: "描画",
      view: "表示",
      paste: "貼り付け",
      style: {
        normalText: "標準テキスト",
        title: "タイトル",
        heading1: "見出し 1",
        heading2: "見出し 2",
      },
    },
    font: {
      defaultLabel: "Nanum Gothic",
      options: {
        arial: "Arial",
        inter: "Inter",
        roboto: "Roboto",
      },
    },
    tooltip: {
      undo: "元に戻す",
      redo: "やり直し",
      bold: "太字",
      italic: "斜体",
      underline: "下線",
      strikethrough: "取り消し線",
      textColor: "文字色",
      highlight: "ハイライト",
      alignLeft: "左揃え",
      alignCenter: "中央揃え",
      alignRight: "右揃え",
      bulletList: "箇条書きリスト",
      orderedList: "番号付きリスト",
      addComment: "コメントを追加",
      toggleMobileView: "モバイル表示を切替",
      openWorldGraph: "ワールドグラフを開く",
      fontSizeIncrease: "文字サイズを大きく",
      fontSizeDecrease: "文字サイズを小さく",
      view: {
        mobile: "モバイル表示",
        desktop: "PC表示",
      },
    },
    view: {
      mobile: "モバイル",
      desktop: "PC",
      graph: "グラフ",
    },
    layout: {
      default: "デフォルトレイアウト",
      scrivener: "スクリブナー（3分割）",
      docs: "Google Docsスタイル",
      focus: "フォーカスモード",
    },
  },
  textEditor: {
    placeholder: {
      body: "書き始めてください...",
    },
    status: {
      saving: "保存中...",
      saved: "保存済み",
    },
    actions: {
      save: "保存",
    },
    suffix: {
      char: "字",
      word: "語",
    },
    ruler: {
      firstLineIndent: "1行目のインデント",
      leftMargin: "左余白",
      rightMargin: "右余白",
    },
  },
  mainLayout: {
    tooltip: {
      sidebarCollapse: "サイドバーを折りたたむ",
      sidebarExpand: "サイドバーを展開",
      contextCollapse: "パネルを折りたたむ",
      contextExpand: "パネルを展開",
    },
  },
  analysis: {
    title: "編集者のデスク",
    selectChapter: "レビューする原稿",
    startButton: "フィードバックを取得",
    analyzing: "原稿を読んでいます...",
    emptyState:
      "こんにちは、作家さん。\nレビューしたい章を机に置いてください。\nゆっくり読んで感想をお伝えします。",
    disclaimer:
      "原稿・キャラクター・用語などを使って分析します。\n分析結果は保存されず、セッション終了時に破棄されます。",
    disclaimerLink: "詳しく見る",
    disclaimerDetailTitle: "データ処理方針",
    disclaimerDetailBody:
      "1. データ使用目的\n- 提供いただいた原稿データはAI分析のためだけに使用します。\n- その他の目的には使用しません。\n\n2. 保存と破棄\n- 分析のために送信されたデータは永久保存されません。\n- 揮発性メモリで処理され、セッション終了時に破棄されます。\n\n3. 第三者提供の禁止\n- 同意なしに第三者へ提供したり、学習目的で使用しません。\n\n安心して創作に集中してください。",
    result: {
      reaction: "読者メモ",
      contradiction: "レビュー・メモ",
      empty: "フィードバックはありません。",
    },
    actions: {
      reset: "リセット",
      reanalyze: "再分析",
      moveToContext: "文脈に移動",
    },
    toast: {
      start: "分析を開始します...",
      error: "分析中にエラーが発生しました。",
      apiKeyMissing:
        "Gemini APIキーが設定されていません。環境変数を確認してください。",
      quotaExceeded:
        "Gemini APIの利用上限を超えました。しばらくしてから再試行してください。",
      networkError:
        "ネットワークエラーが発生しました。接続を確認してください。",
      unknown: "不明なエラーが発生しました。",
      navigateChapter: '"{title}" に移動します。',
      navigateFallback: "参照された文脈へ移動します。(context: {contextId})",
    },
  },
  slashMenu: {
    header: "基本ブロック",
    description: {
      h1: "章または大きなセクション",
      h2: "中間セクション",
      h3: "小さなセクション",
      bullet: "シンプルな箇条書き",
      number: "番号付きリスト",
      check: "チェックボックスで進行管理",
      toggle: "折りたたみ可能なセクション",
      quote: "引用を強調",
      callout: "注釈/メモボックス",
      divider: "シーン区切り",
    },
    label: {
      h1: "見出し 1",
      h2: "見出し 2",
      h3: "見出し 3",
      bullet: "箇条書きリスト",
      number: "番号付きリスト",
      check: "タスクリスト",
      toggle: "トグル",
      quote: "引用",
      callout: "コールアウト",
      divider: "区切り線",
    },
    toggleTitle: "トグルタイトル",
    calloutContent: "メモ内容",
  },
} as const;
