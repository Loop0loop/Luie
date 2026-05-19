import { ReactFlowProvider } from "reactflow";
import GraphSurface from "./GraphSurface";
import GraphToolbar from "./GraphToolbar";
import GraphInspector from "./GraphInspector";

export default function GraphWorkspace() {
  return (
    <ReactFlowProvider>
      <div className="flex h-full w-full flex-col bg-app">
        <GraphToolbar />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <GraphSurface />
          <GraphInspector />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
