// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import type { Plugin } from "prosemirror-state";
import { DiffHighlight } from "../../src/renderer/src/features/editor/components/extensions/DiffExtension.js";

const findDiffPlugin = (editor: Editor) =>
  editor.state.plugins.find((plugin) =>
    String((plugin.spec.key as { key?: string } | undefined)?.key).startsWith(
      "diffHighlight",
    ),
  ) as Plugin | undefined;

describe("DiffHighlight decoration cache", () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it("selection만 바뀌면 같은 decoration을 재사용한다", () => {
    editor = new Editor({
      extensions: [StarterKit, DiffHighlight],
      content: "<p>현재 원고</p>",
    });
    editor.commands.setDiff({ comparisonContent: "<p>비교 원고</p>", mode: "snapshot" });
    const plugin = findDiffPlugin(editor);
    if (!plugin?.props.decorations) throw new Error("Diff plugin is missing");

    const first = plugin.props.decorations(editor.state);
    editor.commands.setTextSelection(1);
    const second = plugin.props.decorations(editor.state);

    expect(second).toBe(first);
  });

  it("본문이 바뀌면 새 decoration을 계산한다", () => {
    editor = new Editor({
      extensions: [StarterKit, DiffHighlight],
      content: "<p>현재 원고</p>",
    });
    editor.commands.setDiff({ comparisonContent: "<p>비교 원고</p>", mode: "snapshot" });
    const plugin = findDiffPlugin(editor);
    if (!plugin?.props.decorations) throw new Error("Diff plugin is missing");
    const first = plugin.props.decorations(editor.state);

    editor.commands.setContent("<p>바뀐 현재 원고</p>");
    const second = plugin.props.decorations(editor.state);

    expect(second).not.toBe(first);
  });
});
