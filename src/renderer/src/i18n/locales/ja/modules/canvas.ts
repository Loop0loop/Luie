/**
 * Canvas i18n — Japanese tree. Keys grow per phase.
 */
export const jaCanvas = {
  workspace: {
    title: "キャンバス",
  },
  activity: {
    explorer: "エクスプローラー",
    graph: "グラフ",
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
  graph: {
    scope: "分析範囲",
    episode: "エピソードグラフ",
    character: "人物グラフ",
    event: "事件グラフ",
    world: "世界観グラフ",
    depthLimit: "探索の深さ(Depth)",
    depth: "接続の深さ: {{depth}}段階",
    depthRange: "1〜3段階",
    relationships: "関係の種類フィルター",
    relationshipFilters: "すべての関係を表示中",
    inspector: "グラフ分析器",
    selectedEntity: "選択された要素",
    entityPlaceholder: "情報を確認するノードを選択してください。",
    relations: "主要な関係網",
    openInBinder: "バインダーで開く",
    relationConflict: "敵対/葛藤",
    relationAlly: "味方/同盟",
    focus: "分析の焦点",
    allRelations: "すべての関係",
    pinToCanvas: "Canvasに固定",
    saveToMemory: "Memoryに保存",
    sourceText: "分析根拠の原文",
    noSourceText: "根拠の原文テキストがありません。",
    goToSource: "原稿コンテキストへ移動",
    emptyTitle: "ノードを選択してください",
    emptyDescription: "グラフでノードをクリックすると、この領域に詳細な分析情報が表示されます。",
  },
} as const;
