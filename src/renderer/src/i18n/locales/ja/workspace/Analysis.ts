export const jaWorkspaceAnalysis = {
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
  };
