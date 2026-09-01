import { ReactRenderer } from "@tiptap/react";
import {
  SLASH_MENU_LISTBOX_ID,
  SUGGESTION_MAX_ITEMS,
  SUGGESTION_POPUP_Z_INDEX,
} from "@renderer/features/editor/constants/suggestion";
import type { Content, Editor } from "@tiptap/core";
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
  SuggestionProps,
} from "@tiptap/suggestion";
import SlashMenu from "@renderer/features/editor/components/SlashMenu";
import type {
  SlashMenuActionProps,
  SlashMenuItem,
  SlashMenuCategory,
} from "@renderer/features/editor/components/SlashMenu";
import { i18n } from "@renderer/i18n";

function replaceCurrentTextblock(editor: Editor, content: Content) {
  const { state } = editor;
  const { $from } = state.selection;

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

type SlashMenuItemTemplate = {
  id: string;
  category: SlashMenuCategory;
  hint: string;
  labelKey: string;
  action: (props: SlashMenuActionProps) => void;
};

const SLASH_ITEM_TEMPLATES: SlashMenuItemTemplate[] = [
  {
    id: "h1",
    category: "headings",
    hint: "#",
    labelKey: "slashMenu.label.h1",
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
    category: "headings",
    hint: "##",
    labelKey: "slashMenu.label.h2",
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
    category: "headings",
    hint: "###",
    labelKey: "slashMenu.label.h3",
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
    category: "lists",
    hint: "-",
    labelKey: "slashMenu.label.bullet",
    action: ({ editor, range }: SlashMenuActionProps) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: "number",
    category: "lists",
    hint: "1.",
    labelKey: "slashMenu.label.number",
    action: ({ editor, range }: SlashMenuActionProps) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: "check",
    category: "lists",
    hint: "[ ]",
    labelKey: "slashMenu.label.check",
    action: ({ editor, range }: SlashMenuActionProps) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    id: "toggle",
    category: "lists",
    hint: ">",
    labelKey: "slashMenu.label.toggle",
    action: ({ editor, range }: SlashMenuActionProps) => {
      editor.chain().focus().deleteRange(range).run();

      replaceCurrentTextblock(editor, {
        type: "details",
        content: [
          {
            type: "detailsSummary",
            content: [{ type: "text", text: i18n.t("slashMenu.toggleTitle") }],
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
    category: "blocks",
    hint: '"',
    labelKey: "slashMenu.label.quote",
    action: ({ editor, range }: SlashMenuActionProps) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    id: "callout",
    category: "blocks",
    hint: "::",
    labelKey: "slashMenu.label.callout",
    action: ({ editor, range }: SlashMenuActionProps) => {
      editor.chain().focus().deleteRange(range).run();

      replaceCurrentTextblock(editor, {
        type: "callout",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: i18n.t("slashMenu.calloutContent") }],
          },
        ],
      });
    },
  },
  {
    id: "divider",
    category: "blocks",
    hint: "---",
    labelKey: "slashMenu.label.divider",
    action: ({ editor, range }: SlashMenuActionProps) => {
      editor.chain().focus().deleteRange(range).run();
      // NOTE: textblock 안에서는 현재 paragraph를 HR로 교체해야 위치가 보정된다.
      replaceCurrentTextblock(editor, { type: "horizontalRule" });
    },
  },
];

export const slashSuggestion: Omit<SuggestionOptions<SlashMenuItem, SlashMenuItem>, "editor"> = {
  char: "/",

  command: ({ editor, range, props }: { editor: Editor; range: SlashMenuActionProps["range"]; props: SlashMenuItem }) => {
    props.action({ editor, range });
  },

  items: ({ query }: { query: string }): SlashMenuItem[] => {
    const q = query.toLowerCase().trim();

    const items: SlashMenuItem[] = SLASH_ITEM_TEMPLATES.map((tpl) => ({
      id: tpl.id,
      label: i18n.t(tpl.labelKey),
      category: tpl.category,
      hint: tpl.hint,
      action: tpl.action,
    }));

    if (!q) {
      return items.slice(0, SUGGESTION_MAX_ITEMS);
    }

    return items
      .filter((item) => {
        return (
          item.label.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          (item.hint && item.hint.toLowerCase().includes(q))
        );
      })
      .slice(0, SUGGESTION_MAX_ITEMS);
  },

  render: () => {
    let component: ReactRenderer | undefined;
    let popup: HTMLElement | undefined;
    let editorDom: HTMLElement | undefined;

    /* NOTE: 메뉴가 열려 있는 동안 포커스는 편집 영역에 남으므로, 활성 항목을 알리는
       `aria-activedescendant`는 팝업이 아니라 **편집 영역**에 붙어야 보조기술이 읽는다.

       `aria-expanded`는 붙이지 않는다. contenteditable은 role=textbox로 매핑되고
       `aria-expanded`는 textbox가 지원하는 속성이 아니다 — combobox role로 바꾸면
       편집 영역 자체의 성격이 달라지므로 하지 않는다. 전역 속성인 `aria-controls`와
       textbox가 지원하는 `aria-activedescendant`만 쓴다. */
    const setActiveOption = (optionId: string | null) => {
      if (!editorDom) return;
      if (optionId) editorDom.setAttribute("aria-activedescendant", optionId);
      else editorDom.removeAttribute("aria-activedescendant");
    };

    const detachEditorDom = () => {
      editorDom?.removeAttribute("aria-controls");
      editorDom?.removeAttribute("aria-activedescendant");
      editorDom = undefined;
    };

    return {
      onStart: (props: SuggestionProps) => {
        editorDom = props.editor.view.dom as HTMLElement;
        editorDom.setAttribute("aria-controls", SLASH_MENU_LISTBOX_ID);

        component = new ReactRenderer(SlashMenu, {
          props: {
            ...props,
            items: props.items,
            onActiveOptionChange: setActiveOption,
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
          onActiveOptionChange: setActiveOption,
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
          detachEditorDom();
          return true;
        }

        const suggestionRef = component?.ref as {
          onKeyDown?: (nextProps: SuggestionKeyDownProps) => boolean;
        } | undefined;
        return suggestionRef?.onKeyDown?.(props) ?? false;
      },

      onExit() {
        component?.destroy();
        popup?.remove();
        detachEditorDom();
      },
    };
  },
};
