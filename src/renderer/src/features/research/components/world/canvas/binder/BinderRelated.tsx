import { useTranslation } from "react-i18next";

/**
 * 선택한 노드와 연결된 원고/노드/메모를 보여준다.
 * 클릭 시 Editor로 점프하거나 캔버스 포커스를 이동시키는 게 핵심 UX.
 *
 * 셸 단계에서는 빈 상태만 표시한다.
 */
export function BinderRelated() {
  const { t } = useTranslation();
  return (
    <p className="py-1 text-[12px] text-muted-foreground">
      {t("canvas.binder.related.empty")}
    </p>
  );
}
