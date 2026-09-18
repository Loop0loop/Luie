// 테스트 전용 진입점. 제품 main을 import하기 전에 저장소를 격리한다.
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function configureProbe(app, config) {
  if (app.isPackaged || !path.isAbsolute(config.profile)) {
    throw new Error(
      "P0 requires an unpackaged app and an absolute owned profile",
    );
  }
  if (
    fs.readFileSync(path.join(config.profile, ".luie-p0-owner"), "utf8") !==
    config.token
  ) {
    throw new Error("P0 profile ownership mismatch");
  }
  app.setPath("userData", config.profile);
  app.setPath("sessionData", config.profile);
  app.setAppPath(config.repo);
  process.env.LUIE_USER_DATA_PATH = config.profile;
  process.env.DATABASE_URL = `file:${path.join(config.profile, "main.db")}`;
  process.env.LUIE_RUNTIME_DATABASE_URL = process.env.DATABASE_URL;
  process.env.LUIE_RUNTIME_CACHE_DATABASE_URL = `file:${path.join(config.profile, "cache.db")}`;
  process.env.LUIE_DISABLE_SYNC = "1";
  process.env.NODE_ENV = "production";

  // 테스트가 실제 OS의 luie:// 연결을 덮어쓰지 않게 한다. 성공으로 위장하지 않는다.
  app.setAsDefaultProtocolClient = () => false;
}

module.exports = { configureProbe };

if (process.versions.electron) {
  const { app } = require("electron");
  const config = JSON.parse(process.env.LUIE_P0_CONFIG);
  configureProbe(app, config);
  const started = performance.now();
  const probe = { marks: [], gpuStatusReady: false };
  globalThis.__luieStartupProbe = probe;
  const mark = (event, windowId) => {
    // ponytail: 시작 시점만 최대 64개 보존. 긴 세션 분석은 별도 trace를 사용한다.
    if (probe.marks.length < 64) {
      probe.marks.push({
        event,
        windowId,
        elapsedMs: performance.now() - started,
      });
    }
  };
  mark("probe-entry");
  app.once("ready", () => mark("app-ready"));
  app.once("gpu-info-update", () => {
    probe.gpuStatusReady = true;
  });
  app.on("browser-window-created", (_event, window) => {
    mark("window-created", window.id);
    window.once("show", () => mark("window-show", window.id));
    for (const event of [
      "dom-ready",
      "did-finish-load",
      "render-process-gone",
    ]) {
      window.webContents.once(event, () => mark(event, window.id));
    }
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    // llmfit의 자동 설치가 측정 중 새 바이너리를 내려받지 않게 하는 통제 실험이다.
    if (
      url === "https://api.github.com/repos/AlexsJones/llmfit/releases/latest"
    ) {
      mark("llmfit-release-blocked");
      return Promise.resolve(new Response(null, { status: 503 }));
    }
    return originalFetch(input, init);
  };
  import(pathToFileURL(path.join(config.repo, "out/main/index.js")).href).catch(
    (error) => {
      console.error(error);
      app.exit(1);
    },
  );
}
