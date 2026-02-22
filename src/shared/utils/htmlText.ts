export function htmlToPlainText(html: string): string {
  if (typeof DOMParser !== "undefined") {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    return parsed.body.textContent ?? "";
  }

  return html.replace(/<[^>]*>/g, " ");
}
