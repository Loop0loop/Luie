export const parseXmlAttributes = (tag: string): Record<string, string> => {
  const attrs: Record<string, string> = {};
  const matches = tag.matchAll(/(\w+)="([^"]*)"/g);
  for (const match of matches) {
    attrs[match[1]] = match[2];
  }
  return attrs;
};

export const escapeXml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const htmlToText = (html: string): string =>
  html
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "\n$1\n")
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "• $1\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\n\n+/g, "\n\n")
    .trim();

export const convertHtmlToParagraphs = (
  html: string,
  title: string,
  secPrXml?: string,
  layout?: {
    contentWidth: number;
  },
): string => {
  const paragraphs: string[] = [];
  let paraId = Math.floor(Math.random() * 4000000000);
  const horzSize = Math.max(12000, Math.round(layout?.contentWidth ?? 42520));

  const firstParaId = paraId++;
  if (secPrXml) {
    paragraphs.push(`  <hp:p id="${firstParaId}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      ${secPrXml}
      <hp:ctrl>
        <hp:colPr id="" type="NEWSPAPER" layout="LEFT" colCount="1" sameSz="1" sameGap="0"/>
      </hp:ctrl>
    </hp:run>
    <hp:run charPrIDRef="0">
      <hp:t>${escapeXml(title)}</hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="${horzSize}" flags="0"/>
    </hp:linesegarray>
  </hp:p>`);
  } else {
    paragraphs.push(`  <hp:p id="${firstParaId}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:t>${escapeXml(title)}</hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="${horzSize}" flags="0"/>
    </hp:linesegarray>
  </hp:p>`);
  }

  paragraphs.push(`  <hp:p id="${paraId++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:t></hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="${horzSize}" flags="0"/>
    </hp:linesegarray>
  </hp:p>`);

  const textContent = htmlToText(html);
  const lines = textContent.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    if (!line.trim()) continue;

    paragraphs.push(`  <hp:p id="${paraId++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:t>${escapeXml(line)}</hp:t>
    </hp:run>
    <hp:linesegarray>
      <hp:lineseg textpos="0" vertpos="0" vertsize="1600" textheight="1000" baseline="1280" spacing="0" horzpos="0" horzsize="${horzSize}" flags="0"/>
    </hp:linesegarray>
  </hp:p>`);
  }

  return paragraphs.join("\n");
};
