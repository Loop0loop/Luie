import { describe, expect, it } from "vitest";
import {
  extractPlainTextFromHtml,
  prepareExportContent,
} from "../../../src/shared/utils/exportContentNormalization.js";

describe("exportContentNormalization", () => {
  it("removes duplicated title lines and rebuilds bullet lists", () => {
    const prepared = prepareExportContent({
      title: "Chapter One",
      html: `
        <h1 style="font-size:32px">Chapter One</h1>
        <p style="line-height:200%">• first item</p>
        <p class="ql-align-center">• second item</p>
        <p>Body paragraph.</p>
      `,
    });

    expect(prepared.removedDuplicateTitle).toBe(true);
    expect(prepared.html).toContain("<ul><li>first item</li><li>second item</li></ul>");
    expect(prepared.html).toContain("<p>Body paragraph.</p>");
    expect(prepared.html).not.toContain("<h1>Chapter One</h1>");
  });

  it("joins broken line breaks into a clean paragraph", () => {
    const prepared = prepareExportContent({
      title: "Scene",
      html: `
        <div style="font-family:Arial">첫 줄입니다.<br>둘째 줄입니다.<br><br>1. 첫 번째 항목
        <br>2. 두 번째 항목</div>
      `,
    });

    expect(prepared.html).toContain("<p>첫 줄입니다. 둘째 줄입니다.</p>");
    expect(prepared.html).toContain("<ol><li>첫 번째 항목</li><li>두 번째 항목</li></ol>");
  });

  it("extracts plain text without web-only markup noise", () => {
    expect(
      extractPlainTextFromHtml(
        '<p class="foo" style="margin:0">Hello&nbsp;<strong>world</strong></p>',
      ),
    ).toBe("Hello world");
  });
});
