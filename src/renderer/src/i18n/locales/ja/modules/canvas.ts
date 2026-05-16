/**
 * Canvas i18n — Japanese tree. Keys grow per phase.
 */
export const jaCanvas = {
  workspace: {
    title: "キャンバス",
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
  sidebar: {
    activity: "アクティビティ",
    expand: "サイドバーを展開",
    collapse: "サイドバーを折りたたむ",
  },
  binder: {
    title: "バインダー",
    expand: "バインダーを展開",
    collapse: "バインダーを折りたたむ",
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
