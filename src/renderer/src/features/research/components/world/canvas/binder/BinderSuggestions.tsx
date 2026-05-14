import { useTranslation } from "react-i18next";

/**
 * Derived 후보(자동 추출된 노드/관계)를 확정/무시하는 영역.
 *
 * 후보 검출은 main 프로세스의 분석 파이프라인이 담당하고,
 * 본 컴포넌트는 후보 카드를 렌더하고 [확정][무시] 액션만 처리한다.
 */
export function BinderSuggestions() {
  const { t } = useTranslation();
  return (
    <p className="py-1 text-[12px] text-muted-foreground">
      {t("canvas.binder.suggestions.empty")}
    </p>
  );
}
