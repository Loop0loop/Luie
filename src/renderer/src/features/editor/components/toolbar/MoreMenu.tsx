import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Eraser,
  FileOutput,
  MoreHorizontal,
  Pilcrow,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";

import { ToolbarButton } from "./primitives";
import { useClickOutside } from "./useClickOutside";

export function MoreMenu({
  canOpenExport,
  compactContent,
  editor,
  onOpenExport,
  onOpenChange,
}: {
  canOpenExport: boolean;
  compactContent?: ReactNode;
  editor: Editor;
  onOpenExport?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  // NOTE: 이 메뉴는 툴바 레이어 안에 렌더되므로 레이아웃이 툴바를 숨기면 함께 사라진다.
  // 열림 상태를 레이아웃에 알려 메뉴가 열려 있는 동안 auto-hide를 잠근다. unmount 시
  // 잠금이 남지 않도록 cleanup에서 반드시 해제한다.
  useEffect(() => {
    onOpenChange?.(open);
    return () => {
      onOpenChange?.(false);
    };
  }, [open, onOpenChange]);

  const clearFormatting = () => {
    editor
      .chain()
      .focus()
      .unsetAllMarks()
      .clearNodes()
      .setTextAlign("left")
      .run();
    setOpen(false);
  };

  const selectAll = () => {
    editor.chain().focus().selectAll().run();
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <ToolbarButton
        active={open}
        label={t("toolbar.more", "더보기")}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </ToolbarButton>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-panel border border-border bg-panel p-1 shadow-panel">
          {compactContent && (
            <>
              <div className="flex flex-wrap items-center gap-1 p-1">
                {compactContent}
              </div>
              <div className="my-1 h-px bg-border" />
            </>
          )}
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-hover disabled:opacity-40"
            disabled={!canOpenExport || !onOpenExport}
            onClick={() => {
              onOpenExport?.();
              setOpen(false);
            }}
          >
            <FileOutput className="h-3.5 w-3.5 text-muted" />
            <span>{t("toolbar.export", "내보내기")}</span>
          </button>
          <div className="my-1 h-px bg-border" />
          {(
            [
              {
                icon: AlignLeft,
                label: t("toolbar.tooltip.alignLeft", "왼쪽 정렬"),
                value: "left",
              },
              {
                icon: AlignCenter,
                label: t("toolbar.tooltip.alignCenter", "가운데 정렬"),
                value: "center",
              },
              {
                icon: AlignRight,
                label: t("toolbar.tooltip.alignRight", "오른쪽 정렬"),
                value: "right",
              },
              {
                icon: AlignJustify,
                label: t("toolbar.tooltip.alignJustify", "양쪽 정렬"),
                value: "justify",
              },
            ] as const
          ).map(({ icon: Icon, label, value }) => (
            <button
              key={value}
              type="button"
              className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-hover"
              onClick={() => {
                editor.chain().focus().setTextAlign(value).run();
                setOpen(false);
              }}
            >
              <Icon className="h-3.5 w-3.5 text-muted" />
              <span>{label}</span>
            </button>
          ))}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-hover"
            onClick={selectAll}
          >
            <Pilcrow className="h-3.5 w-3.5 text-muted" />
            <span>{t("toolbar.selectAll", "전체 선택")}</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-hover"
            onClick={clearFormatting}
          >
            <Eraser className="h-3.5 w-3.5 text-muted" />
            <span>{t("toolbar.clearFormatting", "서식 초기화")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
