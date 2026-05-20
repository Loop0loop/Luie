/**
 * BottomCreateToolbar — 정적 캔버스 하단 중앙 노드 생성 툴바.
 *
 * 3개 슬롯: 빈 노드 / 텍스트 노드 / 미디어 노드.
 * 클릭 핸들러는 추후 연결 예정 (UI shell only).
 */

import { File, FileText, Image } from "lucide-react";
import { useTranslation } from "react-i18next";

const CREATE_BTN_CLASS =
  "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95";

const CREATE_ITEMS = [
  { key: "blank", Icon: File,     i18nKey: "canvas.create.blank" },
  { key: "text",  Icon: FileText, i18nKey: "canvas.create.text"  },
  { key: "media", Icon: Image,    i18nKey: "canvas.create.media" },
] as const;

export function BottomCreateToolbar() {
  const { t } = useTranslation();

  return (
    <div
      className="pointer-events-auto absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
      data-testid="canvas-create-toolbar"
    >
      <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-background/85 p-1 shadow-md backdrop-blur-md">
        {CREATE_ITEMS.map(({ key, Icon, i18nKey }) => (
          <button
            key={key}
            type="button"
            title={t(i18nKey)}
            onClick={() => undefined}
            className={CREATE_BTN_CLASS}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
    