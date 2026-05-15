import { useTranslation } from "react-i18next";

/**
 * Derived 후보(자동 추출된 노드/관계)를 확정/무시하는 영역.
 *
 * 후보 검출은 main 프로세스 분석 파이프라인이 담당하고, 이 컴포넌트는
 * 후보 카드 + [확정][무시] 액션만 표현한다.
 *
 * 현재는 후보 데이터가 없어 BinderBar에서 렌더 자체가 빠져 있다.
 * 데이터가 들어오면 다시 import해서 노출.
 */
export function BinderSuggestions() {
  const { t } = useTranslation();
  return (
    <p className="px-1 py-1 text-[12px] text-muted">
      {t("canvas.binder.suggestions.empty")}
    </p>
  );
}
