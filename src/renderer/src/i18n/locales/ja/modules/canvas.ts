/**
 * Canvas i18n — Japanese tree. Keys grow per phase.
 */
export const jaCanvas = {
  workspace: {
    title: "キャンバス",
  },
  activity: {
    explorer: "エクスプローラー",
    canvas: "キャンバス",
    entities: "エンティティ",
    memory: "メモリー",
    search: "検索",
  },
  panel: {
    views: "ビュー",
    range: "範囲",
    layers: "レイヤー",
  },
  mode: {
    flowMap: {
      label: "フローマップ",
      description: "選択範囲の出来事と流れをノードで表示します。",
    },
    sceneBoard: {
      label: "シーンボード",
      description: "話/区間をシーンカードに分解します。",
    },
    timeline: {
      label: "タイムライン",
      description: "出来事の順序を時間軸で表示します。",
    },
    characterMap: {
      label: "人物関係図",
      description: "人物間の関係と登場密度を表示します。",
    },
    memoryMap: {
      label: "メモリーマップ",
      description: "メモリエンジンが生成したチャンクとエンティティを表示します。",
    },
    comingSoon: "近日公開",
  },
  range: {
    currentChapter: "現在の話",
    threeChapters: "±3話",
    currentPart: "現在の部",
    wholeProject: "プロジェクト全体",
  },
  layer: {
    scene: "シーン",
    character: "キャラクター",
    event: "イベント",
    memo: "メモ",
    aiHint: "AIヒント",
  },
  empty: {
    title: "話が選択されていません",
    description: "話を選択するとキャンバスが表示されます。",
  },
  sidebar: {
    activity: "アクティビティ",
    expand: "サイドバーを展開",
    collapse: "サイドバーを折りたたむ",
  },
  binder: {
    title: "バインダー",
    expand: "バインダーを展開",
    collapse: "バインダーを折りたたむ",
    tab: {
      elements: "要素",
      ai: "AI",
    },
    ai: {
      title: "AIアシスタント",
      description: "AI機能は近日公開予定です。",
    },
  },
  status: {
    empty: "表示する内容がありません。",
    loading: "読み込み中...",
    error: "キャンバスを読み込めませんでした。",
    stale: "ソースが変更されました。更新が必要です。",
  },
  toolbar: {
    fitView: "画面に合わせる",
    zoomIn: "拡大",
    zoomOut: "縮小",
  },
} as const;
