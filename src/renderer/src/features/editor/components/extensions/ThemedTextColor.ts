import Highlight from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";

/* NOTE: 형광펜·글자색을 theme을 따라가게 만드는 층이다(§11).

   문제: Tiptap 기본 `Highlight`는 `<mark style="background-color:#FEF08A">`를,
   `Color`는 `<span style="color:#EF4444">`를 낸다. **인라인 스타일이라 CSS가 이길 수 없다.**
   그래서 theme을 바꿔도 값이 그대로 남아 dark에서 형광펜 위 글자 대비가 1.01~1.50이 됐다.

   해법: 인라인 스타일이 `background-color`/`color`를 **직접 세우지 않게** 한다. 대신 커스텀
   프로퍼티만 세우고 실제 색은 `editor.css`가 그린다. 인라인 선언이 없으므로 CSS가 자연히
   이기고 `!important`가 필요 없다.

     renderHTML → style="--luie-mark: var(--editor-mark-yellow)"
     CSS        → .tiptap mark { background-color: var(--luie-mark, …) }

   기존 문서: `parseHTML`이 커스텀 프로퍼티를 먼저 보고, 없으면 **옛 `background-color`를
   읽는다.** 따라서 이미 저장된 hex도 attribute로 복원되어 같은 경로로 그려진다 —
   렌더 시점에 즉시 고쳐지고, 다음 저장에서 `getHTML()`이 새 형식을 내보내 자연히 이행된다.
   문서를 일괄 변환하지 않으므로 스냅샷·동기화 흐름에 영향이 없다.

   Export는 무관하다. `exportContentNormalization.ts`의 화이트리스트가
   `p br h1 h2 h3 ul ol li blockquote strong em u`이고 `<span>`은 명시적으로 제거되며
   `<mark>`는 화이트리스트에 없다 — 색과 형광펜은 애초에 DOCX/HWPX에 실리지 않는다. */

const MARK_PROPERTY = "--luie-mark";
const INK_PROPERTY = "--luie-ink";

/** 옛 형식(`background-color`/`color` 인라인)과 새 형식(커스텀 프로퍼티)을 함께 읽는다. */
const readColor = (
  element: HTMLElement,
  property: string,
  legacy: "backgroundColor" | "color",
): string | null => {
  const next = element.style.getPropertyValue(property).trim();
  if (next) return next;
  const old = element.style[legacy];
  return old ? old : null;
};

export const ThemedHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) =>
          readColor(element as HTMLElement, MARK_PROPERTY, "backgroundColor"),
        renderHTML: (attributes) => {
          const color = attributes.color as string | null;
          if (!color) return {};
          return { style: `${MARK_PROPERTY}: ${color}` };
        },
      },
    };
  },
});

export const ThemedColor = Color.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types as string[],
        attributes: {
          color: {
            default: null,
            parseHTML: (element) =>
              readColor(element as HTMLElement, INK_PROPERTY, "color"),
            renderHTML: (attributes) => {
              const color = attributes.color as string | null;
              if (!color) return {};
              return { style: `${INK_PROPERTY}: ${color}` };
            },
          },
        },
      },
    ];
  },
});
