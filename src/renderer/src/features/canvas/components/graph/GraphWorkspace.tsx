import { ReactFlowProvider } from "reactflow";
import GraphSurface from "./GraphSurface";

export default function GraphWorkspace() {
  return (
    <ReactFlowProvider>
      <div className="flex h-full w-full flex-col bg-canvas">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <GraphSurface />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
