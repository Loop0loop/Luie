import { ReactRenderer } from '@tiptap/react';
import type { SuggestionKeyDownProps, SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import SlashMenu from './SlashMenu';

function replaceCurrentTextblock(editor: any, content: any) {
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

export const slashSuggestion: Omit<SuggestionOptions, 'editor'> = {
  char: '/',

  command: ({ editor, range, props }: any) => {
    // items()에서 만든 각 아이템의 action을 실행
    props?.action?.({ editor, range });
  },
  
  items: ({ query }) => {
    const items = [
      {
        id: 'h1',
        label: '제목 1',
        action: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run();
        },
      },
      {
        id: 'h2',
        label: '제목 2',
        action: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run();
        },
      },
      {
        id: 'h3',
        label: '제목 3',
        action: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run();
        },
      },
      {
        id: 'bullet',
        label: '글머리 기호 목록',
        action: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
      },
      {
        id: 'number',
        label: '번호 매기기 목록',
        action: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
      },
      {
        id: 'check',
        label: '할 일 목록',
        action: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
      },
      {
        id: 'toggle',
        label: '토글 섹션',
        action: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).run();

          replaceCurrentTextblock(editor, {
            type: 'details',
            content: [
              {
                type: 'detailsSummary',
                content: [{ type: 'text', text: '토글 제목' }],
              },
              {
                type: 'detailsContent',
                content: [{ type: 'paragraph' }],
              },
            ],
          });
        },
      },
      {
        id: 'quote',
        label: '인용',
        action: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
      },
      {
        id: 'callout',
        label: '메모(콜아웃)',
        action: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).run();

          replaceCurrentTextblock(editor, {
            type: 'callout',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: '메모 내용' }],
              },
            ],
          });
        },
      },
      {
        id: 'divider',
        label: '장면 구분선',
        action: ({ editor, range }: any) => {
          editor.chain().focus().deleteRange(range).run();
          // HR도 textblock 내부에서 삽입 시 보정될 수 있어, 현재 문단을 HR로 교체
          replaceCurrentTextblock(editor, { type: 'horizontalRule' });
        },
      },
    ];

    return items
      .filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10);
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
        popup.style.position = 'absolute';
        popup.style.zIndex = '1000';
        
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
        if (props.event.key === 'Escape') {
          component?.destroy();
          popup?.remove();
          return true;
        }

        // @ts-ignore - ref is set by forwardRef
        return component?.ref?.onKeyDown?.(props) ?? false;
      },

      onExit() {
        component?.destroy();
        popup?.remove();
      },
    };
  },
};
