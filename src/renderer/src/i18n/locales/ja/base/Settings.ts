export const jaBaseSettings = {
  settings: {
    title: "画面設定",
    sidebar: {
      section: {
        manuscript: "原稿",
        research: "リサーチ",
        snapshot: "スナップショット",
        trash: "ゴミ箱",
      },
      item: {
        characters: "登場人物",
        world: "世界観",
        scrap: "資料スクラップ",
        analysis: "分析",
      },
      addChapter: "新しい章を追加",
      snapshotEmpty: "選択された章がないか、スナップショットがありません。",
      trashEmpty: "ゴミ箱は空です。",
      tooltip: {
        refresh: "更新",
      },
      editor: "フォント (Editor)",
      appearance: "テーマ (Appearance)",
      features: "機能 (Features)",
      shortcuts: "ショートカット (Shortcuts)",
      recovery: "ファイル復元 (File Recovery)",
      sync: "同期 (Sync)",
      model: "モデル (Model)",
      language: "言語 (Language)",
    },
    section: {
      font: "フォント (Font)",
      optionalFont: "バンドルフォント (オプション)",
      customFont: "カスタムフォント",
      spellcheck: "スペルチェック",
      fontSize: "文字サイズ",
      lineHeight: "行間",
      theme: "テーマ (Theme)",
      uiMode: "UIモード (Laboratory)",
      language: "言語",
      menuBar: "メニューバー",
    },
    customFont: {
      description:
        "システムにインストールされたフォントのfont-family名を入力してください。",
      placeholder: '例: "Noto Sans JP", "ヒラギノ角ゴ ProN"',
      apply: "適用",
      active: "使用中",
    },
    uiMode: {
      description:
        "エディタのツールバーとレイアウトを馴染みのあるスタイルに変更します。",
      default: "デフォルト",
      docs: "Google Docs スタイル",
      editor: "エディターモード",
      scrivener: "Scrivener スタイル",
    },
    menuBar: {
      description:
        "macOS では「隠す」を選ぶと没入型フルスクリーンに切り替わります。",
      hide: "メニューバーを隠す",
      show: "メニューバーを表示",
      applyHint:
        "変更は即時反映されます。（隠す: フルスクリーン / 表示: 通常ウィンドウ）",
      applyFailed:
        "メニューバー表示モードの適用に失敗しました。再試行してください。",
    },
    appearance: {
      baseTheme: {
        title: "ベーステーマ",
        description: "画面全体の明るさと基調トーンを選択します。",
      },
      contrast: {
        title: "コントラスト",
        description: "画面の視認性を調整します。",
        soft: "ソフト",
        high: "ハイ",
      },
      tone: {
        title: "トーン",
        description: "テーマの色温度を選択します。",
        cool: "クール",
        neutral: "標準",
        warm: "ウォーム",
      },
    },
    view: {
      pc: "PC",
      mobile: "モバイル",
    },
    font: {
      systemUi: "システムUI",
      serif: "明朝体",
      mono: "モノ",
      helper: {
        primary:
          "既定ではシステムフォントを使用します。Inter は選択可能な内蔵フォントです。",
        optional:
          "インストール済みフォントのみ適用されます。未インストールの場合は既定フォントにフォールバックします。",
      },
    },
    optionalFont: {
      inter: "Inter Variable",
      action: {
        installing: "読込中",
        install: "Inter を使用",
        apply: "適用",
        active: "使用中",
      },
    },
    spellcheck: {
      description:
        "Electron 内蔵のスペルチェック下線と候補表示を切り替えます。",
      on: "オン",
      off: "オフ",
    },
    theme: {
      light: "Light",
      sepia: "Sepia",
      dark: "Dark",
    },
    sampleText: "Ag",
    language: {
      helper: "アプリ全体の言語を変更します。",
      options: {
        ko: "韓国語",
        en: "英語",
        ja: "日本語",
      },
    },
    placeholder: "準備中の機能です。",
  },
} as const;
