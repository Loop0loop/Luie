import { ReactRenderer } from "@tiptap/react";
import {
  SUGGESTION_MAX_ITEMS,
  SUGGESTION_POPUP_Z_INDEX,
  SLASH_MENU_LABEL_H1,
  SLASH_MENU_LABEL_H2,
  SLASH_MENU_LABEL_H3,
  SLASH_MENU_LABEL_BULLET,
  SLASH_MENU_LABEL_NUMBER,
  SLASH_MENU_LABEL_CHECK,
  SLASH_MENU_LABEL_TOGGLE,
  SLASH_MENU_LABEL_QUOTE,
  SLASH_MENU_LABEL_CALLOUT,
  SLASH_MENU_LABEL_DIVIDER,
  SLASH_MENU_TOGGLE_TITLE,
  SLASH_MENU_CALLOUT_CONTENT,
} from "../../../../shared/constants";
import type { Content, Editor } from "@tiptap/core";
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";
import SlashMenu from "./SlashMenu";
import type { SlashMenuActionProps, SlashMenuItem } from "./SlashMenu";

function replaceCurrentTextblock(editor: Editor, content: Content) {
  const { state } = editor;
  const { $from } = state.selection;

  // Find nearest textblock depth (paragraph, detailsSummary, etc.)
  let depth = $from.depth;
  while (depth > 0 && !$from.node(depth).isTextblock) {
    depth -= 1;
  }

  if (depth <= 0) {
    editor.commands.insertContent(content);
    return;
  }

  const from = $from.before(depth);
  const to = $from.after(depth);
  editor.commands.insertContentAt({ from, to }, content);
}

export const slashSuggestion: Omit<SuggestionOptions<SlashMenuItem, SlashMenuItem>, "editor"> = {
  char: "/",

  command: ({ editor, range, props }: { editor: Editor; range: SlashMenuActionProps["range"]; props: SlashMenuItem }) => {
    // items()에서 만든 각 아이템의 action을 실행
    props.action({ editor, range });
  },

  items: ({ query }: { query: string }): SlashMenuItem[] => {
    const items: SlashMenuItem[] = [
      {
        id: "h1",
        label: SLASH_MENU_LABEL_H1,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .toggleHeading({ level: 1 })
            .run();
        },
      },
      {
        id: "h2",
        label: SLASH_MENU_LABEL_H2,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .toggleHeading({ level: 2 })
            .run();
        },
      },
      {
        id: "h3",
        label: SLASH_MENU_LABEL_H3,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .toggleHeading({ level: 3 })
            .run();
        },
      },
      {
        id: "bullet",
        label: SLASH_MENU_LABEL_BULLET,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
      },
      {
        id: "number",
        label: SLASH_MENU_LABEL_NUMBER,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
      },
      {
        id: "check",
        label: SLASH_MENU_LABEL_CHECK,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
      },
      {
        id: "toggle",
        label: SLASH_MENU_LABEL_TOGGLE,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor.chain().focus().deleteRange(range).run();

          replaceCurrentTextblock(editor, {
            type: "details",
            content: [
              {
                type: "detailsSummary",
                content: [{ type: "text", text: SLASH_MENU_TOGGLE_TITLE }],
              },
              {
                type: "detailsContent",
                content: [{ type: "paragraph" }],
              },
            ],
          });
        },
      },
      {
        id: "quote",
        label: SLASH_MENU_LABEL_QUOTE,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
      },
      {
        id: "callout",
        label: SLASH_MENU_LABEL_CALLOUT,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor.chain().focus().deleteRange(range).run();

          replaceCurrentTextblock(editor, {
            type: "callout",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: SLASH_MENU_CALLOUT_CONTENT }],
              },
            ],
          });
        },
      },
      {
        id: "divider",
        label: SLASH_MENU_LABEL_DIVIDER,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor.chain().focus().deleteRange(range).run();
          // HR도 textblock 내부에서 삽입 시 보정될 수 있어, 현재 문단을 HR로 교체
          replaceCurrentTextblock(editor, { type: "horizontalRule" });
        },
      },
    ];

    return items
      .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
      .slice(0, SUGGESTION_MAX_ITEMS);
  },

  render: () => {
    let component: ReactRenderer | undefined;
    let popup: HTMLElement | undefined;

    return {
      onStart: (props: SuggestionProps) => {
        component = new ReactRenderer(SlashMenu, {
          props: {
            ...props,
            items: props.items,
          },
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = component.element as HTMLElement;
        popup.style.position = "absolute";
        popup.style.zIndex = String(SUGGESTION_POPUP_Z_INDEX);

        document.body.appendChild(popup);

        const rect = props.clientRect();
        if (rect) {
          popup.style.top = `${rect.bottom + window.scrollY}px`;
          popup.style.left = `${rect.left + window.scrollX}px`;
        }
      },

      onUpdate(props: SuggestionProps) {
        component?.updateProps({
          ...props,
          items: props.items,
        });

        if (!popup || !props.clientRect) {
          return;
        }

        const rect = props.clientRect();
        if (rect) {
          popup.style.top = `${rect.bottom + window.scrollY}px`;
          popup.style.left = `${rect.left + window.scrollX}px`;
        }
      },

      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === "Escape") {
          component?.destroy();
          popup?.remove();
          return true;
        }

        // @ts-expect-error - ref is set by forwardRef
        return component?.ref?.onKeyDown?.(props) ?? false;
      },

      onExit() {
        component?.destroy();
        popup?.remove();
      },
    };
  },
};
