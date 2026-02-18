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
} from "lucide-react";
import { cn } from "../../../../shared/types/utils";
import { api } from "../../services/api";

interface RibbonProps {
  editor: Editor | null;
  onOpenSettings?: () => void;
  activeChapterId?: string;
}

type RibbonCommandChain = ReturnType<Editor["chain"]> & {
  toggleBold: () => RibbonCommandChain;
  toggleItalic: () => RibbonCommandChain;
  toggleUnderline: () => RibbonCommandChain;
  toggleStrike: () => RibbonCommandChain;
  toggleHighlight: () => RibbonCommandChain;
  toggleBulletList: () => RibbonCommandChain;
  toggleOrderedList: () => RibbonCommandChain;
  setTextAlign: (align: "left" | "center" | "right") => RibbonCommandChain;
  setParagraph: () => RibbonCommandChain;
  toggleHeading: (attrs: { level: 1 | 2 }) => RibbonCommandChain;
  run: () => boolean;
};

export default function Ribbon({ editor, onOpenSettings, activeChapterId }: RibbonProps) {
  const { t } = useTranslation();

  const styleOptions = [
    { label: t("toolbar.ribbon.style.normalText"), value: "paragraph" },
    { label: t("toolbar.ribbon.style.heading1"), value: "heading1" },
    { label: t("toolbar.ribbon.style.heading2"), value: "heading2" },
  ];

  const fontOptions = [
    t("toolbar.font.options.arial"),
    t("toolbar.font.options.inter"),
    t("toolbar.font.options.roboto"),
  ];

  const isActive = (nameOrAttrs: string | Record<string, unknown>, attributes?: Record<string, unknown>) =>
    editor?.isActive(nameOrAttrs as string, attributes) ?? false;

  const withChain = (action: (chain: RibbonCommandChain) => void): void => {
    if (!editor) return;
    action(editor.chain().focus() as unknown as RibbonCommandChain);
  };

  const handleStyleChange = (value: string) => {
    if (!editor) return;
    if (value === "paragraph") {
      editor.chain().focus().setParagraph().run();
    } else if (value === "heading1") {
      (editor.chain().focus() as unknown as RibbonCommandChain).toggleHeading({ level: 1 }).run();
    } else if (value === "heading2") {
      (editor.chain().focus() as unknown as RibbonCommandChain).toggleHeading({ level: 2 }).run();
    }
  };

  const handleExport = async () => {
    if (!activeChapterId) return;
    await api.window.openExport(activeChapterId);
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
            title={t("common.action.undo")}
          />
          <ToolbarButton
            icon={<Redo className="w-4 h-4" />}
            onClick={() => editor?.chain().focus().redo().run()}
            title={t("common.action.redo")}
          />
        </div>

        {/* Style & Font */}
        <div className="flex items-center gap-2 pr-2 border-r border-border/20">
          <select
            className="h-7 text-xs bg-transparent border-none focus:ring-0 w-28 px-2 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer"
            onChange={(e) => handleStyleChange(e.target.value)}
            defaultValue="paragraph"
          >
            {styleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="h-4 w-px bg-border/20" />
          <select className="h-7 text-xs bg-transparent border-none focus:ring-0 w-24 px-2 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer">
            {fontOptions.map((label) => (
              <option key={label}>{label}</option>
            ))}
          </select>
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
          <ToolbarButton
            icon={<FileOutput className="w-4 h-4" />}
            onClick={() => void handleExport()}
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
