// TEST_LEVEL: UNIT
// PROVES: 세 가지 P1-B 성능 계약.
//   (1) stats Worker 싱글턴 — 여러 소비자가 acquire해도 인스턴스는 1개다.
//   (2) loadGraph 병렬화 — 그래프 본문 응답이 늦어도 레플리카 조회가 즉시 발화한다(워터폴 제거).
//   (3) 시놉시스 세션 캐시 — 재마운트 시 소스 헬퍼를 재호출하지 않고, 저장이 캐시를 갱신한다.
// DOES_NOT_PROVE: 실제 Worker 스레드 동작, worldGraph 병합 규칙의 내용적 정합성(merge는
//   전용 계약 테스트가 담당), localStorage 실제 직렬화 비용.

import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------- (1) stats Worker 싱글턴 ----------

const { FakeStatsWorker } = vi.hoisted(() => {
  class FakeStatsWorker {
    static instanceCount = 0;
    listeners = new Set<(event: { data: unknown }) => void>();

    constructor() {
      FakeStatsWorker.instanceCount += 1;
    }

    addEventListener(
      _type: string,
      listener: (event: { data: unknown }) => void,
    ) {
      this.listeners.add(listener);
    }

    removeEventListener(
      _type: string,
      listener: (event: { data: unknown }) => void,
    ) {
      this.listeners.delete(listener);
    }

    postMessage(data: unknown) {
      this.listeners.forEach((listener) => listener({ data }));
    }
  }
  return { FakeStatsWorker };
});

vi.mock(
  "@renderer/features/editor/workers/stats.worker?worker",
  () => ({ default: FakeStatsWorker }),
);

import {
  acquireStatsWorker,
} from "../../../src/renderer/src/features/editor/hooks/statsWorkerClient.js";

describe("stats worker singleton", () => {
  it("returns the same worker instance across consumers", () => {
    FakeStatsWorker.instanceCount = 0;
    const first = acquireStatsWorker();
    const second = acquireStatsWorker();

    // 근거: 두 소비자가 acquire해도 생성자는 1회만 도는 것.
    expect(FakeStatsWorker.instanceCount).toBe(1);
    expect(second).toBe(first);
  });
});

// ---------- (2) loadGraph parallelization ----------

const graphDeferreds = vi.hoisted(() => {
  const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  };
  return {
    graph: deferred<unknown>(),
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    worldGraphGet: vi.fn(),
    worldStorageGetDocument: vi.fn(),
  };
});

vi.mock("@shared/api", () => ({
  api: {
    logger: graphDeferreds.logger,
    worldGraph: { get: graphDeferreds.worldGraphGet },
    worldStorage: { getDocument: graphDeferreds.worldStorageGetDocument },
  },
}));

import { createLoadGraphAction } from "../../../src/renderer/src/features/research/stores/worldBuilding/worldBuildingActions/loadGraph.js";

describe("loadGraph parallel fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts the replica fetch before the graph response resolves", async () => {
    // 그래프 본문은 늦게, 레플리카는 즉시 응답하도록 만든다.
    const graphPending = graphDeferreds.graph;
    graphDeferreds.worldGraphGet.mockReturnValueOnce(graphPending.promise);
    graphDeferreds.worldStorageGetDocument.mockResolvedValueOnce({
      success: true,
      data: { found: false },
    });

    const set = vi.fn((partial: unknown) => partial);
    const get = vi.fn(() => ({
      activeProjectId: "p1",
      graphData: null,
    }));
    const loadGraph = createLoadGraphAction(
      set as never,
      get as never,
    )("p1");

    // 근거: 그래프 응답이 pending인 동안에도 레플리카 조회가 이미 발화했다.
    // (구버전 순차 await에서는 그래프 응답까지 레플리카 호출이 0회다.)
    expect(graphDeferreds.worldStorageGetDocument).toHaveBeenCalledTimes(1);

    graphPending.resolve({
      success: true,
      data: { nodes: [], edges: [] },
    });
    await loadGraph;

    expect(graphDeferreds.worldGraphGet).toHaveBeenCalledTimes(1);
  });
});

// ---------- (3) synopsis session cache ----------

const helperMocks = vi.hoisted(() => ({
  loadReplicaDocument: vi.fn(),
  saveReplicaDocument: vi.fn(),
  readLuieJson: vi.fn(),
  removeLocalStorageJson: vi.fn(),
  loadLocalStorageJson: vi.fn(),
  migrateLegacyLocalDocument: vi.fn(),
  ensureReplicaDocumentSaved: vi.fn(),
  ensureLuieWorldDocumentSaved: vi.fn(),
  isLuieProjectPath: vi.fn(() => false),
  normalizeSynopsis: vi.fn((data: unknown, fallback: string) =>
    data === null
      ? { synopsis: fallback, updatedAt: null }
      : (data as Record<string, unknown>),
  ),
  DEFAULT_WORLD_SYNOPSIS: { synopsis: "", updatedAt: null },
}));

vi.mock(
  "@renderer/features/research/services/worldPackageStorageHelpers",
  () => helperMocks,
);

import { worldPackageStorage } from "../../../src/renderer/src/features/research/services/worldPackageStorage.js";

describe("worldPackageStorage synopsis session cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves remounts from the session cache without re-reading sources", async () => {
    helperMocks.loadReplicaDocument.mockResolvedValue({
      synopsis: "v1",
      updatedAt: "t1",
    });

    const first = await worldPackageStorage.loadSynopsis("p-cache");
    const second = await worldPackageStorage.loadSynopsis("p-cache");

    // 근거: 두 번째 로드는 소스 헬퍼를 다시 부르지 않는다(탭 왕복 = IPC 0회).
    expect(helperMocks.loadReplicaDocument).toHaveBeenCalledTimes(1);
    expect(first.synopsis).toBe("v1");
    expect(second).toBe(first);
  });

  it("refreshes the cache on save and isolates projects", async () => {
    helperMocks.loadReplicaDocument.mockResolvedValue({
      synopsis: "old",
      updatedAt: "t0",
    });
    helperMocks.ensureReplicaDocumentSaved.mockResolvedValue(undefined);

    await worldPackageStorage.loadSynopsis("p-save");
    await worldPackageStorage.saveSynopsis("p-save", null, {
      synopsis: "new text",
      updatedAt: "ignored",
    } as never);

    const afterSave = await worldPackageStorage.loadSynopsis("p-save");
    // 근거: 저장 직후 로드는 저장 본문이며 소스 재조회 없이 캐시에서 나온다.
    expect(afterSave.synopsis).toBe("new text");
    expect(helperMocks.loadReplicaDocument).toHaveBeenCalledTimes(1);

    // 근거: 다른 프로젝트는 캐시를 공유하지 않는다.
    helperMocks.loadReplicaDocument.mockResolvedValue({
      synopsis: "other",
      updatedAt: "t9",
    });
    const other = await worldPackageStorage.loadSynopsis("p-other");
    expect(other.synopsis).toBe("other");
    expect(helperMocks.loadReplicaDocument).toHaveBeenCalledTimes(2);
  });
});
