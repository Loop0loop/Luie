import { type Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Highlighter,
  Undo,
  Redo,
  Settings,
  FileOutput,
  Monitor,
  Smartphone,
  Network,
} from "lucide-react";
import { cn } from "@shared/types/utils";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { FontSelector } from "./FontSelector";

interface RibbonProps {
  editor: Editor | null;
  onOpenSettings?: () => void;
  activeChapterId?: string;
  onOpenExportPreview?: () => void;
  onOpenWorldGraph?: () => void;
}

export default function Ribbon({
  editor,
  onOpenSettings,
  activeChapterId,
  onOpenExportPreview,
  onOpenWorldGraph,
}: RibbonProps) {
  const { t } = useTranslation();
  const maxWidth = useEditorStore((state) => state.maxWidth);
  if (!editor) return null;

  const isActive = (nameOrAttrs: string | Record<string, unknown>, attributes?: Record<string, unknown>) =>
    editor?.isActive(nameOrAttrs as string, attributes) ?? false;

  const withChain = (action: (chain: ReturnType<Editor["chain"]>) => void): void => {
    if (!editor) return;
    action(editor.chain().focus());
  };
  const handleExport = () => {
    if (!activeChapterId) return;
    onOpenExportPreview?.();
  };

  return (
    <div className="flex flex-col w-full bg-[#f9fbfd] dark:bg-[#1e1e1e] border-b border-border z-40 select-none pt-1">

      {/* Toolbar Row */}
      <div className="flex items-center px-3 py-1.5 gap-1.5 overflow-x-auto border-t border-border/10 bg-[#edf2fa] dark:bg-[#252525] rounded-full mx-2 mb-2 shadow-sm">

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border/20">
          <ToolbarButton
            icon={<Undo className="w-4 h-4" />}
            onClick={() => editor?.chain().focus().undo().run()}
            title={t("toolbar.tooltip.undo")}
          />
          <ToolbarButton
            icon={<Redo className="w-4 h-4" />}
            onClick={() => editor?.chain().focus().redo().run()}
            title={t("toolbar.tooltip.redo")}
          />
        </div>

        {/* Style & Font */}
        <div className="flex items-center gap-2 pr-2 border-r border-border/20">
          {/* Style Selector Removed as per request */}
          <div className="hidden" />
          <div className="h-4 w-px bg-border/20" />
          <FontSelector />
          <div className="h-4 w-px bg-border/20" />
          <div className="flex items-center">
            <button className="px-1 hover:bg-black/5 rounded text-xs">-</button>
            <input
              type="text"
              defaultValue="11"
              className="w-6 text-center bg-transparent text-xs border border-border/50 rounded mx-1"
              readOnly
            />
            <button className="px-1 hover:bg-black/5 rounded text-xs">+</button>
          </div>
        </div>

        {/* Layout Toggle (PC / Mobile) */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border/20">
          <button
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-[14px] bg-black/5 dark:bg-white/5 text-[11px] text-muted border border-transparent cursor-pointer transition-colors hover:bg-black/10 dark:hover:bg-white/10",
              (maxWidth && maxWidth <= 500) && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 border-blue-200 dark:border-blue-800"
            )}
            onClick={() => {
              const isMobile = maxWidth && maxWidth <= 500;
              useEditorStore.getState().updateSettings({ maxWidth: isMobile ? 816 : 450 });
            }}
            title={t("toolbar.tooltip.toggleMobileView")}
          >
            {(maxWidth && maxWidth <= 500) ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
            <span>{(maxWidth && maxWidth <= 500) ? t("view.mobile") : t("view.pc")}</span>
          </button>
        </div>

        {/* Formatting */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border/20">
          <ToolbarButton
            icon={<Bold className="w-4 h-4" />}
            isActive={isActive("bold")}
            onClick={() => withChain((c) => c.toggleBold().run())}
            title={t("toolbar.tooltip.bold")}
          />
          <ToolbarButton
            icon={<Italic className="w-4 h-4" />}
            isActive={isActive("italic")}
            onClick={() => withChain((c) => c.toggleItalic().run())}
            title={t("toolbar.tooltip.italic")}
          />
          <ToolbarButton
            icon={<Underline className="w-4 h-4" />}
            isActive={isActive("underline")}
            onClick={() => withChain((c) => c.toggleUnderline().run())}
            title={t("toolbar.tooltip.underline")}
          />
          <ToolbarButton
            icon={<Highlighter className="w-4 h-4" />}
            isActive={isActive("highlight")}
            onClick={() => withChain((c) => c.toggleHighlight().run())}
            title={t("toolbar.tooltip.highlight")}
          />
        </div>

        {/* Alignment & Lists */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border/20">
          <ToolbarButton
            icon={<AlignLeft className="w-4 h-4" />}
            isActive={isActive({ textAlign: "left" })}
            onClick={() => withChain((c) => c.setTextAlign("left").run())}
            title={t("toolbar.tooltip.alignLeft")}
          />
          <ToolbarButton
            icon={<AlignCenter className="w-4 h-4" />}
            isActive={isActive({ textAlign: "center" })}
            onClick={() => withChain((c) => c.setTextAlign("center").run())}
            title={t("toolbar.tooltip.alignCenter")}
          />
          <ToolbarButton
            icon={<AlignRight className="w-4 h-4" />}
            isActive={isActive({ textAlign: "right" })}
            onClick={() => withChain((c) => c.setTextAlign("right").run())}
            title={t("toolbar.tooltip.alignRight")}
          />
          <div className="h-4 w-px bg-border/20 mx-1" />
          <ToolbarButton
            icon={<List className="w-4 h-4" />}
            isActive={isActive("bulletList")}
            onClick={() => withChain((c) => c.toggleBulletList().run())}
            title={t("toolbar.tooltip.bulletList")}
          />
          <ToolbarButton
            icon={<ListOrdered className="w-4 h-4" />}
            isActive={isActive("orderedList")}
            onClick={() => withChain((c) => c.toggleOrderedList().run())}
            title={t("toolbar.tooltip.orderedList")}
          />
        </div>

        {/* 오른쪽 끝: 내보내기 & 설정 */}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-[14px] bg-black/5 dark:bg-white/5 text-[11px] text-muted border border-transparent transition-colors",
              onOpenWorldGraph
                ? "cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 hover:text-fg"
                : "cursor-not-allowed opacity-50"
            )}
            onClick={onOpenWorldGraph}
            title={t("toolbar.tooltip.openWorldGraph")}
            disabled={!onOpenWorldGraph}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{t("toolbar.view.graph")}</span>
          </button>
          <ToolbarButton
            icon={<FileOutput className="w-4 h-4" />}
            onClick={handleExport}
            title={t("export.title")}
            disabled={!activeChapterId}
          />
          <ToolbarButton
            icon={<Settings className="w-4 h-4" />}
            onClick={() => onOpenSettings?.()}
            title={t("sidebar.section.settings")}
          />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  icon,
  isActive,
  onClick,
  title,
  className,
  disabled,
}: {
  icon: React.ReactNode;
  isActive?: boolean;
  onClick: () => void;
  title?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center p-1.5 rounded transition-colors",
        isActive
          ? "bg-accent/10 text-accent"
          : "hover:bg-black/5 dark:hover:bg-white/10 text-fg/70 hover:text-fg",
        disabled && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      {icon}
    </button>
  );
}
