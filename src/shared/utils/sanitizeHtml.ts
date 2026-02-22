const BLOCKED_TAG_PATTERN =
  /<\s*(script|iframe|object|embed|link|meta)\b[^>]*>([\s\S]*?)<\s*\/\s*\1\s*>/gi;
const BLOCKED_SELF_CLOSING_TAG_PATTERN =
  /<\s*(script|iframe|object|embed|link|meta)\b[^>]*\/?\s*>/gi;
const EVENT_HANDLER_ATTR_PATTERN =
  /\s+on[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_PROTOCOL_QUOTED_ATTR_PATTERN =
  /\s+(href|src|xlink:href)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi;
const JS_PROTOCOL_UNQUOTED_ATTR_PATTERN =
  /\s+(href|src|xlink:href)\s*=\s*javascript:[^\s>]+/gi;

const sanitizeHtmlWithRegex = (html: string): string =>
  html
    .replace(BLOCKED_TAG_PATTERN, "")
    .replace(BLOCKED_SELF_CLOSING_TAG_PATTERN, "")
    .replace(EVENT_HANDLER_ATTR_PATTERN, "")
    .replace(JS_PROTOCOL_QUOTED_ATTR_PATTERN, "")
    .replace(JS_PROTOCOL_UNQUOTED_ATTR_PATTERN, "");

export const sanitizePreviewHtml = (html: string): string => {
  if (typeof document === "undefined") {
    return sanitizeHtmlWithRegex(html);
  }

  const template = document.createElement("template");
  template.innerHTML = html;

  const blockedTags = new Set(["script", "iframe", "object", "embed", "link", "meta"]);
  const elements = Array.from(template.content.querySelectorAll("*"));

  elements.forEach((element) => {
    const tagName = element.tagName.toLowerCase();
    if (blockedTags.has(tagName)) {
      element.remove();
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (
        (name === "href" || name === "src" || name === "xlink:href") &&
        value.startsWith("javascript:")
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return template.innerHTML;
};
