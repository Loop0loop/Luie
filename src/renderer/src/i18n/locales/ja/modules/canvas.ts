export const jaCanvas = {
  sidebar: {
    scope: {
      title: "範囲",
      currentLabel: "現在",
      preset: {
        all: "全体",
        currentEpisode: "現在の話",
        episodeRange: "範囲",
      },
      describe: {
        currentEpisode: "{{episode}}話",
        episodeRange: "{{from}}〜{{to}}話",
        all: "作品全体",
        none: "範囲",
      },
    },
    outline: {
      title: "アウトライン",
      empty: "ノードがありません。",
      groups: {
        episodes: "話",
        characters: "人物",
        events: "事件",
        places: "場所",
        notes: "メモ",
      },
    },
    layers: {
      title: "レイヤー",
      canonical: { label: "Canonical", hint: "確定構造" },
      derived: { label: "Derived 候補", hint: "自動抽出候補" },
      timeline: { label: "タイムライン オーバーレイ" },
      relationStrength: { label: "関係の強さ" },
      conflict: { label: "衝突マーカー" },
      foreshadowing: { label: "伏線" },
    },
    filters: {
      title: "フィルター",
      episode: "話",
      character: "人物",
      event: "事件",
      place: "場所",
      note: "メモ",
      relation: "関係",
    },
  },
  toolbar: {
    addNode: "ノード",
    addNote: "メモ",
    connect: "接続",
    group: "グループ",
    autoLayout: "自動整列",
    fitView: "画面に合わせる",
    searchPlaceholder: "検索",
  },
  binder: {
    inspector: {
      title: "インスペクター",
      empty: "選択された項目がありません。",
      field: {
        type: "種別",
        id: "ID",
        firstAppearance: "初登場",
        subType: "分類",
        description: "説明",
      },
      type: {
        node: "ノード",
        edge: "関係",
      },
    },
    related: {
      title: "関連",
      empty: "関連項目がありません。",
    },
    suggestions: {
      title: "候補",
      empty: "処理する候補がありません。",
    },
    agent: {
      title: "エージェント",
      summarizeScope: "現在の範囲を要約",
      processCandidates: "未確定候補を整理",
      checkTimeline: "タイムライン検査",
      edgeConflict: "関係の衝突を検査",
      summarizeNode: "このノードを要約",
      findRelated: "関連原稿を探す",
    },
  },
  empty: {
    error: "キャンバスを読み込めませんでした。",
    retry: "再試行",
  },
  node: {
    kind: {
      episode: "話",
      character: "人物",
      event: "事件",
      place: "場所",
      note: "メモ",
    },
    derived: "候補",
  },
} as const;
