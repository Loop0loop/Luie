import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";

export function useSettingsEditorPreferences() {
  const { fontSize, lineHeight, letterSpacing, wordSpacing } = useEditorStore(
    useShallow((state) => ({
      fontSize: state.fontSize,
      lineHeight: state.lineHeight,
      letterSpacing: state.letterSpacing ?? 0.05,
      wordSpacing: state.wordSpacing ?? 0.06,
    })),
  );

  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localLineHeight, setLocalLineHeight] = useState(lineHeight);
  const [localLetterSpacing, setLocalLetterSpacing] = useState(letterSpacing);
  const [localWordSpacing, setLocalWordSpacing] = useState(wordSpacing);

  useEffect(() => { setLocalFontSize(fontSize); }, [fontSize]);
  useEffect(() => { setLocalLineHeight(lineHeight); }, [lineHeight]);
  useEffect(() => { setLocalLetterSpacing(letterSpacing); }, [letterSpacing]);
  useEffect(() => { setLocalWordSpacing(wordSpacing); }, [wordSpacing]);

  return {
    fontSize,
    lineHeight,
    letterSpacing,
    wordSpacing,
    localFontSize,
    localLineHeight,
    localLetterSpacing,
    localWordSpacing,
    setLocalFontSize,
    setLocalLineHeight,
    setLocalLetterSpacing,
    setLocalWordSpacing,
  };
}
