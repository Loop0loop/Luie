import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";

export function useSettingsEditorPreferences() {
  const { fontSize, lineHeight } = useEditorStore(
    useShallow((state) => ({
      fontSize: state.fontSize,
      lineHeight: state.lineHeight,
    })),
  );

  const [localFontSize, setLocalFontSize] = useState(fontSize);
  const [localLineHeight, setLocalLineHeight] = useState(lineHeight);

  useEffect(() => {
    setLocalFontSize(fontSize);
  }, [fontSize]);

  useEffect(() => {
    setLocalLineHeight(lineHeight);
  }, [lineHeight]);

  return {
    fontSize,
    lineHeight,
    localFontSize,
    localLineHeight,
    setLocalFontSize,
    setLocalLineHeight,
  };
}
