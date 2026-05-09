import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";

export function useSettingsEditorPreferences() {
  const { fontSize, lineHeight, wordSpacing } = useEditorStore(
    useShallow((state) => ({
      fontSize: state.fontSize,
      lineHeight: state.lineHeight,
      wordSpacing: state.wordSpacing ?? 0.04,
    })),
  );

  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localLineHeight, setLocalLineHeight] = useState(lineHeight);
  const [localWordSpacing, setLocalWordSpacing] = useState(wordSpacing);

  useEffect(() => { setLocalFontSize(fontSize); }, [fontSize]);
  useEffect(() => { setLocalLineHeight(lineHeight); }, [lineHeight]);
  useEffect(() => { setLocalWordSpacing(wordSpacing); }, [wordSpacing]);

  return {
    fontSize,
    lineHeight,
    wordSpacing,
    localFontSize,
    localLineHeight,
    localWordSpacing,
    setLocalFontSize,
    setLocalLineHeight,
    setLocalWordSpacing,
  };
}
