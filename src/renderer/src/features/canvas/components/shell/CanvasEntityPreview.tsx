import CanvasDocumentView from "./CanvasDocumentView";
import type { CanvasEntityPreview as CanvasEntityPreviewState } from "../../types";

interface CanvasEntityPreviewProps {
  preview: CanvasEntityPreviewState;
}

export default function CanvasEntityPreview({ preview }: CanvasEntityPreviewProps) {

  return (
    <CanvasDocumentView
      preview={preview}
    />
  );
}
