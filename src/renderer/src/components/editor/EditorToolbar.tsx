 import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Type,
  Smartphone,
  Monitor,
  ChevronDown,
  List,
  ListOrdered,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { cn } from "../../../../shared/types/utils";
import { useEditorStore } from "../../stores/editorStore";
import { useTranslation } from "react-i18next";
import {
  EDITOR_TOOLBAR_FONT_MIN,
  EDITOR_TOOLBAR_FONT_STEP,
  EDITOR_FONT_FAMILIES,
} from "../../../../shared/constants";
import type { FontFamily } from "../../../../shared/types";
import { useState, useRef, useEffect } from "react";

interface EditorToolbarProps {
  editor: Editor | null;
  isMobileView?: boolean;
  onToggleMobileView?: () => void;
}

// Reusable Button Config
const ToggleButton = ({
  active,
  onClick,
  title,
  children,
  className,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) => (
  <button
    className={cn(
      "flex items-center justify-center rounded text-muted hover:bg-hover hover:text-fg transition-colors disabled:opacity-50 disabled:pointer-events-none",
      active && "bg-active text-accent",
      className || "w-7 h-7"
    )}
    title={title}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

const Divider = () => <div className="w-px h-4 bg-border mx-1.5" />;

const FontSelector = () => {
  const { t } = useTranslation();
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const setFontFamily = useEditorStore((state) => state.setFontFamily);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getLabel = (f: string) => {
      if (f === 'serif') return t("common.settings.font.serif");
      if (f === 'sans') return t("common.settings.font.sans");
      if (f === 'mono') return t("common.settings.font.mono");
      return f;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-1 px-2 h-7 rounded bg-transparent text-muted text-xs cursor-pointer hover:bg-hover hover:text-fg w-24 justify-between"
        onClick={() => setIsOpen(!isOpen)}
        title={t("common.settings.section.font")}
      >
        <span className="truncate">{getLabel(fontFamily)}</span>
        <ChevronDown className="icon-xs opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-32 bg-background border border-border shadow-md rounded-md z-50 py-1 max-h-48 overflow-y-auto">
          {EDITOR_FONT_FAMILIES.map((font) => (
            <button
              key={font}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs hover:bg-hover transition-colors flex items-center gap-2",
                fontFamily === font ? "text-accent bg-accent/5" : "text-fg"
              )}
              onClick={() => {
                setFontFamily(font as FontFamily);
                setIsOpen(false);
              }}
            >
              <span style={{ fontFamily: font === 'mono' ? 'monospace' : font === 'serif' ? 'serif' : 'sans-serif' }}>
                 Aa
              </span>
              <span>{getLabel(font)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- MODES ---

const DefaultToolbar = ({ editor, isMobileView, onToggleMobileView }: EditorToolbarProps) => {
  const { t } = useTranslation();
  const fontSize = useEditorStore((state) => state.fontSize);
  const setFontSize = useEditorStore((state) => state.setFontSize);

  return (
      <div className="flex items-center justify-between h-9 px-2">
        <div className="flex items-center gap-0.5">
          <ToggleButton onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} title={t("common.toolbar.tooltip.undo")}>
              <Undo2 className="icon-md" />
          </ToggleButton>
          <ToggleButton onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} title={t("common.toolbar.tooltip.redo")}>
              <Redo2 className="icon-md" />
          </ToggleButton>
          <Divider />
          <FontSelector />
          <Divider />
          {/* Size Picker */}
          <ToggleButton onClick={() => setFontSize(Math.max(EDITOR_TOOLBAR_FONT_MIN, fontSize - EDITOR_TOOLBAR_FONT_STEP))}>
             <span style={{ fontSize: "var(--editor-toolbar-plus-minus-font-size)" }}>-</span>
          </ToggleButton>
          <input 
            className="w-10 h-7 border-none bg-transparent text-center text-xs text-fg hover:bg-hover hover:rounded select-none outline-none cursor-default" 
            value={fontSize} 
            readOnly 
            tabIndex={-1}
          />
          <ToggleButton onClick={() => setFontSize(fontSize + EDITOR_TOOLBAR_FONT_STEP)}>
            <span style={{ fontSize: "var(--editor-toolbar-plus-minus-font-size)" }}>+</span>
          </ToggleButton>

          <Divider />

          <ToggleButton active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} title={t("common.toolbar.tooltip.bold")}>
              <Bold className="icon-md" />
          </ToggleButton>
          <ToggleButton active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} title={t("common.toolbar.tooltip.italic")}>
              <Italic className="icon-md" />
          </ToggleButton>
          <ToggleButton active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()} title={t("common.toolbar.tooltip.underline")}>
              <Underline className="icon-md" />
          </ToggleButton>
          <ToggleButton active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()} title={t("common.toolbar.tooltip.strikethrough")}>
              <Strikethrough className="icon-md" />
          </ToggleButton>

          <Divider />
          
           {/* Color Picker */}
          <div className="relative w-7 h-7 flex items-center justify-center" title={t("common.toolbar.tooltip.textColor")}>
            <input
              type="color"
              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
              onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
              value={editor?.getAttributes("textStyle").color || "#000000"}
            />
            <button className="flex items-center justify-center w-7 h-7 rounded text-muted hover:bg-hover hover:text-fg transition-colors">
              <Type className="icon-md" style={{ color: editor?.getAttributes("textStyle").color || "currentColor" }} />
            </button>
          </div>

          <ToggleButton active={editor?.isActive("highlight")} onClick={() => editor?.chain().focus().toggleHighlight().run()} title={t("common.toolbar.tooltip.highlight")}>
            <Highlighter className="icon-md" />
          </ToggleButton>
        </div>

        {/* Right */}
         <div className="flex items-center gap-0.5">
          <ToggleButton active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()} title={t("common.toolbar.tooltip.alignLeft")}>
            <AlignLeft className="icon-md" />
          </ToggleButton>
          <ToggleButton active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()} title={t("common.toolbar.tooltip.alignCenter")}>
            <AlignCenter className="icon-md" />
          </ToggleButton>
          <ToggleButton active={editor?.isActive({ textAlign: "right" })} onClick={() => editor?.chain().focus().setTextAlign("right").run()} title={t("common.toolbar.tooltip.alignRight")}>
            <AlignRight className="icon-md" />
          </ToggleButton>
          
          <Divider />

          <button
            className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-[14px] bg-element text-[11px] text-muted border border-transparent cursor-pointer transition-colors",
                isMobileView && "bg-active text-accent font-semibold border-active"
            )}
            onClick={onToggleMobileView}
            title={t("common.toolbar.tooltip.toggleMobileView")}
          >
            {isMobileView ? <Smartphone className="icon-sm" /> : <Monitor className="icon-sm" />}
            <span>{isMobileView ? t("common.toolbar.view.mobile") : t("common.toolbar.view.desktop")}</span>
          </button>
        </div>
      </div>
  )
}

const DocsToolbar = ({ editor }: EditorToolbarProps) => {
    const { t } = useTranslation();
    const fontSize = useEditorStore((state) => state.fontSize);
    const setFontSize = useEditorStore((state) => state.setFontSize);

    return (
        <div className="flex flex-wrap items-center gap-1 justify-center w-full px-2">
             <ToggleButton onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} className="w-8 h-8 rounded-full hover:bg-black/5" title={t("common.toolbar.tooltip.undo")}>
                <Undo2 className="w-4 h-4" />
             </ToggleButton>
             <ToggleButton onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} className="w-8 h-8 rounded-full hover:bg-black/5" title={t("common.toolbar.tooltip.redo")}>
                <Redo2 className="w-4 h-4" />
             </ToggleButton>
             <div className="w-px h-5 bg-border mx-2" />
             
             <FontSelector />
             <div className="w-px h-5 bg-border mx-2" />

             <div className="flex items-center border border-border/50 rounded overflow-hidden h-7 bg-background">
                <button onClick={() => setFontSize(Math.max(EDITOR_TOOLBAR_FONT_MIN, fontSize - EDITOR_TOOLBAR_FONT_STEP))} className="px-2 hover:bg-hover">-</button>
                <input className="w-8 text-center text-xs bg-transparent outline-none" value={fontSize} readOnly />
                <button onClick={() => setFontSize(fontSize + EDITOR_TOOLBAR_FONT_STEP)} className="px-2 hover:bg-hover">+</button>
             </div>
             
             <div className="w-px h-5 bg-border mx-2" />
             
             <ToggleButton active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} className="w-8 h-8 rounded-full hover:bg-black/5" title={t("common.toolbar.tooltip.bold")}>
                <Bold className="w-4 h-4" />
             </ToggleButton>
             <ToggleButton active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} className="w-8 h-8 rounded-full hover:bg-black/5" title={t("common.toolbar.tooltip.italic")}>
                <Italic className="w-4 h-4" />
             </ToggleButton>
             <ToggleButton active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()} className="w-8 h-8 rounded-full hover:bg-black/5" title={t("common.toolbar.tooltip.underline")}>
                <Underline className="w-4 h-4" />
             </ToggleButton>
              {/* Color Picker (Simplified) */}
             <div className="relative w-8 h-8 flex items-center justify-center hover:bg-black/5 rounded-full cursor-pointer" title={t("common.toolbar.tooltip.textColor")}>
                <Type className="w-4 h-4" style={{ color: editor?.getAttributes("textStyle").color || "currentColor" }} />
                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer rounded-full" onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()} />
             </div>

             <div className="w-px h-5 bg-border mx-2" />

             <ToggleButton active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()} className="w-8 h-8 rounded-full hover:bg-black/5" title={t("common.toolbar.tooltip.alignLeft")}>
                <AlignLeft className="w-4 h-4" />
             </ToggleButton>
             <ToggleButton active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()} className="w-8 h-8 rounded-full hover:bg-black/5" title={t("common.toolbar.tooltip.alignCenter")}>
                <AlignCenter className="w-4 h-4" />
             </ToggleButton>
        </div>
    )
}

const WordToolbar = ({ editor }: EditorToolbarProps) => {
    const { t } = useTranslation();
    
    return (
        <div className="flex flex-col w-full bg-[#f3f2f1] dark:bg-[#2b2b2b] border-b border-border">
             {/* Ribbon Tabs */}
             <div className="flex items-center gap-1 px-2 pt-1 border-b border-border">
                <span className="px-4 py-1.5 text-xs bg-background border-t border-x border-border rounded-t font-semibold text-accent cursor-default">{t("toolbar.ribbon.home")}</span>
                <span className="px-4 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 cursor-pointer rounded-t">{t("toolbar.ribbon.insert")}</span>
                <span className="px-4 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 cursor-pointer rounded-t">{t("toolbar.ribbon.draw")}</span>
                <span className="px-4 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 cursor-pointer rounded-t">{t("toolbar.ribbon.view")}</span>
             </div>
             {/* Ribbon Content (Home) */}
             <div className="flex items-center h-20 px-4 py-2 gap-4 bg-[#f3f2f1] dark:bg-[#2b2b2b]">
                 {/* Clipboard Group (Mock) */}
                 <div className="flex flex-col items-center justify-center gap-1 border-r border-border pr-2 opacity-50">
                    <span className="text-[10px] text-muted-foreground">{t("toolbar.ribbon.paste")}</span>
                 </div>
                 
                 {/* Font Group */}
                 <div className="flex flex-col gap-1 border-r border-border pr-4">
                     <div className="flex gap-1">
                        <FontSelector />
                        {/* Size (Static for now in Word mode to keep simple, or use store) */}
                        <div className="w-12 h-6 bg-background border border-border flex items-center justify-center text-xs">11</div>
                     </div>
                     <div className="flex gap-0.5">
                         <ToggleButton active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} className="w-6 h-6 hover:bg-hover"><Bold className="w-3.5 h-3.5" /></ToggleButton>
                         <ToggleButton active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} className="w-6 h-6 hover:bg-hover"><Italic className="w-3.5 h-3.5" /></ToggleButton>
                         <ToggleButton active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()} className="w-6 h-6 hover:bg-hover"><Underline className="w-3.5 h-3.5" /></ToggleButton>
                         <ToggleButton active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()} className="w-6 h-6 hover:bg-hover"><Strikethrough className="w-3.5 h-3.5" /></ToggleButton>
                     </div>
                 </div>

                  {/* Paragraph Group */}
                 <div className="flex flex-col gap-1 border-r border-border pr-4">
                      <div className="flex gap-0.5">
                        <ToggleButton onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} className="w-6 h-6 hover:bg-hover"><List className="w-3.5 h-3.5" /></ToggleButton>
                        <ToggleButton onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} className="w-6 h-6 hover:bg-hover"><ListOrdered className="w-3.5 h-3.5" /></ToggleButton>
                      </div>
                      <div className="flex gap-0.5">
                         <ToggleButton active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()} className="w-6 h-6 hover:bg-hover"><AlignLeft className="w-3.5 h-3.5" /></ToggleButton>
                         <ToggleButton active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()} className="w-6 h-6 hover:bg-hover"><AlignCenter className="w-3.5 h-3.5" /></ToggleButton>
                         <ToggleButton active={editor?.isActive({ textAlign: "right" })} onClick={() => editor?.chain().focus().setTextAlign("right").run()} className="w-6 h-6 hover:bg-hover"><AlignRight className="w-3.5 h-3.5" /></ToggleButton>
                      </div>
                 </div>
             </div>
        </div>
    )
}

const ScrivenerToolbar = ({ editor }: EditorToolbarProps) => {
    // Format Bar
     
     const fontSize = useEditorStore((state) => state.fontSize);
     const setFontSize = useEditorStore((state) => state.setFontSize);

    return (
        <div className="flex items-center gap-2 p-1 bg-[#e3e3e3] dark:bg-[#333] border-b border-border shadow-inner px-3">
             <FontSelector />
             <div className="flex items-center gap-1 bg-background border border-border rounded px-1">
                 <button onClick={() => setFontSize(Math.max(EDITOR_TOOLBAR_FONT_MIN, fontSize - EDITOR_TOOLBAR_FONT_STEP))} className="hover:text-accent">-</button>
                 <span className="text-xs w-6 text-center">{fontSize}</span>
                 <button onClick={() => setFontSize(fontSize + EDITOR_TOOLBAR_FONT_STEP)} className="hover:text-accent">+</button>
             </div>
             
             <div className="w-px h-4 bg-border mx-1" />

             <ToggleButton active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()} className="w-6 h-6 hover:bg-hover rounded"><Bold className="w-3.5 h-3.5" /></ToggleButton>
             <ToggleButton active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()} className="w-6 h-6 hover:bg-hover rounded"><Italic className="w-3.5 h-3.5" /></ToggleButton>
             <ToggleButton active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()} className="w-6 h-6 hover:bg-hover rounded"><Underline className="w-3.5 h-3.5" /></ToggleButton>
             
             <div className="w-px h-4 bg-border mx-1" />
             
             <ToggleButton active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()} className="w-6 h-6 hover:bg-hover rounded"><AlignLeft className="w-3.5 h-3.5" /></ToggleButton>
             <ToggleButton active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()} className="w-6 h-6 hover:bg-hover rounded"><AlignCenter className="w-3.5 h-3.5" /></ToggleButton>
             <ToggleButton active={editor?.isActive({ textAlign: "right" })} onClick={() => editor?.chain().focus().setTextAlign("right").run()} className="w-6 h-6 hover:bg-hover rounded"><AlignRight className="w-3.5 h-3.5" /></ToggleButton>
        </div>
    )
}

export default function EditorToolbar({
  editor,
  isMobileView,
  onToggleMobileView,
}: EditorToolbarProps) {
  const uiMode = useEditorStore((state) => state.uiMode);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col select-none transition-all duration-300">
        {uiMode === 'docs' && <DocsToolbar editor={editor} isMobileView={isMobileView} onToggleMobileView={onToggleMobileView} />}
        {uiMode === 'editor' && <WordToolbar editor={editor} isMobileView={isMobileView} onToggleMobileView={onToggleMobileView} />}
        {uiMode === 'scrivener' && <ScrivenerToolbar editor={editor} isMobileView={isMobileView} onToggleMobileView={onToggleMobileView} />}
        {(uiMode === 'default' || !uiMode) && <DefaultToolbar editor={editor} isMobileView={isMobileView} onToggleMobileView={onToggleMobileView} />}
        
        {/* Additional Toolbar Elements logic if needed */}
    </div>
  );
}
