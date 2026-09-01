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
import type { SlashMenuActionProps, SlashMenuItem } from "@renderer/features/editor/components/SlashMenu";
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

export const slashSuggestion: Omit<SuggestionOptions<SlashMenuItem, SlashMenuItem>, "editor"> = {
  char: "/",

  command: ({ editor, range, props }: { editor: Editor; range: SlashMenuActionProps["range"]; props: SlashMenuItem }) => {
    props.action({ editor, range });
  },

  items: ({ query }: { query: string }): SlashMenuItem[] => {
    const label = {
      h1: i18n.t("slashMenu.label.h1"),
      h2: i18n.t("slashMenu.label.h2"),
      h3: i18n.t("slashMenu.label.h3"),
      bullet: i18n.t("slashMenu.label.bullet"),
      number: i18n.t("slashMenu.label.number"),
      check: i18n.t("slashMenu.label.check"),
      toggle: i18n.t("slashMenu.label.toggle"),
      quote: i18n.t("slashMenu.label.quote"),
      callout: i18n.t("slashMenu.label.callout"),
      divider: i18n.t("slashMenu.label.divider"),
    };
    const toggleTitle = i18n.t("slashMenu.toggleTitle");
    const calloutContent = i18n.t("slashMenu.calloutContent");
    const items: SlashMenuItem[] = [
      {
        id: "h1",
        label: label.h1,
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
        label: label.h2,
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
        label: label.h3,
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
        label: label.bullet,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
      },
      {
        id: "number",
        label: label.number,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
      },
      {
        id: "check",
        label: label.check,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
      },
      {
        id: "toggle",
        label: label.toggle,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor.chain().focus().deleteRange(range).run();

          replaceCurrentTextblock(editor, {
            type: "details",
            content: [
              {
                type: "detailsSummary",
                content: [{ type: "text", text: toggleTitle }],
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
        label: label.quote,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
      },
      {
        id: "callout",
        label: label.callout,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor.chain().focus().deleteRange(range).run();

          replaceCurrentTextblock(editor, {
            type: "callout",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: calloutContent }],
              },
            ],
          });
        },
      },
      {
        id: "divider",
        label: label.divider,
        action: ({ editor, range }: SlashMenuActionProps) => {
          editor.chain().focus().deleteRange(range).run();
          // NOTE: textblock 안에서는 현재 paragraph를 HR로 교체해야 위치가 보정된다.
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
