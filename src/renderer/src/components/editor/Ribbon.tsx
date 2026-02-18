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
  Type,
  Highlighter,
  Undo,
  Redo,
  Printer,
  PaintBucket,
  ZoomIn,
  Link,
  MessageSquare,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "../../../../shared/types/utils";

interface RibbonProps {
  editor: Editor | null;
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

export default function Ribbon({ editor }: RibbonProps) {
  const { t } = useTranslation();

  const isActive = (nameOrAttrs: string | Record<string, unknown>, attributes?: Record<string, unknown>) => 
      editor?.isActive(nameOrAttrs as string, attributes) ?? false;

  const withChain = (action: (chain: RibbonCommandChain) => void): void => {
    if (!editor) return;
    action(editor.chain().focus() as unknown as RibbonCommandChain);
  };

  return (
    <div className="flex flex-col w-full bg-[#f9fbfd] dark:bg-[#1e1e1e] border-b border-border z-40 select-none pt-1">
      
      {/* Toolbar Row (Compact, Single Line) - Moved up as the main element */}
      <div className="flex items-center px-3 py-1.5 gap-1.5 overflow-x-auto border-t border-border/10 bg-[#edf2fa] dark:bg-[#252525] rounded-full mx-2 mb-2 shadow-sm">
        
        {/* Undo/Redo & Print */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border/20">
            <ToolbarButton icon={<Undo className="w-4 h-4" />} onClick={() => editor?.chain().focus().undo().run()} title={t("common.action.undo")} />
            <ToolbarButton icon={<Redo className="w-4 h-4" />} onClick={() => editor?.chain().focus().redo().run()} title={t("common.action.redo")} />
            <ToolbarButton icon={<Printer className="w-4 h-4" />} onClick={() => window.print()} title={t("common.action.print")} />
            <ToolbarButton icon={<PaintBucket className="w-4 h-4" />} onClick={() => {}} title={t("common.action.paintFormat")} />
        </div>

        {/* Zoom & Styles */}
        <div className="flex items-center gap-2 pr-2 border-r border-border/20">
           <button className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
             100% <ZoomIn className="w-3 h-3" />
           </button>
           <div className="h-4 w-px bg-border/20" />
           <select className="h-7 text-xs bg-transparent border-none focus:ring-0 w-24 px-2 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer">
             <option>Normal text</option>
             <option>Title</option>
             <option>Heading 1</option>
             <option>Heading 2</option>
           </select>
           <div className="h-4 w-px bg-border/20" />
           <select className="h-7 text-xs bg-transparent border-none focus:ring-0 w-28 px-2 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer">
             <option>Arial</option>
             <option>Inter</option>
             <option>Roboto</option>
           </select>
           <div className="h-4 w-px bg-border/20" />
           <div className="flex items-center">
             <button className="px-1 hover:bg-black/5 rounded">-</button>
             <input type="text" value="11" className="w-6 text-center bg-transparent text-xs border border-border/50 rounded mx-1" readOnly />
             <button className="px-1 hover:bg-black/5 rounded">+</button>
           </div>
        </div>

        {/* Formatting Group */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border/20">
          <ToolbarButton 
            icon={<Bold className="w-4 h-4" />} 
            isActive={isActive("bold")} 
            onClick={() => withChain(c => c.toggleBold().run())} 
          />
          <ToolbarButton 
            icon={<Italic className="w-4 h-4" />} 
            isActive={isActive("italic")} 
            onClick={() => withChain(c => c.toggleItalic().run())} 
          />
          <ToolbarButton 
            icon={<Underline className="w-4 h-4" />} 
            isActive={isActive("underline")} 
            onClick={() => withChain(c => c.toggleUnderline().run())} 
          />
          <ToolbarButton 
            icon={<Type className="w-4 h-4 text-accent" />} 
            onClick={() => {}} 
            title={t("toolbar.tooltip.textColor")}
          />
          <ToolbarButton 
            icon={<Highlighter className="w-4 h-4" />} 
            isActive={isActive("highlight")} 
            onClick={() => withChain(c => c.toggleHighlight().run())} 
          />
        </div>

        {/* Insert & Link */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border/20">
           <ToolbarButton icon={<Link className="w-4 h-4" />} onClick={() => {}} title={t("common.menu.link")} />
           <ToolbarButton icon={<MessageSquare className="w-4 h-4" />} onClick={() => {}} title="Add Comment" />
           <ToolbarButton icon={<ImageIcon className="w-4 h-4" />} onClick={() => {}} title={t("common.menu.image")} />
        </div>

        {/* Alignment & Lists */}
        <div className="flex items-center gap-0.5">
           <ToolbarButton 
              icon={<AlignLeft className="w-4 h-4" />} 
              isActive={isActive({ textAlign: "left" })} 
              onClick={() => withChain(c => c.setTextAlign("left").run())} 
           />
           <ToolbarButton 
              icon={<AlignCenter className="w-4 h-4" />} 
              isActive={isActive({ textAlign: "center" })} 
              onClick={() => withChain(c => c.setTextAlign("center").run())} 
           />
           <ToolbarButton 
              icon={<AlignRight className="w-4 h-4" />} 
              isActive={isActive({ textAlign: "right" })} 
              onClick={() => withChain(c => c.setTextAlign("right").run())} 
           />
           <div className="h-4 w-px bg-border/20 mx-1" />
           <ToolbarButton 
              icon={<List className="w-4 h-4" />} 
              isActive={isActive("bulletList")} 
              onClick={() => withChain(c => c.toggleBulletList().run())} 
           />
           <ToolbarButton 
              icon={<ListOrdered className="w-4 h-4" />} 
              isActive={isActive("orderedList")} 
              onClick={() => withChain(c => c.toggleOrderedList().run())} 
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
  className 
}: { 
  icon: React.ReactNode, 
  isActive?: boolean, 
  onClick: () => void, 
  title?: string,
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center justify-center p-1.5 rounded transition-colors",
        isActive ? "bg-accent/10 text-accent" : "hover:bg-black/5 dark:hover:bg-white/10 text-fg/70 hover:text-fg",
        className
      )}
    >
      {icon}
    </button>
  );
}
