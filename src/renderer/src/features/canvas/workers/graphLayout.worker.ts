import {
  calculateGraphLayoutResult,
  type GraphLayoutRequest,
} from "./graphLayoutWorkerCore";

self.addEventListener("message", (event: MessageEvent<GraphLayoutRequest>) => {
  self.postMessage(calculateGraphLayoutResult(event.data));
});
