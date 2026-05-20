import { ReactFlowProvider } from "reactflow";
import GraphSurface from "./GraphSurface";
import GraphToolbar from "./GraphToolbar";
import GraphInspector from "./GraphInspector";

export default function GraphWorkspace() {
  return (
    <ReactFlowProvider>
      <div className="flex h-full w-full flex-col bg-canvas">
        <GraphToolbar />
        <div className="flex flex-row relative min-h-0 flex-1 overflow-hidden">
          <div className="flex-1 min-w-0 h-full relative">
            <GraphSurface />
          </div>
          <GraphInspector />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
