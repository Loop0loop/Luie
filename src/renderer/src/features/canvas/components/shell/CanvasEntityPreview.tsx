import CanvasDocumentView from "./CanvasDocumentView";
import { useCanvasViewStore } from "../../stores";
import type { CanvasEntityPreview as CanvasEntityPreviewState } from "../../types";

interface CanvasEntityPreviewProps {
  preview: CanvasEntityPreviewState;
}

export default function CanvasEntityPreview({ preview }: CanvasEntityPreviewProps) {
  const clearEntityPreview = useCanvasViewStore((state) => state.clearEntityPreview);

  return (
    <CanvasDocumentView
      preview={preview}
      onClose={clearEntityPreview}
    />
  );
}
