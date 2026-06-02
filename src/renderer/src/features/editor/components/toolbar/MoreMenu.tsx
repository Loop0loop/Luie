import { useRef, useState } from "react";
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
  editor,
  onOpenExport,
}: {
  canOpenExport: boolean;
  editor: Editor;
  onOpenExport?: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

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
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-border bg-panel p-1 shadow-xl">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-hover disabled:opacity-40"
            disabled={!canOpenExport || !onOpenExport}
            onClick={() => {
              onOpenExport?.();
              setOpen(false);
            }}
          >
            <FileOutput className="h-3.5 w-3.5 text-muted" />
            <span>{t("toolbar.export", "내보내기")}</span>
          </button>
          <div className="my-1 h-px bg-border/60" />
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
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-hover"
              onClick={() => {
                editor.chain().focus().setTextAlign(value).run();
                setOpen(false);
              }}
            >
              <Icon className="h-3.5 w-3.5 text-muted" />
              <span>{label}</span>
            </button>
          ))}
          <div className="my-1 h-px bg-border/60" />
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-hover"
            onClick={selectAll}
          >
            <Pilcrow className="h-3.5 w-3.5 text-muted" />
            <span>{t("toolbar.selectAll", "전체 선택")}</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-hover"
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
