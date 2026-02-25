import createDOMPurify, { type Config } from "dompurify";

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

const BLOCKED_TAGS = ["script", "iframe", "object", "embed", "link", "meta"];
const BLOCKED_ATTRS = ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"];

const DOM_PURIFY_CONFIG: Config = {
  FORBID_TAGS: BLOCKED_TAGS,
  FORBID_ATTR: BLOCKED_ATTRS,
  USE_PROFILES: { html: true },
};

let cachedPurifier: ReturnType<typeof createDOMPurify> | null = null;

const getBrowserPurifier = (): ReturnType<typeof createDOMPurify> | null => {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    !window
  ) {
    return null;
  }

  if (!cachedPurifier) {
    cachedPurifier = createDOMPurify(window);
  }

  return cachedPurifier;
};

export const sanitizePreviewHtml = (html: string): string => {
  const purifier = getBrowserPurifier();
  if (!purifier) {
    return sanitizeHtmlWithRegex(html);
  }

  const sanitized = purifier.sanitize(html, DOM_PURIFY_CONFIG);
  return typeof sanitized === "string" ? sanitized : sanitizeHtmlWithRegex(html);
};
