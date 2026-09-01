import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useEditorStatsStore } from "@renderer/domains/editor";

/**
 * 글자/단어 수 상태바.
 *
 * NOTE: 레이아웃 루트가 wordCount/charCount를 구독하면 타이핑 중 stats 워커가 120ms마다
 * 쓰는 값에 ScrivenerLayout 전체(패널 그룹·에디터 포함)가 리렌더됐다. 구독을 이 리프
 * 컴포넌트로 격리해 타이핑 리렌더를 상태바 하나로 한정한다.
 */
export const ScrivenerStatusBar = memo(function ScrivenerStatusBar() {
  const { t } = useTranslation();
  const wordCount = useEditorStatsStore((state) => state.wordCount);
  const charCount = useEditorStatsStore((state) => state.charCount);

  return (
    <div className="h-6 bg-surface border-t border-border flex items-center px-3 text-xs text-muted shrink-0">
      <span>
        {t("editor.status.charLabel")} {charCount}
        {t("editor.status.separator")}
        {t("editor.status.wordLabel")} {wordCount}
      </span>
    </div>
  );
});
