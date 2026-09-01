import { useState, useRef, useEffect } from "react";
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import { Plus } from "lucide-react";
import { cn } from "@shared/types/utils";
import { CalloutIconPicker } from "@renderer/features/editor/components/extensions/CalloutIconPicker";

export function CalloutComponent({ node, updateAttributes }: NodeViewProps) {
  const icon = (node.attrs.icon as string | null) || "";
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as globalThis.Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectIcon = (newIcon: string) => {
    updateAttributes({ icon: newIcon });
    setIsOpen(false);
  };

  const removeIcon = () => {
    updateAttributes({ icon: null });
    setIsOpen(false);
  };

  return (
    <NodeViewWrapper
      className={cn(
        "callout group/callout relative my-4 flex items-start rounded-xl border border-border/80 bg-bg-secondary px-3.5 py-2.5 text-fg transition-colors",
        icon ? "gap-2.5" : "gap-1.5",
      )}
    >
      {/* Icon Button */}
      <div className="relative shrink-0 select-none">
        {icon ? (
          <button
            type="button"
            contentEditable={false}
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex h-6 w-6 items-center justify-center text-xl leading-none transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            title="아이콘 변경"
            aria-label="콜아웃 아이콘 변경"
          >
            {icon}
          </button>
        ) : (
          <button
            type="button"
            contentEditable={false}
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-border/70 text-muted opacity-0 transition-all hover:border-border-strong hover:text-fg group-hover/callout:opacity-100 cursor-pointer"
            title="아이콘 추가"
            aria-label="콜아웃 아이콘 추가"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Notion Style Emoji Picker Popover */}
        {isOpen && (
          <div ref={popoverRef} contentEditable={false}>
            <CalloutIconPicker
              currentIcon={icon}
              onSelect={selectIcon}
              onRemove={removeIcon}
              onClose={() => setIsOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Content Area - Multi-paragraph block support */}
      <NodeViewContent className="callout-content min-w-0 flex-1 leading-relaxed text-fg" />
    </NodeViewWrapper>
  );
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      icon: {
        default: "💡",
        parseHTML: (element) => element.getAttribute("data-icon"),
        renderHTML: (attributes) => {
          if (!attributes.icon) return {};
          return { "data-icon": attributes.icon as string };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "callout",
        class: "callout",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutComponent);
  },
});
