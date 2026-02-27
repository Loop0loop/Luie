export const jaWorkspace = {
  "toolbar": {
    "ribbon": {
      "home": "ホーム",
      "insert": "挿入",
      "draw": "描画",
      "view": "表示",
      "paste": "貼り付け",
      "style": {
        "normalText": "標準テキスト",
        "title": "タイトル",
        "heading1": "見出し 1",
        "heading2": "見出し 2"
      }
    },
    "font": {
      "defaultLabel": "Nanum Gothic",
      "options": {
        "arial": "Arial",
        "inter": "Inter",
        "roboto": "Roboto"
      }
    },
    "tooltip": {
      "undo": "元に戻す",
      "redo": "やり直し",
      "bold": "太字",
      "italic": "斜体",
      "underline": "下線",
      "strikethrough": "取り消し線",
      "textColor": "文字色",
      "highlight": "ハイライト",
      "alignLeft": "左揃え",
      "alignCenter": "中央揃え",
      "alignRight": "右揃え",
      "bulletList": "箇条書きリスト",
      "orderedList": "番号付きリスト",
      "addComment": "コメントを追加",
      "toggleMobileView": "モバイル表示を切替",
      "openWorldGraph": "ワールドグラフを開く",
      "view": {
        "mobile": "モバイル表示",
        "desktop": "PC表示"
      }
    },
    "view": {
      "mobile": "モバイル",
      "desktop": "PC",
      "graph": "グラフ"
    }
  },
  "textEditor": {
    "placeholder": {
      "body": "書き始めてください..."
    },
    "status": {
      "saving": "保存中...",
      "saved": "保存済み"
    },
    "actions": {
      "save": "保存"
    },
    "suffix": {
      "char": "字",
      "word": "語"
    },
    "ruler": {
      "firstLineIndent": "1行目のインデント",
      "leftMargin": "左余白",
      "rightMargin": "右余白"
    }
  },
  "mainLayout": {
    "tooltip": {
      "sidebarCollapse": "サイドバーを折りたたむ",
      "sidebarExpand": "サイドバーを展開",
      "contextCollapse": "パネルを折りたたむ",
      "contextExpand": "パネルを展開"
    }
  },
  "analysis": {
    "title": "編集者のデスク",
    "selectChapter": "レビューする原稿",
    "startButton": "フィードバックを取得",
    "analyzing": "原稿を読んでいます...",
    "emptyState": "こんにちは、作家さん。\nレビューしたい章を机に置いてください。\nゆっくり読んで感想をお伝えします。",
    "disclaimer": "原稿・キャラクター・用語などを使って分析します。\n分析結果は保存されず、セッション終了時に破棄されます。",
    "disclaimerLink": "詳しく見る",
    "disclaimerDetailTitle": "データ処理方針",
    "disclaimerDetailBody": "1. データ使用目的\n- 提供いただいた原稿データはAI分析のためだけに使用します。\n- その他の目的には使用しません。\n\n2. 保存と破棄\n- 分析のために送信されたデータは永久保存されません。\n- 揮発性メモリで処理され、セッション終了時に破棄されます。\n\n3. 第三者提供の禁止\n- 同意なしに第三者へ提供したり、学習目的で使用しません。\n\n安心して創作に集中してください。",
    "result": {
      "reaction": "読者メモ",
      "contradiction": "レビュー・メモ",
      "empty": "フィードバックはありません。"
    },
    "actions": {
      "reset": "リセット",
      "reanalyze": "再分析",
      "moveToContext": "文脈に移動"
    },
    "toast": {
      "start": "分析を開始します...",
      "error": "分析中にエラーが発生しました。",
      "apiKeyMissing": "Gemini APIキーが設定されていません。環境変数を確認してください。",
      "quotaExceeded": "Gemini APIの利用上限を超えました。しばらくしてから再試行してください。",
      "networkError": "ネットワークエラーが発生しました。接続を確認してください。",
      "unknown": "不明なエラーが発生しました。",
      "navigateChapter": "\"{title}\" に移動します。",
      "navigateFallback": "参照された文脈へ移動します。(context: {contextId})"
    }
  },
  "slashMenu": {
    "header": "基本ブロック",
    "description": {
      "h1": "章または大きなセクション",
      "h2": "中間セクション",
      "h3": "小さなセクション",
      "bullet": "シンプルな箇条書き",
      "number": "番号付きリスト",
      "check": "チェックボックスで進行管理",
      "toggle": "折りたたみ可能なセクション",
      "quote": "引用を強調",
      "callout": "注釈/メモボックス",
      "divider": "シーン区切り"
    },
    "label": {
      "h1": "見出し 1",
      "h2": "見出し 2",
      "h3": "見出し 3",
      "bullet": "箇条書きリスト",
      "number": "番号付きリスト",
      "check": "タスクリスト",
      "toggle": "トグル",
      "quote": "引用",
      "callout": "コールアウト",
      "divider": "区切り線"
    },
    "toggleTitle": "トグルタイトル",
    "calloutContent": "メモ内容"
  },
  "event": {
    "viewAllTitle": "View all",
    "sectionTitle": "Events",
    "addTitle": "Add event",
    "galleryTitle": "Event Overview",
    "uncategorized": "Uncategorized",
    "noRole": "No Type",
    "classificationLabel": "Category:",
    "tocLabel": "Contents",
    "addSection": "+ Add section",
    "newSection": "New section",
    "deleteSectionConfirm": "Delete this section? (Content will be kept)",
    "newFieldLabel": "New field",
    "deleteFieldConfirm": "Delete this field?",
    "wiki": {
      "sectionDeleteTitle": "Delete section",
      "fieldDeleteTitle": "Delete field"
    },
    "template": {
      "basic": "Basic Event"
    },
    "section": {
      "overview": "1. Overview",
      "timeline": "2. Timeline",
      "locations": "3. Locations",
      "participants": "4. Participants",
      "notes": "5. Notes"
    },
    "defaults": {
      "name": "New Event"
    }
  },
  "faction": {
    "viewAllTitle": "View all",
    "sectionTitle": "Factions",
    "addTitle": "Add faction",
    "galleryTitle": "Faction Overview",
    "uncategorized": "Uncategorized",
    "noRole": "No Type",
    "classificationLabel": "Category:",
    "tocLabel": "Contents",
    "addSection": "+ Add section",
    "newSection": "New section",
    "deleteSectionConfirm": "Delete this section? (Content will be kept)",
    "newFieldLabel": "New field",
    "deleteFieldConfirm": "Delete this field?",
    "wiki": {
      "sectionDeleteTitle": "Delete section",
      "fieldDeleteTitle": "Delete field"
    },
    "template": {
      "basic": "Basic Faction"
    },
    "section": {
      "overview": "1. Overview",
      "history": "2. History",
      "organization": "3. Organization",
      "relationships": "4. Relationships",
      "notes": "5. Notes"
    },
    "defaults": {
      "name": "New Faction"
    }
  },
  "character": {
    "viewAllTitle": "全体表示 (ギャラリー)",
    "sectionTitle": "登場人物",
    "addTitle": "キャラクター追加",
    "templateTitle": "テンプレート選択",
    "galleryTitle": "登場人物",
    "uncategorized": "未分類",
    "noRole": "役割なし",
    "classificationLabel": "分類:",
    "tocLabel": "目次",
    "addSection": "+ セクション追加",
    "newSection": "新しいセクション",
    "deleteSectionConfirm": "このセクションを削除しますか？(内容は保持されます)",
    "newFieldLabel": "新しい項目",
    "deleteFieldConfirm": "この項目を削除しますか？",
    "wiki": {
      "sectionDeleteTitle": "セクションを削除",
      "sectionPlaceholder": "内容を入力してください...",
      "fieldDeleteTitle": "項目を削除",
      "selectPlaceholder": "- 選択 -",
      "valuePlaceholder": "-",
      "addField": "項目を追加"
    },
    "defaultSections": [
      "1. 概要",
      "2. 外見",
      "3. 性格",
      "4. 背景/過去",
      "5. 人間関係",
      "6. 作者メモ"
    ],
    "defaults": {
      "name": "クリックして名前を入力",
      "fallbackName": "Character",
      "descriptionLabel": "No description",
      "addCharacter": "Add Character",
      "addTerm": "Add Term"
    },
    "templates": {
      "basic": "基本",
      "fantasy": "ファンタジー",
      "romance": "ロマンス",
      "murim": "武侠",
      "modern": "現代"
    },
    "fields": {
      "age": "年齢",
      "gender": "性別",
      "job": "職業",
      "affiliation": "所属",
      "mbti": "MBTI",
      "race": "種族",
      "class": "クラス",
      "rank": "階級/ランク",
      "element": "属性",
      "affiliationGuild": "所属ギルド/国家",
      "ability": "特殊能力",
      "jobTitle": "職業/役職",
      "status": "社会的地位",
      "style": "外見スタイル",
      "ideal": "理想像",
      "rival": "ライバル",
      "family": "家族関係",
      "sect": "所属門派",
      "realm": "境地",
      "title": "異名",
      "martialArts": "主要武功",
      "weapon": "武器",
      "education": "学歴",
      "wealth": "経済力",
      "hobby": "趣味",
      "vehicle": "所有車両"
    },
    "placeholders": {
      "age": {
        "basic": "例: 24歳",
        "fantasy": "例: 150歳 (エルフ)"
      },
      "job": {
        "basic": "例: 学生",
        "romance": "例: 部長、皇太子"
      },
      "affiliation": "-",
      "mbti": "ENTP",
      "race": "例: 人間、エルフ、ドワーフ",
      "class": "例: 魔法使い、騎士",
      "rank": "例: Aランク、7サークル",
      "element": "例: 火、聖",
      "ability": "スキルや能力",
      "status": "例: 財閥3世、庶民",
      "style": "例: 清楚、クール",
      "sect": "例: 華山派、魔教",
      "realm": "例: 絶頂",
      "title": "例: 剣聖",
      "wealth": "例: 上・中・下"
    },
    "options": {
      "gender": {
        "male": "男性",
        "female": "女性",
        "other": "その他",
        "unknown": "不明"
      }
    }
  },
  "world": {
    "tab": {
      "terms": "用語",
      "synopsis": "あらすじ",
      "mindmap": "マインドマップ",
      "drawing": "地図ドローイング",
      "plot": "プロットボード",
      "graph": "ワールドグラフ"
    },
    "graph": {
      "loading": "ワールドグラフを読み込み中...",
      "errorPrefix": "エラー",
      "suggestionPrefix": "提案",
      "suggestionApply": "適用",
      "mode": {
        "standard": "標準",
        "protagonist": "主人公",
        "eventChain": "イベントチェーン",
        "freeform": "フリーフォーム"
      },
      "entityTypes": {
        "Character": "人物",
        "Faction": "勢力",
        "Event": "事件",
        "Place": "場所",
        "Concept": "概念",
        "Rule": "規則",
        "Item": "事物",
        "Term": "その他の用語",
        "WorldEntity": "未分類エンティティ"
      },
      "relationTypes": {
        "belongs_to": "所属",
        "enemy_of": "敵対",
        "causes": "原因",
        "controls": "統制",
        "located_in": "位置",
        "violates": "違反"
      },
      "inspector": {
        "emptySelection": "ノードや関係をクリックすると\n詳細情報が表示されます。",
        "deleteNodeConfirm": "\"{{name}}\"を削除しますか？",
        "untitled": "名無しの存在",
        "empty": "空",
        "tagsPlaceholder": "カンマで区切る...",
        "descriptionPlaceholder": "ここに詳細設定、背景ストーリー、主な特徴などを記述してください...",
        "relation": "関係 (Relation)",
        "changeRelation": "関係タイプを変更",
        "selectNewRelation": "新しい関係を選択",
        "save": "保存",
        "cancel": "キャンセル",
        "deleteRelation": "この関係を削除",
        "attributes": {
          "time": "時間/時期",
          "region": "位置/地域",
          "tags": "分類タグ",
          "importance": "重要度"
        }
      },
      "sidebar": {
        "entities": "要素",
        "relations": "関係",
        "searchPlaceholder": "検索 (名前、内容...)",
        "entityType": "要素タイプ",
        "active": "アクティブ",
        "relationType": "関係タイプ",
        "resetFilters": "フィルターをリセット",
        "library": "ライブラリ",
        "items": "個",
        "noResults": "検索結果がありません",
        "noResultsHint": "他のフィルターを選択するか\n検索語を変更してください"
      }
    },
    "synopsis": {
      "title": "プロジェクト概要",
      "placeholder": "ログライン、企画意図、あらすじを自由に書いてください。",
      "hint": "* あらすじはいつでも変わります。'Locked' にすると編集を防止します。",
      "genre": "ジャンル",
      "genrePlaceholder": "例: ダークファンタジー",
      "audience": "ターゲット読者",
      "audiencePlaceholder": "例: 20代男性",
      "logline": "ログライン",
      "loglinePlaceholder": "一言で表す物語の核心",
      "status": {
        "draft": "下書き",
        "working": "執筆中",
        "locked": "確定"
      }
    },
    "mindmap": {
      "rootLabel": "中心事件/人物",
      "newTopic": "新しいトピック",
      "subTopic": "サブトピック",
      "uploadImage": "画像アップロード",
      "urlPlaceholder": "https://...",
      "enterUrl": "URLを入力",
      "shortcut": {
        "clickKey": "クリック",
        "select": "選択",
        "enterKey": "Enter",
        "sibling": "同階層トピック",
        "tabKey": "Tab",
        "child": "子トピック",
        "deleteKey": "Del",
        "delete": "削除"
      },
      "controls": {
        "zoomIn": "拡大",
        "zoomOut": "縮小",
        "fitView": "画面に合わせる"
      }
    },
    "term": {
      "addLabel": "用語を追加",
      "defaultName": "新しい用語",
      "defaultCategory": "一般",
      "notFound": "用語が見つかりません",
      "reorderFailed": "用語の並び順の保存に失敗しました",
      "label": "用語",
      "definitionLabel": "定義",
      "categoryLabel": "カテゴリ",
      "noDefinition": "定義なし"
    },
    "drawing": {
      "toolPen": "ペン",
      "toolIcon": "アイコン",
      "toolText": "地名 (テキスト)",
      "clear": "すべてクリア",
      "confirmClear": "本当に地図を初期化しますか？",
      "placePrompt": "地名入力:",
      "mapMakerMode": "ファンタジー地図制作モード"
    },
    "plot": {
      "addAct": "幕を追加",
      "deleteAct": "この幕を削除",
      "addBeat": "ビートを追加",
      "newAct": "幕",
      "newBeat": "新しいビート",
      "act1Title": "第1幕: 導入",
      "act2Title": "第2幕: 展開",
      "act3Title": "第3幕: 解決",
      "card": {
        "act1_1": "主人公の日常",
        "act1_2": "事件の始まり",
        "act2_1": "最初の試練",
        "act3_1": "最終対決"
      }
    }
  }
} as const;
