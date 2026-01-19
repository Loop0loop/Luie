import { useState, useEffect } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import styles from "../../styles/components/Editor.module.css";
import EditorToolbar from "./EditorToolbar";
import SlashMenu from "./SlashMenu";
import { useEditorStore } from "../../stores/editorStore";

// Simple Callout Extension (inline to avoid dependencies)
const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout', class: 'callout' }), 0];
  },

  addCommands() {
    return {
      setCallout: () => ({ commands }: any) => commands.wrapIn(this.name),
      toggleCallout: () => ({ commands }: any) => commands.toggleWrap(this.name),
    };
  },
});

// Toggle (Details) Extension
const ToggleSummary = Node.create({
  name: 'toggleSummary',
  content: 'inline*',
  defining: true,

  parseHTML() {
    return [{ tag: 'summary' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['summary', mergeAttributes(HTMLAttributes), 0];
  },
});

const Toggle = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'toggleSummary block*',
  defining: true,

  parseHTML() {
    return [{ tag: 'details[data-type="toggle"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['details', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle', class: 'toggle' }), 0];
  },

  addCommands() {
    return {
      insertToggle:
        () =>
        ({ commands }: any) =>
          commands.insertContent({
            type: this.name,
            content: [
              {
                type: 'toggleSummary',
                content: [{ type: 'text', text: '토글' }],
              },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: '' }],
              },
            ],
          }),
    };
  },
});

interface EditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave?: (title: string, content: string) => void;
}

export default function Editor({
  initialTitle = "",
  initialContent = "",
  onSave,
}: EditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [contentHtml, setContentHtml] = useState(initialContent);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });
  const [wordCount, setWordCount] = useState(0);

  const { fontFamily, fontSize, lineHeight, theme } = useEditorStore();
  const [isMobileView, setIsMobileView] = useState(false);

  // Handle Slash Menu Global Click to close
  useEffect(() => {
    const handleClick = () => setShowSlashMenu(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleSlashSelect = (id: string) => {
    if (!editor) return;

    // Delete the slash character that triggered the menu
    editor.chain().focus().deleteRange({ 
      from: editor.state.selection.from - 1, 
      to: editor.state.selection.from 
    }).run();

    // Apply the selected formatting
    switch (id) {
      case 'h1': 
        editor.chain().focus().toggleHeading({ level: 1 }).run(); 
        break;
      case 'h2': 
        editor.chain().focus().toggleHeading({ level: 2 }).run(); 
        break;
      case 'h3': 
        editor.chain().focus().toggleHeading({ level: 3 }).run(); 
        break;
      case 'bullet': 
        editor.chain().focus().toggleBulletList().run(); 
        break;
      case 'number': 
        editor.chain().focus().toggleOrderedList().run(); 
        break;
      case 'check': 
        editor.chain().focus().toggleTaskList().run(); 
        break;
      case 'toggle':
        editor.chain().focus().insertToggle().run();
        break;
      case 'callout':
        editor.chain().focus().toggleCallout().run();
        break;
      case 'quote': 
        editor.chain().focus().toggleBlockquote().run(); 
        break;
      case 'divider': 
        editor.chain().focus().setHorizontalRule().run(); 
        break;
    }
    
    setShowSlashMenu(false);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // TipTap Editor Setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TextStyle,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Callout,
      ToggleSummary,
      Toggle,
      Placeholder.configure({
        placeholder: "내용을 입력하세요... ('/'를 입력하여 명령어 확인)",
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      setContentHtml(html);
      setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
    },
    editorProps: {
      attributes: {
        class: styles.editorContent, // We will map this class in CSS
      },
      handleKeyDown: (view, event) => {
        // Handle slash menu navigation when menu is open
        if (showSlashMenu) {
          if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
            return true; // Let SlashMenu component handle navigation
          }
          if (event.key === 'Escape') {
            setShowSlashMenu(false);
            return true;
          }
        }

        // Detect slash key to show menu
        if (event.key === '/') {
          setTimeout(() => {
            const { from } = view.state.selection;
            const coords = view.coordsAtPos(from);
            const container = view.dom.closest(`.${styles.container}`) || document.body;
            const containerRect = container.getBoundingClientRect();
            
            setSlashMenuPos({
              top: coords.top - containerRect.top + 30,
              left: coords.left - containerRect.left
            });
            setShowSlashMenu(true);
          }, 0);
        }
        
        return false;
      }
    },
  });

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave?.(title, contentHtml);
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, contentHtml, onSave]);

  const getFontFamily = () => {
    switch (fontFamily) {
      case "serif": return "var(--font-serif)";
      case "sans": return "var(--font-sans)";
      case "mono": return "var(--font-mono)";
      default: return "var(--font-serif)";
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.container} data-theme={theme}>
      <div className={styles.toolbarArea}>
        <EditorToolbar
          editor={editor}
          isMobileView={isMobileView}
          onToggleMobileView={() => setIsMobileView(!isMobileView)}
        />
      </div>

      <div className={styles.editorWrapper}>
        <div className={styles.mobileFrame} data-mobile={isMobileView}>
          <input
            type="text"
            className={styles.titleInput}
            placeholder="제목 없음"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ fontFamily: getFontFamily() }}
          />

          <div 
            className={styles.editorContainer}
            style={{
              fontFamily: getFontFamily(),
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative' // Ensure absolute positioning of menu works relative to this
            }}
          >
             <EditorContent editor={editor} className={styles.tiptapEditor} />
             {showSlashMenu && (
                <SlashMenu 
                  position={slashMenuPos} 
                  onSelect={handleSlashSelect}
                  onClose={() => setShowSlashMenu(false)}
                />
             )}
          </div>
        </div>
      </div>

      <div className={styles.statusBar}>
        <span className={styles.statusText}>
          글자 {editor.getText().length} · 단어 {wordCount}
        </span>
      </div>
    </div>
  );
}
