export const jaExport = {
  "exportPreview": {
    "defaultTitle": "無題",
    "alertExport": ".{ext} で書き出し (準備中)",
    "format": {
      "hwpShort": "H",
      "hwp": "HWP",
      "word": "Word"
    },
    "action": {
      "export": "書き出し"
    },
    "hwp": {
      "appTitle": "HWP 2024",
      "menu": {
        "file": "ファイル",
        "edit": "編集",
        "view": "表示",
        "input": "入力",
        "format": "書式",
        "page": "ページ",
        "security": "セキュリティ",
        "review": "レビュー",
        "tools": "ツール"
      },
      "toolbar": {
        "baseStyle": "本文",
        "fontName": "ハムチョロムバタン",
        "fontSize": "10"
      },
      "previewNotice": "HWP スタイルのプレビューです。",
      "sampleText": "プレビュー用のサンプルテキストです。",
      "status": {
        "pageCount": "1/1 ページ",
        "column": "1段",
        "layout": "配置: 文字",
        "insert": "挿入",
        "trackChanges": "変更履歴の追跡",
        "zoom": "100%"
      }
    },
    "word": {
      "title": "Word",
      "searchPlaceholder": "検索",
      "premium": "PREMIUM",
      "tabs": {
        "file": "ファイル",
        "home": "ホーム",
        "insert": "挿入",
        "draw": "描画",
        "layout": "レイアウト",
        "references": "参照",
        "review": "校閲",
        "view": "表示",
        "help": "ヘルプ"
      },
      "undo": "元に戻す",
      "styles": {
        "standard": "標準",
        "noSpacing": "間隔なし",
        "heading1": "見出し 1"
      },
      "previewNotice": "Microsoft Word スタイルの書き出しプレビューです。",
      "sampleText": "これはプレビュー用のサンプルテキストです。",
      "status": {
        "pageInfo": "1ページ(全1)",
        "wordCount": "45語",
        "language": "日本語",
        "accessibility": "アクセシビリティ: 確認が必要",
        "view": {
          "read": "読み取りモード",
          "print": "印刷レイアウト",
          "web": "Web レイアウト"
        },
        "zoom": "100%"
      }
    }
  },
  "exportWindow": {
    "title": "書き出しプレビュー",
    "header": {
      "title": "書き出し設定",
      "subtitle": "文書形式を選択してスタイルを調整します。"
    },
    "sections": {
      "format": "ファイル形式",
      "page": "用紙設定",
      "typography": "フォントと行間",
      "header": "ヘッダー / フッター"
    },
    "format": {
      "hwp": "HWP 文書",
      "word": "MS Word",
      "beta": "BETA",
      "hwp_label": "HWP 文書 (.hwp)",
      "docx_label": "Word 文書 (.docx)",
      "txt_label": "テキスト文書 (.txt)",
      "word_label": "Word 文書 (.docx)"
    },
    "page": {
      "paperSize": "用紙サイズ",
      "paperOptions": {
        "a4": "A4 (210 x 297 mm)",
        "letter": "Letter (216 x 279 mm)",
        "b5": "B5 (176 x 250 mm)"
      },
      "margins": "余白 (mm)",
      "marginTop": "上",
      "marginBottom": "下",
      "marginLeft": "左",
      "marginRight": "右"
    },
    "typography": {
      "font": "フォント",
      "fontOptions": {
        "batang": "Batang",
        "malgun": "Malgun Gothic",
        "nanum": "Nanum Myeongjo"
      },
      "fontHint": "フォントがない場合は、近い明朝/ゴシック体に置き換えられます。",
      "lineHeight": "行間"
    },
    "headerSettings": {
      "showPageNumbers": "ページ番号を表示",
      "startPage": "開始番号"
    },
    "button": {
      "export": "書き出し ({format})",
      "exporting": "書き出し中..."
    },
    "preview": {
      "label": "プレビュー",
      "errorTitle": "エラー",
      "loading": "章を読み込み中..."
    },
    "error": {
      "missingChapterId": "章IDが指定されていません。",
      "loadFailed": "章の読み込みに失敗しました。",
      "unknown": "不明なエラーが発生しました。",
      "noChapter": "章情報を読み込めません。"
    },
    "alert": {
      "success": "書き出しが完了しました。\n保存先: {path}",
      "failed": "書き出しに失敗しました。\n{reason}",
      "exception": "書き出し中にエラーが発生しました。\n{reason}"
    }
  }
} as const;
