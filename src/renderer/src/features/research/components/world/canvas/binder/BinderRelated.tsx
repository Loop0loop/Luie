import { useTranslation } from "react-i18next";

/**
 * 선택된 노드와 연결된 원고/메모/노드 목록.
 *
 * 셸 단계에서는 빈 상태만 렌더한다. 실제 항목이 들어오기 전까지는
 * 이 섹션을 부모(BinderBar)가 노드 선택 여부에 따라 렌더링하므로,
 * 여기서는 "선택은 됐는데 연결 항목이 없는" 미세한 빈 상태만 표현.
 */
export function BinderRelated() {
  const { t } = useTranslation();
  return (
    <p className="px-1 py-1 text-[12px] text-muted">
      {t("canvas.binder.related.empty")}
    </p>
  );
}
