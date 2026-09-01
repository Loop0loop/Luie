import StatsWorker from "@renderer/features/editor/workers/stats.worker?worker";

// NOTE: 에디터 인스턴스마다 Worker를 생성/terminate하면 챕터 전환마다 스폰 비용을 냈다.
// 모듈 스코프 싱글턴으로 1개만 띄우고 리스너만 붙였다 뗀다. 유휴 Worker의 상주 비용은
// 미미하고 앱 수명과 같으므로 terminate하지 않는다.
let sharedWorker: InstanceType<typeof StatsWorker> | null = null;

export function acquireStatsWorker(): InstanceType<typeof StatsWorker> {
  if (!sharedWorker) {
    sharedWorker = new StatsWorker();
  }
  return sharedWorker;
}
