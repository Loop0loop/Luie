import { useMemo } from "react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Details, DetailsSummary, DetailsContent } from "@tiptap/extension-details";
import Focus from "@tiptap/extension-focus";
import { Extension, Node, mergeAttributes } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";

import { slashSuggestion } from "@renderer/features/editor/components/suggestion";
import { SmartLink } from "@renderer/features/editor/components/extensions/SmartLink";
import { DiffHighlight } from "@renderer/features/editor/components/extensions/DiffExtension";
import { useTranslation } from "react-i18next";

// Simple Callout Extension
const Callout = Node.create({
    name: "callout",
    group: "block",
    content: "block+",
    defining: true,

    parseHTML() {
        return [{ tag: 'div[data-type="callout"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "div",
            mergeAttributes(HTMLAttributes, {
                "data-type": "callout",
                class: "callout",
            }),
            0,
        ];
    },
});

const SlashCommand = Extension.create({
    name: "slashCommand",
    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...slashSuggestion,
            }),
        ];
    },
});

interface UseEditorExtensionsProps {
    comparisonContent?: string;
    diffMode?: "current" | "snapshot";
    focusMode?: boolean;
}

export function useEditorExtensions({
    comparisonContent,
    diffMode,
    focusMode = false,
}: UseEditorExtensionsProps) {
    const { t } = useTranslation();
    const placeholder = t("editor.placeholder.body");

    const extensions = useMemo(
        () => [
            StarterKit.configure({
                underline: false,
            }),
            Highlight,
            TextStyle,
            Color.configure({
                types: ["textStyle"],
            }),
            Underline,
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Callout,
            Details.configure({
                persist: true,
                HTMLAttributes: {
                    class: "toggle",
                },
            }),
            DetailsSummary,
            DetailsContent,
            Placeholder.configure({
                placeholder,
            }),
            SlashCommand,
            SmartLink,
            DiffHighlight.configure({
                comparisonContent,
                mode: diffMode,
            }),
            ...(focusMode ? [
                Focus.configure({
                    className: "has-focus",
                    mode: "shallowest",
                })
            ] : []),
        ],
        [comparisonContent, diffMode, placeholder, focusMode],
    );

    return extensions;
}
