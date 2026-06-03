import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";

export function useSettingsEditorPreferences() {
  const { fontSize, lineHeight, letterSpacing, wordSpacing, paragraphSpacing } = useEditorStore(
    useShallow((state) => ({
      fontSize: state.fontSize,
      lineHeight: state.lineHeight,
      letterSpacing: state.letterSpacing ?? 0.05,
      wordSpacing: state.wordSpacing ?? 0.06,
      paragraphSpacing: state.paragraphSpacing ?? 1.0,
    })),
  );

  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localLineHeight, setLocalLineHeight] = useState(lineHeight);
  const [localLetterSpacing, setLocalLetterSpacing] = useState(letterSpacing);
  const [localWordSpacing, setLocalWordSpacing] = useState(wordSpacing);
  const [localParagraphSpacing, setLocalParagraphSpacing] = useState(paragraphSpacing);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLocalFontSize(fontSize);
    });
    return () => {
      cancelled = true;
    };
  }, [fontSize]);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLocalLineHeight(lineHeight);
    });
    return () => {
      cancelled = true;
    };
  }, [lineHeight]);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLocalLetterSpacing(letterSpacing);
    });
    return () => {
      cancelled = true;
    };
  }, [letterSpacing]);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLocalWordSpacing(wordSpacing);
    });
    return () => {
      cancelled = true;
    };
  }, [wordSpacing]);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLocalParagraphSpacing(paragraphSpacing);
    });
    return () => {
      cancelled = true;
    };
  }, [paragraphSpacing]);

  return {
    fontSize,
    lineHeight,
    letterSpacing,
    wordSpacing,
    paragraphSpacing,
    localFontSize,
    localLineHeight,
    localLetterSpacing,
    localWordSpacing,
    localParagraphSpacing,
    setLocalFontSize,
    setLocalLineHeight,
    setLocalLetterSpacing,
    setLocalWordSpacing,
    setLocalParagraphSpacing,
  };
}
