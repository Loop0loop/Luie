import { useState, useEffect, useRef } from "react";
import styles from "../../styles/components/Editor.module.css";
import EditorToolbar from "./EditorToolbar";
import SlashMenu from "./SlashMenu";
import { useEditorStore } from "../../stores/editorStore";

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
  const [content, setContent] = useState(initialContent);
  const [wordCount, setWordCount] = useState(0);

  const { fontFamily, fontSize, lineHeight, theme } = useEditorStore();
  
  // Slash Menu State
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSave?.(title, content);
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, content, onSave]);

  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
  }, [content]);

  // Handle Slash Menu Global Click to close
  useEffect(() => {
    const handleClick = () => setShowSlashMenu(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const getFontFamily = () => {
    switch (fontFamily) {
      case "serif":
        return "var(--font-serif)";
      case "sans":
        return "var(--font-sans)";
      case "mono":
        return "var(--font-mono)";
      default:
        return "var(--font-serif)";
    }
  };

  const [isMobileView, setIsMobileView] = useState(false);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Only update if not handled by slash menu logic specially
    setContent(e.target.value);
  };

  // Helper to get caret coordinates (Simplified)
  const updateSlashMenuPos = () => {
    if (!textareaRef.current) return;
    // For now, center/fixed positioning relative to cursor is hard without libraries.
    // We will position it near the cursor approximation or just below the last line typed.
    // A robust way requires a mirror div, which is too much code to inject safely now.
    // We will use a simple heuristic: 
    // Position it somewhat centrally or offset by line height if possible.
    // Actually, let's just make it float near the current line top/left if possible.
    // Fallback: Fixed center-ish or below header.
    
    // Better approximation:
    // We can't easily get X/Y.
    // Let's position it absolute 20% from top, centered horizontally for MVP visibility
    // OR create a fake cursor logic.
    
    // DECISION: Use fixed position relative to editor wrapper for stability.
    // Notion uses a floating menu. We can put it near the cursor if we use a library.
    // Since we can't, let's put it on the left side of the current line? No.
    // Let's use a fixed offset from the active line? Hard to calculate line index.
    
    // Let's try to get selection start index and estimate height?
    // Very rough estimation:
    const { selectionStart, value } = textareaRef.current;
    const lines = value.substr(0, selectionStart).split("\n");
    const lineIndex = lines.length;
    const approxTop = lineIndex * (fontSize * lineHeight) + 20; // 20px padding
    
    // This is relative to scrollTop.
    const scrollTop = textareaRef.current.scrollTop;
    const finalTop = Math.min(approxTop - scrollTop + 100, 500); // Clamp
    
    // Actually, let's just show it in the center of the screen for now as a "Command Palette" feel
    // to ensure it's visible and doesn't go off screen.
    const rect = textareaRef.current.getBoundingClientRect();
    setSlashMenuPos({ 
      top: rect.top + 100, 
      left: rect.left + 50 
    });
  };

  // Basic Markdown insertion handler
  const handleFormat = (type: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (type === 'undo') {
      document.execCommand('undo');
      return;
    }
    if (type === 'redo') {
      document.execCommand('redo');
      return;
    }
    if (type === 'size-up') {
      useEditorStore.getState().setFontSize(fontSize + 1);
      return;
    }
    if (type === 'size-down') {
      useEditorStore.getState().setFontSize(Math.max(10, fontSize - 1));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    let newText = content;
    let newCursorPos = end;

    switch (type) {
      case 'bold':
        newText = content.substring(0, start) + `**${selectedText}**` + content.substring(end);
        newCursorPos = end + 4;
        break;
      case 'italic':
        newText = content.substring(0, start) + `*${selectedText}*` + content.substring(end);
        newCursorPos = end + 2;
        break;
      case 'underline':
        newText = content.substring(0, start) + `<u>${selectedText}</u>` + content.substring(end);
        newCursorPos = end + 7;
        break;
      case 'strikethrough':
        // User requested single tilde ~
        newText = content.substring(0, start) + `~${selectedText}~` + content.substring(end);
        newCursorPos = end + 2;
        break;
      case 'align-center':
        newText = content.substring(0, start) + `<div align="center">\n${selectedText}\n</div>` + content.substring(end);
        newCursorPos = end + 22;
        break;
      case 'align-right':
        newText = content.substring(0, start) + `<div align="right">\n${selectedText}\n</div>` + content.substring(end);
        newCursorPos = end + 21;
        break;
      
      // Slash Menu Inserts
      case 'h1':
        newText = content.substring(0, start) + `# ` + content.substring(end);
        newCursorPos = end + 2;
        break;
      case 'h2':
        newText = content.substring(0, start) + `## ` + content.substring(end);
        newCursorPos = end + 3;
        break;
      case 'h3':
        newText = content.substring(0, start) + `### ` + content.substring(end);
        newCursorPos = end + 4;
        break;
      case 'bullet':
        newText = content.substring(0, start) + `- ` + content.substring(end);
        newCursorPos = end + 2;
        break;
      case 'check':
        newText = content.substring(0, start) + `[ ] ` + content.substring(end);
        newCursorPos = end + 4;
        break;
      case 'number':
        newText = content.substring(0, start) + `1. ` + content.substring(end);
        newCursorPos = end + 3;
        break;
      case 'toggle':
        newText = content.substring(0, start) + `> ` + content.substring(end);
        newCursorPos = end + 2;
        break;
      case 'quote':
        newText = content.substring(0, start) + `> ` + content.substring(end); // Standard MD quote
        newCursorPos = end + 2;
        break;
      case 'divider':
        newText = content.substring(0, start) + `---` + content.substring(end);
        newCursorPos = end + 3;
        break;
    }

    // Direct update to avoid race conditions with state
    // We also need to fire onChange to update React state
    setContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSlashSelect = (id: string) => {
    // Remove the '/' that triggered the menu if possible?
    // Current logic inserts at cursor. We optionally should remove the previous char if it was '/'.
    const textarea = textareaRef.current;
    if (textarea) {
        const start = textarea.selectionStart;
        // Check if previous char is slash
        if (content[start-1] === '/') {
            const newText = content.substring(0, start - 1) + content.substring(start);
            setContent(newText);
             // Adjust cursor backward so handleFormat inserts at correct place
             // Actually handleFormat inserts at cursor.
             // We need to wait for state update? No, just pass clean text to handleFormat logic?
             // Simplest: Just insert. The user can delete / if they want, OR we patch it here.
             // Improved:
             const prevPart = content.substring(0, start - 1);
             const nextPart = content.substring(start);
             
             // Manually handling insertion here instead of calling handleFormat
             let insert = '';
             switch(id) {
               case 'h1': insert = '# '; break;
               case 'h2': insert = '## '; break;
               case 'h3': insert = '### '; break;
               case 'bullet': insert = '- '; break;
               case 'number': insert = '1. '; break;
               case 'check': insert = '[ ] '; break;
               case 'toggle': insert = '> '; break;
               case 'quote': insert = '> '; break; // User asked for " -> space, but usually " is text.
                                                  // User: "인용 블록: " 다음에 space". Okay.
                                                  // If they select from menu, let's use standard > for quote.
                                                  // Or " for quote? Let's use >.
               case 'divider': insert = '---\n'; break;
             }
             
             const final = prevPart + insert + nextPart;
             setContent(final);
             setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start - 1 + insert.length, start - 1 + insert.length);
             }, 0);
        } else {
             handleFormat(id);
        }
    }
    setShowSlashMenu(false);
  };

  // Keyboard shortcuts handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Slash Menu is open, navigation is handled by window listener in SlashMenu component
    // But we might want to prevent Enter here
    if (showSlashMenu) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') {
             // Let SlashMenu handle it
             return; 
        }
        if (e.key === 'Escape') {
            setShowSlashMenu(false);
            return;
        }
    }

    // Input Rules - Space Trigger
    if (e.key === ' ') {
        const textarea = e.currentTarget;
        const { selectionStart } = textarea;
        const value = textarea.value;
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const lineText = value.substring(lineStart, selectionStart);

        // Check patterns
        let replacement = null;
        if (lineText === '#') replacement = '# ';
        else if (lineText === '##') replacement = '## ';
        else if (lineText === '###') replacement = '### ';
        else if (lineText === '*' || lineText === '-' || lineText === '+') replacement = '- ';
        else if (lineText === '[]' || lineText === '[ ]') replacement = '[ ] '; 
        else if (lineText === '1.') replacement = '1. ';
        else if (lineText === '>') replacement = '> ';
        else if (lineText === '"') replacement = '> '; // Quote as requested via "

        if (replacement) {
            e.preventDefault();
            const newText = value.substring(0, lineStart) + replacement + value.substring(selectionStart);
            setContent(newText);
            // Move cursor
            // setTimeout needed?
            // Actually manual setSelection works better immediately usually in React controlled inputs if event prevented
            // We need to flush state.
            return;
        }
    }

    // Slash Trigger
    if (e.key === '/') {
        // Just show menu
        updateSlashMenuPos();
        setShowSlashMenu(true);
        // Let the / be typed
    }

    // Shortcuts
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          handleFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          handleFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          handleFormat('underline');
          break;
        case 'z':
          e.preventDefault();
          handleFormat('undo');
          break;
        case 'y':
          e.preventDefault();
          handleFormat('redo');
          break;
      }
    } else if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
       if (e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 's') {
          e.preventDefault();
          handleFormat('strikethrough');
       }
       if (e.key.toLowerCase() === 'z') {
           e.preventDefault();
           handleFormat('redo');
       }
    }

    // Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newText = content.substring(0, start) + '  ' + content.substring(end);
      
      handleContentChange({ target: { value: newText } } as any);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className={styles.container} data-theme={theme}>
      <div className={styles.toolbarArea}>
        <EditorToolbar
          isMobileView={isMobileView}
          onToggleMobileView={() => setIsMobileView(!isMobileView)}
          onFormat={handleFormat}
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

          <textarea
            ref={textareaRef}
            className={styles.editorArea}
            placeholder="내용을 입력하세요... ('/' 를 눌러 명령어 확인)"
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            style={{
              fontFamily: getFontFamily(),
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight,
            }}
          />
          
          {showSlashMenu && (
             <SlashMenu 
               position={slashMenuPos} 
               onSelect={handleSlashSelect}
               onClose={() => setShowSlashMenu(false)}
             />
          )}
        </div>
      </div>

      <div className={styles.statusBar}>
        <span className={styles.statusText}>
          글자 {content.length} · 단어 {wordCount}
        </span>
      </div>
    </div>
  );
}
