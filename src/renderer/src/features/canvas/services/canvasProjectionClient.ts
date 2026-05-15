import type {
  CanvasProjection,
  CanvasProjectionRequest,
} from "../types/canvasProjection.types";

/**
 * Canvas Projection 빌드 클라이언트.
 *
 * Phase 0a에서는 IPC가 없으므로 항상 빈 ready projection을 돌려주는
 * stub. Phase 2(mock projection) → Phase 4(실제 IPC)로 이 모듈만 갈아낀다.
 *
 * 컴포넌트는 store 액션을 통해서만 이 클라이언트를 호출하고, 직접
 * import하지 않는다 — IPC 교체 시 호출 지점이 흩어지지 않게.
 */

export interface CanvasProjectionClient {
  build(request: CanvasProjectionRequest): Promise<CanvasProjection>;
}

class StubCanvasProjectionClient implements CanvasProjectionClient {
  async build(request: CanvasProjectionRequest): Promise<CanvasProjection> {
    // Phase 2에서 Mode별 mock projection으로 분기. 지금은 빈 ready.
    return {
      status: "ready",
      mode: request.mode,
      scope: request.scope,
      nodes: [],
      edges: [],
      generatedAt: Date.now(),
      sourceVersion: "stub@0",
    };
  }
}

let activeClient: CanvasProjectionClient = new StubCanvasProjectionClient();

/**
 * 외부 코드(Hook)는 이 함수만 부른다. 클라이언트 교체는 setter 한 곳만.
 */
export function getCanvasProjectionClient(): CanvasProjectionClient {
  return activeClient;
}

/** 테스트/Phase 4에서 클라이언트를 교체할 때 사용. */
export function __setCanvasProjectionClientForTesting(
  client: CanvasProjectionClient,
): void {
  activeClient = client;
}
